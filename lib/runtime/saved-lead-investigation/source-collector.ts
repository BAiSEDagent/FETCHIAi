import type { EvidenceProvider } from '@/lib/providers/evidence-provider'
import type { SearchProvider } from '@/lib/providers/search-provider'
import type {
  StructuredPermitRecord,
  StructuredSourceEvidenceRecord,
  StructuredSourceProvider,
} from '@/lib/providers/structured-source-provider'
import type { SavedLeadInvestigationPlaybook } from '@/lib/playbooks/saved-lead-investigation-registry'
import type {
  InvestigationUsageSnapshot,
  SavedLeadIdentity,
  SourceCheckState,
} from './contracts'
import type { SavedLeadInvestigationPlan } from './planner'

export interface SavedLeadInvestigationSourceProviderRegistry {
  structured: Readonly<
    Record<string, Pick<StructuredSourceProvider<StructuredPermitRecord>, 'execute'>>
  >
}

export interface LinkedStructuredRecord {
  evidence: StructuredSourceEvidenceRecord<StructuredPermitRecord>
  investigationSourceId: string
  evidenceSourceId: string
  addressAnchored: boolean
}

export interface SemanticSourceObservation {
  id: string
  registrySourceKey: string
  tier: 1 | 2 | 3
  kind: 'structured' | 'entity_domain' | 'indexed_web'
  sourceClass?: string
  availability: string
  checkState: SourceCheckState
  fallbackReason?: string
  failureCode?: string
  retryableFailure?: boolean
  structuredRecords: LinkedStructuredRecord[]
}

export interface SourceCollectorRepository {
  reserveUsage(input: {
    workspaceId: string
    runId: string
    operationKey: string
    category: 'structuredCalls' | 'serpApiCalls' | 'hydrationPages'
    units: number
  }): Promise<{ state: string; usage?: InvestigationUsageSnapshot }>
  creditUsage(input: {
    workspaceId: string
    runId: string
    operationKey: string
    providerKey: string
    actualUnits: number
    providerRequestCount: number
    providerReportedCredits: number | null
  }): Promise<{ state: string; usage?: InvestigationUsageSnapshot }>
  recordLineage(input: {
    provider: string
    providerRunId: string
    runRole: string
    status: 'ok' | 'error' | 'skipped'
    sourceUrl?: string | null
    query?: string | null
    requestMetadata?: Record<string, unknown>
    responseMetadata?: Record<string, unknown>
  }): Promise<{ id: string }>
  recordEvidence(input: {
    sourceType: string
    sourceAuthority: string
    externalId: string
    sourceUrl: string
    sourceTitle?: string | null
    sourceDate: string
    evidenceFingerprint: string
    sourceMetadata: Record<string, unknown>
  }): Promise<{ id: string }>
  linkInvestigationSource(input: {
    workspaceId: string
    runId: string
    registrySourceKey: string
    tier: 1 | 2 | 3
    availability: string
    checkState: SourceCheckState
    candidateRank?: number | null
    fallbackReason?: string | null
    runtimeLineageRunId?: string | null
    evidenceSourceId?: string | null
  }): Promise<{ id: string }>
}

export interface SourceCollectorInput {
  workspaceId: string
  runId: string
  savedLeadIdentity: SavedLeadIdentity
  playbook: SavedLeadInvestigationPlaybook
  plan: SavedLeadInvestigationPlan
  repository: SourceCollectorRepository
  providers: SavedLeadInvestigationSourceProviderRegistry
  serpApiProvider?: SearchProvider
  firecrawlProvider?: EvidenceProvider
  clock: () => string
}

function sourceFailureObservation(input: {
  id: string
  registrySourceKey: string
  tier: 1 | 2 | 3
  kind: SemanticSourceObservation['kind']
  sourceClass?: string
  availability: string
  checkState: SourceCheckState
  fallbackReason?: string
  failureCode?: string
  retryableFailure?: boolean
}): SemanticSourceObservation {
  return { ...input, structuredRecords: [] }
}

