'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, opportunities } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { TODAYS_RUN_PASS_REASONS } from '@/lib/today/pass-reasons'

const passFeedbackSchema = z.object({
  reasons: z.array(z.enum(TODAYS_RUN_PASS_REASONS)).min(1),
  note: z.string().max(240).optional(),
  signalType: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
})

const updateSchema = z.object({
  opportunityId: z.string().uuid(),
  status: z.enum(['new', 'saved', 'contacted', 'responded', 'won', 'lost', 'skipped']),
  outcomeNotes: z.string().max(2000).nullable().optional(),
  passFeedback: passFeedbackSchema.optional(),
})

export async function updateLeadOutcome(input: unknown) {
  const data = updateSchema.parse(input)
  const ctx = await requireWorkspaceContext()

  let outcomeNotes: string | null = data.outcomeNotes ?? null
  if (data.passFeedback) {
    const payload = {
      v: 1 as const,
      source: 'todays_run' as const,
      action: 'pass' as const,
      reasons: data.passFeedback.reasons,
      note: data.passFeedback.note ?? null,
      timestamp: new Date().toISOString(),
      opportunityId: data.opportunityId,
      signalType: data.passFeedback.signalType ?? null,
      businessName: data.passFeedback.businessName ?? null,
    }
    outcomeNotes = JSON.stringify(payload)
  }

  await db
    .update(opportunities)
    .set({
      status: data.status,
      outcomeNotes,
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
  revalidatePath('/app/today')
  return { ok: true as const }
}
