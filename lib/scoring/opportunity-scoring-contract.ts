/**
 * CP12 - Signal-backed opportunity scoring contract proof.
 *
 * Deterministic contract seam only. Opportunity Urgency scoring is available
 * only for signal-backed opportunities with source-linked evidence, provider
 * lineage, freshness, and why-now reasons. This does not create records,
 * outreach, CRM sync, provider calls, DB writes, routes, or UI.
 */

import type { LeadKind } from '@/lib/prospect-mining/contracts'

export type ScoreKind = 'opportunity_urgency'

export type OpportunityLeadKind = Extract<LeadKind, 'signal_backed_opportunity'>

export interface OpportunityScoringInput {
  leadKind: LeadKind
  signalType: string
  signalLabel: string
  evidenceSourceUrls: string[]
  providerRunIds: string[]
  evidenceSummary: string
  whyNowReasons: string[]
  freshnessWindow: string
  actionWindow?: string
  signalObservedAt?: string
  publishedAt?: string
  scoreComponents?: OpportunityScoreComponent[]
}

export interface OpportunityScoreComponent {
  key: string
  weight: number
  value: number
  reason: string
}

export type OpportunityScoringReasonCode =
  | 'invalid_lead_kind'
  | 'missing_signal'
  | 'missing_signal_label'
  | 'missing_evidence_source'
  | 'missing_provider_run_id'
  | 'missing_evidence_summary'
  | 'missing_why_now'
  | 'missing_freshness_window'
  | 'missing_score_reason'
  | 'prospect_urgency_blocked'

export interface OpportunityScoringResult {
  ok: boolean
  leadKind: LeadKind
  allowedScoreKinds: ScoreKind[]
  blockedScoreKinds: ScoreKind[]
  opportunityUrgencyScore: number | null
  scoreReasons: OpportunityScoreComponent[]
  readyForOpportunityRanking: boolean
  createdOpportunity: false
  outreachDrafted: false
  crmSynced: false
  reasonCode?: OpportunityScoringReasonCode
  gateReasons: string[]
}

const OPPORTUNITY_URGENCY: ScoreKind = 'opportunity_urgency'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nonEmptyStrings(values: readonly string[] | undefined): string[] {
  return (values ?? []).filter(isNonEmptyString)
}

function boundedValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function fail(
  input: OpportunityScoringInput,
  reasonCode: OpportunityScoringReasonCode,
  gateReasons: string[],
): OpportunityScoringResult {
  return {
    ok: false,
    leadKind: input.leadKind,
    allowedScoreKinds: [],
    blockedScoreKinds: [OPPORTUNITY_URGENCY],
    opportunityUrgencyScore: null,
    scoreReasons: [],
    readyForOpportunityRanking: false,
    createdOpportunity: false,
    outreachDrafted: false,
    crmSynced: false,
    reasonCode,
    gateReasons,
  }
}

function isProspectLeadKind(leadKind: LeadKind): boolean {
  return (
    leadKind === 'evidence_backed_prospect' ||
    leadKind === 'exploratory_prospect'
  )
}

function missingScoreReason(
  components: readonly OpportunityScoreComponent[] | undefined,
): boolean {
  return (
    components !== undefined &&
    components.some((component) => !isNonEmptyString(component.reason))
  )
}

function defaultScoreComponents(
  input: OpportunityScoringInput,
): OpportunityScoreComponent[] {
  return [
    {
      key: 'fresh_public_signal',
      weight: 0.25,
      value: 1,
      reason: `Signal "${input.signalType}" is present with approved label "${input.signalLabel}".`,
    },
    {
      key: 'source_linked_evidence',
      weight: 0.25,
      value: Math.min(1, nonEmptyStrings(input.evidenceSourceUrls).length / 2),
      reason: 'Source-linked evidence is present for the opportunity.',
    },
    {
      key: 'provider_lineage',
      weight: 0.15,
      value: Math.min(1, nonEmptyStrings(input.providerRunIds).length / 2),
      reason: 'Provider run lineage is present for replayable scoring.',
    },
    {
      key: 'why_now_reason_coverage',
      weight: 0.25,
      value: Math.min(1, nonEmptyStrings(input.whyNowReasons).length / 2),
      reason: `Why-now evidence includes ${nonEmptyStrings(input.whyNowReasons).length} machine-readable reason(s).`,
    },
    {
      key: 'freshness_window',
      weight: 0.1,
      value: isNonEmptyString(input.actionWindow) ? 1 : 0.8,
      reason: 'Freshness window is present; action window raises urgency confidence when provided.',
    },
  ]
}

