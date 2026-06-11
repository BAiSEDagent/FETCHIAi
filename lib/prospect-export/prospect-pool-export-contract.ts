/**
 * CP14 - Prospect Pool export contract proof.
 *
 * Deterministic contract seam only. Prospect Pool export can shape prospects as
 * buyer-account worklist rows, but it cannot create opportunities, urgency
 * claims, CRM sync, CSV files, provider calls, DB writes, routes, UI, billing,
 * or outreach.
 */

export type ProspectExportStatus =
  | 'export_ready_prospect'
  | 'needs_review'
  | 'not_exportable'

export type ProspectLeadKind =
  | 'evidence_backed_prospect'
  | 'exploratory_prospect'
  | 'signal_backed_opportunity'

export type ProspectExportBlockReason =
  | 'signal_backed_opportunity_not_exportable'
  | 'missing_evidence'
  | 'missing_label'
  | 'missing_fit_reason'
  | 'missing_confidence'
  | 'missing_contact_route_context'
  | 'missing_lineage'
  | 'missing_not_opportunity_yet_reason'
  | 'missing_blocked_claims'
  | 'unsupported_urgency_claim'
  | 'unsupported_decision_maker_claim'
  | 'discarded_fallback'
  | 'weak_fit_fallback'
  | 'opportunity_only_field'
  | 'weak_or_generic_contact_route'

export type ProspectContactRouteStrength = 'strong' | 'moderate' | 'weak' | 'generic'

export type ProspectFallbackState =
  | 'needs_review'
  | 'weak_fit'
  | 'missing_evidence'
  | 'exploratory'
  | 'discarded'

export interface ProspectContactRouteContext {
  routeType:
    | 'company_website'
    | 'directory'
    | 'maps_listing'
    | 'public_phone'
    | 'public_email'
    | 'property_manager_page'
    | 'generic_research_needed'
  summary: string
  strength: ProspectContactRouteStrength
  sourceUrls?: string[]
}

export interface ProspectExportClaims {
  urgency?: string
  needsThisWeek?: boolean
  activeBuyingIntent?: boolean
  decisionMakerIdentity?: string
  decisionMakerSourceUrl?: string
  decisionMakerSourced?: boolean
}

export interface ProspectExportLineage {
  sourceUrls: string[]
  providerRunIds?: string[]
  sourceNames?: string[]
}

export interface ProspectPoolExportCandidate {
  leadKind: ProspectLeadKind
  prospectLabel?: string
  accountName?: string
  evidenceSummary?: string
  fitReasons?: string[]
  confidence?: number
  contactRouteContext?: ProspectContactRouteContext
  blockedClaims?: string[]
  lineage?: ProspectExportLineage
  notOpportunityYetReason?: string
  fallbackState?: ProspectFallbackState
  claims?: ProspectExportClaims
  requestedExportFields?: string[]
}

export interface ProspectPoolExportFields {
  lead_kind: ProspectLeadKind
  export_status: Exclude<ProspectExportStatus, 'not_exportable'>
  prospect_label: string
  account_name: string | null
  evidence_summary: string
  fit_reasons: string[]
  confidence: number
  contact_route_context: string
  blocked_claims: string[]
  lineage_source_urls: string[]
  not_opportunity_yet_reason: string
}

export interface ProspectPoolCrmReadyMapping {
  crm_object_intent: 'buyer_account_worklist'
  lead_kind: ProspectLeadKind
  export_status: Exclude<ProspectExportStatus, 'not_exportable'>
  account_name: string | null
  prospect_label: string
  evidence_summary: string
  fit_reasons: string[]
  confidence: number
  contact_route_context: string
  blocked_claims: string[]
  lineage_source_urls: string[]
  opportunity_stage: null
  opportunity_urgency_score: null
}

export interface ProspectPoolExportDecision {
  status: ProspectExportStatus
  leadKind: ProspectLeadKind
  blockReasons: ProspectExportBlockReason[]
  gateReasons: string[]
  requiredFieldsPresent: boolean
  exportFields: ProspectPoolExportFields | null
  crmReadyMapping: ProspectPoolCrmReadyMapping | null
  createdOpportunity: false
  opportunityUrgencyScore: null
  urgentActionSurface: null
  csvGenerated: false
  sheetsSynced: false
  crmSynced: false
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
  outreachDrafted: false
}

