// Outcome Learning Agent — distills last 30 outcomes into prompt-injection text.
// TODO: wire live in CP6 — reads opportunities table and writes workspace_learning.
import { z } from 'zod'

export const outcomeLearningInputSchema = z.object({
  workspaceId: z.string(),
  outcomes: z.array(
    z.object({
      opportunityId: z.string().uuid(),
      status: z.enum(['won', 'lost', 'skipped', 'expired']),
      score: z.number().int().min(0).max(100),
      whyNow: z.string().nullable(),
      outcomeNotes: z.string().nullable(),
      outcomeValueCents: z.number().int().nullable(),
    }),
  ),
})

export const outcomeLearningOutputSchema = z.object({
  learningContext: z.string(),
  outcomesCounted: z.number().int().nonnegative(),
})

export type OutcomeLearningInput = z.infer<typeof outcomeLearningInputSchema>
export type OutcomeLearningOutput = z.infer<typeof outcomeLearningOutputSchema>

export async function run(input: OutcomeLearningInput): Promise<OutcomeLearningOutput> {
  const parsed = outcomeLearningInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    learningContext: '',
    outcomesCounted: parsed.outcomes.length,
  }
}