function normalizedScoreComponents(
  input: OpportunityScoringInput,
): OpportunityScoreComponent[] {
  const components = input.scoreComponents ?? defaultScoreComponents(input)

  return components.map((component) => ({
    key: component.key,
    weight: Math.max(0, component.weight),
    value: boundedValue(component.value),
    reason: component.reason,
  }))
}

function scoreFromComponents(
  components: readonly OpportunityScoreComponent[],
): number | null {
  if (components.length === 0) {
    return null
  }

  const totalWeight = components.reduce(
    (sum, component) => sum + component.weight,
    0,
  )

  if (totalWeight <= 0) {
    return null
  }

  const weightedValue = components.reduce(
    (sum, component) => sum + component.weight * component.value,
    0,
  )

  return boundedScore((weightedValue / totalWeight) * 100)
}

export function evaluateOpportunityScoring(
  input: OpportunityScoringInput,
): OpportunityScoringResult {
  if (isProspectLeadKind(input.leadKind)) {
    return fail(input, 'prospect_urgency_blocked', [
      'Opportunity Urgency is blocked for evidence-backed prospects without a separate fresh signal-backed opportunity.',
    ])
  }

  if (input.leadKind !== 'signal_backed_opportunity') {
    return fail(input, 'invalid_lead_kind', [
      'Opportunity Urgency scoring accepts only signal-backed opportunities.',
    ])
  }

  if (!isNonEmptyString(input.signalType)) {
    return fail(input, 'missing_signal', [
      'Opportunity Urgency scoring requires a fresh public signal type.',
    ])
  }

  if (!isNonEmptyString(input.signalLabel)) {
    return fail(input, 'missing_signal_label', [
      'Opportunity Urgency scoring requires a signal label supplied by an approved contract.',
    ])
  }

  if (nonEmptyStrings(input.evidenceSourceUrls).length === 0) {
    return fail(input, 'missing_evidence_source', [
      'Opportunity Urgency scoring requires at least one source-linked evidence URL.',
    ])
  }

  if (nonEmptyStrings(input.providerRunIds).length === 0) {
    return fail(input, 'missing_provider_run_id', [
      'Opportunity Urgency scoring requires provider run lineage.',
    ])
  }

  if (!isNonEmptyString(input.evidenceSummary)) {
    return fail(input, 'missing_evidence_summary', [
      'Opportunity Urgency scoring requires a grounded evidence summary.',
    ])
  }

  if (nonEmptyStrings(input.whyNowReasons).length === 0) {
    return fail(input, 'missing_why_now', [
      'Opportunity Urgency scoring requires at least one machine-readable why-now reason.',
    ])
  }

  if (!isNonEmptyString(input.freshnessWindow)) {
    return fail(input, 'missing_freshness_window', [
      'Opportunity Urgency scoring requires a freshness window.',
    ])
  }

  if (missingScoreReason(input.scoreComponents)) {
    return fail(input, 'missing_score_reason', [
      'Every supplied urgency score component must include a machine-readable reason.',
    ])
  }

  const scoreReasons = normalizedScoreComponents(input)
  const opportunityUrgencyScore = scoreFromComponents(scoreReasons)

  if (opportunityUrgencyScore === null || scoreReasons.length === 0) {
    return fail(input, 'missing_score_reason', [
      'Every non-null Opportunity Urgency score must include machine-readable score reasons.',
    ])
  }

  return {
    ok: true,
    leadKind: input.leadKind,
    allowedScoreKinds: [OPPORTUNITY_URGENCY],
    blockedScoreKinds: [],
    opportunityUrgencyScore,
    scoreReasons,
    readyForOpportunityRanking: true,
    createdOpportunity: false,
    outreachDrafted: false,
    crmSynced: false,
    gateReasons: [
      'Lead kind is signal-backed opportunity.',
      'Fresh public signal type and label are present.',
      'Source-linked evidence and provider lineage are present.',
      'Why-now reasons and freshness window are present.',
      'Scoring remains inert: no opportunity record, outreach, CRM sync, provider call, DB write, route, or UI is created.',
    ],
  }
}
