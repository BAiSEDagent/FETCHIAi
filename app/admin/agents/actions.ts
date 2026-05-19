'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, agentRegistry } from '@/db'
import { requireAdmin } from '@/lib/admin'

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
  await db
    .update(agentRegistry)
    .set({
      provider: input.provider,
      model: input.model,
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
