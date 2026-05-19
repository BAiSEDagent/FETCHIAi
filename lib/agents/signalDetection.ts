// Signal Detection Agent — classifies a search result as a buying signal.
// TODO: wire live in CP6 — needs SearchProvider + Query Builder pipeline.
import { z } from 'zod'

export const signalDetectionInputSchema = z.object({
  workspaceId: z.string(),
  vertical: z.string(),
  city: z.string(),
  state: z.string(),
  result: z.object({
    title: z.string().optional(),
    snippet: z.string().optional(),
    url: z.string().optional(),
    raw: z.unknown().optional(),
  }),
})

export const signalDetectionOutputSchema = z.object({
  isSignal: z.boolean(),
  confidence: z.number().min(0).max(100),
  signalType: z.enum([
    'storm_damage',
    'building_permit',
    'new_business_listing',
    'job_posting',
    'event',
    'none',
  ]),
  businessName: z.string().nullable(),
  address: z.string().nullable(),
  whyRelevant: z.string().nullable(),
})

export type SignalDetectionInput = z.infer<typeof signalDetectionInputSchema>
export type SignalDetectionOutput = z.infer<typeof signalDetectionOutputSchema>

export async function run(input: SignalDetectionInput): Promise<SignalDetectionOutput> {
  signalDetectionInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    isSignal: false,
    confidence: 0,
    signalType: 'none',
    businessName: null,
    address: null,
    whyRelevant: null,
  }
}
