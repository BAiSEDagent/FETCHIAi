import {
  createStructuredPermitEvidenceRecord,
  mapStructuredRecord,
  resolveStructuredSourceAvailability,
  type ArcGisFeatureProvider as ArcGisFeatureProviderContract,
  type ArcGisStructuredSourceConfig,
  type StructuredPermitRecord,
  type StructuredSourceRequest,
  type StructuredSourceResult,
  type StructuredSourceTerritory,
} from '@/lib/providers/structured-source-provider'
import {
  normalizeAddress,
  normalizeAddressParts,
} from '@/lib/runtime/saved-lead-investigation/identity-resolution'

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_RESULT_LIMIT = 25
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

type FetchLike = typeof fetch

export interface ArcGisFeatureProviderOptions {
  config: ArcGisStructuredSourceConfig<StructuredPermitRecord>
  fetch?: FetchLike
  clock?: () => string
  runIdFactory?: () => string
  evidenceSourceIdFactory?: () => string
  defaultTimeoutMs?: number
  defaultResultLimit?: number
}

export interface ArcGisAddressQuery extends StructuredSourceRequest {
  query: Readonly<{
    address?: string | number | boolean
    city?: string | number | boolean
    state?: string | number | boolean
    countryCode?: string | number | boolean
  }>
}

interface ArcGisFeature {
  attributes?: unknown
}

interface ArcGisResponse {
  error?: unknown
  features?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizedText(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('en-US')
}

function sameLocality(
  config: ArcGisStructuredSourceConfig<StructuredPermitRecord>,
  query: ArcGisAddressQuery['query'],
): boolean {
  return (
    normalizedText(query.countryCode) ===
      normalizedText(config.territory.country) &&
    normalizedText(query.state) === normalizedText(config.territory.state) &&
    (!config.territory.city ||
      normalizedText(query.city) === normalizedText(config.territory.city))
  )
}

function serviceLayerUrl(config: ArcGisStructuredSourceConfig<StructuredPermitRecord>): string {
  const base = config.serviceUrl.replace(/\/+$/, '')
  return /\/\d+$/.test(base) ? base : `${base}/${config.layerId}`
}

function safeFields(fields: readonly string[]): string[] {
  const unique = [...new Set(fields.map((field) => field.trim()))]
  if (unique.length === 0 || unique.some((field) => !FIELD_RE.test(field))) {
    throw new Error('ArcGIS configuration contains an unsafe field name')
  }
  return unique
}

function escapedSqlText(value: string): string {
  return value.replaceAll("'", "''")
}

function addressWhere(
  config: ArcGisStructuredSourceConfig<StructuredPermitRecord>,
  address: string,
): string {
  const parts = normalizeAddressParts(address)
  const streetNumber = parts.addressWithoutUnit.split(' ')[0] ?? ''
  const streetNameTokens = parts.addressWithoutUnit.split(' ').slice(1)
  if (!/^\d+[a-z]?$/.test(streetNumber) || streetNameTokens.length === 0) {
    throw new Error('ArcGIS address query requires street number and street name')
  }
  const addressFields = safeFields(config.identityFields.address ?? [])
  const predicates = addressFields.map((field) => {
    const tokens = [streetNumber, ...streetNameTokens]
      .map((token) => escapedSqlText(token.toLocaleUpperCase('en-US')))
    return [
      `${field} IS NOT NULL`,
      ...tokens.map((token) => `UPPER(${field}) LIKE '%${token}%'`),
    ].join(' AND ')
  })
  return predicates.map((predicate) => `(${predicate})`).join(' OR ')
}

function failure(
  registrySourceKey: string,
  canonicalAuthority: string,
  runtimeLineageRunId: string,
  code: StructuredSourceResult<StructuredPermitRecord>['failure'] extends infer T
    ? T extends { code: infer C } ? C : never
    : never,
  retryable: boolean,
  metadata: Readonly<Record<string, string | number | boolean>> = {},
): StructuredSourceResult<StructuredPermitRecord> {
  return {
    registrySourceKey,
    records: [],
    canonicalAuthority,
    runtimeLineageRunId,
    usage: { requestCount: 0, providerReportedCredits: null },
    exhausted: false,
    failure: { code, retryable, metadata },
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (isRecord(error) && error.name === 'AbortError')
  )
}

function eventDate(record: StructuredPermitRecord): string | null {
  return record.issuedAt ?? record.enteredAt
}

export class ArcGisFeatureProvider
  implements ArcGisFeatureProviderContract<StructuredPermitRecord> {
  readonly format = 'arcgis_feature_service' as const
  private readonly config: ArcGisStructuredSourceConfig<StructuredPermitRecord>
  private readonly fetcher: FetchLike
  private readonly clock: () => string
  private readonly runIdFactory: () => string
  private readonly evidenceSourceIdFactory: () => string
  private readonly defaultTimeoutMs: number
  private readonly defaultResultLimit: number

  constructor(options: ArcGisFeatureProviderOptions) {
    this.config = options.config
    this.fetcher = options.fetch ?? fetch
    this.clock = options.clock ?? (() => new Date().toISOString())
    this.runIdFactory = options.runIdFactory ?? crypto.randomUUID
    this.evidenceSourceIdFactory = options.evidenceSourceIdFactory ?? crypto.randomUUID
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
    this.defaultResultLimit = options.defaultResultLimit ?? DEFAULT_RESULT_LIMIT
  }

  resolveAvailability(
    _definition: never,
    territory: StructuredSourceTerritory,
  ) {
    return resolveStructuredSourceAvailability(this.config, territory)
  }

  async execute(
    request: ArcGisAddressQuery,
  ): Promise<StructuredSourceResult<StructuredPermitRecord>> {
    const runtimeLineageRunId = this.runIdFactory()
    if (request.registrySourceKey !== this.config.registrySourceKey) {
      return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'source_unavailable', false)
    }
    if (!sameLocality(this.config, request.query)) {
      return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'source_unavailable', false, { reason: 'locality_mismatch' })
    }

