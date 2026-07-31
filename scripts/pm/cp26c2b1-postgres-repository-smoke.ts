/**
 * CP26C.2B.1 real-Postgres repository regression smoke.
 *
 * This intentionally refuses to run without explicit proof-branch guards.
 * It never prints DATABASE_URL and only creates deterministic
 * cp26c2b-db-proof- fixtures, which are cleaned in FK-safe order.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import {
  createInvestigationUsage,
  type CompletedSignalCheck,
  type IdentityResolution,
} from '@/lib/runtime/saved-lead-investigation'
import {
  createPostgresSavedLeadInvestigationRepository,
} from '@/lib/runtime/saved-lead-investigation/postgres-repository'
import {
  resolveSavedLeadInvestigationPlaybook,
  type SavedLeadInvestigationPlaybook,
} from '@/lib/playbooks/saved-lead-investigation-registry'

const PREFIX = 'cp26c2b-db-proof-'
const EXPECTED_PROJECT_ID = 'plain-king-65928893'
const EXPECTED_BRANCH_ID = 'br-aged-lake-ahligui6'
const REPORT_PATH = '/private/tmp/cp26c2b1-postgres-correction-proof.json'
const NOW = '2026-07-30T12:00:00.000Z'
const ACTIVE_HEARTBEAT = '2026-07-30T11:58:00.001Z'
const STALE_HEARTBEAT = '2026-07-30T11:58:00.000Z'

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

function validateEnvironment() {
  assert.equal(process.env.CP26C2B_DB_PROOF, '1')
  assert.equal(process.env.CP26C2B_EXPECTED_PROJECT_ID, EXPECTED_PROJECT_ID)
  assert.equal(process.env.CP26C2B_EXPECTED_BRANCH_ID, EXPECTED_BRANCH_ID)
  assert.equal(process.env.CP26C2B_PROOF_PREFIX, PREFIX)
  const databaseUrl = requireEnv('DATABASE_URL')
  const allowedHost = requireEnv('CP26C2B_ALLOWED_HOST')
  const parsed = new URL(databaseUrl)
  assert.equal(parsed.hostname, allowedHost)
  assert.match(parsed.hostname, /\.neon\.tech$/)
  assert.notEqual(process.env.CP26C2B_EXPECTED_BRANCH_ID, 'main')
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

async function createRun(
  repo: Repo,
  playbook: SavedLeadInvestigationPlaybook,
  workspaceId: string,
  savedLeadId: string,
  runId: string,
  clientRequestId: string,
) {
  return repo.createOrGetRun({
    workspaceId,
    savedLeadId,
    runId,
    clientRequestId,
    playbook,
  })
}

async function runRow(db: Db, runId: string) {
  return rows(await db.execute(sql`
    select id::text, workspace_id, saved_lead_id::text, client_request_id,
           status, workspace_day_key, usage_counted_at is not null as usage_counted,
           failure_code, failure_retryable, checked_at, recheck_eligible_at,
           result_expires_at, identity_resolution, source_plan, trigger_state,
           trigger_reason_code, usage_actual
    from saved_lead_investigation_runs
    where id = ${runId}::uuid
  `))[0]
}

async function usageRow(db: Db, workspaceId: string) {
  return rows(await db.execute(sql`
    select workspace_day_key, used_count::int, limit_snapshot::int, reset_at
    from saved_lead_investigation_daily_usage
    where workspace_id = ${workspaceId}
    order by workspace_day_key
  `))
}

function completedResult(input: {
  savedLeadId: string
  runId: string
  checkedAt?: string
  reasonCode?: 'none_found' | 'insufficient_evidence'
}): CompletedSignalCheck {
  const checkedAt = input.checkedAt ?? NOW
  const identity: IdentityResolution = {
    state: 'resolved',
    confidence: 0.96,
    matchedOn: ['address'],
    conflicts: [],
    reasonCodes: ['address_match'],
    evaluatedAt: checkedAt,
  }
  return {
    status: 'completed',
    savedLeadId: input.savedLeadId,
    runId: input.runId,
    checkedAt,
    identity,
    trigger: {
      state: 'no_signal',
      reasonCode: input.reasonCode ?? 'none_found',
    },
    profileReport: {
      findings: [],
      sourcesChecked: 1,
      structuredSourcesChecked: 1,
      webQueriesRun: 0,
      hydratedSources: 0,
      categoryIdsChecked: ['building_permits'],
      unavailableSourceKeys: [],
      checkedSourceKeys: ['albuquerque_city_building_permits'],
      usage: createInvestigationUsage(),
      expiresAt: '2026-08-29T12:00:00.000Z',
    },
    recheckEligibleAt: '2026-08-06T12:00:00.000Z',
    resultExpiresAt: '2026-08-29T12:00:00.000Z',
  }
}

async function cleanAdmissionProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}clean-admission`
  const leadId = '26264100-0000-4000-8000-000000000001'
  const runId = '26264200-0000-4000-8000-000000000001'
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, leadId, 'lead')
  await createRun(repo, playbook, workspaceId, leadId, runId, `${workspaceId}-client`)
  const initialUsageRows = await usageRow(db, workspaceId)
  const admission = await repo.admitRun({
    workspaceId,
    savedLeadId: leadId,
    runId,
    clientRequestId: `${workspaceId}-client`,
  })
  const usage = await usageRow(db, workspaceId)
  const run = await runRow(db, runId)
  assert.equal(initialUsageRows.length, 0)
  assert.equal(admission.state, 'admitted')
  assert.equal(usage[0]?.used_count, 1)
  assert.equal(usage[0]?.limit_snapshot, 10)
  assert.equal(run.status, 'running')
  assert.equal(run.usage_counted, true)
  return { admission, usage, run }
}

async function sameRunConcurrencyProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}same-run`
  const leadId = '26264100-0000-4000-8000-000000000002'
  const runId = '26264200-0000-4000-8000-000000000002'
  const clientRequestId = `${workspaceId}-client`
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, leadId, 'lead')
  await createRun(repo, playbook, workspaceId, leadId, runId, clientRequestId)
  const admissions = await Promise.all(Array.from({ length: 5 }, () =>
    repo.admitRun({ workspaceId, savedLeadId: leadId, runId, clientRequestId }),
  ))
  const replay = await repo.admitRun({ workspaceId, savedLeadId: leadId, runId, clientRequestId })
  const usage = await usageRow(db, workspaceId)
  const admitted = admissions.filter((result) => result.state === 'admitted').length
  const replayed = admissions.filter((result) => result.state === 'idempotent_replay').length
  assert.equal(admitted, 1)
  assert.equal(replayed, 4)
  assert.equal(replay.state, 'idempotent_replay')
  assert.equal(usage[0]?.used_count, 1)
  assert.equal(countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_investigation_runs
    where workspace_id = ${workspaceId} and usage_counted_at is not null
  `)), 1)
  return { admissions, replay, usage }
}

async function dailyConcurrencyProof(
  db: Db,
  repo: Repo,
  playbook: SavedLeadInvestigationPlaybook,
  iteration: number,
) {
  const workspaceId = `${PREFIX}daily-${iteration}`
  await insertWorkspace(db, workspaceId)
  const inputs = Array.from({ length: 11 }, (_, index) => {
    const n = String(index + 1).padStart(12, '0')
    return {
      leadId: `2626410${iteration}-0000-4000-8000-${n}`,
      runId: `2626420${iteration}-0000-4000-8000-${n}`,
      clientRequestId: `${workspaceId}-client-${index + 1}`,
    }
  })
  for (const [index, input] of inputs.entries()) {
    await insertLead(db, workspaceId, input.leadId, `lead-${index + 1}`)
    await createRun(repo, playbook, workspaceId, input.leadId, input.runId, input.clientRequestId)
  }
  const admissions = await Promise.all(inputs.map((input) =>
    repo.admitRun({
      workspaceId,
      savedLeadId: input.leadId,
      runId: input.runId,
      clientRequestId: input.clientRequestId,
    }),
  ))
  const usage = await usageRow(db, workspaceId)
  const admitted = admissions.filter((result) => result.state === 'admitted').length
  const rejected = admissions.filter((result) => result.state === 'daily_limit_reached').length
  const countedRuns = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_investigation_runs
    where workspace_id = ${workspaceId} and usage_counted_at is not null
  `))
  assert.equal(admitted, 10)
  assert.equal(rejected, 1)
  assert.equal(usage[0]?.used_count, 10)
  assert.equal(countedRuns, 10)
  return { iteration, admitted, rejected, usage, countedRuns }
}

async function activeRunProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}active-run`
  const leadId = '26264100-0000-4000-8000-000000000003'
  const runOne = '26264200-0000-4000-8000-000000000003'
  const runTwo = '26264200-0000-4000-8000-000000000004'
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, leadId, 'lead')
  await createRun(repo, playbook, workspaceId, leadId, runOne, `${workspaceId}-client-1`)
  const first = await repo.admitRun({
    workspaceId,
    savedLeadId: leadId,
    runId: runOne,
    clientRequestId: `${workspaceId}-client-1`,
  })
  const competingCreate = await createRun(
    repo,
    playbook,
    workspaceId,
    leadId,
    runTwo,
    `${workspaceId}-client-2`,
  )
  const competingAdmission = await repo.admitRun({
    workspaceId,
    savedLeadId: leadId,
    runId: competingCreate.runId,
    clientRequestId: `${workspaceId}-client-2`,
  })
  assert.equal(first.state, 'admitted')
  assert.equal(competingAdmission.state, 'already_running')
  assert.equal((await usageRow(db, workspaceId))[0]?.used_count, 1)
  await db.execute(sql`
    update saved_lead_investigation_runs
    set status = 'completed', current_phase = 'completed', checked_at = ${NOW}::timestamptz,
        recheck_eligible_at = '2026-08-06T12:00:00.000Z'::timestamptz,
        result_expires_at = '2026-08-29T12:00:00.000Z'::timestamptz
    where id = ${runOne}::uuid
  `)
  const laterCreate = await createRun(
    repo,
    playbook,
    workspaceId,
    leadId,
    runTwo,
    `${workspaceId}-client-2`,
  )
  const laterAdmission = await repo.admitRun({
    workspaceId,
    savedLeadId: leadId,
    runId: laterCreate.runId,
    clientRequestId: `${workspaceId}-client-2`,
  })
  assert.equal(laterAdmission.state, 'admitted')
  assert.equal((await usageRow(db, workspaceId))[0]?.used_count, 2)
  return { first, competingCreate, competingAdmission, laterCreate, laterAdmission }
}

async function staleBoundaryProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}stale-boundary`
  const activeLead = '26264100-0000-4000-8000-000000000004'
  const staleLead = '26264100-0000-4000-8000-000000000005'
  const activeRun = '26264200-0000-4000-8000-000000000005'
  const staleRun = '26264200-0000-4000-8000-000000000006'
  const successRun = '26264200-0000-4000-8000-000000000007'
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, activeLead, 'active-lead')
  await insertLead(db, workspaceId, staleLead, 'stale-lead')
  await db.execute(sql`
    insert into saved_lead_investigation_daily_usage
      (workspace_id, workspace_day_key, timezone, reset_at, used_count, limit_snapshot)
    values (${workspaceId}, '2026-07-30', 'UTC', '2026-07-31T00:00:00.000Z'::timestamptz, 2, 10)
  `)
  const priorSuccess = completedResult({ savedLeadId: staleLead, runId: successRun })
  await db.execute(sql`
    insert into saved_lead_investigation_runs
      (id, workspace_id, saved_lead_id, client_request_id, playbook_id,
       playbook_version, status, current_phase, identity_resolution,
       budget_ceiling, usage_actual, category_ids_checked, trigger_state,
       trigger_reason_code, checked_at, recheck_eligible_at,
       result_expires_at)
    values
      (${successRun}::uuid, ${workspaceId}, ${staleLead}::uuid,
       ${`${workspaceId}-success-client`}, ${playbook.id}, ${playbook.version},
       'completed', 'completed', ${JSON.stringify(priorSuccess.identity)}::jsonb,
       '{}'::jsonb, ${JSON.stringify(createInvestigationUsage())}::jsonb,
       '["building_permits"]'::jsonb, 'no_signal', 'none_found',
       ${priorSuccess.checkedAt}::timestamptz,
       ${priorSuccess.recheckEligibleAt}::timestamptz,
       ${priorSuccess.resultExpiresAt}::timestamptz)
  `)
  await db.execute(sql`
    insert into saved_lead_investigation_state
      (workspace_id, saved_lead_id, latest_attempt_run_id, latest_successful_run_id, checked_at, recheck_eligible_at, result_expires_at)
    values
      (${workspaceId}, ${staleLead}::uuid, ${successRun}::uuid, ${successRun}::uuid, ${NOW}::timestamptz, '2026-08-06T12:00:00.000Z'::timestamptz, '2026-08-29T12:00:00.000Z'::timestamptz)
  `)
  for (const [leadId, runId, heartbeat] of [
    [activeLead, activeRun, ACTIVE_HEARTBEAT],
    [staleLead, staleRun, STALE_HEARTBEAT],
  ] as const) {
    await createRun(repo, playbook, workspaceId, leadId, runId, `${workspaceId}-${runId}`)
    await db.execute(sql`
      update saved_lead_investigation_runs
      set status = 'running', heartbeat_at = ${heartbeat}::timestamptz, updated_at = ${heartbeat}::timestamptz
      where id = ${runId}::uuid
    `)
  }
  const latestBefore = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: staleLead })
  await repo.reconcileAbandonedRuns({ workspaceId, savedLeadId: activeLead, now: NOW })
  await repo.reconcileAbandonedRuns({ workspaceId, savedLeadId: staleLead, now: NOW })
  const afterFirst = { active: await runRow(db, activeRun), stale: await runRow(db, staleRun) }
  await repo.reconcileAbandonedRuns({ workspaceId, savedLeadId: staleLead, now: NOW })
  const afterSecond = await runRow(db, staleRun)
  const state = rows(await db.execute(sql`
    select latest_successful_run_id::text from saved_lead_investigation_state
    where workspace_id = ${workspaceId} and saved_lead_id = ${staleLead}::uuid
  `))[0]
  const latestAfter = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: staleLead })
  assert.equal(afterFirst.active.status, 'running')
  assert.equal(afterFirst.stale.status, 'failed')
  assert.equal(afterFirst.stale.failure_code, 'abandoned_request')
  assert.equal(afterFirst.stale.failure_retryable, true)
  assert.equal(afterSecond.status, 'failed')
  assert.equal((await usageRow(db, workspaceId))[0]?.used_count, 2)
  assert.equal(state.latest_successful_run_id, successRun)
  assert.equal(latestBefore?.runId, successRun)
  assert.equal(latestAfter?.runId, successRun)
  return { latestBefore, afterFirst, afterSecond, state, latestAfter }
}

async function insertProfileFinding(db: Db, input: {
  id: string
  workspaceId: string
  runId: string
  sourceId: string
  evidenceId: string
  proofHash: string
  value?: string
}) {
  await db.execute(sql`
    insert into saved_lead_profile_findings
      (id, workspace_id, investigation_run_id, investigation_source_id, evidence_source_id,
       fact_key, value, exact_excerpt, observed_date, event_date,
       identity_match_reason_codes, conflict_reason_codes, fact_expiration, proof_hash)
    values
      (${input.id}::uuid, ${input.workspaceId}, ${input.runId}::uuid, ${input.sourceId}::uuid,
       ${input.evidenceId}::uuid, 'latest_permit_date', ${input.value ?? '2026-07-30'},
       'Official permit record dated 2026-07-30.', ${NOW}::timestamptz, ${NOW}::timestamptz,
       '[]'::jsonb, '[]'::jsonb, '2026-08-29T12:00:00.000Z'::timestamptz, ${input.proofHash})
  `)
}

async function lineageEvidenceProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}lineage`
  const leadId = '26264100-0000-4000-8000-000000000006'
  const runId = '26264200-0000-4000-8000-000000000008'
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, leadId, 'lead')
  await createRun(repo, playbook, workspaceId, leadId, runId, `${workspaceId}-client`)
  await repo.admitRun({ workspaceId, savedLeadId: leadId, runId, clientRequestId: `${workspaceId}-client` })
  const lineage = await repo.recordLineage({
    provider: 'arcgis_feature_service',
    providerRunId: `${PREFIX}lineage-provider-run`,
    runRole: 'source_adapter_listing',
    status: 'ok',
    sourceUrl: `${PREFIX}lineage-source-url`,
    query: `${PREFIX}lineage-query`,
    requestMetadata: { registrySourceKey: `${PREFIX}source` },
    responseMetadata: { recordCount: 1 },
  })
  const evidence = await repo.recordEvidence({
    sourceType: `${PREFIX}source-type`,
    sourceAuthority: `${PREFIX}authority`,
    externalId: `${PREFIX}external-id`,
    sourceUrl: `${PREFIX}evidence-source-url`,
    sourceTitle: `${PREFIX}source-title`,
    sourceDate: NOW,
    evidenceFingerprint: `${PREFIX}fingerprint-v1`,
    sourceMetadata: { permitNumber: `${PREFIX}permit` },
  })
  const replayedEvidence = await repo.recordEvidence({
    sourceType: `${PREFIX}source-type`,
    sourceAuthority: `${PREFIX}authority`,
    externalId: `${PREFIX}external-id`,
    sourceUrl: `${PREFIX}evidence-source-url`,
    sourceTitle: `${PREFIX}source-title`,
    sourceDate: NOW,
    evidenceFingerprint: `${PREFIX}fingerprint-v2`,
    sourceMetadata: { permitNumber: `${PREFIX}permit` },
  })
  const source = await repo.linkInvestigationSource({
    workspaceId,
    runId,
    registrySourceKey: `${PREFIX}registry-source`,
    tier: 1,
    availability: 'available',
    checkState: 'checked',
    candidateRank: 1,
    runtimeLineageRunId: lineage.id,
    evidenceSourceId: evidence.id,
  })
  await db.execute(sql`
    insert into saved_lead_trigger_findings
      (id, workspace_id, investigation_run_id, investigation_source_id, evidence_source_id,
       approved_signal_family_id, approved_signal_label_id, exact_excerpt, event_date,
       freshness_end, identity_match_reason_codes, qualification_reason_codes, proof_hash)
    values
      ('26264300-0000-4000-8000-000000000001'::uuid, ${workspaceId}, ${runId}::uuid,
       ${source.id}::uuid, ${evidence.id}::uuid, 'building_permit',
       'cleaning_buildout_activity', 'Tenant improvement permit was issued.',
       ${NOW}::timestamptz, '2026-08-29T12:00:00.000Z'::timestamptz,
       '[]'::jsonb, '[]'::jsonb, ${`${PREFIX}trigger-proof`})
  `)
  await insertProfileFinding(db, {
    id: '26264400-0000-4000-8000-000000000001',
    workspaceId,
    runId,
    sourceId: source.id,
    evidenceId: evidence.id,
    proofHash: `${PREFIX}profile-proof`,
  })
  let duplicateRejected = false
  try {
    await insertProfileFinding(db, {
      id: '26264400-0000-4000-8000-000000000002',
      workspaceId,
      runId,
      sourceId: source.id,
      evidenceId: evidence.id,
      proofHash: `${PREFIX}profile-proof`,
      value: 'duplicate',
    })
  } catch {
    duplicateRejected = true
  }
  const otherEvidence = rows(await db.execute(sql`
    insert into evidence_sources
      (source_type, source_authority, external_id, source_url, source_title, source_date, evidence_fingerprint, source_metadata)
    values
      (${`${PREFIX}source-type-2`}, ${`${PREFIX}authority`}, ${`${PREFIX}external-id-2`},
       ${`${PREFIX}evidence-source-url-2`}, ${`${PREFIX}source-title-2`},
       ${NOW}::timestamp, ${`${PREFIX}fingerprint-other`}, '{}'::jsonb)
    returning id::text
  `))[0]?.id as string
  let invalidRelationshipRejected = false
  try {
    await insertProfileFinding(db, {
      id: '26264400-0000-4000-8000-000000000003',
      workspaceId,
      runId,
      sourceId: source.id,
      evidenceId: otherEvidence,
      proofHash: `${PREFIX}invalid-relationship-proof`,
    })
  } catch {
    invalidRelationshipRejected = true
  }
  await repo.persistTriggerFinding(runId, { state: 'no_signal', reasonCode: 'none_found' })
  await repo.persistCompletedResult(completedResult({ savedLeadId: leadId, runId }))
  const latest = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadId })
  const profileCount = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_profile_findings
    where workspace_id = ${workspaceId} and investigation_run_id = ${runId}::uuid
  `))
  const triggerCount = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_trigger_findings
    where workspace_id = ${workspaceId} and investigation_run_id = ${runId}::uuid
  `))
  assert.equal(evidence.id, replayedEvidence.id)
  assert.equal(profileCount, 1)
  assert.equal(triggerCount, 1)
  assert.equal(duplicateRejected, true)
  assert.equal(invalidRelationshipRejected, true)
  assert.equal(latest?.runId, runId)
  return { lineage, evidence, replayedEvidence, source, profileCount, triggerCount, latest }
}

async function persistenceReplayProof(db: Db, repo: Repo, playbook: SavedLeadInvestigationPlaybook) {
  const workspaceId = `${PREFIX}persistence`
  const leadOne = '26264100-0000-4000-8000-000000000007'
  const leadTwo = '26264100-0000-4000-8000-000000000008'
  const successRun = '26264200-0000-4000-8000-000000000009'
  const failedRun = '26264200-0000-4000-8000-000000000010'
  const zeroProfileRun = '26264200-0000-4000-8000-000000000011'
  await insertWorkspace(db, workspaceId)
  await insertLead(db, workspaceId, leadOne, 'lead-one')
  await insertLead(db, workspaceId, leadTwo, 'lead-two')
  await createRun(repo, playbook, workspaceId, leadOne, successRun, `${workspaceId}-success`)
  await repo.admitRun({ workspaceId, savedLeadId: leadOne, runId: successRun, clientRequestId: `${workspaceId}-success` })
  await repo.persistSourcePlan(successRun, { coverage: `${PREFIX}coverage-round-trip` })
  await repo.persistProfileFindings(successRun, [{ factKey: 'latest_permit_date' } as never])
  await repo.persistTriggerFinding(successRun, { state: 'no_signal', reasonCode: 'none_found' })
  await repo.persistCompletedResult(completedResult({ savedLeadId: leadOne, runId: successRun }))
  await createRun(repo, playbook, workspaceId, leadOne, failedRun, `${workspaceId}-failed`)
  await repo.admitRun({ workspaceId, savedLeadId: leadOne, runId: failedRun, clientRequestId: `${workspaceId}-failed` })
  await repo.persistRetryableFailure({
    runId: failedRun,
    failureCode: 'provider_timeout',
    latestSuccessfulRunId: successRun,
  })
  await createRun(repo, playbook, workspaceId, leadTwo, zeroProfileRun, `${workspaceId}-zero`)
  await repo.admitRun({ workspaceId, savedLeadId: leadTwo, runId: zeroProfileRun, clientRequestId: `${workspaceId}-zero` })
  await repo.persistTriggerFinding(zeroProfileRun, { state: 'no_signal', reasonCode: 'insufficient_evidence' })
  await repo.persistCompletedResult(completedResult({
    savedLeadId: leadTwo,
    runId: zeroProfileRun,
    reasonCode: 'insufficient_evidence',
  }))
  const latestOne = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadOne })
  const latestTwo = await repo.readLatestSuccessfulResult({ workspaceId, savedLeadId: leadTwo })
  const success = await runRow(db, successRun)
  const failed = await runRow(db, failedRun)
  const zeroProfiles = countRows(await db.execute(sql`
    select count(*)::int as count from saved_lead_profile_findings
    where workspace_id = ${workspaceId} and investigation_run_id = ${zeroProfileRun}::uuid
  `))
  assert.equal(latestOne?.runId, successRun)
  assert.equal(latestTwo?.runId, zeroProfileRun)
  assert.equal(success.status, 'completed')
  assert.equal(success.trigger_state, 'no_signal')
  assert.equal(failed.status, 'failed')
  assert.equal(failed.failure_code, 'provider_timeout')
  assert.equal(failed.failure_retryable, true)
  assert.equal(zeroProfiles, 0)
  assert.match(JSON.stringify(success.source_plan), /coverage-round-trip/)
  return { latestOne, latestTwo, success, failed, zeroProfiles }
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
    checkpoint: 'CP26C.2B.1',
    projectId: EXPECTED_PROJECT_ID,
    branchId: EXPECTED_BRANCH_ID,
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
    await capture('cleanAdmission', () => cleanAdmissionProof(db, repo, playbook))
    await capture('staleBoundary', () => staleBoundaryProof(db, repo, playbook))
    if (failures.length === 0) {
      await capture('sameRunConcurrency', () => sameRunConcurrencyProof(db, repo, playbook))
      for (const iteration of [1, 2, 3]) {
        await capture(`dailyConcurrency${iteration}`, () =>
          dailyConcurrencyProof(db, repo, playbook, iteration),
        )
      }
      await capture('activeRunUniqueness', () => activeRunProof(db, repo, playbook))
      await capture('lineageEvidence', () => lineageEvidenceProof(db, repo, playbook))
      await capture('persistenceReplay', () => persistenceReplayProof(db, repo, playbook))
      await capture('forbiddenWrites', () => forbiddenWritesProof(db))
    }
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
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
