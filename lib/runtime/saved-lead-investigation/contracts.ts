/**
 * CP26C.2A renderer-neutral saved-lead investigation contracts.
 *
 * Semantic data only: no provider, model, database, or rendering work.
 */

export const IDENTITY_MATCH_KEYS = [
  'domain',
  'phone',
  'address',
  'name',
  'locality',
] as const
export type IdentityMatchKey = (typeof IDENTITY_MATCH_KEYS)[number]

export const IDENTITY_RESOLUTION_STATES = [
  'resolved',
  'ambiguous',
  'unresolved',
] as const
export type IdentityResolutionState = (typeof IDENTITY_RESOLUTION_STATES)[number]

export const INVESTIGATION_PHASES = [
  'resolving_identity',
  'checking_structured_sources',
  'searching_entity_domain',
  'searching_public_web',
  'reading_sources',
  'validating_evidence',
  'completed',
] as const
export type InvestigationPhase = (typeof INVESTIGATION_PHASES)[number]

export const INVESTIGATION_ATTEMPT_STATUSES = [
  'created',
  'running',
  'completed',
  'failed',
] as const
export type InvestigationAttemptStatus =
  (typeof INVESTIGATION_ATTEMPT_STATUSES)[number]

export const TRIGGER_STATES = ['signal_found', 'no_signal'] as const
export type TriggerState = (typeof TRIGGER_STATES)[number]

export const NO_SIGNAL_REASON_CODES = [
  'none_found',
  'identity_ambiguous',
  'identity_unresolved',
  'insufficient_evidence',
] as const
export type NoSignalReasonCode = (typeof NO_SIGNAL_REASON_CODES)[number]

export const SAVED_LEAD_PROFILE_FACT_KEYS = [
  'official_name',
  'business_category',
  'domain',
  'phone',
  'email',
  'street_address',
  'ownership_or_management',
  'facility_or_property_type',
  'service_area',
  'opening_or_founded_date',
  'license_or_permit_reference',
  'permit_history',
  'latest_permit_date',
  'project_or_expansion_context',
  'careers_or_hiring_context',
] as const
export type SavedLeadProfileFactKey =
  (typeof SAVED_LEAD_PROFILE_FACT_KEYS)[number]

export const INVESTIGATION_EVIDENCE_SOURCE_KINDS = [
  'structured',
  'entity_domain',
  'indexed_web',
] as const
export type InvestigationEvidenceSourceKind =
  (typeof INVESTIGATION_EVIDENCE_SOURCE_KINDS)[number]

export const INVESTIGATION_USAGE_CATEGORIES = [
  'structuredCalls',
  'serpApiCalls',
  'hydrationPages',
  'interpretationCalls',
] as const
export type InvestigationUsageCategory =
  (typeof INVESTIGATION_USAGE_CATEGORIES)[number]

export const STRUCTURED_SOURCE_CLASSES = [
  'building_and_trade_permits',
  'business_licenses_and_registrations',
  'health_fire_safety_inspections',
  'property_assessor_and_sales',
  'procurement_bids_and_capital_plans',
  'warn_closures_and_official_hiring',
  'official_storm_and_hail_events',
] as const
export type StructuredSourceClass = (typeof STRUCTURED_SOURCE_CLASSES)[number]

export const STRUCTURED_SOURCE_FORMATS = [
  'arcgis_feature_service',
  'socrata_dataset',
  'source_specific_api',
] as const
export type StructuredSourceFormat = (typeof STRUCTURED_SOURCE_FORMATS)[number]

export const SOURCE_AVAILABILITIES = [
  'available',
  'unavailable',
  'unsupported',
  'not_applicable',
] as const
export type SourceAvailability = (typeof SOURCE_AVAILABILITIES)[number]

export const SOURCE_CHECK_STATES = [
  'planned',
  'checked',
  'failed',
  'skipped_budget',
  'not_checked',
] as const
export type SourceCheckState = (typeof SOURCE_CHECK_STATES)[number]

export type SourceTier = 1 | 2 | 3
export type StructuredEvidenceScalar = string | number | boolean | null

export interface StructuredSourceTerritory {
  country: string
  state: string
  city?: string
  jurisdictionLabel: string
}

export interface StructuredPermitRecord {
  permitNumber: string
  issuedAt: string | null
  enteredAt: string | null
  calculatedAddress: string | null
  freeFormAddress: string | null
  recordCategory: string | null
  typeOfWork: string | null
  structureType: string | null
  workDescription: string | null
  valuation: number | null
  squareFootage: number | null
  numberOfUnits: number | null
  owner: string | null
  applicant: string | null
  contractor: string | null
  stableExternalId: string
}

