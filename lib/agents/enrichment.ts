// Enrichment Agent — extracts decision-maker contact info for a prospect.
// TODO: wire live in CP6 — needs SearchProvider results + structured extraction.
import { z } from 'zod'

export const enrichmentInputSchema = z.object({
  workspaceId: z.string(),
  prospectId: z.string().uuid(),
  businessName: z.string(),
  address: z.string().nullable(),
  businessType: z.string().nullable(),
  vertical: z.string(),
})

export const enrichmentOutputSchema = z.object({
  contacts: z.array(
    z.object({
      name: z.string().nullable(),
      title: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      confidence: z.number().min(0).max(100),
    }),
  ),
})

export type EnrichmentInput = z.infer<typeof enrichmentInputSchema>
export type EnrichmentOutput = z.infer<typeof enrichmentOutputSchema>

export async function run(input: EnrichmentInput): Promise<EnrichmentOutput> {
  enrichmentInputSchema.parse(input)
  // TODO: wire live in CP6
  return { contacts: [] }
}