    const limit = Math.min(
      Math.max(1, request.resultLimit || this.defaultResultLimit),
      DEFAULT_RESULT_LIMIT,
    )
    const timeoutMs = Math.max(1, request.timeoutMs || this.defaultTimeoutMs)
    let where: string
    try {
      where = addressWhere(this.config, String(request.query.address ?? ''))
      safeFields(this.config.outFields)
      safeFields(this.config.externalIdFields)
      safeFields(this.config.dateFields)
    } catch (error) {
      return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'invalid_response', false, { reason: error instanceof Error ? error.message : 'invalid_query' })
    }

    const params = new URLSearchParams({
      f: 'json',
      where,
      outFields: safeFields(this.config.outFields).join(','),
      returnGeometry: 'false',
      resultRecordCount: String(limit),
    })
    if (this.config.orderByFields?.length) {
      params.set('orderByFields', this.config.orderByFields.join(','))
    }
    const url = `${serviceLayerUrl(this.config)}/query?${params.toString()}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let payload: ArcGisResponse
    try {
      const response = await this.fetcher(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) {
        return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'transport_failed', response.status >= 500, { status: response.status })
      }
      payload = (await response.json()) as ArcGisResponse
    } catch (error) {
      const timeout = controller.signal.aborted || isAbortError(error)
      return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, timeout ? 'provider_timeout' : 'transport_failed', true)
    } finally {
      clearTimeout(timer)
    }

    if (payload.error) {
      return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'transport_failed', false, { providerError: 'arcgis_error_payload' })
    }
    if (!Array.isArray(payload.features)) {
      return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'invalid_response', false, { reason: 'missing_features' })
    }

    const records: StructuredSourceResult<StructuredPermitRecord>['records'] = []
    const seen = new Set<string>()
    for (const feature of payload.features as ArcGisFeature[]) {
      if (!isRecord(feature) || !isRecord(feature.attributes)) {
        return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'invalid_response', false, { reason: 'malformed_feature' })
      }
      let record: StructuredPermitRecord
      try {
        record = mapStructuredRecord(this.config, feature.attributes)
      } catch {
        return failure(request.registrySourceKey, this.config.authority, runtimeLineageRunId, 'invalid_response', false, { reason: 'malformed_record' })
      }
      const stableExternalId = record.stableExternalId.trim()
      if (!stableExternalId || seen.has(stableExternalId)) continue
      seen.add(stableExternalId)
      records.push(createStructuredPermitEvidenceRecord({
        record: { ...record, stableExternalId },
        registrySourceKey: this.config.registrySourceKey,
        canonicalSourceReference: `${serviceLayerUrl(this.config)}/${encodeURIComponent(stableExternalId)}`,
        sourceAuthority: this.config.authority,
        evidenceSourceId: this.evidenceSourceIdFactory(),
        runtimeLineageRunId,
        eventDate: eventDate(record),
      }))
      if (records.length >= limit) break
    }

    return {
      registrySourceKey: this.config.registrySourceKey,
      records,
      canonicalAuthority: this.config.authority,
      runtimeLineageRunId,
      usage: { requestCount: 1, providerReportedCredits: null },
      exhausted: payload.features.length > records.length,
    }
  }
}
