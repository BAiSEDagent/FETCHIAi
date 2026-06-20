/**
 * CP21B - Postgres persister proof.
 *
 * Fixture-only proof against the standalone non-production Neon database.
 * This script does not call live providers, run LLMs, push schema, migrate,
 * seed, or touch routes/UI. All writes are scoped to cp21b-fixture-* IDs.
 */

import assert from 'node:assert/strict'
import { sql } from 'drizzle-orm'
import {
  createPostgresCp21aConductorPersister,
  runCp21aFixtureConductor,
} from '@/lib/runtime/conductor'
import {
  PROSPECT_VIEW_FORBIDDEN_KEYS,
  getLeadFunnelReadModelFromStorage,
  type OpportunityFunnelView,
} from '@/lib/read-model/lead-funnel'

const MAIN_WORKSPACE_ID = 'cp21b-fixture-main'
const ROLLBACK_WORKSPACE_ID = 'cp21b-fixture-rollback'
const RUN_FAILURE_WORKSPACE_ID = 'cp21b-fixture-run-failure'
const PROOF_DB_APPROVAL_ENV = 'CP21B_POSTGRES_PROOF_DB_APPROVED'
const PROOF_DB_APPROVAL_VALUE = 'fetchi-cp21-proof'

const EXPECTED_CORE_TABLES = [
  'workspace_settings',
  'scout_runs',
  'signals',
  'prospects',
  'opportunities',
  'evidence_sources',
  'opportunity_evidence_proofs',
  'runtime_lineage_runs',
  'contact_routes',
  'outreach_plays',
  'lead_pass_reasons',
  'todays_run_items',
] as const

type DbModule = typeof import('@/db')
type DbClient = DbModule['db']

type WorkspaceCounts = {
  opportunities: number
  prospects: number
  signals: number
  proofs: number
  evidenceSources: number
  lineageRuns: number
  contactRoutes: number
  outreachPlays: number
  leadPassReasons: number
  todaysRunItems: number
  scoutRuns: number
  runningScoutRuns: number
  failedScoutRuns: number
}

function sanitizedDatabaseMetadata() {
  assert.equal(
    process.env[PROOF_DB_APPROVAL_ENV],
    PROOF_DB_APPROVAL_VALUE,
    `${PROOF_DB_APPROVAL_ENV} must equal ${PROOF_DB_APPROVAL_VALUE}`,
  )

  const raw = process.env.DATABASE_URL
  assert(raw, 'DATABASE_URL is not available')

  const parsed = new URL(raw)
  const databaseName = parsed.pathname.replace(/^\//, '')
  const hostClassification = parsed.hostname.endsWith('.neon.tech') ? 'neon' : 'unknown'

  assert.equal(hostClassification, 'neon')
  assert.equal(databaseName, 'neondb')

  return {
    projectLabel: 'fetchi-cp21-proof',
    projectId: 'orange-pond-21076952',
    branchId: 'br-odd-hall-afhsm7mh',
    databaseName,
    hostClassification,
    production: false,
    proofDbApproval: PROOF_DB_APPROVAL_VALUE,
  }
}

async function loadDb(): Promise<DbModule> {
  return import('@/db')
}

function rows<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseInt(value, 10)
  return 0
}

async function tableVerification(db: DbClient) {
  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  const tableNames = rows<{ table_name: string }>(result).map((row) => row.table_name)
  const missing = EXPECTED_CORE_TABLES.filter((tableName) => !tableNames.includes(tableName))

  return {
    tableCount: tableNames.length,
    expectedCoreMissing: missing,
    expectedCoreTablesVisible: missing.length === 0,
  }
}

async function cleanupCp21bFixtureRows(db: DbClient) {
  await db.execute(sql`DELETE FROM todays_run_items WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM lead_pass_reasons WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM outreach_plays WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM contact_routes WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM opportunity_evidence_proofs WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM runtime_lineage_runs WHERE provider_run_id LIKE 'cp21b-fixture:%'`)
  await db.execute(sql`DELETE FROM opportunities WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM signals WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM prospects WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM evidence_sources WHERE source_type = 'cp21b_fixture_evidence'`)
  await db.execute(sql`DELETE FROM scout_runs WHERE workspace_id LIKE 'cp21b-fixture-%'`)
  await db.execute(sql`DELETE FROM workspace_settings WHERE workspace_id LIKE 'cp21b-fixture-%'`)
}

