/**
 * CP8 - Prospect mining contract proof.
 *
 * Deterministic structural contracts only. Prospect mining can produce
 * evidence-backed prospects for a Prospect Pool, but it cannot produce
 * signal-backed opportunities, urgency claims, scores, outreach, provider
 * calls, DB writes, CRM sync, or route/UI changes.
 */

export type LeadKind =
  | 'signal_backed_opportunity'
  | 'evidence_backed_prospect'
  | 'exploratory_prospect'

export type ProspectLeadKind = Extract<
  LeadKind,
  'evidence_backed_prospect' | 'exploratory_prospect'
>

export type SourceEvidenceType =
  | 'permit'
  | 'maps_listing'
  | 'directory'
  | 'company_website'
  | 'news'
  | 'job_posting'
  | 'review'
  | 'database'
  | 'property_portfolio'

export interface ProspectMiningInput {
  workspaceId: string
  vertical: string
  location: {
    city: string
    state: string
    county?: string
  }
  sourceTypes: SourceEvidenceType[]
  targetAccountCriteria: string[]
  runMode: 'manual_smoke' | 'scheduled_prospect_mining' | 'admin_review'
}

export interface ProspectEvidencePacket {
  leadKind: ProspectLeadKind
  sourceType: SourceEvidenceType
  sourceUrl?: string
  sourceName?: string
  fetchedAt: string
  accessNotes: string
  businessName?: string
  location?: {
    address?: string
    city?: string
    state?: string
  }
  evidenceSummary: string
  fitReasons: string[]
  contactRouteHints?: string[]
  rawProviderMetadata?: unknown
}

export interface ProspectMiningOutput {
  leadKind: ProspectLeadKind
  evidencePackets: ProspectEvidencePacket[]
  validationResults: ProspectEvidencePacketValidationResult[]
  prospectPoolNotes: string[]
  createdOpportunities: 0
  opportunityStatuses: []
  opportunityUrgencyScores: []
  outreachDrafts: []
  crmSyncs: []
}

export type ProspectEvidenceValidationReasonCode =
  | 'invalid_lead_kind'
  | 'missing_source'
  | 'missing_access_notes'
  | 'blocked_opportunity_field'
  | 'blocked_urgency_language'

interface ProspectEvidencePacketValidationBase {
  packet: ProspectEvidencePacket
  reasons: string[]
  readyForProspectPool: boolean
  createdOpportunity: false
  opportunityStatus: null
  opportunityUrgencyScore: null
  coralUrgentSurface: false
  outreachDrafted: false
  crmSynced: false
}

export interface ProspectEvidencePacketValidationPass
  extends ProspectEvidencePacketValidationBase {
  ok: true
  leadKind: ProspectLeadKind
  readyForProspectPool: true
}

export interface ProspectEvidencePacketValidationFail
  extends ProspectEvidencePacketValidationBase {
  ok: false
  reasonCode: ProspectEvidenceValidationReasonCode
  readyForProspectPool: false
}

export type ProspectEvidencePacketValidationResult =
  | ProspectEvidencePacketValidationPass
  | ProspectEvidencePacketValidationFail

const BLOCKED_OPPORTUNITY_FIELDS = [
  'opportunityId',
  'opportunityStatus',
  'qualifiedOpportunity',
  'score',
  'scoreReasons',
  'urgencyScore',
  'opportunityUrgencyScore',
  'whyNow',
  'recommendedAction',
  'outreachDraft',
  'coralUrgentSurface',
] as const

const URGENCY_LANGUAGE_PATTERNS = [
  /\bwhy[-\s]?now\b/i,
  /\burgent\b/i,
  /\burgency\b/i,
  /\bneeds?\s+this\s+week\b/i,
  /\bthis\s+week\b/i,
  /\bimmediate\b/i,
  /\bhot\s+opportunity\b/i,
  /\bcoral\s+urgent\b/i,
]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function fail(
  packet: ProspectEvidencePacket,
  reasonCode: ProspectEvidenceValidationReasonCode,
  reasons: string[],
): ProspectEvidencePacketValidationFail {
  return {
    ok: false,
    packet,
    reasonCode,
    reasons,
    readyForProspectPool: false,
    createdOpportunity: false,
    opportunityStatus: null,
    opportunityUrgencyScore: null,
    coralUrgentSurface: false,
    outreachDrafted: false,
    crmSynced: false,
  }
}

function hasBlockedOpportunityField(packet: ProspectEvidencePacket): string | null {
  const record = packet as unknown as Record<string, unknown>

  for (const field of BLOCKED_OPPORTUNITY_FIELDS) {
    if (field in record && record[field] !== undefined && record[field] !== null) {
      return field
    }
  }

  return null
}

function hasUrgencyLanguage(packet: ProspectEvidencePacket): boolean {
  const text = [
    packet.evidenceSummary,
    ...packet.fitReasons,
    ...(packet.contactRouteHints ?? []),
  ].join(' ')

  return URGENCY_LANGUAGE_PATTERNS.some((pattern) => pattern.test(text))
}

export function validateProspectEvidencePacket(
  packet: ProspectEvidencePacket,
): ProspectEvidencePacketValidationResult {
  if (
    packet.leadKind !== 'evidence_backed_prospect' &&
    packet.leadKind !== 'exploratory_prospect'
  ) {
    return fail(packet, 'invalid_lead_kind', [
      'Prospect mining output cannot be a signal-backed opportunity.',
    ])
  }

  if (!isNonEmptyString(packet.sourceUrl) && !isNonEmptyString(packet.sourceName)) {
    return fail(packet, 'missing_source', [
      'Prospect evidence packet must include a source URL or source name.',
    ])
  }

  if (!isNonEmptyString(packet.accessNotes)) {
    return fail(packet, 'missing_access_notes', [
      'Prospect evidence packet must explain how the source was accessed.',
    ])
  }

  const blockedOpportunityField = hasBlockedOpportunityField(packet)

  if (blockedOpportunityField) {
    return fail(packet, 'blocked_opportunity_field', [
      `Prospect evidence packet includes opportunity-only field "${blockedOpportunityField}".`,
    ])
  }

  if (hasUrgencyLanguage(packet)) {
    return fail(packet, 'blocked_urgency_language', [
      'Prospect evidence packet cannot claim urgency without a signal.',
    ])
  }

  return {
    ok: true,
    packet,
    leadKind: packet.leadKind,
    reasons: [
      'Lead kind is prospect-only.',
      'Source evidence is present.',
      'Access notes are present.',
      'No urgency language or opportunity-only fields are present.',
    ],
    readyForProspectPool: true,
    createdOpportunity: false,
    opportunityStatus: null,
    opportunityUrgencyScore: null,
    coralUrgentSurface: false,
    outreachDrafted: false,
    crmSynced: false,
  }
}
