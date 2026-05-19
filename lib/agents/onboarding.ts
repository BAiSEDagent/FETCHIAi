// Onboarding Completion Agent — drafts 24h/48h/7d activation emails.
// TODO: wire live in CP6 — Resend send happens elsewhere; this just drafts.
import { z } from 'zod'

export const onboardingInputSchema = z.object({
  workspaceId: z.string(),
  templateSlug: z.enum(['onboarding_24h', 'onboarding_7d']),
  vars: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
})

export const onboardingOutputSchema = z.object({
  subjectLine: z.string(),
  body: z.string(),
})

export type OnboardingInput = z.infer<typeof onboardingInputSchema>
export type OnboardingOutput = z.infer<typeof onboardingOutputSchema>

export async function run(input: OnboardingInput): Promise<OnboardingOutput> {
  const parsed = onboardingInputSchema.parse(input)
  // TODO: wire live in CP6
  return {
    subjectLine: `[draft] ${parsed.templateSlug}`,
    body: '[stub] Live drafting lands in CP6.',
  }
}