async function workspaceCounts(db: DbClient, workspaceId: string): Promise<WorkspaceCounts> {
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM opportunities WHERE workspace_id = ${workspaceId})::int AS opportunities,
      (SELECT count(*) FROM prospects WHERE workspace_id = ${workspaceId})::int AS prospects,
      (SELECT count(*) FROM signals WHERE workspace_id = ${workspaceId})::int AS signals,
      (SELECT count(*) FROM opportunity_evidence_proofs WHERE workspace_id = ${workspaceId})::int AS proofs,
      (SELECT count(*) FROM evidence_sources WHERE external_id LIKE ${`cp21b-fixture-${workspaceId}-%`})::int AS evidence_sources,
      (SELECT count(*) FROM runtime_lineage_runs WHERE provider_run_id LIKE ${`cp21b-fixture:${workspaceId}:%`})::int AS lineage_runs,
      (SELECT count(*) FROM contact_routes WHERE workspace_id = ${workspaceId})::int AS contact_routes,
      (SELECT count(*) FROM outreach_plays WHERE workspace_id = ${workspaceId})::int AS outreach_plays,
      (SELECT count(*) FROM lead_pass_reasons WHERE workspace_id = ${workspaceId})::int AS lead_pass_reasons,
      (SELECT count(*) FROM todays_run_items WHERE workspace_id = ${workspaceId})::int AS todays_run_items,
      (SELECT count(*) FROM scout_runs WHERE workspace_id = ${workspaceId})::int AS scout_runs,
      (SELECT count(*) FROM scout_runs WHERE workspace_id = ${workspaceId} AND status = 'running')::int AS running_scout_runs,
      (SELECT count(*) FROM scout_runs WHERE workspace_id = ${workspaceId} AND status = 'failed')::int AS failed_scout_runs
  `)
  const [row] = rows<Record<string, unknown>>(result)
  assert(row, `No count row returned for ${workspaceId}`)

  return {
    opportunities: numberValue(row.opportunities),
    prospects: numberValue(row.prospects),
    signals: numberValue(row.signals),
    proofs: numberValue(row.proofs),
    evidenceSources: numberValue(row.evidence_sources),
    lineageRuns: numberValue(row.lineage_runs),
    contactRoutes: numberValue(row.contact_routes),
    outreachPlays: numberValue(row.outreach_plays),
    leadPassReasons: numberValue(row.lead_pass_reasons),
    todaysRunItems: numberValue(row.todays_run_items),
    scoutRuns: numberValue(row.scout_runs),
    runningScoutRuns: numberValue(row.running_scout_runs),
    failedScoutRuns: numberValue(row.failed_scout_runs),
  }
}

async function fixtureRunningScoutRows(db: DbClient): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS running_count
    FROM scout_runs
    WHERE workspace_id LIKE 'cp21b-fixture-%'
      AND status = 'running'
  `)
  const [row] = rows<{ running_count: number }>(result)
  return numberValue(row?.running_count)
}

async function prospectUrgencyProof(db: DbClient, workspaceId: string) {
  const result = await db.execute(sql`
    SELECT
      proof.id AS proof_id,
      proof.proof_metadata->>'candidateId' AS candidate_id,
      opportunity.signal_id AS opportunity_signal_id,
      opportunity.why_now AS opportunity_why_now,
      proof.signal_type,
      proof.signal_label,
      proof.why_now AS proof_why_now,
      proof.proof_metadata->>'claimsUrgency' AS claims_urgency
    FROM opportunity_evidence_proofs proof
    INNER JOIN opportunities opportunity
      ON opportunity.id = proof.opportunity_id
    WHERE proof.workspace_id = ${workspaceId}
      AND proof.lead_kind <> 'signal_backed_opportunity'
    ORDER BY proof.id
  `)
  const proofRows = rows<{
    proof_id: string
    candidate_id: string | null
    opportunity_signal_id: string | null
    opportunity_why_now: string | null
    signal_type: string
    signal_label: string
    proof_why_now: string
    claims_urgency: string | null
  }>(result)
  assert(proofRows.length > 0, 'Expected non-signal-backed proof rows.')

  for (const row of proofRows) {
    const label = row.candidate_id ?? row.proof_id
    assert.equal(row.opportunity_signal_id, null, `${label} leaked opportunity.signal_id`)
    assert.equal(row.opportunity_why_now, null, `${label} leaked opportunity.why_now`)
    assert.equal(row.signal_type, 'no_fresh_signal', `${label} stored wrong signal_type`)
    assert.equal(row.signal_label, 'No fresh signal', `${label} stored wrong signal_label`)
    assert.equal(
      row.proof_why_now,
      'No fresh signal; evidence-backed prospect only.',
      `${label} stored wrong proof why_now`,
    )
    assert.notEqual(row.claims_urgency, 'true', `${label} stored claimsUrgency=true`)
  }

  return {
    checkedRows: proofRows.length,
    leaksPersisted: 0,
  }
}

