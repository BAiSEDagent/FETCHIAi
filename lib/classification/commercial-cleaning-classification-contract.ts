/**
 * CP13 - Commercial Cleaning classification contract proof.
 *
 * Deterministic guardrail only. It validates proposed UI-visible labels
 * against the approved Commercial Cleaning playbook/taxonomy values. It does
 * not classify with a model, compute scores, create opportunities, draft
 * outreach, call providers, write DB records, or affect routes/UI.
 */

export const COMMERCIAL_CLEANING_VERTICAL_ID = 'commercial_cleaning' as const

export const APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS = [
  'NEW BIZ',
  'NEW LEASE',
  'BUILDOUT',
  'MOVE-IN',
  'REVIEW',
  'PROPERTY MGR',
  'EVENT',
  'HIRING',
  'RESTAURANT',
  'MEDICAL',
  'SCHOOL',
] as const

export const APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS = [
  'Final Clean',
  'Janitorial Contract',
  'New Office',
  'Restaurant',
  'Medical Office',
  'School / Daycare',
  'Gym / Fitness',
  'Property Manager',
  'Move-Out Clean',
  'Post-Construction Clean',
  'Recurring Service',
] as const

export const APPROVED_COMMERCIAL_CLEANING_FALLBACK_STATES = [
  'needs_review',
  'weak_fit',
  'missing_evidence',
  'exploratory',
  'discarded',
] as const

export const APPROVED_COMMERCIAL_CLEANING_SURFACES = [
  'urgent_action',
  'default',
  'pipeline',
  'history',
  'preview',
  'formal_record',
  'fallback',
] as const

export type CommercialCleaningSignalLabel =
  (typeof APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS)[number]

export type CommercialCleaningVerticalFitLabel =
  (typeof APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS)[number]

export type CommercialCleaningFallbackState =
  (typeof APPROVED_COMMERCIAL_CLEANING_FALLBACK_STATES)[number]

export type CommercialCleaningSurface =
  (typeof APPROVED_COMMERCIAL_CLEANING_SURFACES)[number]

export type ClassificationReasonCode =
  | 'invalid_vertical'
  | 'unapproved_signal_label'
  | 'unapproved_vertical_fit_label'
  | 'unapproved_freshness_label'
  | 'unapproved_fallback_state'
  | 'unapproved_surface'
  | 'urgent_surface_missing_action_evidence'
  | 'missing_evidence'
  | 'missing_classification_reason'

export interface CommercialCleaningClassificationInput {
  verticalId: string
  rawSignalId: string
  proposedSignalLabel: string
  proposedVerticalFitLabel: string
  proposedFreshnessLabel?: string
  proposedFallbackState?: string
  proposedSurface?: string
  evidenceSummary?: string
  evidenceSourceUrls?: string[]
  whyNowReasons?: string[]
}

