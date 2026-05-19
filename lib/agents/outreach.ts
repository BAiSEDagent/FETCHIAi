// Outreach Drafting Agent — writes the email draft for an opportunity.
// TODO: wire live in CP6.
import { z } from 'zod'

export const outreachInputSchema = z.object({
  workspaceId: z.string(),
  opportunityId: z.string().uuid(),
  vertical: z.string(),
  businessName: z.string(),
  contactName: z.string().nullable().optional(),
  contactTitle: z.string().nullable().optional(),
  signalDetail: z.string(),
  whyNow: z.string(),
  contractorName: z.string(),
  contractorDescription: z.string(),
})

export const outreachOutputSchema = z.object({
  subjectLine: z.string().max(120),
  body: z.string(),
})

export type OutreachInput = z.infer<typeof outreachInputSchema>
export type OutreachOutput = z.infer<typeof outreachOutputSchema>

export async function run(input: OutreachInput): Promise<OutreachOutput> {
  const parsed = outreachInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    subjectLine: `[draft] Reaching out about ${parsed.businessName}`,
    body: '[stub] Live drafting lands in CP6.',
  }
}
