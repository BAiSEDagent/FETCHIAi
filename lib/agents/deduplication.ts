// Deduplication Agent — collapses near-duplicate signals before they become leads.
// TODO: wire live in CP6 — needs SearchProvider results + signal_hash window logic.
import { z } from 'zod'

export const dedupInputSchema = z.object({
  workspaceId: z.string(),
  candidates: z.array(
    z.object({
      businessName: z.string(),
      address: z.string().nullable(),
      signalType: z.string(),
      detectedAt: z.string(),
    }),
  ),
})

export const dedupOutputSchema = z.object({
  keep: z.array(z.number().int().nonnegative()),
  drop: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      reason: z.string(),
    }),
  ),
})

export type DedupInput = z.infer<typeof dedupInputSchema>
export type DedupOutput = z.infer<typeof dedupOutputSchema>

export async function run(input: DedupInput): Promise<DedupOutput> {
  const parsed = dedupInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    keep: parsed.candidates.map((_, i) => i),
    drop: [],
  }
}