export interface ClassificationResult {
  ok: boolean
  verticalId: string
  signalLabel: CommercialCleaningSignalLabel | null
  verticalFitLabel: CommercialCleaningVerticalFitLabel | null
  freshnessLabel: string | null
  fallbackState: CommercialCleaningFallbackState | null
  opportunitySurface: CommercialCleaningSurface | null
  confidenceAllowed: boolean
  createdOpportunity: false
  createdScore: false
  outreachDrafted: false
  providerCalls: 0
  dbWrites: 0
  reasonCode?: ClassificationReasonCode
  gateReasons: string[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nonEmptyStrings(values: readonly string[] | undefined): string[] {
  return (values ?? []).filter(isNonEmptyString)
}

function isApprovedSignalLabel(
  value: string,
): value is CommercialCleaningSignalLabel {
  return APPROVED_COMMERCIAL_CLEANING_SIGNAL_LABELS.includes(
    value as CommercialCleaningSignalLabel,
  )
}

function isApprovedVerticalFitLabel(
  value: string,
): value is CommercialCleaningVerticalFitLabel {
  return APPROVED_COMMERCIAL_CLEANING_VERTICAL_FIT_LABELS.includes(
    value as CommercialCleaningVerticalFitLabel,
  )
}

function isApprovedFallbackState(
  value: string,
): value is CommercialCleaningFallbackState {
  return APPROVED_COMMERCIAL_CLEANING_FALLBACK_STATES.includes(
    value as CommercialCleaningFallbackState,
  )
}

function isApprovedSurface(value: string): value is CommercialCleaningSurface {
  return APPROVED_COMMERCIAL_CLEANING_SURFACES.includes(
    value as CommercialCleaningSurface,
  )
}

function isApprovedFreshnessLabel(value: string): boolean {
  return (
    value === 'Just now' ||
    value === 'Yesterday' ||
    value === 'Expiring soon' ||
    /^\d+h ago$/.test(value) ||
    /^\d+d ago$/.test(value) ||
    /^\d+w ago$/.test(value)
  )
}

function fail(
  input: CommercialCleaningClassificationInput,
  reasonCode: ClassificationReasonCode,
  gateReasons: string[],
): ClassificationResult {
  return {
    ok: false,
    verticalId: input.verticalId,
    signalLabel: null,
    verticalFitLabel: null,
    freshnessLabel: null,
    fallbackState: null,
    opportunitySurface: null,
    confidenceAllowed: false,
    createdOpportunity: false,
    createdScore: false,
    outreachDrafted: false,
    providerCalls: 0,
    dbWrites: 0,
    reasonCode,
    gateReasons,
  }
}

function hasActionEvidence(
  input: CommercialCleaningClassificationInput,
): boolean {
  return (
    nonEmptyStrings(input.evidenceSourceUrls).length > 0 &&
    nonEmptyStrings(input.whyNowReasons).length > 0
  )
}

export function classifyCommercialCleaningSignal(
  input: CommercialCleaningClassificationInput,
): ClassificationResult {
  if (input.verticalId !== COMMERCIAL_CLEANING_VERTICAL_ID) {
    return fail(input, 'invalid_vertical', [
      'Commercial Cleaning classification accepts only verticalId "commercial_cleaning".',
    ])
  }

  if (!isApprovedSignalLabel(input.proposedSignalLabel)) {
    return fail(input, 'unapproved_signal_label', [
      `Signal label "${input.proposedSignalLabel}" is not approved for Commercial Cleaning.`,
    ])
  }

  if (!isApprovedVerticalFitLabel(input.proposedVerticalFitLabel)) {
    return fail(input, 'unapproved_vertical_fit_label', [
      `Vertical-fit label "${input.proposedVerticalFitLabel}" is not approved for Commercial Cleaning.`,
    ])
  }

  if (
    isNonEmptyString(input.proposedFreshnessLabel) &&
    !isApprovedFreshnessLabel(input.proposedFreshnessLabel)
  ) {
    return fail(input, 'unapproved_freshness_label', [
      `Freshness label "${input.proposedFreshnessLabel}" is not an approved taxonomy/playbook format.`,
    ])
  }

  if (
    isNonEmptyString(input.proposedFallbackState) &&
    !isApprovedFallbackState(input.proposedFallbackState)
  ) {
    return fail(input, 'unapproved_fallback_state', [
      `Fallback state "${input.proposedFallbackState}" is not approved.`,
    ])
  }

  if (
    isNonEmptyString(input.proposedSurface) &&
    !isApprovedSurface(input.proposedSurface)
  ) {
    return fail(input, 'unapproved_surface', [
      `Opportunity surface "${input.proposedSurface}" is not approved.`,
    ])
  }

  const opportunitySurface = isNonEmptyString(input.proposedSurface)
    ? input.proposedSurface
    : 'default'

  if (opportunitySurface === 'urgent_action' && !hasActionEvidence(input)) {
    return fail(input, 'urgent_surface_missing_action_evidence', [
      'urgent_action surface requires evidence source URLs and why-now reasons.',
    ])
  }

  if (
    !isNonEmptyString(input.evidenceSummary) &&
    !isNonEmptyString(input.proposedFallbackState)
  ) {
    return fail(input, 'missing_evidence', [
      'Confident Commercial Cleaning classification requires evidence summary unless an approved fallback state is present.',
    ])
  }

  if (!isNonEmptyString(input.rawSignalId)) {
    return fail(input, 'missing_classification_reason', [
      'Classification contract requires a raw signal identifier for replay.',
    ])
  }

  return {
    ok: true,
    verticalId: input.verticalId,
    signalLabel: input.proposedSignalLabel,
    verticalFitLabel: input.proposedVerticalFitLabel,
    freshnessLabel: input.proposedFreshnessLabel ?? null,
    fallbackState: input.proposedFallbackState ?? null,
    opportunitySurface,
    confidenceAllowed: !isNonEmptyString(input.proposedFallbackState),
    createdOpportunity: false,
    createdScore: false,
    outreachDrafted: false,
    providerCalls: 0,
    dbWrites: 0,
    gateReasons: [
      'Vertical id is commercial_cleaning.',
      'Signal label is approved by the Commercial Cleaning playbook.',
      'Vertical-fit label is approved by the Commercial Cleaning playbook.',
      'Fallback state, surface, and freshness label are approved when present.',
      'Classification remains inert: no score, opportunity, outreach, provider call, DB write, route, or UI is created.',
    ],
  }
}
