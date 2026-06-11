/**
 * CP15 - Commercial Roofing classification contract proof.
 *
 * Deterministic guardrail only. It validates proposed UI-visible labels
 * against the approved Commercial Roofing playbook/taxonomy values. It does
 * not classify with a model, compute scores, create opportunities, draft
 * outreach, call providers, write DB records, or affect routes/UI.
 */

export const COMMERCIAL_ROOFING_VERTICAL_ID = 'commercial_roofing' as const

export const APPROVED_COMMERCIAL_ROOFING_SIGNAL_LABELS = [
  'REROOF PERMIT',
  'ROOF REPAIR PERMIT',
  'PUBLIC BID',
  'CAPITAL IMPROVEMENT',
  'STORM EXPOSURE',
  'LEAK REPORTED',
  'TENANT IMPROVEMENT',
  'OWNERSHIP CHANGE',
  'MANAGER CHANGE',
  'CODE NOTICE',
  'RESTORATION',
] as const

export const APPROVED_COMMERCIAL_ROOFING_VERTICAL_FIT_LABELS = [
  'Commercial Roof',
  'Roof Replacement',
  'Roof Repair',
  'Flat Roof',
  'Membrane Roof',
  'TPO',
  'EPDM',
  'PVC',
  'Metal Roof',
  'Roof Coating',
  'Roof Maintenance',
  'Property Portfolio',
  'Facility Roof',
  'Storm Inspection',
  'Insurance Restoration',
  'Drainage / Gutters',
] as const

export const APPROVED_COMMERCIAL_ROOFING_FALLBACK_STATES = [
  'needs_review',
  'weak_fit',
  'missing_evidence',
  'exploratory',
  'discarded',
] as const

export const APPROVED_COMMERCIAL_ROOFING_SURFACES = [
  'urgent_action',
  'default',
  'pipeline',
  'history',
  'preview',
  'formal_record',
  'fallback',
] as const

export type CommercialRoofingSignalLabel =
  (typeof APPROVED_COMMERCIAL_ROOFING_SIGNAL_LABELS)[number]

export type CommercialRoofingVerticalFitLabel =
  (typeof APPROVED_COMMERCIAL_ROOFING_VERTICAL_FIT_LABELS)[number]

export type CommercialRoofingFallbackState =
  (typeof APPROVED_COMMERCIAL_ROOFING_FALLBACK_STATES)[number]

export type CommercialRoofingSurface =
  (typeof APPROVED_COMMERCIAL_ROOFING_SURFACES)[number]

export type CommercialRoofingClassificationReasonCode =
  | 'invalid_vertical'
  | 'unapproved_signal_label'
  | 'unapproved_vertical_fit_label'
  | 'unapproved_fallback_state'
  | 'unapproved_surface'
  | 'urgent_surface_missing_action_evidence'
  | 'missing_evidence'
  | 'missing_classification_reason'
  | 'weather_damage_certainty_without_corroboration'
  | 'contractor_as_buyer_candidate'
  | 'unsupported_urgency_claim'
  | 'unsupported_procurement_bypass_claim'
  | 'unsourced_decision_maker_claim'

export interface CommercialRoofingClassificationInput {
  verticalId: string
  rawSignalId: string
  proposedSignalLabels: string[]
  proposedVerticalFitLabels: string[]
  proposedFallbackState?: string
  proposedSurface?: string
  evidenceSummary?: string
  evidenceSourceUrls?: string[]
  classificationReason?: string
  urgentActionEvidence?: string[]
  corroboratingEvidenceSourceUrls?: string[]
  buyerAccountType?: string
  routeConfidence?: 'high' | 'medium' | 'low' | 'generic' | 'missing'
  claimsRoofDamageFromWeather?: boolean
  contractorAsBuyerCandidate?: boolean
  unsupportedUrgencyClaims?: string[]
  unsupportedProcurementBypassClaim?: boolean
  unsourcedDecisionMakerClaim?: boolean
}

export interface CommercialRoofingClassificationResult {
  ok: boolean
  verticalId: string
  signalLabels: CommercialRoofingSignalLabel[]
  verticalFitLabels: CommercialRoofingVerticalFitLabel[]
  fallbackState: CommercialRoofingFallbackState | null
  opportunitySurface: CommercialRoofingSurface | null
  confidenceAllowed: boolean
  createdOpportunity: false
  createdScore: false
  outreachDrafted: false
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  reasonCode?: CommercialRoofingClassificationReasonCode
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
): value is CommercialRoofingSignalLabel {
  return APPROVED_COMMERCIAL_ROOFING_SIGNAL_LABELS.includes(
    value as CommercialRoofingSignalLabel,
  )
}

function isApprovedVerticalFitLabel(
  value: string,
): value is CommercialRoofingVerticalFitLabel {
  return APPROVED_COMMERCIAL_ROOFING_VERTICAL_FIT_LABELS.includes(
    value as CommercialRoofingVerticalFitLabel,
  )
}

function isApprovedFallbackState(
  value: string,
): value is CommercialRoofingFallbackState {
  return APPROVED_COMMERCIAL_ROOFING_FALLBACK_STATES.includes(
    value as CommercialRoofingFallbackState,
  )
}

function isApprovedSurface(value: string): value is CommercialRoofingSurface {
  return APPROVED_COMMERCIAL_ROOFING_SURFACES.includes(
    value as CommercialRoofingSurface,
  )
}

