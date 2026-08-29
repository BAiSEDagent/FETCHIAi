/**
 * CP26C.2B live Albuquerque ArcGIS proof.
 *
 * Makes at most two outbound requests to the approved public City of
 * Albuquerque FeatureServer. No SerpApi, Firecrawl, model, DB, or app runtime.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { ArcGisFeatureProvider } from '@/lib/providers/structured/arcgis-feature-provider'
import {
  ALBUQUERQUE_BUILDING_PERMITS,
  filterPermitRecordsForPlaybook,
  resolveSavedLeadInvestigationPlaybook,
} from '@/lib/playbooks/saved-lead-investigation-registry'
import {
  createStructuredPermitEvidenceSnapshot,
  mapStructuredRecord,
} from '@/lib/providers/structured-source-provider'
import {
  resolvePermitIdentity,
  type PermitIdentityResolution,
} from '@/lib/runtime/saved-lead-investigation/identity-resolution'
import {
  createInvestigationUsage,
  type CompletedSignalCheck,
  type SavedLeadIdentity,
  type SavedLeadProfileFinding,
  type StructuredPermitRecord,
  type TriggerResult,
} from '@/lib/runtime/saved-lead-investigation'
import {
  evaluateTriggerCandidate,
  validateProfileFinding,
  type InvestigationEvidenceSourceContext,
} from '@/lib/gates/saved-lead-investigation-gate'
import { buildCompletedSignalCheck } from '@/lib/runtime/saved-lead-investigation/result-builder'
import type { SemanticSourceObservation } from '@/lib/runtime/saved-lead-investigation/source-collector'

const OUTPUT_PATH = '/private/tmp/cp26c2b-live-arcgis-proof.json'
const MAX_REQUESTS = 2
const TIMEOUT_MS = 8000
let requestCount = 0

function serviceLayerUrl(): string {
  const base = ALBUQUERQUE_BUILDING_PERMITS.serviceUrl.replace(/\/+$/, '')
  return /\/\d+$/.test(base)
    ? base
    : `${base}/${ALBUQUERQUE_BUILDING_PERMITS.layerId}`
}

function configuredField(field: keyof typeof ALBUQUERQUE_BUILDING_PERMITS.fieldMap): string {
  const mapping = ALBUQUERQUE_BUILDING_PERMITS.fieldMap[field]
  return typeof mapping === 'string' ? mapping : mapping[0]!
}

async function boundedFetch(url: string, init?: RequestInit): Promise<Response> {
  requestCount += 1
  if (requestCount > MAX_REQUESTS) {
    throw new Error('CP26C.2B live ArcGIS proof exceeded two HTTP requests')
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function discoveryRecord(): Promise<StructuredPermitRecord> {
  const params = new URLSearchParams({
    f: 'json',
    where: [
      `${configuredField('stableExternalId')} IS NOT NULL`,
      `${configuredField('issuedAt')} IS NOT NULL`,
      `${configuredField('calculatedAddress')} IS NOT NULL`,
    ].join(' AND '),
    outFields: ALBUQUERQUE_BUILDING_PERMITS.outFields.join(','),
    returnGeometry: 'false',
    resultRecordCount: '1',
    orderByFields:
      ALBUQUERQUE_BUILDING_PERMITS.orderByFields?.join(',') ??
      'ISSUED_DATE DESC',
  })
  const response = await boundedFetch(`${serviceLayerUrl()}/query?${params.toString()}`, {
    headers: { accept: 'application/json' },
  })
  assert.equal(response.ok, true, `ArcGIS discovery HTTP ${response.status}`)
  const payload = await response.json() as {
    error?: unknown
    features?: Array<{ attributes?: Record<string, unknown> }>
  }
  assert.equal(payload.error, undefined, 'ArcGIS discovery returned an error payload')
  const attributes = payload.features?.[0]?.attributes
  assert(attributes, 'ArcGIS discovery did not return a usable feature')
  const record = mapStructuredRecord(ALBUQUERQUE_BUILDING_PERMITS, attributes)
  assert(record.stableExternalId, 'ArcGIS record lacks stable external ID')
  assert(record.issuedAt && !Number.isNaN(Date.parse(record.issuedAt)), 'ArcGIS record lacks parseable issue date')
  assert(record.calculatedAddress || record.freeFormAddress, 'ArcGIS record lacks parseable address')
  return record
}

function proofIdentity(record: StructuredPermitRecord): SavedLeadIdentity {
  return {
    name: record.owner ?? record.applicant ?? record.contractor ?? record.permitNumber,
    address: record.calculatedAddress ?? record.freeFormAddress,
    city: 'Albuquerque',
    state: 'NM',
    countryCode: 'US',
  }
}

function sourceContext(observation: SemanticSourceObservation): InvestigationEvidenceSourceContext {
  const linked = observation.structuredRecords[0]
  assert(linked, 'No linked structured record was available')
  return {
    investigationSourceId: linked.investigationSourceId,
    evidenceSourceId: linked.evidenceSourceId,
    tier: 1,
    kind: 'structured',
    structuredSourceClass: 'building_and_trade_permits',
    addressAnchored: linked.addressAnchored,
  }
}

function profileFinding(input: {
  record: StructuredPermitRecord
  identity: PermitIdentityResolution
  source: InvestigationEvidenceSourceContext
  checkedAt: string
}): SavedLeadProfileFinding | null {
  if (!input.record.issuedAt || !input.identity.addressAnchored) return null
  const finding: SavedLeadProfileFinding = {
    id: randomUUID(),
    factKey: 'latest_permit_date',
    value: input.record.issuedAt,
    investigationSourceId: input.source.investigationSourceId,
    evidenceSourceId: input.source.evidenceSourceId,
    structuredEvidenceSnapshot: createStructuredPermitEvidenceSnapshot(input.record),
    observedAt: input.checkedAt,
    eventDate: input.record.issuedAt,
    identityMatch: {
      matchedOn: input.identity.identity.matchedOn,
      reasonCodes: input.identity.identity.reasonCodes,
    },
  }
  return validateProfileFinding(finding, input.source, { existingFindings: [] }).ok
    ? finding
    : null
}

function sanitized(result: CompletedSignalCheck) {
  return {
    status: result.status,
    savedLeadId: result.savedLeadId,
    runId: result.runId,
    checkedAt: result.checkedAt,
    identity: result.identity,
    trigger: result.trigger.state === 'signal_found'
      ? {
          state: result.trigger.state,
          approvedSignalFamilyId: result.trigger.finding.approvedSignalFamilyId,
          approvedSignalLabelId: result.trigger.finding.approvedSignalLabelId,
          eventDate: result.trigger.finding.eventDate,
          freshnessEndsAt: result.trigger.finding.freshnessEndsAt,
          qualificationReasonCodes: result.trigger.finding.qualificationReasonCodes,
        }
      : result.trigger,
    profileReport: {
      findings: result.profileReport.findings.map((finding) => ({
        factKey: finding.factKey,
        value: finding.value,
        eventDate: finding.eventDate,
        identityMatch: finding.identityMatch,
      })),
      sourcesChecked: result.profileReport.sourcesChecked,
      structuredSourcesChecked: result.profileReport.structuredSourcesChecked,
      checkedSourceKeys: result.profileReport.checkedSourceKeys,
      unavailableSourceKeys: result.profileReport.unavailableSourceKeys,
      usage: result.profileReport.usage,
      expiresAt: result.profileReport.expiresAt,
    },
    recheckEligibleAt: result.recheckEligibleAt,
    resultExpiresAt: result.resultExpiresAt,
  }
}

async function main(): Promise<void> {
  const discovered = await discoveryRecord()
  const savedLeadIdentity = proofIdentity(discovered)
  const provider = new ArcGisFeatureProvider({
    config: ALBUQUERQUE_BUILDING_PERMITS,
    fetch: boundedFetch as typeof fetch,
    clock: () => new Date().toISOString(),
    runIdFactory: randomUUID,
    evidenceSourceIdFactory: randomUUID,
  })
  const providerResult = await provider.execute({
    registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    territory: ALBUQUERQUE_BUILDING_PERMITS.territory,
    resultLimit: 25,
    timeoutMs: TIMEOUT_MS,
    query: {
      address: savedLeadIdentity.address ?? '',
      city: savedLeadIdentity.city ?? '',
      state: savedLeadIdentity.state ?? '',
      countryCode: savedLeadIdentity.countryCode ?? 'US',
    },
  })
  assert.equal(providerResult.failure, undefined, `ArcGIS address replay failed: ${providerResult.failure?.code}`)
  const evidence = providerResult.records[0]
  assert(evidence, 'ArcGIS address replay returned zero normalized records')
  const checkedAt = new Date().toISOString()
  const identity = resolvePermitIdentity({
    persisted: savedLeadIdentity,
    permit: evidence.record,
    territory: ALBUQUERQUE_BUILDING_PERMITS.territory,
    evaluatedAt: checkedAt,
  })
  const observation: SemanticSourceObservation = {
    id: randomUUID(),
    registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    tier: 1,
    kind: 'structured',
    sourceClass: ALBUQUERQUE_BUILDING_PERMITS.sourceClass,
    availability: 'available',
    checkState: 'checked',
    structuredRecords: [{
      evidence,
      investigationSourceId: randomUUID(),
      evidenceSourceId: evidence.evidenceSourceId,
      addressAnchored: identity.addressAnchored,
    }],
  }
  const source = sourceContext(observation)
  const playbook = resolveSavedLeadInvestigationPlaybook('commercial_cleaning')!
  const qualifying = filterPermitRecordsForPlaybook([evidence.record], playbook)
  let trigger: TriggerResult = { state: 'no_signal', reasonCode: 'none_found' }
  if (qualifying.length > 0 && evidence.eventDate) {
    trigger = evaluateTriggerCandidate({
      findingId: randomUUID(),
      identity: identity.identity,
      source,
      activePlaybookId: playbook.id,
      approvedSignalFamilyId: 'building_permit',
      approvedSignalLabelId: playbook.approvedSignalLabels[0]!,
      recordFamilyId: 'building_permit',
      investigationSourceId: source.investigationSourceId,
      evidenceSourceId: source.evidenceSourceId,
      structuredEvidenceSnapshot: createStructuredPermitEvidenceSnapshot(evidence.record),
      eventDate: evidence.eventDate,
      evaluatedAt: checkedAt,
      claimGuardPassed: true,
    })
  }
  const profile = profileFinding({
    record: evidence.record,
    identity,
    source,
    checkedAt,
  })
  const completed = buildCompletedSignalCheck({
    savedLeadId: 'proof-only-harness-generated-from-official-record',
    runId: randomUUID(),
    checkedAt,
    identity: identity.identity,
    trigger,
    profileFindings: profile ? [profile] : [],
    sourceObservations: [observation],
    usage: {
      ...createInvestigationUsage(),
      structuredCalls: 1,
      totalProviderEquivalents: 1,
      providerRequestCounts: {
        [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: requestCount,
      },
    },
    playbook,
  })
  const output = {
    checkpoint: 'CP26C.2B live ArcGIS proof',
    proofOnlyLead: {
      harnessGeneratedFromOfficialRecord: true,
      businessName: savedLeadIdentity.name,
      address: savedLeadIdentity.address,
      city: savedLeadIdentity.city,
      state: savedLeadIdentity.state,
    },
    requestCount,
    maximumRequests: MAX_REQUESTS,
    authority: ALBUQUERQUE_BUILDING_PERMITS.authority,
    endpoint: serviceLayerUrl(),
    normalizedRecordSummary: {
      stableExternalId: evidence.record.stableExternalId,
      permitNumber: evidence.record.permitNumber,
      issuedAt: evidence.record.issuedAt,
      calculatedAddress: evidence.record.calculatedAddress,
      recordCategory: evidence.record.recordCategory,
      typeOfWork: evidence.record.typeOfWork,
      structureType: evidence.record.structureType,
    },
    identityResolution: identity,
    triggerResult: trigger,
    failedVersusNoSignal:
      'Provider failure or timeout fails retryably; no_signal is used only after a completed source check with no qualifying trigger.',
    sanitizedCompletedSignalCheck: sanitized(completed),
  }
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  console.log(JSON.stringify({
    outputPath: OUTPUT_PATH,
    requestCount,
    authority: output.authority,
    endpoint: output.endpoint,
    triggerState: trigger.state,
    profileFindingCount: completed.profileReport.findings.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