const OPPORTUNITY_ONLY_FIELD_NAMES = [
  'opportunityUrgencyScore',
  'opportunity_urgency_score',
  'urgencyScore',
  'opportunityScore',
  'urgentActionSurface',
  'urgent_action_surface',
  'opportunitySurface',
  'opportunity_surface',
  'needsThisWeek',
  'needs_this_week',
  'activeBuyingIntent',
  'active_buying_intent',
  'whyNow',
  'why_now',
  'crmOpportunityStage',
  'crm_opportunity_stage',
  'opportunityStage',
  'opportunity_stage',
  'opportunityStatus',
  'opportunity_status',
  'dealStage',
  'deal_stage',
  'closeDate',
  'close_date',
  'outreachDraft',
  'outreach_draft',
] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nonEmptyStrings(values: readonly string[] | undefined): string[] {
  return (values ?? []).filter(isNonEmptyString).map((value) => value.trim())
}

function normalizedFieldName(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function hasFiniteConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function sourceUrls(candidate: ProspectPoolExportCandidate): string[] {
  return nonEmptyStrings(candidate.lineage?.sourceUrls)
}

function missingRequiredFields(
  candidate: ProspectPoolExportCandidate,
): ProspectExportBlockReason[] {
  const reasons: ProspectExportBlockReason[] = []

  if (!isNonEmptyString(candidate.evidenceSummary)) {
    reasons.push('missing_evidence')
  }

  if (!isNonEmptyString(candidate.prospectLabel)) {
    reasons.push('missing_label')
  }

  if (nonEmptyStrings(candidate.fitReasons).length === 0) {
    reasons.push('missing_fit_reason')
  }

  if (!hasFiniteConfidence(candidate.confidence)) {
    reasons.push('missing_confidence')
  }

  if (!isNonEmptyString(candidate.contactRouteContext?.summary)) {
    reasons.push('missing_contact_route_context')
  }

  if (sourceUrls(candidate).length === 0) {
    reasons.push('missing_lineage')
  }

  if (!isNonEmptyString(candidate.notOpportunityYetReason)) {
    reasons.push('missing_not_opportunity_yet_reason')
  }

  if (nonEmptyStrings(candidate.blockedClaims).length === 0) {
    reasons.push('missing_blocked_claims')
  }

  return reasons
}

function findOpportunityOnlyField(
  candidate: ProspectPoolExportCandidate,
): string | null {
  const record = candidate as unknown as Record<string, unknown>
  const blockedNames = OPPORTUNITY_ONLY_FIELD_NAMES.map(normalizedFieldName)

  for (const fieldName of OPPORTUNITY_ONLY_FIELD_NAMES) {
    if (
      fieldName in record &&
      record[fieldName] !== undefined &&
      record[fieldName] !== null
    ) {
      return fieldName
    }
  }

  for (const requestedField of candidate.requestedExportFields ?? []) {
    if (blockedNames.includes(normalizedFieldName(requestedField))) {
      return requestedField
    }
  }

  return null
}

function hasUnsupportedUrgencyClaim(candidate: ProspectPoolExportCandidate): boolean {
  return (
    isNonEmptyString(candidate.claims?.urgency) ||
    candidate.claims?.needsThisWeek === true ||
    candidate.claims?.activeBuyingIntent === true
  )
}

function hasUnsupportedDecisionMakerClaim(
  candidate: ProspectPoolExportCandidate,
): boolean {
  const identityClaimed = isNonEmptyString(candidate.claims?.decisionMakerIdentity)

  if (!identityClaimed) {
    return false
  }

  return (
    candidate.claims?.decisionMakerSourced !== true ||
    !isNonEmptyString(candidate.claims?.decisionMakerSourceUrl)
  )
}

function hasWeakOrGenericContactRoute(
  candidate: ProspectPoolExportCandidate,
): boolean {
  return (
    candidate.contactRouteContext?.routeType === 'generic_research_needed' ||
    candidate.contactRouteContext?.strength === 'weak' ||
    candidate.contactRouteContext?.strength === 'generic'
  )
}

function buildExportFields(
  candidate: ProspectPoolExportCandidate,
  status: Exclude<ProspectExportStatus, 'not_exportable'>,
): ProspectPoolExportFields {
  return {
    lead_kind: candidate.leadKind,
    export_status: status,
    prospect_label: candidate.prospectLabel?.trim() ?? '',
    account_name: candidate.accountName?.trim() || null,
    evidence_summary: candidate.evidenceSummary?.trim() ?? '',
    fit_reasons: nonEmptyStrings(candidate.fitReasons),
    confidence: candidate.confidence ?? 0,
    contact_route_context: candidate.contactRouteContext?.summary.trim() ?? '',
    blocked_claims: nonEmptyStrings(candidate.blockedClaims),
    lineage_source_urls: sourceUrls(candidate),
    not_opportunity_yet_reason: candidate.notOpportunityYetReason?.trim() ?? '',
  }
}

function buildCrmReadyMapping(
  exportFields: ProspectPoolExportFields,
): ProspectPoolCrmReadyMapping {
  return {
    crm_object_intent: 'buyer_account_worklist',
    lead_kind: exportFields.lead_kind,
    export_status: exportFields.export_status,
    account_name: exportFields.account_name,
    prospect_label: exportFields.prospect_label,
    evidence_summary: exportFields.evidence_summary,
    fit_reasons: exportFields.fit_reasons,
    confidence: exportFields.confidence,
    contact_route_context: exportFields.contact_route_context,
    blocked_claims: exportFields.blocked_claims,
    lineage_source_urls: exportFields.lineage_source_urls,
    opportunity_stage: null,
    opportunity_urgency_score: null,
  }
}

function decision(
  candidate: ProspectPoolExportCandidate,
  status: ProspectExportStatus,
  blockReasons: ProspectExportBlockReason[],
  gateReasons: string[],
): ProspectPoolExportDecision {
  const requiredFieldsPresent = missingRequiredFields(candidate).length === 0
  const exportFields =
    status === 'not_exportable'
      ? null
      : buildExportFields(candidate, status)

  return {
    status,
    leadKind: candidate.leadKind,
    blockReasons,
    gateReasons,
    requiredFieldsPresent,
    exportFields,
    crmReadyMapping: exportFields ? buildCrmReadyMapping(exportFields) : null,
    createdOpportunity: false,
    opportunityUrgencyScore: null,
    urgentActionSurface: null,
    csvGenerated: false,
    sheetsSynced: false,
    crmSynced: false,
    providerCalls: 0,
    dbWrites: 0,
    routesChanged: 0,
    outreachDrafted: false,
  }
}

export function evaluateProspectPoolExport(
  candidate: ProspectPoolExportCandidate,
): ProspectPoolExportDecision {
  if (candidate.leadKind === 'signal_backed_opportunity') {
    return decision(
      candidate,
      'not_exportable',
      ['signal_backed_opportunity_not_exportable'],
      [
        'Signal-backed opportunities are not Prospect Pool exports.',
        'Prospect Pool export cannot turn opportunities into buyer-account worklist rows.',
      ],
    )
  }

  const requiredFieldFailures = missingRequiredFields(candidate)

  if (requiredFieldFailures.length > 0) {
    return decision(candidate, 'not_exportable', requiredFieldFailures, [
      'Prospect Pool export requires evidence, label, fit reason, confidence, contact route context, lineage, blocked claims, and a not-opportunity-yet reason.',
    ])
  }

  if (candidate.fallbackState === 'discarded') {
    return decision(candidate, 'not_exportable', ['discarded_fallback'], [
      'Discarded fallback records are not eligible for Prospect Pool export.',
    ])
  }

  if (candidate.fallbackState === 'weak_fit') {
    return decision(candidate, 'not_exportable', ['weak_fit_fallback'], [
      'Weak-fit fallback records are blocked from Prospect Pool export.',
    ])
  }

  const opportunityOnlyField = findOpportunityOnlyField(candidate)

  if (opportunityOnlyField) {
    return decision(candidate, 'not_exportable', ['opportunity_only_field'], [
      `Prospect Pool export cannot include opportunity-only field "${opportunityOnlyField}".`,
    ])
  }

  if (hasUnsupportedUrgencyClaim(candidate)) {
    return decision(candidate, 'not_exportable', ['unsupported_urgency_claim'], [
      'Prospect Pool export cannot include urgency, needs-this-week, or active buying intent claims.',
    ])
  }

  if (hasUnsupportedDecisionMakerClaim(candidate)) {
    return decision(
      candidate,
      'not_exportable',
      ['unsupported_decision_maker_claim'],
      [
        'Prospect Pool export cannot include an unsourced decision-maker identity claim.',
      ],
    )
  }

  if (
    candidate.leadKind === 'exploratory_prospect' &&
    hasWeakOrGenericContactRoute(candidate)
  ) {
    return decision(candidate, 'needs_review', ['weak_or_generic_contact_route'], [
      'Exploratory prospects with weak or generic contact routes require review before ready export.',
    ])
  }

  return decision(candidate, 'export_ready_prospect', [], [
    'Lead kind is prospect-only.',
    'Required export fields are present.',
    'No opportunity-only fields or unsupported claims are present.',
    'Export shape is buyer-account worklist only and does not create an opportunity.',
  ])
}
