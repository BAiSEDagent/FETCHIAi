/**
 * CP26C.2A generic structured public-source seam.
 *
 * Contract helpers only: no transport, environment access, or provider calls.
 */
import {
  STRUCTURED_PERMIT_EVIDENCE_FIELDS,
  STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID,
  STRUCTURED_SOURCE_PUBLIC_METADATA_FIELDS,
} from '@/lib/runtime/saved-lead-investigation/contracts'
import type {
  ApprovedStructuredEvidenceSnapshot,
  SourceAvailability,
  SourceCheckState,
  SourceTier,
  StructuredEvidenceScalar,
  StructuredPermitEvidenceField,
  StructuredPermitRecord,
  StructuredSourceClass,
  StructuredSourceFormat,
  StructuredSourcePublicMetadata,
  StructuredSourcePublicMetadataField,
  StructuredSourceTerritory,
} from '@/lib/runtime/saved-lead-investigation/contracts'
export {
  SOURCE_AVAILABILITIES,
  SOURCE_CHECK_STATES,
  STRUCTURED_PERMIT_EVIDENCE_FIELDS,
  STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID,
  STRUCTURED_SOURCE_CLASSES,
  STRUCTURED_SOURCE_FORMATS,
  STRUCTURED_SOURCE_PUBLIC_METADATA_FIELDS,
} from '@/lib/runtime/saved-lead-investigation/contracts'
export type {
  ApprovedStructuredEvidenceSnapshot,
  SourceAvailability,
  SourceCheckState,
  SourceTier,
  StructuredEvidenceScalar,
  StructuredPermitEvidenceField,
  StructuredPermitRecord,
  StructuredSourceClass,
  StructuredSourceFormat,
  StructuredSourcePublicMetadata,
  StructuredSourcePublicMetadataField,
  StructuredSourceTerritory,
} from '@/lib/runtime/saved-lead-investigation/contracts'
export interface StructuredSourceDefinition {
  registrySourceKey: string
  labelKey: string
  format: StructuredSourceFormat
  sourceClass: StructuredSourceClass
  tier: SourceTier
  authority: string
  territories: string[]
  supportedVerticals: string[]
  supportedSignalFamilies: string[]
  limitations: string[]
}
export interface StructuredSourcePlanItem extends StructuredSourceDefinition {
  availability: SourceAvailability
  checkState: SourceCheckState
  fallbackReasonCode?: string
}
export interface StructuredSourceEvidenceRecord<TRecord> {
  record: TRecord
  registrySourceKey: string
  canonicalSourceReference: string
  sourceAuthority: string
  stableExternalId: string
  canonicalArtifactKey: string
  evidenceSourceId: string
  eventDate: string | null
  evidenceFingerprint: string
  approvedPublicMetadata: StructuredSourcePublicMetadata
  runtimeLineageRunId: string
}
export type StructuredFieldValue = string | number | null | undefined
export type StructuredFieldMap<TRecord extends object> = {
  [Key in keyof TRecord]: string | readonly string[]
}
export interface ArcGisStructuredSourceConfig<
  TRecord extends object = Record<string, unknown>,
> {
  registrySourceKey: string
  labelKey: string
  format: 'arcgis_feature_service'
  tier: 1
  availability: 'live' | 'fixture_only' | 'unavailable'
  territory: StructuredSourceTerritory
  sourceClass: StructuredSourceClass
  authority: string
  serviceUrl: string
  layerId: number
  supportedVerticals: string[]
  supportedSignalFamilies: string[]
  identityFields: {
    domain?: string[]
    phone?: string[]
    address?: string[]
    name?: string[]
    locality?: string[]
  }
  externalIdFields: string[]
  dateFields: string[]
  outFields: string[]
  orderByFields?: string[]
  fieldMap: StructuredFieldMap<TRecord>
  limitations: string[]
}
export interface StructuredSourceConfig {
  registrySourceKey: string
  labelKey: string
  format: StructuredSourceFormat
  tier: SourceTier
  availability: 'live' | 'fixture_only' | 'unavailable'
  territory: StructuredSourceTerritory
  sourceClass: StructuredSourceClass
  authority: string
  supportedVerticals: string[]
  supportedSignalFamilies: string[]
  limitations: string[]
}
export interface StructuredSourceRequest {
  registrySourceKey: string
  territory: StructuredSourceTerritory
  resultLimit: number
  timeoutMs: number
  query: Readonly<Record<string, string | number | boolean>>
}
export interface StructuredSourceFailure {
  code:
    | 'source_unavailable'
    | 'provider_timeout'
    | 'invalid_response'
    | 'transport_failed'
    | 'budget_refused'
  retryable: boolean
  metadata?: Readonly<Record<string, string | number | boolean>>
}
export interface StructuredSourceUsage {
  requestCount: number
  providerReportedCredits: number | null
}
export interface StructuredSourceResult<TRecord> {
  registrySourceKey: string
  records: StructuredSourceEvidenceRecord<TRecord>[]
  canonicalAuthority: string
  runtimeLineageRunId: string
  usage: StructuredSourceUsage
  exhausted: boolean
  failure?: StructuredSourceFailure
}
export interface StructuredSourceProvider<
  TRecord,
  TRequest extends StructuredSourceRequest = StructuredSourceRequest,
