/**
 * CP11 - Prospect scoring contract proof.
 *
 * Deterministic contract seam only. Evidence-backed prospects may receive
 * Prospect Fit and Outreach Readiness scoring, but they cannot receive
 * Opportunity Urgency scoring unless a separate signal-backed opportunity
 * exists in a later checkpoint.
 */

import type { LeadKind } from '@/lib/prospect-mining/contracts'

export type ScoreKind =
  | 'prospect_fit'
  | 'outreach_readiness'
  | 'opportunity_urgency'

export interface ProspectScoreInput {
  leadKind: LeadKind
  evidenceSummary: string
  fitReasons: string[]
  contactRouteHints?: string[]
  sourceConfidence?: number
  locationConfidence?: number
  accountFitSignals?: string[]
  crmReady?: boolean
  requestedScoreKinds?: ScoreKind[]
}

export interface ProspectScoreComponent {
  key: string
  weight: number
  value: number
  reason: string
}

export type ProspectScoringReasonCode =
  | 'invalid_lead_kind'
  | 'missing_evidence_summary'
  | 'missing_fit_reasons'
  | 'forbidden_opportunity_urgency'
  | 'forbidden_opportunity_field'
  | 'missing_score_reason'

export interface ProspectScoringResult {
  ok: boolean
  leadKind: LeadKind
  allowedScoreKinds: ScoreKind[]
  blockedScoreKinds: ScoreKind[]
  prospectFitScore: number | null
  outreachReadinessScore: number | null
  opportunityUrgencyScore: null
  scoreReasons: Partial<Record<ScoreKind, ProspectScoreComponent[]>>
  createdOpportunity: false
  outreachDrafted: false
  crmSynced: false
  reasonCode?: ProspectScoringReasonCode
  gateReasons: string[]
}

const ALLOWED_PROSPECT_SCORE_KINDS: ScoreKind[] = [
  'prospect_fit',
  'outreach_readiness',
]

const BLOCKED_PROSPECT_SCORE_KINDS: ScoreKind[] = ['opportunity_urgency']

