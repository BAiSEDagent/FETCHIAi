/**
 * CP26C.2B.2 real-Postgres persistence/replay/usage regression smoke.
 *
 * This refuses to run without explicit proof-branch guards. It never prints
 * DATABASE_URL and only creates deterministic cp26c2b2-db-proof- fixtures,
 * which are cleaned in FK-safe order.
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
  type SavedLeadSignalFinding,
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

const PREFIX = 'cp26c2b2-db-proof-'
const EXPECTED_PROJECT_ID = 'plain-king-65928893'
const PARENT_BRANCH_ID = 'br-orange-dawn-ahhq1jyw'
const REPORT_PATH = '/private/tmp/cp26c2b2-persistence-replay-proof.json'
const NOW = '2026-08-04T12:00:00.000Z'
const RECHECK = '2026-08-11T12:00:00.000Z'
const EXPIRES = '2026-09-03T12:00:00.000Z'

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
  return `26265${String(sequence).padStart(3, '0')}-0000-4000-8000-${String(sequence).padStart(12, '0')}`
}

function validateEnvironment() {
  assert.equal(process.env.CP26C2B_DB_PROOF, '1')
  assert.equal(process.env.CP26C2B_EXPECTED_PROJECT_ID, EXPECTED_PROJECT_ID)
  assert.equal(process.env.CP26C2B_PARENT_BRANCH_ID, PARENT_BRANCH_ID)
  assert.equal(process.env.CP26C2B_PROOF_PREFIX, PREFIX)
  const branchId = requireEnv('CP26C2B_EXPECTED_BRANCH_ID')
  assert.notEqual(branchId, PARENT_BRANCH_ID, 'proof branch must not be parent')
  assert.notEqual(branchId, 'br-aged-lake-ahligui6', 'stale proof branch is revoked')
  const databaseUrl = requireEnv('DATABASE_URL')
  const allowedHost = requireEnv('CP26C2B_ALLOWED_HOST')
  const parsed = new URL(databaseUrl)
  assert.equal(parsed.hostname, allowedHost)
  assert.match(parsed.hostname, /\.neon\.tech$/)
  return { databaseUrl, allowedHost, branchId }
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
  assert.equal(tableCount, 51, 'proof branch must have 51 public tables')
  assert.equal(investigationCount, 6, 'proof branch must have six investigation tables')
  assert.equal(savedLeadsIndex, 1, 'proof branch must have saved_leads_workspace_id_unique')
  return { tableCount, investigationCount, savedLeadsIndex }
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

async function createSourceArtifact(input: {
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
  await input.repo.linkInvestigationSource({
    workspaceId: input.workspaceId,
    runId: input.runId,
    registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    tier: 1,
    availability: 'available',
    checkState: 'checked',
    candidateRank: null,
    runtimeLineageRunId: lineage.id,
    evidenceSourceId: null,
  })
  const source = await input.repo.linkInvestigationSource({
    workspaceId: input.workspaceId,
    runId: input.runId,
    registrySourceKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    tier: 1,
    availability: 'available',
    checkState: 'checked',
    candidateRank: 1,
    runtimeLineageRunId: lineage.id,
    evidenceSourceId: evidence.id,
  })
  return { lineage, evidence, source }
}

function identity(): IdentityResolution {
  return {
    state: 'resolved',
    confidence: 0.97,
    matchedOn: ['address'],
    conflicts: [],
    reasonCodes: ['address_match'],
    evaluatedAt: NOW,
  }
}

function nonzeroUsage(): InvestigationUsageSnapshot {
  return {
    ...createInvestigationUsage(),
    structuredCalls: 1,
    totalProviderEquivalents: 1,
    providerRequestCounts: {
      [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: 1,
    },
    providerReportedCredits: {
      [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: 1,
    },
  }
}

function profileFinding(input: {
  id: string
  sourceId: string
  evidenceId: string
}): SavedLeadProfileFinding {
  return {
    id: input.id,
    factKey: 'latest_permit_date',
    value: '2026-08-04',
    investigationSourceId: input.sourceId,
    evidenceSourceId: input.evidenceId,
    exactExcerpt: 'Official permit record dated 2026-08-04.',
    structuredEvidenceSnapshot: {
      schemaId: 'structured_permit_record_v1',
      fields: {
        permitNumber: `${PREFIX}permit-1`,
        issuedAt: '2026-08-04',
        calculatedAddress: '6200 Coors Blvd NW Suite 200',
        recordCategory: 'Commercial',
        typeOfWork: 'Tenant improvement',
        stableExternalId: `${PREFIX}permit-1`,
      },
    },
    observedAt: NOW,
    eventDate: '2026-08-04T00:00:00.000Z',
    identityMatch: {
      matchedOn: ['address'],
      reasonCodes: ['address_match'],
    },
    conflict: {
      groupId: `${PREFIX}profile-conflict-group`,
      reasonCodes: ['same_fact_newer_artifact'],
    },
  }
}

function signalFinding(input: {
  id: string
  sourceId: string
  evidenceId: string
}): SavedLeadSignalFinding {
  return {
    id: input.id,
    approvedSignalFamilyId: 'building_permit',
    approvedSignalLabelId: 'cleaning_buildout_activity',
    investigationSourceId: input.sourceId,
    evidenceSourceId: input.evidenceId,
    exactExcerpt: 'Tenant improvement permit was issued.',
    structuredEvidenceSnapshot: {
      schemaId: 'structured_permit_record_v1',
      fields: {
        permitNumber: `${PREFIX}permit-1`,
        issuedAt: '2026-08-04',
        calculatedAddress: '6200 Coors Blvd NW Suite 200',
        recordCategory: 'Commercial',
        typeOfWork: 'Tenant improvement',
        stableExternalId: `${PREFIX}permit-1`,
      },
    },
    eventDate: '2026-08-04T00:00:00.000Z',
    freshnessEndsAt: EXPIRES,
    identityMatchReasonCodes: ['address_match'],
    qualificationReasonCodes: ['approved_signal_label'],
  }
}

function completedSignal(input: {
  savedLeadId: string
  runId: string
  sourceId: string
  evidenceId: string
  trigger?: 'signal_found' | 'no_signal'
  profileFindings?: SavedLeadProfileFinding[]
}): CompletedSignalCheck {
  const findings = input.profileFindings ?? [
    profileFinding({
      id: uuid(301),
      sourceId: input.sourceId,
      evidenceId: input.evidenceId,
    }),
  ]
  return {
    status: 'completed',
    savedLeadId: input.savedLeadId,
    runId: input.runId,
    checkedAt: NOW,
    identity: identity(),
    trigger: input.trigger === 'no_signal'
      ? { state: 'no_signal', reasonCode: 'none_found' }
      : {
          state: 'signal_found',
          finding: signalFinding({
            id: uuid(302),
            sourceId: input.sourceId,
            evidenceId: input.evidenceId,
          }),
        },
    profileReport: {
      findings,
      sourcesChecked: 1,
      structuredSourcesChecked: 1,
      webQueriesRun: 0,
      hydratedSources: 0,
      categoryIdsChecked: ['building_permits'],
      unavailableSourceKeys: [],
      checkedSourceKeys: [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey],
      usage: nonzeroUsage(),
      expiresAt: EXPIRES,
    },
    recheckEligibleAt: RECHECK,
    resultExpiresAt: EXPIRES,
  }
}

async function runStateRow(db: Db, workspaceId: string, leadId: string) {
  return rows(await db.execute(sql`
    select latest_attempt_run_id::text, latest_successful_run_id::text,
           checked_at, recheck_eligible_at, result_expires_at
    from saved_lead_investigation_state
    where workspace_id = ${workspaceId} and saved_lead_id = ${leadId}::uuid
  `))[0]
}

async function persistedUsage(db: Db, runId: string) {
  return rows(await db.execute(sql`
    select usage_actual
    from saved_lead_investigation_runs
    where id = ${runId}::uuid
  `))[0]?.usage_actual as unknown
}

async function signalFoundPersistenceReplayProof(
  db: Db,
  repo: Repo,
  playbook: SavedLeadInvestigationPlaybook,
) {
  const workspaceId = `${PREFIX}signal`
  const leadId = uuid(101)
  const runId = uuid(201)
  await createAdmittedRun({ db, repo, playbook, workspaceId, leadId, runId, label: 'signal' })
  const artifact = await createSourceArtifact({ repo, workspaceId, runId, suffix: 'signal' })
  const expected = completedSignal({
    savedLeadId: leadId,
    runId,
    sourceId: artifact.source.id,
    evidenceId: artifact.evidence.id,
  })

  await repo.persistProfileFindings(runId, expected.profileReport.findings)
  await repo.persistTriggerFinding(runId, expected.trigger)
  await repo.persistCompletedResult(expected)

  const triggerCount = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_trigger_findings
    where workspace_id = ${workspaceId} and investigation_run_id = ${runId}::uuid
  `))
  const profileCount = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_profile_findings
    where workspace_id = ${workspaceId} and investigation_run_id = ${runId}::uuid
  `))
  const stateCount = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_investigation_state
    where workspace_id = ${workspaceId} and saved_lead_id = ${leadId}::uuid
  `))
  const state = await runStateRow(db, workspaceId, leadId)
  const replay = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadId })

  assert.equal(triggerCount, 1, 'signal finding must be inserted by repository persistence')
  assert.equal(profileCount, 1, 'profile finding must be inserted by repository persistence')
  assert.equal(stateCount, 1, 'completion must upsert investigation state')
  assert.equal(state.latest_attempt_run_id, runId)
  assert.equal(state.latest_successful_run_id, runId)
  assert.deepEqual(replay, expected)
  return {
    triggerCount,
    profileCount,
    state,
    replayTriggerState: replay?.trigger.state,
    expectedHash: stableHash(expected),
    replayHash: stableHash(replay),
  }
}

async function noSignalReplayProof(
  db: Db,
  repo: Repo,
  playbook: SavedLeadInvestigationPlaybook,
) {
  const workspaceId = `${PREFIX}no-signal`
  const leadId = uuid(102)
  const runId = uuid(202)
  await createAdmittedRun({ db, repo, playbook, workspaceId, leadId, runId, label: 'no-signal' })
  const artifact = await createSourceArtifact({ repo, workspaceId, runId, suffix: 'no-signal' })
  const expected = completedSignal({
    savedLeadId: leadId,
    runId,
    sourceId: artifact.source.id,
    evidenceId: artifact.evidence.id,
    trigger: 'no_signal',
    profileFindings: [],
  })
  await repo.persistProfileFindings(runId, [])
  await repo.persistTriggerFinding(runId, expected.trigger)
  await repo.persistCompletedResult(expected)
  const replay = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadId })
  const profileCount = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_profile_findings
    where workspace_id = ${workspaceId} and investigation_run_id = ${runId}::uuid
  `))
  assert.equal(profileCount, 0)
  assert.deepEqual(replay, expected)
  return { profileCount, expectedHash: stableHash(expected), replayHash: stableHash(replay) }
}

async function retryableFailurePreservationProof(
  db: Db,
  repo: Repo,
  playbook: SavedLeadInvestigationPlaybook,
) {
  const workspaceId = `${PREFIX}retry`
  const leadId = uuid(103)
  const successRunId = uuid(203)
  const failedRunId = uuid(204)
  await createAdmittedRun({ db, repo, playbook, workspaceId, leadId, runId: successRunId, label: 'success' })
  const artifact = await createSourceArtifact({ repo, workspaceId, runId: successRunId, suffix: 'retry-success' })
  const success = completedSignal({
    savedLeadId: leadId,
    runId: successRunId,
    sourceId: artifact.source.id,
    evidenceId: artifact.evidence.id,
  })
  await repo.persistCompletedResult(success)
  await repo.createOrGetRun({
    workspaceId,
    savedLeadId: leadId,
    runId: failedRunId,
    clientRequestId: `${workspaceId}-failed-client`,
    playbook,
  })
  await repo.admitRun({
    workspaceId,
    savedLeadId: leadId,
    runId: failedRunId,
    clientRequestId: `${workspaceId}-failed-client`,
  })
  await repo.persistRetryableFailure({
    runId: failedRunId,
    failureCode: 'provider_timeout',
    latestSuccessfulRunId: successRunId,
  })
  const state = await runStateRow(db, workspaceId, leadId)
  const replay = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadId })
  assert.equal(state.latest_attempt_run_id, failedRunId)
  assert.equal(state.latest_successful_run_id, successRunId)
  assert.deepEqual(replay, success)
  return { state, replayHash: stableHash(replay) }
}

async function usageReservationCreditProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}usage`
  const leadId = uuid(104)
  const runId = uuid(205)
  await createAdmittedRun({ db, repo, playbook, workspaceId, leadId, runId, label: 'usage' })
  const first = await repo.reserveUsage({
    workspaceId,
    runId,
    operationKey: 'structured:one',
    category: 'structuredCalls',
    units: 1,
  })
  const replayReserve = await repo.reserveUsage({
    workspaceId,
    runId,
    operationKey: 'structured:one',
    category: 'structuredCalls',
    units: 1,
  })
  const firstCredit = await repo.creditUsage({
    workspaceId,
    runId,
    operationKey: 'structured:one',
    providerKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    actualUnits: 1,
    providerRequestCount: 1,
    providerReportedCredits: 1,
  })
  const replayCredit = await repo.creditUsage({
    workspaceId,
    runId,
    operationKey: 'structured:one',
    providerKey: ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey,
    actualUnits: 1,
    providerRequestCount: 1,
    providerReportedCredits: 1,
  })
  const second = await repo.reserveUsage({
    workspaceId,
    runId,
    operationKey: 'structured:two',
    category: 'structuredCalls',
    units: 1,
  })
  const categoryRefusal = await repo.reserveUsage({
    workspaceId,
    runId,
    operationKey: 'structured:three',
    category: 'structuredCalls',
    units: 1,
  })
  const stored = await persistedUsage(db, runId)
  assert.equal(first.state, 'reserved')
  assert.equal(replayReserve.state, 'idempotent_replay')
  assert.equal(firstCredit.state, 'credited')
  assert.equal(replayCredit.state, 'idempotent_replay')
  assert.equal(second.state, 'reserved')
  assert.equal(categoryRefusal.state, 'budget_refused')
  assert.equal(firstCredit.usage?.structuredCalls, 1)
  assert.equal(firstCredit.usage?.totalProviderEquivalents, 1)
  assert.equal(
    firstCredit.usage?.providerRequestCounts[ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey],
    1,
  )
  assert.equal(
    replayCredit.usage?.providerRequestCounts[ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey],
    1,
  )
  assert.match(JSON.stringify(stored), /structured:one/)
  return { first, replayReserve, firstCredit, replayCredit, second, categoryRefusal, stored }
}

function fixturePermit(): StructuredPermitRecord {
  return {
    permitNumber: `${PREFIX}executor-permit`,
    issuedAt: '2026-08-04',
    enteredAt: '2026-08-04',
    calculatedAddress: '6200 Coors Blvd NW Suite 200',
    freeFormAddress: '6200 Coors Blvd NW Suite 200',
    recordCategory: 'Commercial',
    typeOfWork: 'Tenant improvement',
    structureType: 'Office',
    workDescription: 'Interior tenant improvement for cleaning contractor.',
    valuation: 125000,
    squareFootage: 4500,
    numberOfUnits: 1,
    owner: `${PREFIX}owner`,
    applicant: `${PREFIX}applicant`,
    contractor: `${PREFIX}contractor`,
    stableExternalId: `${PREFIX}executor-permit`,
  }
}

function fixtureStructuredProvider(): Pick<StructuredSourceProvider<StructuredPermitRecord>, 'execute'> {
  return {
    async execute(request) {
      const evidence = createStructuredPermitEvidenceRecord({
        record: fixturePermit(),
        registrySourceKey: request.registrySourceKey,
        canonicalSourceReference: `${PREFIX}executor-source-url`,
        sourceAuthority: 'City of Albuquerque Planning Department',
        evidenceSourceId: uuid(401),
        runtimeLineageRunId: uuid(402),
        eventDate: '2026-08-04T00:00:00.000Z',
      })
      return {
        registrySourceKey: request.registrySourceKey,
        records: [evidence],
        canonicalAuthority: 'City of Albuquerque Planning Department',
        runtimeLineageRunId: `${PREFIX}executor-lineage-run`,
        usage: {
          requestCount: 1,
          providerReportedCredits: 1,
        },
        exhausted: false,
      }
    },
  }
}

async function executorActualUsageProof(db: Db, repo: Repo) {
  const workspaceId = `${PREFIX}executor`
  const leadId = uuid(105)
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, leadId, 'executor')
  let sequence = 500
  const result = await executeSavedLeadInvestigation({
    workspaceId,
    savedLeadId: leadId,
    clientRequestId: `${workspaceId}-client`,
    repository: repo,
    providers: {
      structured: {
        [ALBUQUERQUE_BUILDING_PERMITS.registrySourceKey]: fixtureStructuredProvider(),
      },
    },
    structuredSourceConfigs: [ALBUQUERQUE_BUILDING_PERMITS],
    clock: () => NOW,
    idFactory: () => uuid(sequence++),
  })
  assert.equal(result.state, 'completed')
  if (result.state !== 'completed') throw new Error('executor did not complete')
  assert.notDeepEqual(result.result.profileReport.usage, createInvestigationUsage())
  assert.equal(result.result.profileReport.usage.structuredCalls, 1)
  assert.equal(result.result.profileReport.usage.totalProviderEquivalents, 1)
  const replay = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadId })
  assert.deepEqual(replay, result.result)
  return {
    resultUsage: result.result.profileReport.usage,
    replayHash: stableHash(replay),
    resultHash: stableHash(result.result),
  }
}

async function forbiddenWritesProof(db: Db) {
  const result = rows(await db.execute(sql`
    select
      (select count(*)::int from opportunities where workspace_id like ${`${PREFIX}%`}) as opportunities,
      (select count(*)::int from outreach_plays where workspace_id like ${`${PREFIX}%`}) as outreach_plays,
      (select count(*)::int from saved_leads where workspace_id like ${`${PREFIX}%`} and lifecycle_status <> 'saved') as lifecycle_mutations,
      (select count(*)::int from saved_lead_investigation_runs where workspace_id like ${`${PREFIX}%`} and (identity_resolution::text ilike '%renderer%' or source_plan::text ilike '%renderer%')) as renderer_copy
  `))[0]
  assert.equal(result.opportunities, 0)
  assert.equal(result.outreach_plays, 0)
  assert.equal(result.lifecycle_mutations, 0)
  assert.equal(result.renderer_copy, 0)
  return result
}

function reportHash(report: unknown): string {
  return createHash('sha256').update(JSON.stringify(report)).digest('hex')
}

async function main() {
  const { databaseUrl, allowedHost, branchId } = validateEnvironment()
  delete process.env.DATABASE_URL
  const client = postgres(databaseUrl, { max: 20, prepare: false })
  const db = drizzle(client)
  const repo = createPostgresSavedLeadInvestigationRepository({ db })
  const playbook = resolveSavedLeadInvestigationPlaybook('commercial_cleaning')
  if (!playbook) throw new Error('commercial_cleaning playbook missing')
  const report: Record<string, unknown> = {
    checkpoint: 'CP26C.2B.2',
    projectId: EXPECTED_PROJECT_ID,
    branchId,
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
    await capture('signalFoundPersistenceReplay', () =>
      signalFoundPersistenceReplayProof(db, repo, playbook),
    )
    await cleanup(db)
    await capture('noSignalReplay', () => noSignalReplayProof(db, repo, playbook))
    await cleanup(db)
    await capture('retryableFailurePreservation', () =>
      retryableFailurePreservationProof(db, repo, playbook),
    )
    await cleanup(db)
    await capture('usageReservationCredit', () =>
      usageReservationCreditProof(db, repo, playbook),
    )
    await cleanup(db)
    await capture('executorActualUsage', () => executorActualUsageProof(db, repo))
    await capture('forbiddenWrites', () => forbiddenWritesProof(db))
  } finally {
    await cleanup(db)
    report.cleanup = await remainingProofRows(db)
    report.finalTableCount = countRows(await db.execute(sql`
      select count(*)::int as count
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
    `))
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
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