function fail(
  input: CommercialRoofingClassificationInput,
  reasonCode: CommercialRoofingClassificationReasonCode,
  gateReasons: string[],
): CommercialRoofingClassificationResult {
  return {
    ok: false,
    verticalId: input.verticalId,
    signalLabels: [],
    verticalFitLabels: [],
    fallbackState: null,
    opportunitySurface: null,
    confidenceAllowed: false,
    createdOpportunity: false,
    createdScore: false,
    outreachDrafted: false,
    providerCalls: 0,
    dbWrites: 0,
    routesChanged: 0,
    reasonCode,
    gateReasons,
  }
}

function hasEvidence(input: CommercialRoofingClassificationInput): boolean {
  return (
    isNonEmptyString(input.evidenceSummary) &&
    nonEmptyStrings(input.evidenceSourceUrls).length > 0
  )
}

function hasUrgentActionEvidence(
  input: CommercialRoofingClassificationInput,
): boolean {
  return nonEmptyStrings(input.urgentActionEvidence).length > 0
}

function hasCorroboration(
  input: CommercialRoofingClassificationInput,
): boolean {
  return nonEmptyStrings(input.corroboratingEvidenceSourceUrls).length > 0
}

export function classifyCommercialRoofingCandidate(
  input: CommercialRoofingClassificationInput,
): CommercialRoofingClassificationResult {
  if (input.verticalId !== COMMERCIAL_ROOFING_VERTICAL_ID) {
    return fail(input, 'invalid_vertical', [
      'Commercial Roofing classification accepts only verticalId "commercial_roofing".',
    ])
  }

  const signalLabels: CommercialRoofingSignalLabel[] = []
  const verticalFitLabels: CommercialRoofingVerticalFitLabel[] = []

  for (const label of nonEmptyStrings(input.proposedSignalLabels)) {
    if (!isApprovedSignalLabel(label)) {
      return fail(input, 'unapproved_signal_label', [
        `Signal label "${label}" is not approved for Commercial Roofing.`,
      ])
    }

    signalLabels.push(label)
  }

  for (const label of nonEmptyStrings(input.proposedVerticalFitLabels)) {
    if (!isApprovedVerticalFitLabel(label)) {
      return fail(input, 'unapproved_vertical_fit_label', [
        `Vertical-fit label "${label}" is not approved for Commercial Roofing.`,
      ])
    }

    verticalFitLabels.push(label)
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

  if (opportunitySurface === 'urgent_action' && !hasUrgentActionEvidence(input)) {
    return fail(input, 'urgent_surface_missing_action_evidence', [
      'urgent_action surface requires source-linked urgent-action evidence.',
    ])
  }

  if (!hasEvidence(input)) {
    return fail(input, 'missing_evidence', [
      'Confident Commercial Roofing classification requires an evidence summary and source URL.',
    ])
  }

  if (!isNonEmptyString(input.classificationReason)) {
    return fail(input, 'missing_classification_reason', [
      'Classification contract requires a source-readable classification reason.',
    ])
  }

  if (!isNonEmptyString(input.rawSignalId)) {
    return fail(input, 'missing_classification_reason', [
      'Classification contract requires a raw signal identifier for replay.',
    ])
  }

  if (input.contractorAsBuyerCandidate === true) {
    return fail(input, 'contractor_as_buyer_candidate', [
      'Roofing contractor/applicant context is not a buyer account by default.',
    ])
  }

  if (input.claimsRoofDamageFromWeather === true && !hasCorroboration(input)) {
    return fail(input, 'weather_damage_certainty_without_corroboration', [
      'Storm exposure may support watchlist context, but weather alone cannot claim roof damage.',
    ])
  }

  if (nonEmptyStrings(input.unsupportedUrgencyClaims).length > 0) {
    return fail(input, 'unsupported_urgency_claim', [
      'Commercial Roofing classification blocks unsupported urgency claims.',
    ])
  }

  if (input.unsupportedProcurementBypassClaim === true) {
    return fail(input, 'unsupported_procurement_bypass_claim', [
      'Public-sector opportunities must route through the published procurement path.',
    ])
  }

  if (input.unsourcedDecisionMakerClaim === true) {
    return fail(input, 'unsourced_decision_maker_claim', [
      'Decision-maker identity or authority must be source-linked.',
    ])
  }

  const fallbackState = isNonEmptyString(input.proposedFallbackState)
    ? input.proposedFallbackState
    : null

  return {
    ok: true,
    verticalId: input.verticalId,
    signalLabels,
    verticalFitLabels,
    fallbackState,
    opportunitySurface,
    confidenceAllowed: fallbackState === null,
    createdOpportunity: false,
    createdScore: false,
    outreachDrafted: false,
    providerCalls: 0,
    dbWrites: 0,
    routesChanged: 0,
    gateReasons: [
      'Vertical id is commercial_roofing.',
      'Signal labels are approved by the Commercial Roofing playbook.',
      'Vertical-fit labels are approved by the Commercial Roofing playbook.',
      'Fallback state and surface are approved when present.',
      'Evidence and classification reason are source-readable.',
      'Classification remains inert: no score, opportunity, outreach, provider call, DB write, route, or UI is created.',
    ],
  }
}
