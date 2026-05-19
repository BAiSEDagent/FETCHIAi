// Staleness Agent — marks opportunities stale when their signal ages out.
// TODO: wire live in CP6.
import { z } from 'zod'

export const stalenessInputSchema = z.object({
  workspaceId: z.string(),
  opportunities: z.array(
    z.object({
      id: z.string().uuid(),
      signalType: z.string(),
      detectedAt: z.string(),
      status: z.string(),
    }),
  ),
})

export const stalenessOutputSchema = z.object({
  stale: z.array(
    z.object({
      opportunityId: z.string().uuid(),
      reason: z.string(),
    }),
  ),
})

export type StalenessInput = z.infer<typeof stalenessInputSchema>
export type StalenessOutput = z.infer<typeof stalenessOutputSchema>

export async function run(input: StalenessInput): Promise<StalenessOutput> {
  stalenessInputSchema.parse(input)
  // TODO: wire live in CP6
  return { stale: [] }
}