async function collectStructuredSource(
  input: SourceCollectorInput,
  source: SavedLeadInvestigationPlan['structuredSources'][number],
): Promise<SemanticSourceObservation> {
  const fallbackReason = 'fallbackReasonCode' in source
    ? source.fallbackReasonCode
    : undefined
  if (source.availability !== 'available' || source.checkState !== 'planned') {
    const linked = await input.repository.linkInvestigationSource({
      workspaceId: input.workspaceId,
      runId: input.runId,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      availability: source.availability,
      checkState: source.checkState,
      fallbackReason,
    })
    return sourceFailureObservation({
      id: linked.id,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      kind: 'structured',
      sourceClass: source.sourceClass,
      availability: source.availability,
      checkState: source.checkState,
      fallbackReason,
    })
  }

  const operationKey = `structured:${source.registrySourceKey}`
  const reservation = await input.repository.reserveUsage({
    workspaceId: input.workspaceId,
    runId: input.runId,
    operationKey,
    category: 'structuredCalls',
    units: 1,
  })
  if (reservation.state === 'budget_refused') {
    const linked = await input.repository.linkInvestigationSource({
      workspaceId: input.workspaceId,
      runId: input.runId,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      availability: source.availability,
      checkState: 'skipped_budget',
      fallbackReason: 'structured_source_call_limit',
    })
    return sourceFailureObservation({
      id: linked.id,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      kind: 'structured',
      sourceClass: source.sourceClass,
      availability: source.availability,
      checkState: 'skipped_budget',
      fallbackReason: 'structured_source_call_limit',
    })
  }

  const provider = input.providers.structured[source.registrySourceKey]
  if (!provider) {
    const linked = await input.repository.linkInvestigationSource({
      workspaceId: input.workspaceId,
      runId: input.runId,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      availability: 'unavailable',
      checkState: 'not_checked',
      fallbackReason: 'structured_source_provider_missing',
    })
    return sourceFailureObservation({
      id: linked.id,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      kind: 'structured',
      sourceClass: source.sourceClass,
      availability: 'unavailable',
      checkState: 'not_checked',
      fallbackReason: 'structured_source_provider_missing',
    })
  }

  const result = await provider.execute({
    registrySourceKey: source.registrySourceKey,
    territory: {
      country: input.savedLeadIdentity.countryCode ?? 'US',
      state: input.savedLeadIdentity.state ?? '',
      city: input.savedLeadIdentity.city ?? undefined,
      jurisdictionLabel: input.savedLeadIdentity.city ?? 'saved lead market',
    },
    resultLimit: 25,
    timeoutMs: 8000,
    query: {
      address: input.savedLeadIdentity.address ?? '',
      city: input.savedLeadIdentity.city ?? '',
      state: input.savedLeadIdentity.state ?? '',
      countryCode: input.savedLeadIdentity.countryCode ?? 'US',
    },
  })
  const lineage = await input.repository.recordLineage({
    provider: 'arcgis_feature_service',
    providerRunId: result.runtimeLineageRunId,
    runRole: 'source_adapter_listing',
    status: result.failure ? 'error' : 'ok',
    query: source.registrySourceKey,
    requestMetadata: { registrySourceKey: source.registrySourceKey, tier: 1 },
    responseMetadata: {
      recordCount: result.records.length,
      failureCode: result.failure?.code ?? null,
    },
  })
  await input.repository.creditUsage({
    workspaceId: input.workspaceId,
    runId: input.runId,
    operationKey,
    providerKey: source.registrySourceKey,
    actualUnits: result.usage.requestCount,
    providerRequestCount: result.usage.requestCount,
    providerReportedCredits: result.usage.providerReportedCredits,
  })
  if (result.failure) {
    const linked = await input.repository.linkInvestigationSource({
      workspaceId: input.workspaceId,
      runId: input.runId,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      availability: source.availability,
      checkState: 'failed',
      fallbackReason: result.failure.code,
      runtimeLineageRunId: lineage.id,
    })
    return sourceFailureObservation({
      id: linked.id,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      kind: 'structured',
      sourceClass: source.sourceClass,
      availability: source.availability,
      checkState: 'failed',
      failureCode: result.failure.code,
      retryableFailure: result.failure.retryable,
    })
  }

  const structuredRecords: LinkedStructuredRecord[] = []
  for (const [index, record] of result.records.entries()) {
    const evidence = await input.repository.recordEvidence({
      sourceType: source.registrySourceKey,
      sourceAuthority: result.canonicalAuthority,
      externalId: record.stableExternalId,
      sourceUrl: record.canonicalSourceReference,
      sourceTitle: record.record.permitNumber,
      sourceDate: record.eventDate ?? input.clock(),
      evidenceFingerprint: record.evidenceFingerprint,
      sourceMetadata: record.approvedPublicMetadata,
    })
    const linked = await input.repository.linkInvestigationSource({
      workspaceId: input.workspaceId,
      runId: input.runId,
      registrySourceKey: source.registrySourceKey,
      tier: 1,
      availability: source.availability,
      checkState: 'checked',
      candidateRank: index + 1,
      runtimeLineageRunId: lineage.id,
      evidenceSourceId: evidence.id,
    })
    structuredRecords.push({
      evidence: { ...record, evidenceSourceId: evidence.id },
      investigationSourceId: linked.id,
      evidenceSourceId: evidence.id,
      addressAnchored: true,
    })
  }

  return {
    id: structuredRecords[0]?.investigationSourceId ?? lineage.id,
    registrySourceKey: source.registrySourceKey,
    tier: 1,
    kind: 'structured',
    sourceClass: source.sourceClass,
    availability: source.availability,
    checkState: 'checked',
    structuredRecords,
  }
}

export async function collectSavedLeadInvestigationSources(
  input: SourceCollectorInput,
): Promise<SemanticSourceObservation[]> {
  const observations: SemanticSourceObservation[] = []
  for (const source of input.plan.structuredSources) {
    observations.push(await collectStructuredSource(input, source))
  }
  return observations
}
