// ツ Conversation Agent — user-facing chat for finding/coaching leads.
// TODO: wire live in CP6 — currently returns a deterministic stub so the
// chat surface can be exercised end-to-end without burning provider tokens.
import { z } from 'zod'
import type { LLMMessage } from './providers'

export const conversationInputSchema = z.object({
  workspaceId: z.string(),
  workspaceContext: z.string().default(''),
  learningContext: z.string().default(''),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .default([]),
  userMessage: z.string().min(1),
})

export const conversationOutputSchema = z.object({
  reply: z.string(),
  suggestedActions: z.array(z.string()).default([]),
})

export type ConversationInput = z.infer<typeof conversationInputSchema>
export type ConversationOutput = z.infer<typeof conversationOutputSchema>

export async function run(input: ConversationInput): Promise<ConversationOutput> {
  const parsed = conversationInputSchema.parse(input)
  // TODO: wire live — call runAgent({ slug: 'conversation', promptVars: {...}, messages: [...] })
  const _messages: LLMMessage[] = [
    ...parsed.history,
    { role: 'user', content: parsed.userMessage },
  ]
  return {
    reply:
      "I'm here. Live chat lands in the next checkpoint — for now I'm a stub so you can wire the UI without burning tokens.",
    suggestedActions: ['Find new leads', 'Review today\u2019s stack'],
  }
}
