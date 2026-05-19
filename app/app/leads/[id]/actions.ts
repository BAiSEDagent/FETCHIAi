'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, opportunities } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'

const updateSchema = z.object({
  opportunityId: z.string().uuid(),
  status: z.enum(['new', 'saved', 'contacted', 'responded', 'won', 'lost', 'skipped']),
  outcomeNotes: z.string().max(2000).optional(),
})

export async function updateLeadOutcome(input: unknown) {
  const data = updateSchema.parse(input)
  const ctx = await requireWorkspaceContext()

  await db
    .update(opportunities)
    .set({
      status: data.status,
      outcomeNotes: data.outcomeNotes ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(opportunities.id, data.opportunityId),
        eq(opportunities.workspaceId, ctx.workspaceId),
      ),
    )

  revalidatePath(`/app/leads/${data.opportunityId}`)
  revalidatePath('/app/leads')
  return { ok: true as const }
}
