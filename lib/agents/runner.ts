import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { agentRegistry, db, type AgentRegistryEntry } from '@/db'
import { getActivePrompt, renderPrompt } from '@/lib/prompts'
import { getProvider } from './providerFactory'
import type { LLMCompletion, LLMMessage } from './providers'

export interface RunAgentOptions<TOutput> {
  /** Agent slug from agent_registry. */
  slug: string
  /** Variables substituted into the prompt template via `{var}` syntax. */
  promptVars?: Record<string, string | number | null | undefined>
  /** Additional user/assistant turns appended after the system prompt. */
  messages?: LLMMessage[]
  /** Schema applied to the model output (after optional JSON parse). */
  outputSchema?: z.ZodType<TOutput>
  /** "text" returns raw string. "json" parses content as JSON before validation. */
  responseFormat?: 'text' | 'json'
  /** If true and registry row has escalation_provider + escalation_model, use those. */
  escalate?: boolean
  /** Per-call overrides. */
  overrideMaxTokens?: number
  overrideTemperature?: number
}

export interface RunAgentResult<TOutput> {
  output: TOutput
  raw: string
  agent: AgentRegistryEntry
  promptVersionId: string | null
  usage: {
    inputTokens?: number
    outputTokens?: number
    model?: string
    provider: string
    escalated: boolean
  }
}

const getAgentBySlug = cache(async (slug: string): Promise<AgentRegistryEntry | null> => {
  const rows = await db.select().from(agentRegistry).where(eq(agentRegistry.slug, slug)).limit(1)
  return rows[0] ?? null
})

export async function runAgent<TOutput = string>(
  opts: RunAgentOptions<TOutput>,
): Promise<RunAgentResult<TOutput>> {
  const agent = await getAgentBySlug(opts.slug)
  if (!agent) throw new Error(`Agent "${opts.slug}" not found in agent_registry.`)
  if (!agent.isActive) throw new Error(`Agent "${opts.slug}" is disabled at /admin/agents.`)

  const escalated = Boolean(
    opts.escalate && agent.escalationProvider && agent.escalationModel,
  )
  const providerName = escalated ? agent.escalationProvider! : agent.provider
  const model = escalated ? agent.escalationModel! : agent.model

  if (model === 'set-in-admin') {
    throw new Error(
      `Agent "${opts.slug}" has no model configured. Set provider + model at /admin/agents.`,
    )
  }

  const provider = getProvider(providerName)

  // Build messages: system prompt (if promptKey set) + caller messages
  const messages: LLMMessage[] = []
  let promptVersionId: string | null = null
  if (agent.promptKey) {
    const active = await getActivePrompt(agent.promptKey)
    if (!active) {
      throw new Error(
        `No active prompt found for "${agent.promptKey}". Activate one at /admin/prompts.`,
      )
    }
    promptVersionId = active.id
    const rendered = renderPrompt(active.content, opts.promptVars ?? {})
    messages.push({ role: 'system', content: rendered })
  }
  if (opts.messages) messages.push(...opts.messages)

  if (messages.length === 0) {
    throw new Error(`Agent "${opts.slug}" was invoked with no system prompt and no messages.`)
  }

  const completion: LLMCompletion = await provider.complete(messages, {
    model,
    maxTokens: opts.overrideMaxTokens ?? agent.maxTokens,
    temperature: opts.overrideTemperature ?? parseFloat(agent.temperature),
    timeoutMs: agent.timeoutMs,
    responseFormat: opts.responseFormat,
  })

  let parsed: unknown = completion.content
  if (opts.responseFormat === 'json') {
    try {
      parsed = JSON.parse(completion.content)
    } catch (err) {
      throw new Error(
        `Agent "${opts.slug}" returned invalid JSON: ${(err as Error).message}`,
      )
    }
  }

  const output = (opts.outputSchema ? opts.outputSchema.parse(parsed) : parsed) as TOutput

  return {
    output,
    raw: completion.content,
    agent,
    promptVersionId,
    usage: {
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      model: completion.rawModel ?? model,
      provider: provider.name,
      escalated,
    },
  }
}
