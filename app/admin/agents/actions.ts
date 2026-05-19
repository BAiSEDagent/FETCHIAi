'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, agentRegistry } from '@/db'
import { requireAdmin } from '@/lib/admin'

const ALLOWED_PROVIDERS = new Set([
  'anthropic', 'openai', 'google', 'groq', 'together', 'custom',
])

export async function updateAgent(input: {
  id: string
  provider: string
  model: string
  escalationProvider: string | null
  escalationModel: string | null
  promptKey: string | null
  maxTokens: number
  temperature: string
  isActive: boolean
}) {
  await requireAdmin()

  if (!ALLOWED_PROVIDERS.has(input.provider)) {
    throw new Error(`Invalid provider "${input.provider}"`)
  }
  if (input.escalationProvider && !ALLOWED_PROVIDERS.has(input.escalationProvider)) {
    throw new Error(`Invalid escalation provider "${input.escalationProvider}"`)
  }
  if (!input.model.trim()) throw new Error('Model is required')
  if (!Number.isFinite(input.maxTokens) || !Number.isInteger(input.maxTokens) || input.maxTokens < 1) {
    throw new Error('Max tokens must be a positive whole number')
  }
  const tempNum = Number(input.temperature)
  if (!Number.isFinite(tempNum) || tempNum < 0 || tempNum > 2) {
    throw new Error('Temperature must be a number between 0 and 2')
  }

  await db
    .update(agentRegistry)
    .set({
      provider: input.provider,
      model: input.model.trim(),
      escalationProvider: input.escalationProvider,
      escalationModel: input.escalationModel,
      promptKey: input.promptKey,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(agentRegistry.id, input.id))
  revalidatePath('/admin/agents')
}
