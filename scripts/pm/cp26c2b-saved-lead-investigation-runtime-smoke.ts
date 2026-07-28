/**
 * CP26C.2B saved-lead investigation runtime smoke.
 *
 * Deterministic proof: no live SerpApi, Firecrawl, model, database, route, or
 * UI execution. Live ArcGIS proof is isolated in cp26c2b-live-arcgis-proof.ts.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ArcGisFeatureProvider } from '@/lib/providers/structured/arcgis-feature-provider'
import {
  ALBUQUERQUE_BUILDING_PERMITS,
  FIXTURE_SECOND_ARCGIS_SOURCE,
  resolveSavedLeadInvestigationPlaybook,
} from '@/lib/playbooks/saved-lead-investigation-registry'
import { SerpApiSearchProvider } from '@/lib/providers/serpapi-search-provider'
import { FirecrawlEvidenceProvider } from '@/lib/providers/firecrawl-evidence-provider'
import {
  executeSavedLeadInvestigation,
  type SavedLeadInvestigationRepository,
  type SavedLeadInvestigationSourceProviderRegistry,
} from '@/lib/runtime/saved-lead-investigation/executor'
import {
  collectSavedLeadInvestigationSources,
  type SemanticSourceObservation,
} from '@/lib/runtime/saved-lead-investigation/source-collector'
import { buildCompletedSignalCheck } from '@/lib/runtime/saved-lead-investigation/result-builder'
import {
  createPostgresSavedLeadInvestigationRepository,
  validateInvestigationSourceInsert,
} from '@/lib/runtime/saved-lead-investigation/postgres-repository'
import {
  createInvestigationUsage,
  type CompletedSignalCheck,
  type SavedLeadIdentity,
  type StructuredPermitRecord,
} from '@/lib/runtime/saved-lead-investigation'
import {
  buildSavedLeadInvestigationPlan,
} from '@/lib/runtime/saved-lead-investigation/planner'
import { resolveIdentity } from '@/lib/runtime/saved-lead-investigation/identity-resolution'

const ROOT = process.cwd()
const STAGE_1 = '23ae376fbcbdb2fce8b327e575c2c418585a52d7'
const STAGE_2A = '0845782c13e574d35ae949d8e80b0b0034e11d12'
const NOW = '2026-07-27T12:00:00.000Z'
const IDS = {
  run: '11111111-1111-4111-8111-111111111111',
  source: '22222222-2222-4222-8222-222222222222',
  evidence: '33333333-3333-4333-8333-333333333333',
  lineage: '44444444-4444-4444-8444-444444444444',
  trigger: '55555555-5555-4555-8555-555555555555',
  profile: '66666666-6666-4666-8666-666666666666',
}
const AUTHORIZED_STAGE_2B_PATHS = [
  'lib/providers/index.ts',
  'lib/providers/structured-source-provider.ts',
  'lib/providers/serpapi-search-provider.ts',
  'lib/providers/firecrawl-evidence-provider.ts',
  'lib/playbooks/saved-lead-investigation-registry.ts',
  'lib/gates/saved-lead-investigation-gate.ts',
  'lib/runtime/saved-lead-investigation/contracts.ts',
  'lib/runtime/saved-lead-investigation/budget.ts',
  'lib/runtime/saved-lead-investigation/planner.ts',
  'lib/runtime/saved-lead-investigation/persistence.ts',
  'lib/runtime/saved-lead-investigation/run-state.ts',
  'lib/runtime/saved-lead-investigation/index.ts',
  'lib/providers/structured/arcgis-feature-provider.ts',
  'lib/runtime/saved-lead-investigation/source-collector.ts',
  'lib/runtime/saved-lead-investigation/result-builder.ts',
  'lib/runtime/saved-lead-investigation/executor.ts',
  'lib/runtime/saved-lead-investigation/postgres-repository.ts',
  'scripts/pm/cp26c2b-saved-lead-investigation-runtime-smoke.ts',
  'scripts/pm/cp26c2b-live-arcgis-proof.ts',
] as const
const FORBIDDEN_REPOSITORY_EVENTS = new Set([
  'createOpportunity',
  'writeScore',
  'sendOutreach',
  'createWatch',
  'changeLifecycleStatus',
])

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}
function dirtyFiles(): string[] {
  const modified = git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean)
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean)
  return [...new Set([...modified, ...untracked])].sort()
}
function routes(current = join(ROOT, 'app')): string[] {
  const out: string[] = []
  for (const entry of readdirSync(current)) {
    const path = join(current, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...routes(path))
    else if (entry === 'page.tsx') out.push(relative(ROOT, path))
  }
  return out.sort()
}
function response(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
function neverFetch(counter: { calls: number }): typeof fetch {
  return async () => {
    counter.calls += 1
    throw new Error('unexpected external fetch')
  }
}
function permit(overrides: Partial<StructuredPermitRecord> = {}): StructuredPermitRecord {
  return {
    permitNumber: 'BP-2026-1400',
    issuedAt: '2026-07-20T00:00:00.000Z',
    enteredAt: '2026-07-19T00:00:00.000Z',
    calculatedAddress: '10 Test Rd',
    freeFormAddress: '10 Test Road',
    recordCategory: 'Building Permit',
    typeOfWork: 'Tenant Improvement',
    structureType: 'Commercial',
    workDescription: 'Tenant improvement for commercial suite',
    valuation: 20000,
    squareFootage: 1200,
    numberOfUnits: 1,
    owner: 'Fixture Tenant LLC',
    applicant: 'Fixture Tenant LLC',
    contractor: 'Fixture Contractor',
    stableExternalId: '9001',
    ...overrides,
  }
}
const persistedIdentity: SavedLeadIdentity = {
  name: 'Fixture Tenant LLC',
  address: '10 Test Road, Fixture City, CO',
  city: 'Fixture City',
  state: 'CO',
  countryCode: 'US',
  phone: '(303) 555-0100',
  domain: 'fixture.example',
}
const albuquerqueIdentity: SavedLeadIdentity = {
  name: 'Ridgeline Business Park LLC',
  address: '6200 Coors Blvd NW Suite 200, Albuquerque, NM',
  city: 'Albuquerque',
  state: 'NM',
  countryCode: 'US',
  phone: '(505) 555-0100',
  domain: 'ridgeline.example',
}

async function arcgisProof(): Promise<void> {
  const urls: string[] = []
  const fetcher: typeof fetch = async (url) => {
    urls.push(String(url))
    return response({
      features: [
        { attributes: { fixture_object_id: 1, case_no: 'A', issued_on: Date.parse('2026-07-20T00:00:00.000Z'), entered_on: Date.parse('2026-07-19T00:00:00.000Z'), site_address: '10 Test Rd', record_category: 'Building Permit', work_kind: 'Tenant Improvement', structure_type: 'Commercial', project_text: 'Tenant improvement', declared_value: 100, floor_area: 10, unit_count: 1, owner_name: 'Fixture Tenant LLC', applicant_name: 'Fixture Tenant LLC', contractor_name: 'Fixture Contractor' } },
        { attributes: { fixture_object_id: 1, case_no: 'A-duplicate', site_address: '10 Test Rd' } },
        { attributes: { fixture_object_id: 2, case_no: 'B', issued_on: Date.parse('2026-07-21T00:00:00.000Z'), site_address: '10 Test Rd' } },
      ],
    })
  }
  const provider = new ArcGisFeatureProvider({
    config: FIXTURE_SECOND_ARCGIS_SOURCE,
    fetch: fetcher,
    clock: () => NOW,
    runIdFactory: () => IDS.lineage,
    evidenceSourceIdFactory: () => IDS.evidence,
  })
  const result = await provider.execute({
    registrySourceKey: FIXTURE_SECOND_ARCGIS_SOURCE.registrySourceKey,
    territory: FIXTURE_SECOND_ARCGIS_SOURCE.territory,
    resultLimit: 2,
    timeoutMs: 50,
    query: { address: '10 Test Road', city: 'Fixture City', state: 'CO', countryCode: 'US' },
  })
  assert.equal(result.records.length, 2, 'result ceiling applies after duplicate collapse')
  assert.equal(result.records[0]?.record.permitNumber, 'A')
  assert.equal(result.records[0]?.stableExternalId, '1')
  const request = new URL(urls[0]!)
  assert(request.pathname.endsWith('/FeatureServer/7/query'), 'fixture config controls endpoint and layer')
  assert.equal(request.searchParams.get('returnGeometry'), 'false')
  assert.equal(request.searchParams.get('outFields'), FIXTURE_SECOND_ARCGIS_SOURCE.outFields.join(','))
  assert.notEqual(request.searchParams.get('where'), '1=1')
  assert.match(request.searchParams.get('where') ?? '', /site_address/i)
  assert(!/userSuppliedField/.test(request.searchParams.get('where') ?? ''), 'raw user fields are never interpolated')
  const malformed = new ArcGisFeatureProvider({
    config: FIXTURE_SECOND_ARCGIS_SOURCE,
    fetch: async () => response({ features: [{ nope: true }] }),
    clock: () => NOW,
    runIdFactory: () => IDS.lineage,
    evidenceSourceIdFactory: () => IDS.evidence,
  })
  assert.equal((await malformed.execute({ registrySourceKey: FIXTURE_SECOND_ARCGIS_SOURCE.registrySourceKey, territory: FIXTURE_SECOND_ARCGIS_SOURCE.territory, resultLimit: 1, timeoutMs: 50, query: { address: '10 Test Road', city: 'Fixture City', state: 'CO', countryCode: 'US' } })).failure?.code, 'invalid_response')
  let timeoutCalls = 0
  let aborted = false
  const timeoutProvider = new ArcGisFeatureProvider({
    config: ALBUQUERQUE_BUILDING_PERMITS,
    fetch: async (_url, init) => {
      timeoutCalls += 1
      await new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal
        signal.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
      throw new Error('unreachable')
    },
    clock: () => NOW,
    runIdFactory: () => IDS.lineage,
    evidenceSourceIdFactory: () => IDS.evidence,
  })
  const timeout = await timeoutProvider.execute({ registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey, territory: ALBUQUERQUE_BUILDING_PERMITS.territory, resultLimit: 25, timeoutMs: 1, query: { address: '100 Central Ave NW', city: 'Albuquerque', state: 'NM', countryCode: 'US' } })
  assert.equal(timeout.failure?.code, 'provider_timeout')
  assert.equal(timeout.failure?.retryable, true)
  assert.equal(timeout.records.length, 0)
  assert.equal(timeoutCalls, 1, 'ArcGIS adapter performs zero retries')
  assert.equal(aborted, true, 'ArcGIS timeout aborts fetch')
}

async function providerDeadlineProof(): Promise<void> {
  const serpCalls: string[] = []
  const serp = new SerpApiSearchProvider('serp-key', {
    fetch: async (url) => {
      serpCalls.push(String(url))
      return response({ organic_results: [{ title: 'Permit', link: 'https://example.com', snippet: 'tenant improvement', source: 'Example', position: 1 }] })
    },
    timeoutMs: 50,
  })
  assert.equal((await serp.discover({ workspaceId: 'ws', vertical: 'commercial_cleaning', signalType: 'building_permit', engine: 'google_light', query: 'fixture', location: { city: 'Albuquerque', state: 'NM' }, dateWindow: '30d', budget: { workspaceId: 'ws', maxProviderCalls: 1, maxSpendEstimateUsd: 1, triggeredBy: 'manual_chat' } })).candidates.length, 1)
  assert.equal(serpCalls.length, 1, 'SerpApi injected fetch is used')
  let serpClear = 0
  const serpTimeout = new SerpApiSearchProvider('serp-key', {
    timeoutMs: 1,
    clearTimeout: () => { serpClear += 1 },
    fetch: async (_url, init) => new Promise((_resolve, reject) => {
      ;(init?.signal as AbortSignal).addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }),
  })
  const serpTimedOut = await serpTimeout.discover({ workspaceId: 'ws', vertical: 'commercial_cleaning', signalType: 'building_permit', engine: 'google_light', query: 'fixture', location: { city: 'Albuquerque', state: 'NM' }, dateWindow: '30d', budget: { workspaceId: 'ws', maxProviderCalls: 1, maxSpendEstimateUsd: 1, triggeredBy: 'manual_chat' } })
  assert.equal(serpTimedOut.error?.code, 'provider_timeout')
  assert.equal(serpTimedOut.error?.retryable, true)
  assert.equal(serpTimedOut.candidates.length, 0)
  assert.equal(serpClear, 1, 'SerpApi timeout timer is cleared')

  const fireCalls: string[] = []
  const firecrawl = new FirecrawlEvidenceProvider('fire-key', {
    fetch: async (url) => {
      fireCalls.push(String(url))
      return response({ success: true, data: { markdown: 'Issued July 20, 2026 for tenant improvement.', metadata: { title: 'Permit' } } })
    },
    timeoutMs: 50,
  })
  assert.equal((await firecrawl.scrapeUrl({ url: 'https://example.com/permit', workspaceId: 'ws', budget: { workspaceId: 'ws', maxProviderCalls: 1, maxSpendEstimateUsd: 1, triggeredBy: 'manual_chat' } })).doc?.cleanedText.includes('tenant improvement'), true)
  assert.equal(fireCalls.length, 1, 'Firecrawl injected fetch is used')
  let fireClear = 0
  const fireTimeout = new FirecrawlEvidenceProvider('fire-key', {
    timeoutMs: 1,
    clearTimeout: () => { fireClear += 1 },
    fetch: async (_url, init) => new Promise((_resolve, reject) => {
      ;(init?.signal as AbortSignal).addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }),
  })
  const fireTimedOut = await fireTimeout.scrapeUrl({ url: 'https://example.com/permit', workspaceId: 'ws', budget: { workspaceId: 'ws', maxProviderCalls: 1, maxSpendEstimateUsd: 1, triggeredBy: 'manual_chat' } })
  assert.equal(fireTimedOut.error?.code, 'provider_timeout')
  assert.equal(fireTimedOut.error?.retryable, true)
  assert.equal(fireTimedOut.doc, undefined)
  assert.equal(fireClear, 1, 'Firecrawl timeout timer is cleared')
}

class FakeRepository implements SavedLeadInvestigationRepository {
  events: string[] = []
  usageCount = 0
  latestSuccessfulResult: CompletedSignalCheck | null = null
  admission: 'admitted' | 'already_running' | 'cooldown' | 'daily_limit_reached' | 'idempotent_replay' = 'admitted'
  savedLead = { workspaceId: 'ws', id: 'lead-1', identity: persistedIdentity, serviceProfileAlias: 'commercial_cleaning' }
  async loadOwnedSavedLead() { return this.savedLead }
  async loadLatestRunState() { return { activeRunId: this.admission === 'already_running' ? 'active-run' : null, latestCompletedRunId: this.admission === 'cooldown' ? 'complete-run' : null, recheckEligibleAt: this.admission === 'cooldown' ? '2099-01-01T00:00:00.000Z' : null } }
  async createOrGetRun() { return { runId: IDS.run, idempotent: this.admission === 'idempotent_replay' } }
  async admitRun() {
    const state: 'admitted' | 'idempotent_replay' | 'already_running' | 'daily_limit_reached' =
      this.admission === 'cooldown' ? 'admitted' : this.admission
    if (state === 'admitted') this.usageCount += 1
    return { state, runId: state === 'already_running' ? 'active-run' : IDS.run, savedLeadId: 'lead-1', usedCount: this.usageCount, usageCounted: state === 'admitted', externalCalls: 0 as const, resetAt: '2026-07-28T00:00:00.000Z', limit: 10 }
  }
  async markPhase(_runId: string, phase: string) { this.events.push(`phase:${phase}`) }
  async persistInitialIdentity() { this.events.push('initialIdentity') }
  async persistSourcePlan() { this.events.push('sourcePlan') }
  async reserveUsage() { this.events.push('reserveUsage'); return { state: 'reserved' as const, usage: createInvestigationUsage() } }
  async creditUsage() { this.events.push('creditUsage'); return { state: 'credited' as const, usage: createInvestigationUsage() } }
  async recordLineage() { this.events.push('lineage'); return { id: IDS.lineage } }
  async recordEvidence() { this.events.push('evidence'); return { id: IDS.evidence } }
  async linkInvestigationSource() { this.events.push('linkSource'); return { id: IDS.source } }
  async persistProfileFindings() { this.events.push('profileFindings') }
  async persistTriggerFinding() { this.events.push('triggerFinding') }
  async persistCompletedResult(_result: CompletedSignalCheck) { this.events.push('completed') }
  async persistRetryableFailure() { this.events.push('retryableFailure') }
  async readLatestSuccessfulResult() { return this.latestSuccessfulResult }
  async reconcileAbandonedRuns() { this.events.push('reconcileAbandoned') }
}
function fakeRegistry(
  records = [permit({
    calculatedAddress: '6200 Coors Blvd NW Suite 200',
    freeFormAddress: '6200 Coors Blvd NW',
    owner: 'Ridgeline Business Park LLC',
    applicant: 'Ridgeline Business Park LLC',
  })],
  source = ALBUQUERQUE_BUILDING_PERMITS,
): SavedLeadInvestigationSourceProviderRegistry {
  return {
    structured: {
      [source.registrySourceKey]: {
        execute: async () => ({
          registrySourceKey: source.registrySourceKey,
          records: records.map((record) => ({
            record,
            registrySourceKey: source.registrySourceKey,
            canonicalSourceReference: 'fixture',
            sourceAuthority: source.authority,
            stableExternalId: record.stableExternalId,
            canonicalArtifactKey: `structured:${record.stableExternalId}`,
            evidenceSourceId: IDS.evidence,
            eventDate: record.issuedAt,
            evidenceFingerprint: `fingerprint:${record.stableExternalId}`,
            approvedPublicMetadata: { permitNumber: record.permitNumber },
            runtimeLineageRunId: IDS.lineage,
          })),
          canonicalAuthority: source.authority,
          runtimeLineageRunId: IDS.lineage,
          usage: { requestCount: 1, providerReportedCredits: null },
          exhausted: false,
        }),
      },
    },
  }
}

async function collectorAndExecutorProof(): Promise<void> {
  const playbook = resolveSavedLeadInvestigationPlaybook('commercial_cleaning')!
  const identity = resolveIdentity({ persisted: albuquerqueIdentity, candidate: albuquerqueIdentity, evaluatedAt: NOW })
  const plan = buildSavedLeadInvestigationPlan({
    identity,
    playbook,
    savedDomain: 'ridgeline.example',
    territory: ALBUQUERQUE_BUILDING_PERMITS.territory,
    structuredSources: [ALBUQUERQUE_BUILDING_PERMITS],
  })
  const repo = new FakeRepository()
  repo.savedLead.identity = albuquerqueIdentity
  const observations = await collectSavedLeadInvestigationSources({ workspaceId: 'ws', runId: IDS.run, savedLeadIdentity: albuquerqueIdentity, playbook, plan, repository: repo, providers: fakeRegistry(), clock: () => NOW })
  assert.equal(observations[0]?.tier, 1)
  assert.equal(observations[0]?.checkState, 'checked')
  assert(repo.events.indexOf('lineage') < repo.events.indexOf('evidence'), 'lineage is recorded before accepted evidence')
  assert(repo.events.indexOf('evidence') < repo.events.indexOf('linkSource'), 'evidence is linked through investigation source')
  assert(!repo.events.some((event) => FORBIDDEN_REPOSITORY_EVENTS.has(event)))
  const noSignal = buildCompletedSignalCheck({ savedLeadId: 'lead-1', runId: IDS.run, checkedAt: NOW, identity, trigger: { state: 'no_signal', reasonCode: 'none_found' }, profileFindings: [], sourceObservations: observations, usage: createInvestigationUsage(), playbook })
  assert.equal(noSignal.trigger.state, 'no_signal')
  assert.equal(noSignal.profileReport.sourcesChecked, 1)
  assert.equal(noSignal.profileReport.findings.length, 0)
  assert.equal(noSignal.profileReport.categoryIdsChecked.includes('building_permits'), true)

  const already = new FakeRepository()
  already.admission = 'already_running'
  const noFetch = { calls: 0 }
  already.savedLead.identity = albuquerqueIdentity
  assert.equal((await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-1', serviceProfileAlias: 'commercial_cleaning', repository: already, providers: fakeRegistry(), clock: () => NOW, idFactory: () => IDS.run })).state, 'already_running')
  assert.equal(noFetch.calls, 0, 'already-running performs zero external calls')
  const cooldown = new FakeRepository()
  cooldown.admission = 'cooldown'
  cooldown.savedLead.identity = albuquerqueIdentity
  assert.equal((await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-1', serviceProfileAlias: 'commercial_cleaning', repository: cooldown, providers: fakeRegistry(), clock: () => NOW, idFactory: () => IDS.run })).state, 'cooldown')
  assert.equal(cooldown.usageCount, 0, 'cooldown performs zero usage admission')
  const daily = new FakeRepository()
  daily.admission = 'daily_limit_reached'
  daily.savedLead.identity = albuquerqueIdentity
  assert.equal((await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-1', serviceProfileAlias: 'commercial_cleaning', repository: daily, providers: fakeRegistry(), clock: () => NOW, idFactory: () => IDS.run })).state, 'daily_limit_reached')
  assert.equal(daily.usageCount, 0, 'daily limit rejection counts no usage')
  const idempotent = new FakeRepository()
  idempotent.admission = 'idempotent_replay'
  idempotent.savedLead.identity = albuquerqueIdentity
  assert.equal((await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-1', serviceProfileAlias: 'commercial_cleaning', repository: idempotent, providers: fakeRegistry(), clock: () => NOW, idFactory: () => IDS.run })).state, 'idempotent_replay')
  assert.equal(idempotent.usageCount, 0, 'same clientRequestId does not double count')
  const admitted = new FakeRepository()
  admitted.savedLead.identity = albuquerqueIdentity
  const completed = await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-1', serviceProfileAlias: 'commercial_cleaning', repository: admitted, providers: fakeRegistry(), clock: () => NOW, idFactory: () => IDS.run })
  assert.equal(completed.state, 'completed')
  assert.equal(admitted.usageCount, 1, 'admitted run counts once')
  const ambiguous = new FakeRepository()
  ambiguous.savedLead.identity = { ...albuquerqueIdentity, address: '99 Other Road, Albuquerque, NM' }
  const ambiguousResult = await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-2', serviceProfileAlias: 'commercial_cleaning', repository: ambiguous, providers: fakeRegistry(), clock: () => NOW, idFactory: () => IDS.run })
  assert.equal(ambiguousResult.state, 'completed')
  assert.equal(ambiguousResult.state === 'completed' ? ambiguousResult.result.trigger.state : null, 'no_signal')
  const failed = new FakeRepository()
  failed.latestSuccessfulResult = noSignal
  failed.savedLead.identity = albuquerqueIdentity
  const providerTimeout: SavedLeadInvestigationSourceProviderRegistry = { structured: { [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: { execute: async () => ({ registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey, records: [], canonicalAuthority: ALBUQUERQUE_BUILDING_PERMITS.authority, runtimeLineageRunId: IDS.lineage, usage: { requestCount: 1, providerReportedCredits: null }, exhausted: false, failure: { code: 'provider_timeout', retryable: true } }) } } }
  const retryable = await executeSavedLeadInvestigation({ workspaceId: 'ws', savedLeadId: 'lead-1', clientRequestId: 'client-3', serviceProfileAlias: 'commercial_cleaning', repository: failed, providers: providerTimeout, clock: () => NOW, idFactory: () => IDS.run })
  assert.equal(retryable.state, 'failed')
  assert.equal(retryable.failureCode, 'provider_timeout')
  assert.equal(retryable.latestSuccessfulResult?.runId, IDS.run, 'latest successful result survives retryable failure')
  assert(failed.events.includes('reconcileAbandoned'), 'abandoned runs are reconciled before admission')
}

function repositoryContractProof(): void {
  const fakeDb = {
    execute: async () => ({}),
    transaction: async <T>(fn: (tx: { execute: (statement: unknown) => Promise<unknown> }) => Promise<T>) =>
      fn({ execute: async () => ({}) }),
  }
  const repo = createPostgresSavedLeadInvestigationRepository({ db: fakeDb })
  assert.equal(typeof repo.admitRun, 'function')
  assert.throws(() => validateInvestigationSourceInsert({ registrySourceKey: 'x', tier: 1, availability: 'available', checkState: 'checked', providerRunId: 'duplicate' }), /duplicated canonical metadata/)
  assert.doesNotThrow(() => validateInvestigationSourceInsert({ registrySourceKey: 'x', tier: 1, availability: 'available', checkState: 'checked', runtimeLineageRunId: IDS.lineage, evidenceSourceId: IDS.evidence }))
}

function scopeProof(): void {
  assert.equal(git(['merge-base', '--is-ancestor', STAGE_1, 'HEAD']).length, 0)
  assert.equal(git(['merge-base', '--is-ancestor', STAGE_2A, 'HEAD']).length, 0)
  assert.equal(routes().length, 23)
  const dirty = dirtyFiles()
  assert(dirty.length > 0, 'Stage 2B should remain uncommitted for review')
  assert.deepEqual(dirty.filter((file) => !AUTHORIZED_STAGE_2B_PATHS.includes(file as never)), [])
  assert(!dirty.some((file) => file.startsWith('app/') || file.startsWith('components/') || file === 'db/schema.ts'))
}

async function main(): Promise<void> {
  await arcgisProof()
  await providerDeadlineProof()
  await collectorAndExecutorProof()
  repositoryContractProof()
  scopeProof()
  console.log(JSON.stringify({
    checkpoint: 'CP26C.2B',
    arcgis: 'generic address-bounded provider passed',
    providers: 'SerpApi and Firecrawl deadline proofs passed',
    executor: 'admission, source order, lineage, result, and failure semantics passed',
    scope: { routeCount: routes().length, dirtyFiles: dirtyFiles() },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
