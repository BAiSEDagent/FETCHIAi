/**
 * CP26C.2A deterministic trigger/profile persistence gates.
 */
import {
  INVESTIGATION_EVIDENCE_SOURCE_KINDS,
  SAVED_LEAD_PROFILE_FACT_KEYS,
  STRUCTURED_PERMIT_EVIDENCE_FIELDS,
  STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID,
  STRUCTURED_SOURCE_CLASSES,
  type ApprovedStructuredEvidenceSnapshot,
  type CompletedSignalCheck,
  type IdentityResolution,
  type NoSignalReasonCode,
  type ProfileReport,
  type SavedLeadProfileFactKey,
  type SavedLeadProfileFinding,
  type SavedLeadSignalFinding,
  type SourceTier,
  type StructuredEvidenceScalar,
  type StructuredSourceClass,
  type TriggerResult,
} from '@/lib/runtime/saved-lead-investigation/contracts'
import {
  resolveSavedLeadInvestigationPlaybook,
  type SavedLeadTriggerPolicy,
} from '@/lib/playbooks/saved-lead-investigation-registry'
export type InvestigationGateDecision =
  | { ok: true }
  | { ok: false; reasonCode: string }
export interface InvestigationEvidenceSourceContext {
  investigationSourceId: string
  evidenceSourceId: string
  tier: SourceTier
  kind: (typeof INVESTIGATION_EVIDENCE_SOURCE_KINDS)[number]
  structuredSourceClass?: StructuredSourceClass
  addressAnchored?: boolean
}
export interface ProfileFindingConflictContext {
  existingFindings: readonly SavedLeadProfileFinding[]
}
export interface TriggerCandidateInput {
  findingId: string
  identity: IdentityResolution
  source: InvestigationEvidenceSourceContext
  activePlaybookId: string
  approvedSignalFamilyId: string
  approvedSignalLabelId: string
  recordFamilyId: string
  investigationSourceId: string
  evidenceSourceId: string
  exactExcerpt?: string
  structuredEvidenceSnapshot?: unknown
  eventDate: string
  evaluatedAt: string
  claimGuardPassed: boolean
}
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const APPROVED_STRUCTURED_EVIDENCE_FIELDS = new Set<string>(
  STRUCTURED_PERMIT_EVIDENCE_FIELDS,
)
const APPROVED_PROFILE_FACT_KEYS = new Set<string>(
  SAVED_LEAD_PROFILE_FACT_KEYS,
)
const PERMIT_ONLY_PROFILE_FACT_KEYS = new Set<SavedLeadProfileFactKey>([
  'permit_history',
  'latest_permit_date',
])
const ANCHOR_KEYS = new Set(['domain', 'phone', 'address'])
const DATE_RE =
  /\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/gi
const STRUCTURED_PERMIT_TRIGGER_POLICY_FIELDS = [
  'recordCategory',
  'typeOfWork',
  'structureType',
  'workDescription',
] as const satisfies readonly (keyof ApprovedStructuredEvidenceSnapshot['fields'])[]
const STRUCTURED_PROFILE_FACT_FIELDS: Readonly<
  Partial<Record<SavedLeadProfileFactKey, readonly (keyof ApprovedStructuredEvidenceSnapshot['fields'])[]>>
