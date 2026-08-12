/**
 * CP26C.2B.3 real-Postgres source replay and usage regression smoke.
 *
 * This script refuses to run without explicit proof-branch guards. It never
 * prints DATABASE_URL and only creates deterministic cp26c2b3-db-proof-
 * fixtures, which are cleaned in FK-safe order.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  createInvestigationUsage,
  executeSavedLeadInvestigation,
  type CompletedSignalCheck,
  type IdentityResolution,
  type InvestigationUsageSnapshot,
  type SavedLeadProfileFinding,
} from '@/lib/runtime/saved-lead-investigation'
import {
  createPostgresSavedLeadInvestigationRepository,
} from '@/lib/runtime/saved-lead-investigation/postgres-repository'
import {
  ALBUQUERQUE_BUILDING_PERMITS,
  resolveSavedLeadInvestigationPlaybook,
  type SavedLeadInvestigationPlaybook,
} from '@/lib/playbooks/saved-lead-investigation-registry'
import {
  createStructuredPermitEvidenceRecord,
  type StructuredPermitRecord,
  type StructuredSourceProvider,
} from '@/lib/providers/structured-source-provider'

const PREFIX = 'cp26c2b3-db-proof-'
const EXPECTED_PROJECT_ID = 'plain-king-65928893'
const EXPECTED_BRANCH_ID = 'br-fancy-wildflower-ah7d82zr'
const PARENT_BRANCH_ID = 'br-orange-dawn-ahhq1jyw'
const REPORT_PATH = '/private/tmp/cp26c2b3-source-replay-proof.json'
const NOW = '2026-08-05T12:00:00.000Z'
const RECHECK = '2026-08-12T12:00:00.000Z'
const EXPIRES = '2026-09-04T12:00:00.000Z'

type Db = ReturnType<typeof drizzle>
type Repo = ReturnType<typeof createPostgresSavedLeadInvestigationRepository>

function rows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  if (
    typeof result === 'object' &&
    result !== null &&
    'rows' in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows as Record<string, unknown>[]
  }
  return []
}

function countRows(result: unknown): number {
  return Number(rows(result)[0]?.count ?? 0)
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function maskHost(host: string): string {
  return host.replace(/^ep-[^.]+/, 'ep-***')
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function uuid(sequence: number): string {
  return `26263${String(sequence).padStart(3, '0')}-0000-4000-8000-${String(sequence).padStart(12, '0')}`
}

function validateEnvironment() {
  assert.equal(process.env.CP26C2B3_DB_PROOF, '1')
  assert.equal(process.env.CP26C2B3_EXPECTED_PROJECT_ID, EXPECTED_PROJECT_ID)
  assert.equal(process.env.CP26C2B3_EXPECTED_BRANCH_ID, EXPECTED_BRANCH_ID)
  assert.equal(process.env.CP26C2B3_PARENT_BRANCH_ID, PARENT_BRANCH_ID)
  assert.equal(process.env.CP26C2B3_PROOF_PREFIX, PREFIX)
  const databaseUrl = requireEnv('DATABASE_URL')
  const allowedHost = requireEnv('CP26C2B3_ALLOWED_HOST')
  const parsed = new URL(databaseUrl)
  assert.equal(parsed.hostname, allowedHost)
  assert.match(parsed.hostname, /\.neon\.tech$/)
  assert.equal(parsed.pathname.replace(/^\//, ''), 'neondb')
  return { databaseUrl, allowedHost }
}

async function cleanup(db: Db) {
  await db.execute(sql`delete from saved_lead_profile_findings where workspace_id like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from saved_lead_trigger_findings where workspace_id like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from saved_lead_investigation_sources where workspace_id like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from saved_lead_investigation_state where workspace_id like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from saved_lead_investigation_runs where workspace_id like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from saved_lead_investigation_daily_usage where workspace_id like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from runtime_lineage_runs where provider_run_id like ${`${PREFIX}%`} or source_url like ${`${PREFIX}%`} or query like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from evidence_sources where external_id like ${`${PREFIX}%`} or source_url like ${`${PREFIX}%`} or evidence_fingerprint like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from saved_leads where workspace_id like ${`${PREFIX}%`} or user_id like ${`${PREFIX}%`} or dedupe_key like ${`${PREFIX}%`} or business_name like ${`${PREFIX}%`}`)
  await db.execute(sql`delete from workspace_settings where workspace_id like ${`${PREFIX}%`} or owner_user_id like ${`${PREFIX}%`} or business_name like ${`${PREFIX}%`}`)
}

async function remainingProofRows(db: Db) {
  return rows(await db.execute(sql`
    select
      (select count(*)::int from workspace_settings where workspace_id like ${`${PREFIX}%`} or owner_user_id like ${`${PREFIX}%`} or business_name like ${`${PREFIX}%`}) as workspace_settings,
      (select count(*)::int from saved_leads where workspace_id like ${`${PREFIX}%`} or user_id like ${`${PREFIX}%`} or dedupe_key like ${`${PREFIX}%`} or business_name like ${`${PREFIX}%`}) as saved_leads,
      (select count(*)::int from saved_lead_investigation_daily_usage where workspace_id like ${`${PREFIX}%`}) as daily_usage,
      (select count(*)::int from saved_lead_investigation_runs where workspace_id like ${`${PREFIX}%`}) as runs,
      (select count(*)::int from saved_lead_investigation_state where workspace_id like ${`${PREFIX}%`}) as state,
      (select count(*)::int from saved_lead_investigation_sources where workspace_id like ${`${PREFIX}%`}) as sources,
      (select count(*)::int from saved_lead_trigger_findings where workspace_id like ${`${PREFIX}%`}) as triggers,
      (select count(*)::int from saved_lead_profile_findings where workspace_id like ${`${PREFIX}%`}) as profiles,
      (select count(*)::int from runtime_lineage_runs where provider_run_id like ${`${PREFIX}%`} or source_url like ${`${PREFIX}%`} or query like ${`${PREFIX}%`}) as lineage,
      (select count(*)::int from evidence_sources where external_id like ${`${PREFIX}%`} or source_url like ${`${PREFIX}%`} or evidence_fingerprint like ${`${PREFIX}%`}) as evidence
  `))[0]
}

async function ensureSchemaGate(db: Db) {
  const expectedTables = [
    'saved_lead_investigation_daily_usage',
    'saved_lead_investigation_runs',
    'saved_lead_investigation_state',
    'saved_lead_investigation_sources',
    'saved_lead_trigger_findings',
    'saved_lead_profile_findings',
  ]
  const tableCount = countRows(await db.execute(sql`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `))
  const investigationCount = countRows(await db.execute(sql`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${expectedTables}
  `))
  const savedLeadsIndex = countRows(await db.execute(sql`
    select count(*)::int as count
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'saved_leads'
      and indexname = 'saved_leads_workspace_id_unique'
  `))
  const identityMatchKeysColumn = countRows(await db.execute(sql`
    select count(*)::int as count
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_lead_profile_findings'
      and column_name = 'identity_match_keys'
  `))
  assert.equal(tableCount, 51, 'proof branch must have 51 public tables')
  assert.equal(investigationCount, 6, 'proof branch must have six investigation tables')
  assert.equal(savedLeadsIndex, 1, 'proof branch must have saved_leads_workspace_id_unique')
  return { tableCount, investigationCount, savedLeadsIndex, identityMatchKeysColumn }
}

async function insertWorkspace(db: Db, workspaceId: string) {
  await db.execute(sql`
    insert into workspace_settings (workspace_id, owner_user_id, business_name, is_approved, onboarding_step)
    values (${workspaceId}, ${`${workspaceId}-user`}, ${`${workspaceId}-business`}, true, 4)
  `)
}

async function insertLead(db: Db, workspaceId: string, id: string, label: string) {
  await db.execute(sql`
    insert into saved_leads
      (id, workspace_id, user_id, dedupe_key, business_name, phone, address, market, source, category, lifecycle_status, raw_lead)
    values
      (${id}::uuid, ${workspaceId}, ${`${workspaceId}-user`}, ${`${workspaceId}-${label}`}, ${`${workspaceId}-${label}`}, ${'(505) 555-0100'}, ${'6200 Coors Blvd NW Suite 200'}, ${'Albuquerque, NM'}, ${'Google Maps'}, ${'commercial_cleaning'}, 'saved', '{}'::jsonb)
  `)
}

function identity(matchedOn: IdentityResolution['matchedOn'] = ['address']): IdentityResolution {
  return {
    state: 'resolved',
    confidence: 0.97,
    matchedOn,
    conflicts: [],
    reasonCodes: ['address_match'],
    evaluatedAt: NOW,
  }
}

function basePermit(suffix: string, issuedAt: string): StructuredPermitRecord {
  return {
    permitNumber: `${PREFIX}${suffix}-permit`,
    issuedAt,
    enteredAt: issuedAt,
    calculatedAddress: '6200 Coors Blvd NW Suite 200',
    freeFormAddress: '6200 Coors Blvd NW Suite 200',
    recordCategory: 'Commercial',
    typeOfWork: 'Tenant improvement',
    structureType: 'Office',
    workDescription: 'Interior tenant improvement for cleaning contractor.',
    valuation: 125000,
    squareFootage: 4500,
    numberOfUnits: 1,
    owner: `${PREFIX}${suffix}-owner`,
    applicant: `${PREFIX}${suffix}-applicant`,
    contractor: `${PREFIX}${suffix}-contractor`,
    stableExternalId: `${PREFIX}${suffix}-permit`,
  }
}

function structuredProvider(input: {
  label: string
  records: StructuredPermitRecord[]
}) {
  let requestCount = 0
  const provider: Pick<StructuredSourceProvider<StructuredPermitRecord>, 'execute'> = {
    async execute(request) {
      requestCount += 1
      const records = input.records.map((record, index) =>
        createStructuredPermitEvidenceRecord({
          record,
          registrySourceKey: request.registrySourceKey,
          canonicalSourceReference: `${PREFIX}${input.label}-${index}-source-url`,
          sourceAuthority: 'City of Albuquerque Planning Department',
          evidenceSourceId: uuid(800 + index),
          runtimeLineageRunId: uuid(900 + index),
          eventDate: record.issuedAt
            ? new Date(record.issuedAt).toISOString()
            : null,
        }),
      )
      return {
        registrySourceKey: request.registrySourceKey,
        records,
        canonicalAuthority: 'City of Albuquerque Planning Department',
        runtimeLineageRunId: `${PREFIX}${input.label}-lineage-run`,
        usage: {
          requestCount: 1,
          providerReportedCredits: 1,
        },
        exhausted: false,
      }
    },
  }
  return { provider, requestCount: () => requestCount }
}

async function executeWithProvider(input: {
  db: Db
  repo: Repo
  label: string
  leadId: string
  idStart: number
  provider?: Pick<StructuredSourceProvider<StructuredPermitRecord>, 'execute'>
}) {
  const workspaceId = `${PREFIX}${input.label}`
  await insertWorkspace(input.db, workspaceId)
  await insertLead(input.db, workspaceId, input.leadId, input.label)
  let sequence = input.idStart
  const result = await executeSavedLeadInvestigation({
    workspaceId,
    savedLeadId: input.leadId,
    clientRequestId: `${workspaceId}-client`,
    repository: input.repo,
    providers: {
      structured: input.provider
        ? { [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: input.provider }
        : {},
    },
    structuredSourceConfigs: [ALBUQUERQUE_BUILDING_PERMITS],
    clock: () => NOW,
    idFactory: () => uuid(sequence++),
  })
  assert.equal(result.state, 'completed')
  if (result.state !== 'completed') throw new Error(`${input.label} did not complete`)
  const replay = await input.repo.readLatestSuccessfulResult({
    workspaceId,
    savedLeadId: input.leadId,
  })
  return { workspaceId, result: result.result, replay }
}

async function sourceRows(db: Db, workspaceId: string, runId: string) {
  return rows(await db.execute(sql`
    select registry_source_key, check_state, availability, candidate_rank
    from saved_lead_investigation_sources
    where workspace_id = ${workspaceId}
      and investigation_run_id = ${runId}::uuid
    order by candidate_rank nulls first, registry_source_key
  `))
}

function targetRows(persistedSources: Record<string, unknown>[]) {
  return persistedSources.filter(
    (row) => row.registry_source_key === ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
  )
}

function assertReplayEqual(
  label: string,
  expected: CompletedSignalCheck,
  replay: CompletedSignalCheck | null,
  extra: Record<string, unknown>,
) {
  try {
    assert.deepEqual(replay, expected)
  } catch {
    throw new Error(`${label} replay mismatch ${JSON.stringify({
      expectedHash: stableHash(expected),
      replayHash: stableHash(replay),
      expectedSourcesChecked: expected.profileReport.sourcesChecked,
      replaySourcesChecked: replay?.profileReport.sourcesChecked ?? null,
      expectedStructuredSourcesChecked: expected.profileReport.structuredSourcesChecked,
      replayStructuredSourcesChecked: replay?.profileReport.structuredSourcesChecked ?? null,
      expectedCheckedSourceKeys: expected.profileReport.checkedSourceKeys,
      replayCheckedSourceKeys: replay?.profileReport.checkedSourceKeys ?? null,
      expectedProfileMatchedOn: expected.profileReport.findings.map((finding) => finding.identityMatch.matchedOn),
      replayProfileMatchedOn: replay?.profileReport.findings.map((finding) => finding.identityMatch.matchedOn) ?? null,
      ...extra,
    })}`)
  }
}

async function zeroRecordSourceReplayProof(db: Db, repo: Repo) {
  const fixture = structuredProvider({ label: 'zero', records: [] })
  const { workspaceId, result, replay } = await executeWithProvider({
    db,
    repo,
    label: 'zero',
    leadId: uuid(101),
    idStart: 200,
    provider: fixture.provider,
  })
  const persistedSources = await sourceRows(db, workspaceId, result.runId)
  assert.equal(fixture.requestCount(), 1)
  assert.equal(result.profileReport.sourcesChecked, 1)
  assert.equal(result.profileReport.structuredSourcesChecked, 1)
  assert.equal(result.profileReport.checkedSourceKeys.length, 1)
  assert.equal(result.profileReport.usage.structuredCalls, 1)
  assert.equal(
    result.profileReport.usage.providerRequestCounts[ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey],
    1,
  )
  assertReplayEqual('zero-record source', result, replay, {
    providerRequestCount: fixture.requestCount(),
    persistedSourceRows: persistedSources.length,
    targetSourceRows: targetRows(persistedSources).length,
    targetPrimaryCheckedSourceRows: targetRows(persistedSources).filter(
      (row) => row.candidate_rank === null && row.check_state === 'checked',
    ).length,
  })
  return {
    providerRequestCount: fixture.requestCount(),
    persistedSources,
    resultHash: stableHash(result),
    replayHash: stableHash(replay),
  }
}

async function multiRecordSourceReplayProof(db: Db, repo: Repo) {
  const fixture = structuredProvider({
    label: 'multi',
    records: [
      basePermit('multi-1', '2026-08-01'),
      basePermit('multi-2', '2026-08-02'),
    ],
  })
  const { workspaceId, result, replay } = await executeWithProvider({
    db,
    repo,
    label: 'multi',
    leadId: uuid(102),
    idStart: 300,
    provider: fixture.provider,
  })
  const persistedSources = await sourceRows(db, workspaceId, result.runId)
  assert.equal(fixture.requestCount(), 1)
  assert.equal(result.profileReport.sourcesChecked, 1)
  assert.equal(result.profileReport.structuredSourcesChecked, 1)
  assert.equal(result.profileReport.checkedSourceKeys.length, 1)
  assertReplayEqual('multi-record source', result, replay, {
    providerRequestCount: fixture.requestCount(),
    persistedSourceRows: persistedSources.length,
    targetSourceRows: targetRows(persistedSources).length,
    targetPrimaryCheckedSourceRows: targetRows(persistedSources).filter(
      (row) => row.candidate_rank === null && row.check_state === 'checked',
    ).length,
    targetCandidateRows: targetRows(persistedSources).filter((row) => row.candidate_rank !== null).length,
  })
  return {
    providerRequestCount: fixture.requestCount(),
    persistedSources,
    resultHash: stableHash(result),
    replayHash: stableHash(replay),
  }
}

async function createAdmittedRun(input: {
  repo: Repo
  db: Db
  playbook: SavedLeadInvestigationPlaybook
  workspaceId: string
  leadId: string
  runId: string
  label: string
}) {
  await insertWorkspace(input.db, input.workspaceId)
  await insertLead(input.db, input.workspaceId, input.leadId, input.label)
  await input.repo.createOrGetRun({
    workspaceId: input.workspaceId,
    savedLeadId: input.leadId,
    runId: input.runId,
    clientRequestId: `${input.workspaceId}-${input.label}-client`,
    playbook: input.playbook,
  })
  const admission = await input.repo.admitRun({
    workspaceId: input.workspaceId,
    savedLeadId: input.leadId,
    runId: input.runId,
    clientRequestId: `${input.workspaceId}-${input.label}-client`,
  })
  assert.equal(admission.state, 'admitted')
}

async function createPrimarySourceArtifact(input: {
  repo: Repo
  workspaceId: string
  runId: string
  suffix: string
}) {
  const lineage = await input.repo.recordLineage({
    provider: 'arcgis_feature_service',
    providerRunId: `${PREFIX}${input.suffix}-provider-run`,
    runRole: 'source_adapter_listing',
    status: 'ok',
    sourceUrl: `${PREFIX}${input.suffix}-lineage-url`,
    query: `${PREFIX}${input.suffix}-query`,
    requestMetadata: { registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey },
    responseMetadata: { recordCount: 1 },
  })
  const evidence = await input.repo.recordEvidence({
    sourceType: `${PREFIX}${input.suffix}-source-type`,
    sourceAuthority: 'City of Albuquerque Planning Department',
    externalId: `${PREFIX}${input.suffix}-external-id`,
    sourceUrl: `${PREFIX}${input.suffix}-source-url`,
    sourceTitle: `${PREFIX}${input.suffix}-permit`,
    sourceDate: NOW,
    evidenceFingerprint: `${PREFIX}${input.suffix}-fingerprint`,
    sourceMetadata: { permitNumber: `${PREFIX}${input.suffix}-permit` },
  })
  const source = await input.repo.linkInvestigationSource({
    workspaceId: input.workspaceId,
    runId: input.runId,
    registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    tier: 1,
    availability: 'available',
    checkState: 'checked',
    candidateRank: null,
    runtimeLineageRunId: lineage.id,
    evidenceSourceId: evidence.id,
  })
  return { lineage, evidence, source }
}

function profileFinding(input: {
  id: string
  sourceId: string
  evidenceId: string
  factKey: SavedLeadProfileFinding['factKey']
  value: string
  matchedOn: SavedLeadProfileFinding['identityMatch']['matchedOn']
}): SavedLeadProfileFinding {
  return {
    id: input.id,
    factKey: input.factKey,
    value: input.value,
    investigationSourceId: input.sourceId,
    evidenceSourceId: input.evidenceId,
    exactExcerpt: `Official record confirms ${input.factKey}.`,
    structuredEvidenceSnapshot: {
      schemaId: 'structured_permit_record_v1',
      fields: {
        permitNumber: `${PREFIX}matched-on-permit`,
        issuedAt: '2026-08-04',
        calculatedAddress: '6200 Coors Blvd NW Suite 200',
        recordCategory: 'Commercial',
        typeOfWork: 'Tenant improvement',
        stableExternalId: `${PREFIX}matched-on-permit`,
      },
    },
    observedAt: NOW,
    eventDate: '2026-08-04T00:00:00.000Z',
    identityMatch: {
      matchedOn: input.matchedOn,
      reasonCodes: ['address_match'],
    },
  }
}

function completedProfileResult(input: {
  savedLeadId: string
  runId: string
  sourceId: string
  evidenceId: string
  playbook: SavedLeadInvestigationPlaybook
}): CompletedSignalCheck {
  return {
    status: 'completed',
    savedLeadId: input.savedLeadId,
    runId: input.runId,
    checkedAt: NOW,
    identity: identity(['address', 'name', 'phone']),
    trigger: { state: 'no_signal', reasonCode: 'none_found' },
    profileReport: {
      findings: [
        profileFinding({
          id: uuid(501),
          sourceId: input.sourceId,
          evidenceId: input.evidenceId,
          factKey: 'latest_permit_date',
          value: '2026-08-04',
          matchedOn: ['address'],
        }),
        profileFinding({
          id: uuid(502),
          sourceId: input.sourceId,
          evidenceId: input.evidenceId,
          factKey: 'phone',
          value: '(505) 555-0100',
          matchedOn: ['address', 'name'],
        }),
      ],
      sourcesChecked: 1,
      structuredSourcesChecked: 1,
      webQueriesRun: 0,
      hydratedSources: 0,
      categoryIdsChecked: [...input.playbook.categoryIds],
      unavailableSourceKeys: [],
      checkedSourceKeys: [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey],
      usage: {
        ...createInvestigationUsage(),
        structuredCalls: 1,
        totalProviderEquivalents: 1,
        providerRequestCounts: {
          [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: 1,
        },
        providerReportedCredits: {
          [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: 1,
        },
      },
      expiresAt: EXPIRES,
    },
    recheckEligibleAt: RECHECK,
    resultExpiresAt: EXPIRES,
  }
}

async function matchedOnReplayProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}matched-on`
  const leadId = uuid(103)
  const runId = uuid(400)
  await createAdmittedRun({ db, repo, playbook, workspaceId, leadId, runId, label: 'matched-on' })
  const artifact = await createPrimarySourceArtifact({
    repo,
    workspaceId,
    runId,
    suffix: 'matched-on',
  })
  const expected = completedProfileResult({
    savedLeadId: leadId,
    runId,
    sourceId: artifact.source.id,
    evidenceId: artifact.evidence.id,
    playbook,
  })
  await repo.persistCompletedResult(expected)
  const replay = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadId })
  const identityColumn = countRows(await db.execute(sql`
    select count(*)::int as count
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_lead_profile_findings'
      and column_name = 'identity_match_keys'
  `))
  let storedIdentityMatchKeys: unknown = null
  if (identityColumn === 1) {
    storedIdentityMatchKeys = rows(await db.execute(sql`
      select identity_match_keys
      from saved_lead_profile_findings
      where workspace_id = ${workspaceId}
        and investigation_run_id = ${runId}::uuid
      order by created_at, id
    `)).map((row) => row.identity_match_keys)
  }
  assertReplayEqual('finding-specific matchedOn', expected, replay, {
    identityColumn,
    storedIdentityMatchKeys,
  })
  assert.deepEqual(storedIdentityMatchKeys, [['address'], ['address', 'name']])
  return {
    identityColumn,
    storedIdentityMatchKeys,
    resultHash: stableHash(expected),
    replayHash: stableHash(replay),
  }
}

async function missingProviderZeroUsageProof(db: Db, repo: Repo) {
  const { workspaceId, result, replay } = await executeWithProvider({
    db,
    repo,
    label: 'missing-provider',
    leadId: uuid(104),
    idStart: 600,
  })
  const persistedSources = await sourceRows(db, workspaceId, result.runId)
  const target = targetRows(persistedSources)
  const expectedUsage: InvestigationUsageSnapshot = createInvestigationUsage()
  assert.deepEqual(result.profileReport.usage, expectedUsage, JSON.stringify({
    actualUsage: result.profileReport.usage,
    persistedSources,
  }))
  assert.equal(replay?.profileReport.usage.structuredCalls, 0)
  assert.equal(replay?.profileReport.usage.totalProviderEquivalents, 0)
  assert.equal(Object.keys(replay?.profileReport.usage.providerRequestCounts ?? {}).length, 0)
  assert.equal(target.length, 1)
  assert.equal(target[0]?.check_state, 'not_checked')
  assert.equal(target[0]?.availability, 'unavailable')
  return {
    resultUsage: result.profileReport.usage,
    replayUsage: replay?.profileReport.usage,
    persistedSources,
  }
}

async function forbiddenWritesProof(db: Db) {
  const result = rows(await db.execute(sql`
    select
      (select count(*)::int from opportunities where workspace_id like ${`${PREFIX}%`}) as opportunities,
      (select count(*)::int from outreach_plays where workspace_id like ${`${PREFIX}%`}) as outreach_plays,
      (select count(*)::int from saved_leads where workspace_id like ${`${PREFIX}%`} and lifecycle_status <> 'saved') as lifecycle_mutations
  `))[0]
  assert.equal(result.opportunities, 0)
  assert.equal(result.outreach_plays, 0)
  assert.equal(result.lifecycle_mutations, 0)
  return result
}

function reportHash(report: unknown): string {
  return createHash('sha256').update(JSON.stringify(report)).digest('hex')
}

async function main() {
  const { databaseUrl, allowedHost } = validateEnvironment()
  delete process.env.DATABASE_URL
  const client = postgres(databaseUrl, { max: 20, prepare: false })
  const db = drizzle(client)
  const repo = createPostgresSavedLeadInvestigationRepository({ db })
  const playbook = resolveSavedLeadInvestigationPlaybook('commercial_cleaning')
  if (!playbook) throw new Error('commercial_cleaning playbook missing')
  const report: Record<string, unknown> = {
    checkpoint: 'CP26C.2B.3',
    projectId: EXPECTED_PROJECT_ID,
    branchId: EXPECTED_BRANCH_ID,
    parentBranchId: PARENT_BRANCH_ID,
    allowedHost: maskHost(allowedHost),
    proofPrefix: PREFIX,
    generatedAt: new Date().toISOString(),
    results: {},
  }
  const failures: string[] = []
  const capture = async (name: string, fn: () => Promise<unknown>) => {
    try {
      ;(report.results as Record<string, unknown>)[name] = {
        status: 'pass',
        detail: await fn(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      ;(report.results as Record<string, unknown>)[name] = {
        status: 'fail',
        error: message,
        stack: error instanceof Error ? error.stack : null,
      }
      failures.push(`${name}: ${message}`)
    }
  }

  try {
    await cleanup(db)
    report.schemaGate = await ensureSchemaGate(db)
    await capture('zeroRecordSourceReplay', async () => {
      await cleanup(db)
      return zeroRecordSourceReplayProof(db, repo)
    })
    await capture('multiRecordSourceReplay', async () => {
      await cleanup(db)
      return multiRecordSourceReplayProof(db, repo)
    })
    await capture('findingSpecificMatchedOnReplay', async () => {
      await cleanup(db)
      return matchedOnReplayProof(db, repo, playbook)
    })
    await capture('missingProviderZeroUsage', async () => {
      await cleanup(db)
      return missingProviderZeroUsageProof(db, repo)
    })
    await cleanup(db)
    await capture('forbiddenWrites', () => forbiddenWritesProof(db))
  } finally {
    await cleanup(db)
    report.cleanup = await remainingProofRows(db)
    report.finalCatalog = rows(await db.execute(sql`
      select
        (select count(*)::int from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE') as table_count,
        (select count(*)::int from information_schema.tables
          where table_schema = 'public'
            and table_name in (
              'saved_lead_investigation_daily_usage',
              'saved_lead_investigation_runs',
              'saved_lead_investigation_state',
              'saved_lead_investigation_sources',
              'saved_lead_trigger_findings',
              'saved_lead_profile_findings'
            )) as investigation_tables,
        (select count(*)::int from information_schema.columns
          where table_schema = 'public'
            and table_name = 'saved_lead_profile_findings'
            and column_name = 'identity_match_keys') as identity_match_keys_column
    `))[0]
    await client.end({ timeout: 5 })
    report.reportSha256 = reportHash(report)
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
  }
  if (failures.length > 0) {
    console.error(JSON.stringify({
      status: 'fail',
      reportPath: REPORT_PATH,
      failures,
    }, null, 2))
    process.exit(1)
  }
  console.log(JSON.stringify({
    status: 'pass',
    reportPath: REPORT_PATH,
    reportSha256: report.reportSha256,
    cleanup: report.cleanup,
    finalCatalog: report.finalCatalog,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