> {
  readonly format: StructuredSourceFormat
  resolveAvailability(
    definition: StructuredSourceDefinition,
    territory: StructuredSourceTerritory,
  ): SourceAvailability
  execute(request: TRequest): Promise<StructuredSourceResult<TRecord>>
}
export interface ArcGisFeatureProvider<TRecord>
  extends StructuredSourceProvider<TRecord> {
  readonly format: 'arcgis_feature_service'
}
export interface SocrataDatasetProvider<TRecord>
  extends StructuredSourceProvider<TRecord> {
  readonly format: 'socrata_dataset'
}
export interface TdlrTabsProvider<TRecord>
  extends StructuredSourceProvider<TRecord> {
  readonly format: 'source_specific_api'
}
export interface SamGovProvider<TRecord>
  extends StructuredSourceProvider<TRecord> {
  readonly format: 'source_specific_api'
}
export interface NoaaEventProvider<TRecord>
  extends StructuredSourceProvider<TRecord> {
  readonly format: 'source_specific_api'
}
export const STRUCTURED_SOURCE_ADAPTER_CONCEPTS = {
  universal: 'StructuredSourceProvider',
  formatAdapters: ['ArcGisFeatureProvider', 'SocrataDatasetProvider'],
  sourceSpecificAdapters: ['TdlrTabsProvider', 'SamGovProvider', 'NoaaEventProvider'],
} as const
function deterministicEvidenceToken(value: string | null): string {
  return encodeURIComponent(value?.trim() ?? '')
}
function isCanonicalUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
export function createStructuredEvidenceArtifactKey(
  registrySourceKey: string,
  stableExternalId: string,
): string {
  return [
    'structured',
    deterministicEvidenceToken(registrySourceKey),
    deterministicEvidenceToken(stableExternalId),
  ].join(':')
}
export function createStructuredEvidenceFingerprint(input: {
  registrySourceKey: string
  stableExternalId: string
  eventDate: string | null
  approvedFields: ApprovedStructuredEvidenceSnapshot['fields']
}): string {
  const canonicalEvidence = JSON.stringify(
    Object.entries(input.approvedFields).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  )
  const canonicalInput = [
    'structured-evidence-v1',
    deterministicEvidenceToken(input.registrySourceKey),
    deterministicEvidenceToken(input.stableExternalId),
    deterministicEvidenceToken(input.eventDate),
    canonicalEvidence,
  ].join(':')
  let hash = 2166136261
  for (let index = 0; index < canonicalInput.length; index += 1) {
    hash ^= canonicalInput.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `structured-evidence-v1:${(hash >>> 0).toString(16).padStart(8, '0')}`
}
export function createStructuredPermitEvidenceSnapshot(
  record: StructuredPermitRecord,
): ApprovedStructuredEvidenceSnapshot {
  const fields: Partial<
    Record<StructuredPermitEvidenceField, StructuredEvidenceScalar>
  > = {}
  for (const field of STRUCTURED_PERMIT_EVIDENCE_FIELDS) {
    fields[field] = record[field]
  }
  return {
    schemaId: STRUCTURED_PERMIT_EVIDENCE_SCHEMA_ID,
    fields,
  }
}
export function selectStructuredPermitPublicMetadata(
  record: StructuredPermitRecord,
): StructuredSourcePublicMetadata {
  const metadata: Partial<
    Record<StructuredSourcePublicMetadataField, StructuredEvidenceScalar>
  > = {}
  for (const field of STRUCTURED_SOURCE_PUBLIC_METADATA_FIELDS) {
    const value = record[field]
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      metadata[field] = value
    }
  }
  return metadata
}
export function createStructuredPermitEvidenceRecord(input: {
  record: StructuredPermitRecord
  registrySourceKey: string
  canonicalSourceReference: string
  sourceAuthority: string
  /** Canonical UUID allocated by evidence_sources persistence. */
  evidenceSourceId: string
  runtimeLineageRunId: string
  eventDate?: string | null
}): StructuredSourceEvidenceRecord<StructuredPermitRecord> {
  if (!isCanonicalUuid(input.evidenceSourceId)) {
    throw new Error(
      'Structured evidence requires a canonical evidence_sources UUID',
    )
  }
  if (!isCanonicalUuid(input.runtimeLineageRunId)) {
    throw new Error(
      'Structured evidence requires a canonical runtime_lineage_runs UUID',
    )
  }
  const eventDate =
    input.eventDate ?? input.record.issuedAt ?? input.record.enteredAt
  const approvedEvidence = createStructuredPermitEvidenceSnapshot(input.record)
  return {
    record: input.record,
    registrySourceKey: input.registrySourceKey,
    canonicalSourceReference: input.canonicalSourceReference,
    sourceAuthority: input.sourceAuthority,
    stableExternalId: input.record.stableExternalId,
    canonicalArtifactKey: createStructuredEvidenceArtifactKey(
      input.registrySourceKey,
      input.record.stableExternalId,
    ),
    evidenceSourceId: input.evidenceSourceId,
    eventDate,
    evidenceFingerprint: createStructuredEvidenceFingerprint({
      registrySourceKey: input.registrySourceKey,
      stableExternalId: input.record.stableExternalId,
      eventDate,
      approvedFields: approvedEvidence.fields,
    }),
    approvedPublicMetadata: selectStructuredPermitPublicMetadata(input.record),
    runtimeLineageRunId: input.runtimeLineageRunId,
  }
}
function normalizeToken(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? ''
}
export function resolveStructuredSourceAvailability(
  config: StructuredSourceConfig,
  territory: StructuredSourceTerritory,
): SourceAvailability {
  if (config.availability === 'unavailable') return 'unavailable'
  if (config.availability === 'fixture_only') return 'unsupported'
  const sameCountry =
    normalizeToken(config.territory.country) === normalizeToken(territory.country)
  const sameState =
    normalizeToken(config.territory.state) === normalizeToken(territory.state)
  const configuredCity = normalizeToken(config.territory.city)
  const requestedCity = normalizeToken(territory.city)
  if (!sameCountry || !sameState) return 'unavailable'
  if (configuredCity && configuredCity !== requestedCity) return 'unavailable'
  return 'available'
}
function firstMappedValue(
  raw: Record<string, unknown>,
  mapping: string | readonly string[],
): unknown {
  const keys = typeof mapping === 'string' ? [mapping] : mapping
  for (const key of keys) {
    const value = raw[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return null
}
function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : null
}
function nullableArcGisDate(value: unknown): string | null {
  if (typeof value !== 'number') return nullableText(value)
  if (!Number.isFinite(value)) return null
  const normalized = new Date(value)
  return Number.isFinite(normalized.getTime())
    ? normalized.toISOString()
    : null
}
function requiredText(value: unknown, field: string): string {
  const normalized = nullableText(value)
  if (!normalized) {
    throw new Error(`Structured source record is missing required ${field}`)
  }
  return normalized
}
function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const normalized =
    typeof value === 'string' ? value.replaceAll(',', '').trim() : value
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}
export function mapStructuredRecord(
  config: ArcGisStructuredSourceConfig<StructuredPermitRecord>,
  raw: Record<string, unknown>,
): StructuredPermitRecord {
  const mapped = <Key extends keyof StructuredPermitRecord>(key: Key): unknown =>
    firstMappedValue(raw, config.fieldMap[key])
  return {
    permitNumber: requiredText(mapped('permitNumber'), 'permitNumber'),
    issuedAt: nullableArcGisDate(mapped('issuedAt')),
    enteredAt: nullableArcGisDate(mapped('enteredAt')),
    calculatedAddress: nullableText(mapped('calculatedAddress')),
    freeFormAddress: nullableText(mapped('freeFormAddress')),
    recordCategory: nullableText(mapped('recordCategory')),
    typeOfWork: nullableText(mapped('typeOfWork')),
    structureType: nullableText(mapped('structureType')),
    workDescription: nullableText(mapped('workDescription')),
    valuation: nullableNumber(mapped('valuation')),
    squareFootage: nullableNumber(mapped('squareFootage')),
    numberOfUnits: nullableNumber(mapped('numberOfUnits')),
    owner: nullableText(mapped('owner')),
    applicant: nullableText(mapped('applicant')),
    contractor: nullableText(mapped('contractor')),
    stableExternalId: requiredText(mapped('stableExternalId'), 'stableExternalId'),
  }
}