export const STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID =
  'structured_permit_record_v1' as const
export const STRUCTURED_PERMIT_EVIDENCE_FIELDS = [
  'permitNumber',
  'issuedAt',
  'enteredAt',
  'calculatedAddress',
  'freeFormAddress',
  'recordCategory',
  'typeOfWork',
  'structureType',
  'workDescription',
  'valuation',
  'squareFootage',
  'numberOfUnits',
  'owner',
  'applicant',
  'contractor',
  'stableExternalId',
] as const satisfies readonly (keyof StructuredPermitRecord)[]
export type StructuredPermitEvidenceField =
  (typeof STRUCTURED_PERMIT_EVIDENCE_FIELDS)[number]

export const STRUCTURED_SOURCE_PUBLIC_METADATA_FIELDS = [
  'permitNumber',
  'recordCategory',
  'typeOfWork',
  'structureType',
  'valuation',
  'squareFootage',
  'numberOfUnits',
] as const satisfies readonly StructuredPermitEvidenceField[]
export type StructuredSourcePublicMetadataField =
  (typeof STRUCTURED_SOURCE_PUBLIC_METADATA_FIELDS)[number]

export interface ApprovedStructuredEvidenceSnapshot {
  schemaId: typeof STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID
  fields: Readonly<
    Partial<Record<StructuredPermitEvidenceField, StructuredEvidenceScalar>>
  >
}

export type StructuredSourcePublicMetadata = Readonly<
  Partial<Record<StructuredSourcePublicMetadataField, StructuredEvidenceScalar>>
>

export interface IdentityResolution {
  state: IdentityResolutionState
  confidence: number
  matchedOn: IdentityMatchKey[]
  conflicts: string[]
  reasonCodes: string[]
  evaluatedAt: string
}

export interface SavedLeadIdentity {
  domain?: string | null
  phone?: string | null
  address?: string | null
  name?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
}

export interface SavedLeadInvestigationRunSnapshot {
  id: string
  status: InvestigationAttemptStatus
  currentPhase: InvestigationPhase
  heartbeatAt: string | null
  updatedAt: string
  failureCode: string | null
  failureRetryable: boolean
  dailyUsageCounted: boolean
  latestSuccessfulRunId: string | null
}

export interface SavedLeadProfileConflict {
  groupId: string
  reasonCodes: string[]
}

export interface SavedLeadProfileFinding {
  id: string
  factKey: SavedLeadProfileFactKey
  value: string
  investigationSourceId: string
  evidenceSourceId: string
  exactExcerpt?: string
  structuredEvidenceSnapshot?: ApprovedStructuredEvidenceSnapshot
  observedAt: string
  eventDate?: string
  identityMatch: {
    matchedOn: IdentityMatchKey[]
    reasonCodes: string[]
  }
  conflict?: SavedLeadProfileConflict
}

export interface SavedLeadSignalFinding {
  id: string
  approvedSignalFamilyId: string
  approvedSignalLabelId: string
  investigationSourceId: string
  evidenceSourceId: string
  exactExcerpt?: string
  structuredEvidenceSnapshot?: ApprovedStructuredEvidenceSnapshot
  eventDate: string
  freshnessEndsAt: string
  identityMatchReasonCodes: string[]
  qualificationReasonCodes: string[]
}

export type TriggerResult =
  | { state: 'signal_found'; finding: SavedLeadSignalFinding }
  | { state: 'no_signal'; reasonCode: NoSignalReasonCode }

export interface InvestigationUsageSnapshot {
  structuredCalls: number
  serpApiCalls: number
  hydrationPages: number
  interpretationCalls: number
  totalProviderEquivalents: number
  providerRequestCounts: Readonly<Record<string, number>>
  providerReportedCredits: Readonly<Record<string, number>>
}

export interface ProfileReport {
  findings: SavedLeadProfileFinding[]
  sourcesChecked: number
  structuredSourcesChecked: number
  webQueriesRun: number
  hydratedSources: number
  categoryIdsChecked: string[]
  unavailableSourceKeys: string[]
  checkedSourceKeys: string[]
  usage: InvestigationUsageSnapshot
  expiresAt: string
}

export interface CompletedSignalCheck {
  status: 'completed'
  savedLeadId: string
  runId: string
  checkedAt: string
  identity: IdentityResolution
  trigger: TriggerResult
  profileReport: ProfileReport
  recheckEligibleAt: string
  resultExpiresAt: string
}
