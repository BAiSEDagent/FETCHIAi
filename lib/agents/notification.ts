// Notification Agent — composes daily digest + high-score / expiring alerts.
// TODO: wire live in CP6.
import { z } from 'zod'

export const notificationInputSchema = z.object({
  workspaceId: z.string(),
  digestKind: z.enum(['daily_digest', 'high_score_alert', 'expiring_leads_alert']),
  opportunities: z.array(
    z.object({
      id: z.string().uuid(),
      businessName: z.string(),
      score: z.number().int().min(0).max(100),
      whyNow: z.string().nullable(),
    }),
  ),
})

export const notificationOutputSchema = z.object({
  subjectLine: z.string(),
  body: z.string(),
})

export type NotificationInput = z.infer<typeof notificationInputSchema>
export type NotificationOutput = z.infer<typeof notificationOutputSchema>

export async function run(input: NotificationInput): Promise<NotificationOutput> {
  const parsed = notificationInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    subjectLine: `[draft] ${parsed.digestKind} — ${parsed.opportunities.length} leads`,
    body: '[stub] Live composition lands in CP6.',
  }
}