> = {
  business_category: ['recordCategory'],
  street_address: ['calculatedAddress', 'freeFormAddress'],
  ownership_or_management: ['owner', 'applicant', 'contractor'],
  facility_or_property_type: ['structureType'],
  license_or_permit_reference: ['permitNumber', 'stableExternalId'],
  permit_history: ['permitNumber', 'issuedAt', 'enteredAt', 'recordCategory', 'typeOfWork', 'workDescription'],
  latest_permit_date: ['issuedAt', 'enteredAt'],
  project_or_expansion_context: ['typeOfWork', 'workDescription', 'valuation', 'squareFootage', 'numberOfUnits'],
}
const STRUCTURED_SOURCE_RECORD_FAMILIES: Readonly<Record<StructuredSourceClass, readonly string[]>> = {
  building_and_trade_permits: ['building_permit'],
  business_licenses_and_registrations: ['business_registration'],
  health_fire_safety_inspections: ['health_fire_safety_inspection'],
  property_assessor_and_sales: ['property_assessor_or_sale'],
  procurement_bids_and_capital_plans: ['procurement_bid', 'capital_plan'],
  warn_closures_and_official_hiring: ['warn_closure', 'official_hiring_record'],
  official_storm_and_hail_events: ['official_storm_event'],
}
function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function isStructuredEvidenceScalar(
  value: unknown,
): value is StructuredEvidenceScalar {
  return value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean'
}
function isMeaningfulScalar(value: StructuredEvidenceScalar): boolean {
  return value !== null && (typeof value !== 'string' || value.trim().length > 0)
}
function hasStructuredEvidence(
  snapshot: unknown,
): snapshot is ApprovedStructuredEvidenceSnapshot {
  if (!isRecord(snapshot) || snapshot.schemaId !== STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID || !isRecord(snapshot.fields)) return false
  const fields = Object.entries(snapshot.fields)
  return fields.length > 0 &&
    fields.every(([field, value]) => APPROVED_STRUCTURED_EVIDENCE_FIELDS.has(field) && isStructuredEvidenceScalar(value)) &&
    fields.some(([, value]) => isStructuredEvidenceScalar(value) && isMeaningfulScalar(value))
}
function acceptsPermitStructuredEvidence(
  source: InvestigationEvidenceSourceContext,
): boolean {
  return source.kind === 'structured' &&
    source.structuredSourceClass === 'building_and_trade_permits'
}
function hasEvidence(excerpt: string | undefined, snapshot: unknown): boolean {
  return nonEmpty(excerpt) || hasStructuredEvidence(snapshot)
}
function normalizedEvidenceValue(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}
function normalizedPhoneValue(value: string): string {
  return value.replace(/\D/g, '')
}
function normalizedDomainValue(value: string): string {
  const candidate = value.trim().toLocaleLowerCase('en-US')
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
    return parsed.hostname.replace(/^www\./, '').replace(/\.$/, '')
  } catch {
    return candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/^www\./, '').split(/[/?#\s]/, 1)[0].replace(/\.$/, '')
  }
}
function parsedDateValue(value: string): string | null {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10)
}
function scalarSupportsFindingValue(
  factKey: SavedLeadProfileFactKey,
  findingValue: string,
  evidenceValue: StructuredEvidenceScalar,
): boolean {
  if (!isMeaningfulScalar(evidenceValue)) return false
  const evidenceText = String(evidenceValue)
  if (factKey === 'phone') return normalizedPhoneValue(findingValue).length >= 7 && normalizedPhoneValue(findingValue) === normalizedPhoneValue(evidenceText)
  if (factKey === 'domain') return normalizedDomainValue(findingValue) === normalizedDomainValue(evidenceText)
  if (factKey === 'latest_permit_date' || factKey === 'opening_or_founded_date') {
    return parsedDateValue(findingValue) !== null &&
      parsedDateValue(findingValue) === parsedDateValue(evidenceText)
  }
  const finding = normalizedEvidenceValue(findingValue)
  const evidence = normalizedEvidenceValue(evidenceText)
  return finding.length > 0 && (finding === evidence || ` ${evidence} `.includes(` ${finding} `))
}
function exactExcerptSupportsFinding(finding: SavedLeadProfileFinding): boolean {
  if (!nonEmpty(finding.exactExcerpt)) return false
  const excerpt = finding.exactExcerpt as string
  if (finding.factKey === 'phone') {
    const phone = normalizedPhoneValue(finding.value)
    return phone.length >= 7 &&
      (excerpt.match(/\+?\d[\d().\-\s]{5,}\d/g) ?? []).some((candidate) => normalizedPhoneValue(candidate) === phone)
  }
  if (finding.factKey === 'domain') {
    const domain = normalizedDomainValue(finding.value)
    return domain.length > 0 &&
      (excerpt.match(/(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?/gi) ?? []).some((candidate) => normalizedDomainValue(candidate) === domain)
  }
  if (finding.factKey === 'email') {
    const email = finding.value.trim().toLocaleLowerCase('en-US')
    return email.length > 3 &&
      (excerpt.match(/[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/g) ?? []).some((candidate) => candidate.replace(/[.,;:!?]+$/, '').toLocaleLowerCase('en-US') === email)
  }
  if (finding.factKey === 'latest_permit_date' || finding.factKey === 'opening_or_founded_date') {
    const date = parsedDateValue(finding.value)
    return date !== null && (excerpt.match(DATE_RE) ?? []).some((candidate) => parsedDateValue(candidate) === date)
  }
  const value = normalizedEvidenceValue(finding.value)
  return value.length > 0 && ` ${normalizedEvidenceValue(excerpt)} `.includes(` ${value} `)
}
function structuredSnapshotSupportsFinding(
  finding: SavedLeadProfileFinding,
): boolean {
  if (!hasStructuredEvidence(finding.structuredEvidenceSnapshot)) return false
  return (STRUCTURED_PROFILE_FACT_FIELDS[finding.factKey] ?? []).some((field) => {
    const value = finding.structuredEvidenceSnapshot?.fields[field]
    return value !== undefined &&
      scalarSupportsFindingValue(finding.factKey, finding.value, value)
  })
}
function normalizedFindingValue(finding: SavedLeadProfileFinding): string {
  if (finding.factKey === 'phone') return normalizedPhoneValue(finding.value)
  if (finding.factKey === 'domain') return normalizedDomainValue(finding.value)
  if (finding.factKey === 'latest_permit_date' || finding.factKey === 'opening_or_founded_date') {
    return parsedDateValue(finding.value) ?? normalizedEvidenceValue(finding.value)
  }
  return normalizedEvidenceValue(finding.value)
}
function hasValidConflictMetadata(
  finding: Pick<SavedLeadProfileFinding, 'conflict'>,
): boolean {
  return finding.conflict !== undefined &&
    nonEmpty(finding.conflict.groupId) &&
    finding.conflict.reasonCodes.length > 0 &&
    finding.conflict.reasonCodes.every(nonEmpty)
}
function validateFindingConflicts(
  finding: SavedLeadProfileFinding,
  context: ProfileFindingConflictContext,
): InvestigationGateDecision {
  const normalizedValue = normalizedFindingValue(finding)
  const peers = context.existingFindings.filter((peer) =>
    peer.id !== finding.id &&
    peer.factKey === finding.factKey &&
    normalizedFindingValue(peer) !== normalizedValue)
  if (peers.length === 0) return { ok: true }
  if (!hasValidConflictMetadata(finding)) {
    return { ok: false, reasonCode: 'unacknowledged_fact_conflict' }
  }
  return peers.some((peer) => !hasValidConflictMetadata(peer) || peer.conflict?.groupId !== finding.conflict?.groupId)
    ? { ok: false, reasonCode: 'conflict_group_mismatch' }
    : { ok: true }
}
function validateEvidenceSourceContext(
  source: InvestigationEvidenceSourceContext,
): InvestigationGateDecision {
  const validKind = INVESTIGATION_EVIDENCE_SOURCE_KINDS.includes(source.kind)
  if (!isUuid(source.investigationSourceId) || !isUuid(source.evidenceSourceId)) return { ok: false, reasonCode: 'invalid_source_binding' }
  if (!validKind || !([1, 2, 3] as const).includes(source.tier)) return { ok: false, reasonCode: 'invalid_source_context' }
  if (source.kind === 'structured' && (source.tier !== 1 || source.structuredSourceClass === undefined || !STRUCTURED_SOURCE_CLASSES.includes(source.structuredSourceClass))) {
    return { ok: false, reasonCode: 'invalid_structured_source_context' }
  }
  if (source.kind === 'entity_domain' && (source.tier !== 2 || source.structuredSourceClass !== undefined)) return { ok: false, reasonCode: 'invalid_domain_source_context' }
  if (source.kind === 'indexed_web' && (source.tier !== 3 || source.structuredSourceClass !== undefined)) return { ok: false, reasonCode: 'invalid_indexed_web_source_context' }
  return { ok: true }
}
function validateProfileShape(
  finding: SavedLeadProfileFinding,
  source: InvestigationEvidenceSourceContext,
): InvestigationGateDecision {
  if (!isUuid(finding.id)) return { ok: false, reasonCode: 'invalid_finding_id' }
  if (!APPROVED_PROFILE_FACT_KEYS.has(finding.factKey)) return { ok: false, reasonCode: 'unapproved_fact_key' }
  if (!isUuid(finding.investigationSourceId)) return { ok: false, reasonCode: 'invalid_investigation_source' }
  if (!isUuid(finding.evidenceSourceId)) return { ok: false, reasonCode: 'invalid_evidence_source' }
  if (finding.investigationSourceId.toLocaleLowerCase('en-US') !== source.investigationSourceId.toLocaleLowerCase('en-US') ||
      finding.evidenceSourceId.toLocaleLowerCase('en-US') !== source.evidenceSourceId.toLocaleLowerCase('en-US')) {
    return { ok: false, reasonCode: 'source_artifact_mismatch' }
  }
  if (!nonEmpty(finding.value)) return { ok: false, reasonCode: 'missing_value' }
  if (!nonEmpty(finding.observedAt) || Number.isNaN(Date.parse(finding.observedAt))) return { ok: false, reasonCode: 'invalid_observed_at' }
  if (!finding.identityMatch.matchedOn.some((key) => ANCHOR_KEYS.has(key))) return { ok: false, reasonCode: 'missing_identity_match' }
  if (finding.identityMatch.reasonCodes.length === 0) return { ok: false, reasonCode: 'missing_identity_reason' }
  if (finding.conflict !== undefined && !hasValidConflictMetadata(finding)) return { ok: false, reasonCode: 'invalid_conflict_metadata' }
  return { ok: true }
}
function validateProfileEvidence(
  finding: SavedLeadProfileFinding,
  source: InvestigationEvidenceSourceContext,
): InvestigationGateDecision {
  const permitSource = acceptsPermitStructuredEvidence(source)
  if (finding.structuredEvidenceSnapshot !== undefined &&
      (!permitSource || !hasStructuredEvidence(finding.structuredEvidenceSnapshot))) {
    return { ok: false, reasonCode: 'invalid_structured_evidence' }
  }
  if (!hasEvidence(finding.exactExcerpt, finding.structuredEvidenceSnapshot)) return { ok: false, reasonCode: 'missing_exact_evidence' }
  if (!(permitSource ? structuredSnapshotSupportsFinding(finding) : exactExcerptSupportsFinding(finding) || structuredSnapshotSupportsFinding(finding))) {
    return { ok: false, reasonCode: 'evidence_value_mismatch' }
  }
  if (source.kind === 'entity_domain' && !finding.identityMatch.matchedOn.includes('domain')) return { ok: false, reasonCode: 'domain_identity_anchor_required' }
  if ((permitSource || PERMIT_ONLY_PROFILE_FACT_KEYS.has(finding.factKey)) &&
      (!permitSource || source.addressAnchored !== true || !finding.identityMatch.matchedOn.includes('address') || !hasStructuredEvidence(finding.structuredEvidenceSnapshot))) {
    return { ok: false, reasonCode: 'permit_address_anchor_required' }
  }
  return { ok: true }
}
export function validateProfileFinding(
  finding: SavedLeadProfileFinding,
  source: InvestigationEvidenceSourceContext,
  conflictContext: ProfileFindingConflictContext,
): InvestigationGateDecision {
  const decisions = [
    validateEvidenceSourceContext(source),
    validateProfileShape(finding, source),
    validateProfileEvidence(finding, source),
    validateFindingConflicts(finding, conflictContext),
  ]
  return decisions.find((decision) => !decision.ok) ?? { ok: true }
}
function noSignal(reasonCode: NoSignalReasonCode): TriggerResult {
  return { state: 'no_signal', reasonCode }
}
function normalizedPolicyText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}
function candidateEvidenceText(
  exactExcerpt: string | undefined,
  snapshot: ApprovedStructuredEvidenceSnapshot | undefined,
): string {
  const values = snapshot
    ? STRUCTURED_PERMIT_TRIGGER_POLICY_FIELDS
        .map((field) => snapshot.fields[field])
        .filter((value): value is Exclude<StructuredEvidenceScalar, null | undefined> => value !== null && value !== undefined)
        .map(String)
    : [exactExcerpt ?? '']
  return normalizedPolicyText(values.join(' '))
}
function matchesPolicyKeyword(
  policy: SavedLeadTriggerPolicy,
  evidenceText: string,
): boolean {
  const paddedEvidence = ` ${evidenceText} `
  return policy.recordKeywords.some((keyword) => {
    const normalizedKeyword = normalizedPolicyText(keyword)
    return normalizedKeyword.length > 0 &&
      paddedEvidence.includes(` ${normalizedKeyword} `)
  })
}
function canonicalExcerptEventDate(
  exactExcerpt: string | undefined,
  eventDate: string,
): string | null {
  const eventDay = parsedDateValue(eventDate)
  if (!nonEmpty(exactExcerpt) || eventDay === null) return null
  if (!(exactExcerpt as string).match(DATE_RE)?.some((candidate) => parsedDateValue(candidate) === eventDay)) return null
  const canonical = `${eventDay}T00:00:00.000Z`
  return Date.parse(eventDate) === Date.parse(canonical) ? canonical : null
}
function canonicalStructuredPermitEventDate(
  snapshot: ApprovedStructuredEvidenceSnapshot | undefined,
  eventDate: string,
): string | null {
  const issuedAt = snapshot?.fields.issuedAt
  const eventMs = Date.parse(eventDate)
  const issuedAtMs = typeof issuedAt === 'string' ? Date.parse(issuedAt) : Number.NaN
  return !Number.isNaN(eventMs) && eventMs === issuedAtMs
    ? new Date(issuedAtMs).toISOString()
    : null
}
function canonicalTriggerEventDate(
  input: TriggerCandidateInput,
  snapshot: ApprovedStructuredEvidenceSnapshot | undefined,
): string | null {
  return acceptsPermitStructuredEvidence(input.source)
    ? canonicalStructuredPermitEventDate(snapshot, input.eventDate)
    : canonicalExcerptEventDate(input.exactExcerpt, input.eventDate)
}
function triggerIdentityRejection(
  input: TriggerCandidateInput,
): NoSignalReasonCode | null {
  if (input.identity.state === 'ambiguous') return 'identity_ambiguous'
  if (input.identity.state !== 'resolved') return 'identity_unresolved'
  if (input.identity.confidence < 0.88 || input.identity.conflicts.length > 0) return 'identity_ambiguous'
  if (!input.identity.matchedOn.some((key) => ANCHOR_KEYS.has(key))) return 'insufficient_evidence'
  if (input.source.kind === 'entity_domain' && !input.identity.matchedOn.includes('domain')) return 'insufficient_evidence'
  if (acceptsPermitStructuredEvidence(input.source) && (input.source.addressAnchored !== true || !input.identity.matchedOn.includes('address'))) return 'insufficient_evidence'
  return null
}
function triggerPolicy(
  input: TriggerCandidateInput,
): SavedLeadTriggerPolicy | null {
  const playbook = resolveSavedLeadInvestigationPlaybook(input.activePlaybookId)
  const policy = playbook?.active
    ? playbook.triggerPolicies.find((candidate) =>
        candidate.signalFamilyId === input.approvedSignalFamilyId &&
        candidate.approvedSignalLabelIds.includes(input.approvedSignalLabelId))
    : undefined
  const sourceAllowsRecord =
    input.source.kind !== 'structured' ||
    (
      input.source.structuredSourceClass !== undefined &&
      STRUCTURED_SOURCE_RECORD_FAMILIES[input.source.structuredSourceClass].includes(input.recordFamilyId)
    )
  return policy && policy.relevantRecordFamilies.includes(input.recordFamilyId) && sourceAllowsRecord
    ? policy
    : null
}
function triggerEvidenceRejection(
  input: TriggerCandidateInput,
  snapshot: ApprovedStructuredEvidenceSnapshot | undefined,
): NoSignalReasonCode | null {
  const validIds = isUuid(input.findingId) &&
    isUuid(input.investigationSourceId) &&
    isUuid(input.evidenceSourceId)
  const sourceMatches = input.investigationSourceId.toLocaleLowerCase('en-US') === input.source.investigationSourceId.toLocaleLowerCase('en-US') &&
    input.evidenceSourceId.toLocaleLowerCase('en-US') === input.source.evidenceSourceId.toLocaleLowerCase('en-US')
  if (!sourceMatches || !validIds || !nonEmpty(input.approvedSignalFamilyId) || !nonEmpty(input.approvedSignalLabelId) || !nonEmpty(input.recordFamilyId)) return 'insufficient_evidence'
  if (input.structuredEvidenceSnapshot !== undefined && (!acceptsPermitStructuredEvidence(input.source) || snapshot === undefined)) return 'insufficient_evidence'
  if (!hasEvidence(input.exactExcerpt, input.structuredEvidenceSnapshot) || input.identity.reasonCodes.length === 0) return 'insufficient_evidence'
  return null
}
function triggerFreshnessRejection(
  input: TriggerCandidateInput,
  policy: SavedLeadTriggerPolicy,
  eventDate: string | null,
  snapshot: ApprovedStructuredEvidenceSnapshot | undefined,
): NoSignalReasonCode | null {
  const eventMs = eventDate === null ? Number.NaN : Date.parse(eventDate)
  const evaluatedAtMs = Date.parse(input.evaluatedAt)
  const freshnessEndMs = eventMs + policy.freshnessWindowHours * 60 * 60 * 1000
  const invalidFreshness = Number.isNaN(eventMs) ||
    Number.isNaN(evaluatedAtMs) ||
    !Number.isFinite(freshnessEndMs) ||
    !Number.isInteger(policy.freshnessWindowHours) ||
    policy.freshnessWindowHours <= 0 ||
    eventMs > evaluatedAtMs ||
    freshnessEndMs < eventMs ||
    evaluatedAtMs > freshnessEndMs
  return invalidFreshness ||
    !input.claimGuardPassed ||
    !matchesPolicyKeyword(policy, candidateEvidenceText(input.exactExcerpt, snapshot))
    ? 'insufficient_evidence'
    : null
}
function signalFinding(
  input: TriggerCandidateInput,
  snapshot: ApprovedStructuredEvidenceSnapshot | undefined,
  eventDate: string,
  policy: SavedLeadTriggerPolicy,
): SavedLeadSignalFinding {
  return {
    id: input.findingId,
    approvedSignalFamilyId: input.approvedSignalFamilyId,
    approvedSignalLabelId: input.approvedSignalLabelId,
    investigationSourceId: input.investigationSourceId,
    evidenceSourceId: input.evidenceSourceId,
    ...(nonEmpty(input.exactExcerpt) ? { exactExcerpt: input.exactExcerpt } : {}),
    ...(snapshot ? { structuredEvidenceSnapshot: snapshot } : {}),
    eventDate,
    freshnessEndsAt: new Date(Date.parse(eventDate) + policy.freshnessWindowHours * 60 * 60 * 1000).toISOString(),
    identityMatchReasonCodes: [...input.identity.reasonCodes],
    qualificationReasonCodes: ['identity_resolved', `source_tier_${input.source.tier}`, 'record_family_approved', 'record_keyword_matched', 'fresh_dated_evidence', 'claim_guard_passed'],
  }
}
export function evaluateTriggerCandidate(
  input: TriggerCandidateInput,
): TriggerResult {
  const sourceDecision = validateEvidenceSourceContext(input.source)
  if (!sourceDecision.ok) return noSignal('insufficient_evidence')
  const identityRejection = triggerIdentityRejection(input)
  if (identityRejection) return noSignal(identityRejection)
  const policy = triggerPolicy(input)
  if (!policy) return noSignal('insufficient_evidence')
  const snapshot = hasStructuredEvidence(input.structuredEvidenceSnapshot)
    ? input.structuredEvidenceSnapshot
    : undefined
  const evidenceRejection = triggerEvidenceRejection(input, snapshot)
  if (evidenceRejection) return noSignal(evidenceRejection)
  const eventDate = canonicalTriggerEventDate(input, snapshot)
  const freshnessRejection = triggerFreshnessRejection(input, policy, eventDate, snapshot)
  if (freshnessRejection) return noSignal(freshnessRejection)
  return { state: 'signal_found', finding: signalFinding(input, snapshot, eventDate!, policy) }
}
type CompletedSignalCheckInput = {
  savedLeadId: string
  runId: string
  checkedAt: string
  identity: IdentityResolution
  trigger: TriggerResult
  profileReport: ProfileReport
  recheckEligibleAt: string
  resultExpiresAt: string
  status?: 'completed'
}
export function createCompletedSignalCheck(
  input: CompletedSignalCheckInput,
): CompletedSignalCheck {
  return {
    status: 'completed',
    savedLeadId: input.savedLeadId,
    runId: input.runId,
    checkedAt: input.checkedAt,
    identity: input.identity,
    trigger: input.trigger,
    profileReport: input.profileReport,
    recheckEligibleAt: input.recheckEligibleAt,
    resultExpiresAt: input.resultExpiresAt,
  }
}