const FORBIDDEN_OPPORTUNITY_FIELDS = [
  'whyNow',
  'freshnessLabel',
  'opportunityStatus',
  'coralSurface',
  'outreachDraft',
  'opportunityScore',
  'opportunityFitScore',
  'opportunityUrgencyScore',
  'urgencyScore',
  'score',
  'scoreReasons',
  'createdOpportunity',
] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nonEmptyStrings(values: readonly string[] | undefined): string[] {
  return (values ?? []).filter(isNonEmptyString)
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function boundedConfidence(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  return Math.max(0, Math.min(1, value))
}

function fail(
  input: ProspectScoreInput,
  reasonCode: ProspectScoringReasonCode,
  gateReasons: string[],
): ProspectScoringResult {
  return {
    ok: false,
    leadKind: input.leadKind,
    allowedScoreKinds: ALLOWED_PROSPECT_SCORE_KINDS,
    blockedScoreKinds: BLOCKED_PROSPECT_SCORE_KINDS,
    prospectFitScore: null,
    outreachReadinessScore: null,
    opportunityUrgencyScore: null,
    scoreReasons: {},
    createdOpportunity: false,
    outreachDrafted: false,
    crmSynced: false,
    reasonCode,
    gateReasons,
  }
}

function findForbiddenOpportunityField(input: ProspectScoreInput): string | null {
  const record = input as unknown as Record<string, unknown>

  for (const field of FORBIDDEN_OPPORTUNITY_FIELDS) {
    if (field in record && record[field] !== undefined && record[field] !== null) {
      return field
    }
  }

  return null
}

function asksForOpportunityUrgency(input: ProspectScoreInput): boolean {
  return (input.requestedScoreKinds ?? []).includes('opportunity_urgency')
}

function buildProspectFitReasons(
  fitReasons: string[],
  accountFitSignals: string[],
  sourceConfidence: number,
): ProspectScoreComponent[] {
  const reasons: ProspectScoreComponent[] = [
    {
      key: 'fit_reason_coverage',
      weight: 0.55,
      value: Math.min(1, fitReasons.length / 3),
      reason: `Fit evidence includes ${fitReasons.length} machine-readable reason(s).`,
    },
    {
      key: 'source_confidence',
      weight: 0.25,
      value: sourceConfidence,
      reason: 'Source confidence contributes to prospect fit only as evidence support.',
    },
  ]

  if (accountFitSignals.length > 0) {
    reasons.push({
      key: 'account_fit_signal_coverage',
      weight: 0.2,
      value: Math.min(1, accountFitSignals.length / 2),
      reason: `Account fit includes ${accountFitSignals.length} explicit signal(s).`,
    })
  }

  return reasons
}

function buildOutreachReadinessReasons(
  contactRouteHints: string[],
  sourceConfidence: number,
  locationConfidence: number,
  crmReady: boolean,
): ProspectScoreComponent[] {
  const reasons: ProspectScoreComponent[] = [
    {
      key: 'contact_route_hint_coverage',
      weight: 0.45,
      value: Math.min(1, contactRouteHints.length / 2),
      reason: `Contactability includes ${contactRouteHints.length} route hint(s).`,
    },
    {
      key: 'source_readiness',
      weight: 0.25,
      value: sourceConfidence,
      reason: 'Source confidence supports outreach readiness without drafting outreach.',
    },
    {
      key: 'location_readiness',
      weight: 0.2,
      value: locationConfidence,
      reason: 'Location confidence supports routing readiness.',
    },
  ]

  if (crmReady) {
    reasons.push({
      key: 'crm_mapping_readiness',
      weight: 0.1,
      value: 1,
      reason: 'CRM-ready flag is treated as mapping readiness only; no sync/export occurs.',
    })
  }

  return reasons
}

function scoreFromReasons(reasons: ProspectScoreComponent[]): number | null {
  if (reasons.length === 0) {
    return null
  }

  const totalWeight = reasons.reduce((sum, component) => sum + component.weight, 0)

  if (totalWeight <= 0) {
    return null
  }

  const weightedValue = reasons.reduce(
    (sum, component) => sum + component.weight * component.value,
    0,
  )

  return boundedScore((weightedValue / totalWeight) * 100)
}

function hasReasonsForEveryScore(result: ProspectScoringResult): boolean {
  const prospectFitReasons = result.scoreReasons.prospect_fit ?? []
  const outreachReadinessReasons = result.scoreReasons.outreach_readiness ?? []

  return (
    (result.prospectFitScore === null || prospectFitReasons.length > 0) &&
    (result.outreachReadinessScore === null || outreachReadinessReasons.length > 0)
  )
}

export function evaluateProspectScoring(
  input: ProspectScoreInput,
): ProspectScoringResult {
  if (
    input.leadKind !== 'evidence_backed_prospect' &&
    input.leadKind !== 'exploratory_prospect'
  ) {
    return fail(input, 'invalid_lead_kind', [
      'Prospect scoring only accepts evidence-backed or exploratory prospects.',
    ])
  }

  if (!isNonEmptyString(input.evidenceSummary)) {
    return fail(input, 'missing_evidence_summary', [
      'Prospect scoring requires a grounded evidence summary.',
    ])
  }

  const fitReasons = nonEmptyStrings(input.fitReasons)

  if (fitReasons.length === 0) {
    return fail(input, 'missing_fit_reasons', [
      'Prospect Fit scoring requires at least one machine-readable fit reason.',
    ])
  }

  if (asksForOpportunityUrgency(input)) {
    return fail(input, 'forbidden_opportunity_urgency', [
      'Opportunity Urgency scoring is blocked for prospects without a separate signal-backed opportunity.',
    ])
  }

  const forbiddenOpportunityField = findForbiddenOpportunityField(input)

  if (forbiddenOpportunityField) {
    return fail(input, 'forbidden_opportunity_field', [
      `Prospect scoring input includes opportunity-only field "${forbiddenOpportunityField}".`,
    ])
  }

  const contactRouteHints = nonEmptyStrings(input.contactRouteHints)
  const accountFitSignals = nonEmptyStrings(input.accountFitSignals)
  const sourceConfidence = boundedConfidence(input.sourceConfidence, 0.75)
  const locationConfidence = boundedConfidence(input.locationConfidence, 0.7)
  const prospectFitReasons = buildProspectFitReasons(
    fitReasons,
    accountFitSignals,
    sourceConfidence,
  )
  const outreachReadinessReasons = buildOutreachReadinessReasons(
    contactRouteHints,
    sourceConfidence,
    locationConfidence,
    input.crmReady === true,
  )

  const result: ProspectScoringResult = {
    ok: true,
    leadKind: input.leadKind,
    allowedScoreKinds: ALLOWED_PROSPECT_SCORE_KINDS,
    blockedScoreKinds: BLOCKED_PROSPECT_SCORE_KINDS,
    prospectFitScore: scoreFromReasons(prospectFitReasons),
    outreachReadinessScore: scoreFromReasons(outreachReadinessReasons),
    opportunityUrgencyScore: null,
    scoreReasons: {
      prospect_fit: prospectFitReasons,
      outreach_readiness: outreachReadinessReasons,
      opportunity_urgency: [],
    },
    createdOpportunity: false,
    outreachDrafted: false,
    crmSynced: false,
    gateReasons: [
      'Prospect Fit score is based on fit/account evidence only.',
      'Outreach Readiness score is based on contactability and source readiness only.',
      'Opportunity Urgency is blocked because this is not a signal-backed opportunity.',
      'No opportunity, outreach, CRM sync, or export is created by this contract.',
    ],
  }

  if (!hasReasonsForEveryScore(result)) {
    return fail(input, 'missing_score_reason', [
      'Every non-null prospect score must include machine-readable score reasons.',
    ])
  }

  return result
}