function runRequest(workspaceId: string) {
  return {
    workspaceId,
    vertical: 'commercial_cleaning' as const,
    market: 'Austin',
    requestedAt: '2026-06-20T12:00:00.000Z',
    budget: {
      maxProviderCalls: 0 as const,
      maxEstimatedCostCents: 0 as const,
      maxCandidates: 8,
    },
  }
}

async function runSuccessfulFixture(workspaceId: string) {
  return runCp21aFixtureConductor(runRequest(workspaceId), {
    persister: createPostgresCp21aConductorPersister(),
  })
}

function assertNoProspectForbiddenKeys(view: Record<string, unknown>) {
  for (const key of PROSPECT_VIEW_FORBIDDEN_KEYS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(view, key),
      false,
      `Prospect view leaked ${key}`,
    )
  }
}

async function cp20cDisplayProof(workspaceId: string) {
  const readModel = await getLeadFunnelReadModelFromStorage()
  const items = readModel.lanes.flatMap((lane) =>
    lane.items
      .filter((item) => item.view.workspaceId === workspaceId)
      .map((item) => ({
        laneId: lane.id,
        kind: item.kind,
        view: item.view,
      })),
  )

  const todaysOpportunities = items.filter((item) => item.laneId === 'todays_opportunities')
  const prospectPool = items.filter((item) => item.laneId === 'prospect_pool')
  const needsReview = items.filter((item) => item.laneId === 'needs_review')

  assert.equal(todaysOpportunities.length, 1)
  assert.equal(prospectPool.length, 1)
  assert.equal(needsReview.length, 1)

  const opportunity = todaysOpportunities[0]
  assert(opportunity)
  assert.equal(opportunity.kind, 'opportunity')
  assert(opportunity.view.evidence.length > 0)
  assert(opportunity.view.score.reasons.length > 0)
  const opportunityView = opportunity.view as OpportunityFunnelView
  assert(opportunityView.urgency.whyNow)
  assert(opportunityView.lineage.runtimeLineageRuns.length > 0)
  assert(opportunityView.lineage.searchProviderRunId)
  assert(opportunityView.lifecycle.todayRunStatus)

  for (const item of [...prospectPool, ...needsReview]) {
    assert.equal(item.kind, 'prospect')
    assert(item.view.evidence.length > 0)
    assert(item.view.score.reasons.length > 0)
    assertNoProspectForbiddenKeys(item.view as unknown as Record<string, unknown>)
  }

  return {
    displaysViaCp20cReadModel: true,
    cp20cLaneCounts: {
      todays_opportunities: todaysOpportunities.length,
      prospect_pool: prospectPool.length,
      needs_review: needsReview.length,
    },
    cp20cProviderCallsDuringRead: readModel.providerCallsDuringRead,
    cp20cDbWritesDuringRead: readModel.dbWritesDuringRead,
  }
}

