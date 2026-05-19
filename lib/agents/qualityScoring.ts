// Quality Scoring Agent — nightly batch re-score of open opportunities.
// TODO: wire live in CP6.
import { z } from 'zod'

export const qualityScoringInputSchema = z.object({
  workspaceId: z.string(),
  opportunities: z.array(
    z.object({
      id: z.string().uuid(),
      signalDetail: z.string(),
      prospectDetail: z.string(),
      contractorProfile: z.string(),
      idealCustomer: z.string(),
    }),
  ),
})

export const qualityScoringOutputSchema = z.object({
  scores: z.array(
    z.object({
      opportunityId: z.string().uuid(),
      score: z.number().int().min(0).max(100),
      rationale: z.string(),
    }),
  ),
})

export type QualityScoringInput = z.infer<typeof qualityScoringInputSchema>
export type QualityScoringOutput = z.infer<typeof qualityScoringOutputSchema>

export async function run(input: QualityScoringInput): Promise<QualityScoringOutput> {
  const parsed = qualityScoringInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    scores: parsed.opportunities.map((o) => ({
      opportunityId: o.id,
      score: 0,
      rationale: '[stub] live scoring lands in CP6',
    })),
  }
}