async function main() {
  const database = sanitizedDatabaseMetadata()
  console.log('DATABASE_URL_PRESENT=true')

  const { db } = await loadDb()
  const tables = await tableVerification(db)
  assert.equal(tables.expectedCoreTablesVisible, true)

  await cleanupCp21bFixtureRows(db)

  const firstReport = await runSuccessfulFixture(MAIN_WORKSPACE_ID)
  const firstCounts = await workspaceCounts(db, MAIN_WORKSPACE_ID)
  const secondReport = await runSuccessfulFixture(MAIN_WORKSPACE_ID)
  const secondCounts = await workspaceCounts(db, MAIN_WORKSPACE_ID)

  assert.equal(firstReport.ok, true)
  assert.equal(secondReport.ok, true)
  assert.equal(secondReport.persistence.mode, 'postgres')
  assert(secondReport.persistence.dbWrites > 0)
  assert.equal(secondReport.providerCalls, 0)
  assert.equal(secondReport.estimatedCostCents, 0)
  assert.equal(secondReport.badCandidateDidNotAbortRun, true)
  assert.equal(secondReport.failedCandidates.length, 1)
  assert.equal(secondReport.demotedCandidates.length, 1)
  assert.equal(secondCounts.proofs, 3)
  assert.equal(secondCounts.opportunities, 3)
  assert.equal(secondCounts.prospects, 3)
  assert.equal(secondCounts.signals, 1)
  assert.equal(secondCounts.todaysRunItems, 1)
  assert.equal(secondCounts.runningScoutRuns, 0)

  const duplicateLeadsOnRerun = secondCounts.proofs - firstCounts.proofs
  assert.equal(duplicateLeadsOnRerun, 0)

  let rollbackThrew = false
  try {
    await runCp21aFixtureConductor(runRequest(ROLLBACK_WORKSPACE_ID), {
      persister: createPostgresCp21aConductorPersister({
        faultAfterLeadPlans: 1,
      }),
    })
  } catch {
    rollbackThrew = true
  }
  assert.equal(rollbackThrew, true)
  const rollbackCounts = await workspaceCounts(db, ROLLBACK_WORKSPACE_ID)
  assert.equal(rollbackCounts.proofs, 0)
  assert.equal(rollbackCounts.opportunities, 0)
  assert.equal(rollbackCounts.prospects, 0)
  assert.equal(rollbackCounts.evidenceSources, 0)
  assert.equal(rollbackCounts.runningScoutRuns, 0)
  assert.equal(rollbackCounts.failedScoutRuns, 1)

  let runFailureThrew = false
  try {
    await runCp21aFixtureConductor(runRequest(RUN_FAILURE_WORKSPACE_ID), {
      persister: createPostgresCp21aConductorPersister({
        failOnBudgetUsage: true,
      }),
    })
  } catch {
    runFailureThrew = true
  }
  assert.equal(runFailureThrew, true)
  const runFailureCounts = await workspaceCounts(db, RUN_FAILURE_WORKSPACE_ID)
  assert.equal(runFailureCounts.runningScoutRuns, 0)
  assert.equal(runFailureCounts.failedScoutRuns, 1)

  const strandedRunningRows = await fixtureRunningScoutRows(db)
  assert.equal(strandedRunningRows, 0)

  const prospectUrgencyRows = await prospectUrgencyProof(db, MAIN_WORKSPACE_ID)
  const prospectUrgencyLeaksPersisted = prospectUrgencyRows.leaksPersisted
  assert.equal(prospectUrgencyLeaksPersisted, 0)

  const displayProof = await cp20cDisplayProof(MAIN_WORKSPACE_ID)
  assert.equal(displayProof.cp20cProviderCallsDuringRead, 0)
  assert.equal(displayProof.cp20cDbWritesDuringRead, 0)

  const stageFailureCount =
    secondReport.stageCounts.hydrate.failed +
    secondReport.stageCounts.evidenceGate.blocked +
    secondReport.stageCounts.classification.failed +
    secondReport.stageCounts.scoring.failed +
    secondReport.stageCounts.claimGuard.blocked
  const failureCountsAccurate =
    stageFailureCount === secondReport.failedCandidates.length &&
    secondReport.stageCounts.hydrate.failed === 1 &&
    secondReport.stageCounts.evidenceGate.blocked === 0 &&
    secondReport.stageCounts.classification.failed === 0 &&
    secondReport.stageCounts.scoring.failed === 0 &&
    secondReport.stageCounts.claimGuard.blocked === 0
  assert.equal(failureCountsAccurate, true)

  const proof = {
    ok: true,
    mode: 'cp21b_postgres_persister',
    database,
    tableCount: tables.tableCount,
    expectedCoreMissing: tables.expectedCoreMissing,
    expectedCoreTablesVisible: tables.expectedCoreTablesVisible,
    persistedOpportunities: displayProof.cp20cLaneCounts.todays_opportunities,
    persistedProspects: displayProof.cp20cLaneCounts.prospect_pool,
    persistedNeedsReview: displayProof.cp20cLaneCounts.needs_review,
    readBackMatchesWritten: true,
    prospectUrgencyRowsChecked: prospectUrgencyRows.checkedRows,
    prospectUrgencyLeaksPersisted,
    transactionRollbackCleanOnFault:
      rollbackCounts.proofs === 0 &&
      rollbackCounts.opportunities === 0 &&
      rollbackCounts.prospects === 0 &&
      rollbackCounts.evidenceSources === 0,
    strandedRunningRows,
    duplicateLeadsOnRerun,
    failureCountsAccurate,
    providerCalls: secondReport.providerCalls,
    liveProviders: false,
    schemaChanged: false,
    displaysViaCp20cReadModel: displayProof.displaysViaCp20cReadModel,
    cp20cProviderCallsDuringRead: displayProof.cp20cProviderCallsDuringRead,
    cp20cDbWritesDuringRead: displayProof.cp20cDbWritesDuringRead,
    dbWrites: secondReport.dbWrites,
    persistenceMode: secondReport.persistence.mode,
  }

  console.log(JSON.stringify(proof, null, 2))
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
