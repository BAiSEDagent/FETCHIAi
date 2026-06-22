/**
 * CP21C - bounded live TDLR/TABS conductor proof.
 *
 * Uses the standalone non-production Neon proof DB only. It does not run
 * db:push, migrations, seeds, routes, UI, LLMs, SerpApi discovery, crawl,
 * extract, deep research, CRM/export, scheduler, or outreach sends.
 */

import assert from 'node:assert/strict'
import { sql } from 'drizzle-orm'
import {
  CP21C_MARKET,
  CP21C_SOURCE_PATH,
  CP21C_VERTICAL,
  CP21C_WORKSPACE_PREFIX,
  createPostgresCp21aConductorPersister,
  runCp21cLiveTdlrConductor,
  type Cp21cCachedCandidateSet,
  type Cp21cCandidateDisposition,
  type Cp21cPersistedItemAudit,
} from '@/lib/runtime/conductor'
import {
  PROSPECT_VIEW_FORBIDDEN_KEYS,
  getLeadFunnelReadModelFromStorage,
} from '@/lib/read-model/lead-funnel'

const MAIN_WORKSPACE_ID = `${CP21C_WORKSPACE_PREFIX}main`
const ROLLBACK_WORKSPACE_ID = `${CP21C_WORKSPACE_PREFIX}rollback`
const RUN_FAILURE_WORKSPACE_ID = `${CP21C_WORKSPACE_PREFIX}run-failure`
const PROOF_DB_APPROVAL_VALUE = 'fetchi-cp21-proof'
const CP21B_APPROVAL_ENV = 'CP21B_POSTGRES_PROOF_DB_APPROVED'
const CP21C_APPROVAL_ENV = 'CP21C_LIVE_TDLR_DFW_APPROVED'
const CP21C_PROVIDER_RUN_PREFIX = 'cp21c-live-tdlr-dfw:'

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
    process.env[CP21B_APPROVAL_ENV],
    PROOF_DB_APPROVAL_VALUE,
    `${CP21B_APPROVAL_ENV} must equal ${PROOF_DB_APPROVAL_VALUE}`,
  )
  assert.equal(
    process.env[CP21C_APPROVAL_ENV],
    PROOF_DB_APPROVAL_VALUE,
    `${CP21C_APPROVAL_ENV} must equal ${PROOF_DB_APPROVAL_VALUE}`,
  )

  const raw = process.env.DATABASE_URL
  assert(raw, 'DATABASE_URL is not available')
  const parsed = new URL(raw)
  const databaseName = parsed.pathname.replace(/^\//, '')
  const hostClassification = parsed.hostname.endsWith('.neon.tech') ? 'neon' : 'unknown'

  assert.equal(hostClassification, 'neon')
  assert.equal(databaseName, 'neondb')
  assert(process.env.FIRECRAWL_API_KEY, 'FIRECRAWL_API_KEY is not available')

  return {
    projectLabel: 'fetchi-cp21-proof',
    projectId: 'orange-pond-21076952',
    branchId: 'br-odd-hall-afhsm7mh',
    databaseName,
    hostClassification,
    production: false,
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

async function cleanupCp21cRows(db: DbClient) {
  await db.execute(sql`DELETE FROM todays_run_items WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM lead_pass_reasons WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM outreach_plays WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM contact_routes WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM opportunity_evidence_proofs WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM runtime_lineage_runs WHERE provider_run_id LIKE ${`${CP21C_PROVIDER_RUN_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM opportunities WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM signals WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM prospects WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM scout_runs WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
  await db.execute(sql`DELETE FROM workspace_settings WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}`)
}

async function workspaceCounts(db: DbClient, workspaceId: string): Promise<WorkspaceCounts> {
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM opportunities WHERE workspace_id = ${workspaceId})::int AS opportunities,
      (SELECT count(*) FROM prospects WHERE workspace_id = ${workspaceId})::int AS prospects,
      (SELECT count(*) FROM signals WHERE workspace_id = ${workspaceId})::int AS signals,
      (SELECT count(*) FROM opportunity_evidence_proofs WHERE workspace_id = ${workspaceId})::int AS proofs,
      (SELECT count(*) FROM runtime_lineage_runs WHERE provider_run_id LIKE ${`${CP21C_PROVIDER_RUN_PREFIX}${workspaceId}:%`})::int AS lineage_runs,
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

async function cp21cRunningScoutRows(db: DbClient): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS running_count
    FROM scout_runs
    WHERE workspace_id LIKE ${`${CP21C_WORKSPACE_PREFIX}%`}
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

async function noOpportunityWithoutSignalProof(db: DbClient, workspaceId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS bad_count
    FROM opportunity_evidence_proofs proof
    INNER JOIN opportunities opportunity
      ON opportunity.id = proof.opportunity_id
    WHERE proof.workspace_id = ${workspaceId}
      AND proof.lead_kind = 'signal_backed_opportunity'
      AND opportunity.signal_id IS NULL
  `)
  const [row] = rows<{ bad_count: number }>(result)
  return numberValue(row?.bad_count) === 0
}

function runRequest(workspaceId: string) {
  return {
    workspaceId,
    vertical: CP21C_VERTICAL,
    market: CP21C_MARKET,
    requestedAt: new Date().toISOString(),
    budget: {
      maxProviderCalls: 24,
      maxEstimatedCostCents: 25,
      maxCandidates: 50,
    },
  }
}

function cp21cPersister(options: {
  faultAfterLeadPlans?: number
  failOnBudgetUsage?: boolean
} = {}) {
  return createPostgresCp21aConductorPersister({
    checkpoint: 'CP21C',
    fixtureWorkspacePrefix: CP21C_WORKSPACE_PREFIX,
    ...options,
  })
}

async function runLive(workspaceId: string) {
  return runCp21cLiveTdlrConductor(runRequest(workspaceId), {
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
    persister: cp21cPersister(),
  })
}

async function runCached(workspaceId: string, cachedCandidateSet: Cp21cCachedCandidateSet) {
  return runCp21cLiveTdlrConductor(runRequest(workspaceId), {
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
    persister: cp21cPersister(),
    cachedCandidateSet,
  })
}

async function runRollbackFault(cachedCandidateSet: Cp21cCachedCandidateSet) {
  return runCp21cLiveTdlrConductor(runRequest(ROLLBACK_WORKSPACE_ID), {
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
    persister: cp21cPersister({ faultAfterLeadPlans: 1 }),
    cachedCandidateSet,
  })
}

async function runTopLevelFailure(cachedCandidateSet: Cp21cCachedCandidateSet) {
  return runCp21cLiveTdlrConductor(runRequest(RUN_FAILURE_WORKSPACE_ID), {
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
    persister: cp21cPersister({ failOnBudgetUsage: true }),
    cachedCandidateSet,
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

  for (const item of items) {
    assert(item.view.evidence.length > 0)
    assert(item.view.score.reasons.length > 0)
    if (item.kind === 'prospect') {
      assertNoProspectForbiddenKeys(item.view as unknown as Record<string, unknown>)
    }
  }

  return {
    displaysViaCp20cReadModel: items.length > 0,
    items,
    cp20cLaneCounts: {
      todays_opportunities: todaysOpportunities.length,
      prospect_pool: prospectPool.length,
      needs_review: needsReview.length,
    },
    cp20cLiveReadBackCount: items.length,
    cp20cProviderCallsDuringRead: readModel.providerCallsDuringRead,
    cp20cDbWritesDuringRead: readModel.dbWritesDuringRead,
    cp21bFixtureRowsExcludedFromReadback: items.every((item) =>
      item.view.workspaceId.startsWith(CP21C_WORKSPACE_PREFIX),
    ),
  }
}

function scoreMathProof(persistedItemAudits: readonly Cp21cPersistedItemAudit[]) {
  return persistedItemAudits.map((audit) => ({
    candidateId: audit.candidateId,
    scoreTotal: audit.scoreTotal,
    fitScore: audit.fitScore,
    freshnessScore: audit.freshnessScore,
    contactScore: audit.contactScore,
    scoreMaxPossible: audit.scoreMaxPossible,
    scoreMathConsistent: audit.scoreMathConsistent,
    scoreTrusted: audit.scoreTrusted,
    scoreReasonSubstance: audit.scoreReasonSubstance,
    scoreComponents: audit.scoreComponents,
  }))
}

function actionabilityProof(persistedItemAudits: readonly Cp21cPersistedItemAudit[]) {
  return persistedItemAudits.map((audit) => ({
    candidateId: audit.candidateId,
    buyerIdentityRaw: audit.buyerIdentityRaw,
    buyerIdentitySafe: audit.buyerIdentitySafe,
    buyerIdentityIssue: audit.buyerIdentityIssue,
    contactRouteCount: audit.contactRouteCount,
    contactRouteStatus: audit.contactRouteStatus,
    leadActionabilityReady: audit.leadActionabilityReady,
    nextCheckpointNeeded: audit.nextCheckpointNeeded,
    defensibleSourceBackedOpportunity: audit.defensibleSourceBackedOpportunity,
    defensibleActionableLead: audit.defensibleActionableLead,
  }))
}

function candidateDispositionsForReadback({
  candidateDispositions,
  readbackSourceUrls,
}: {
  candidateDispositions: readonly Cp21cCandidateDisposition[]
  readbackSourceUrls: ReadonlySet<string>
}) {
  return candidateDispositions.map((disposition) => ({
    ...disposition,
    includedInCp20cReadbackCounts:
      disposition.includedInLiveRecordsPersisted && readbackSourceUrls.has(disposition.sourceUrl),
  }))
}

function costAccounting({
  providerSpendUsd,
  persistedOpportunities,
  persistedLiveRecords,
  actionableLeads,
}: {
  providerSpendUsd: number
  persistedOpportunities: number
  persistedLiveRecords: number
  actionableLeads: number
}) {
  return {
    firecrawlCallType: 'scrapeUrl',
    estimatedFirecrawlCostUsd: providerSpendUsd,
    estimatedCostPerFirecrawlHydrationUsd: 0.01,
    sourceAdapterEstimatedSpendUsd: 0,
    costPerPersistedLiveRecordUsd:
      persistedLiveRecords > 0 ? Number((providerSpendUsd / persistedLiveRecords).toFixed(2)) : null,
    costPerPersistedOpportunityUsd:
      persistedOpportunities > 0 ? Number((providerSpendUsd / persistedOpportunities).toFixed(2)) : null,
    costPerActionableLeadUsd:
      actionableLeads > 0 ? Number((providerSpendUsd / actionableLeads).toFixed(2)) : null,
  }
}

function persistedRecordDump({
  displayProof,
  persistedItemAudits,
  laneId,
}: {
  displayProof: Awaited<ReturnType<typeof cp20cDisplayProof>>
  persistedItemAudits: readonly Cp21cPersistedItemAudit[]
  laneId?: string
}) {
  const preferred = laneId
    ? displayProof.items.find((item) => item.laneId === laneId) ?? null
    : displayProof.items.find((item) => item.laneId === 'todays_opportunities') ??
      displayProof.items.find((item) => item.laneId === 'needs_review') ??
      displayProof.items.find((item) => item.laneId === 'prospect_pool') ??
      null
  if (!preferred) return null

  const audit = persistedItemAudits.find((itemAudit) => itemAudit.candidateId === preferred.view.lineage.runtimeLineageRuns[0]?.providerRunId.split(':')[2]) ??
    persistedItemAudits[0] ??
    null
  const contactRouteCount = preferred.view.contactRoutes.length
  const outreachPlayCount = preferred.view.outreachPlays.length
  const urgency = preferred.view.leadKind === 'signal_backed_opportunity'
    ? preferred.view.urgency
    : null

  return {
    businessName: preferred.view.businessName,
    buyerIdentitySafe: audit?.buyerIdentitySafe ?? false,
    leadActionabilityReady: audit?.leadActionabilityReady ?? false,
    contactRouteStatus: audit?.contactRouteStatus ?? (contactRouteCount > 0 ? 'present' : 'missing'),
    lane: preferred.laneId,
    leadKind: preferred.view.leadKind,
    state: preferred.view.state,
    signalType: urgency?.signalType ?? null,
    signalLabel: urgency?.signalLabel ?? null,
    verticalFitLabel: preferred.view.verticalFitLabel,
    sourceUrl: preferred.view.evidence[0]?.sourceUrl ?? null,
    sourceDate: preferred.view.evidence[0]?.sourceDate ?? null,
    evidenceSummary: preferred.view.evidence[0]?.evidenceSummary ?? null,
    sourceExcerpt: preferred.view.evidence[0]?.sourceExcerpt ?? null,
    whyNow: urgency?.whyNow ?? null,
    scoreTotal: preferred.view.score.total,
    scoreComponents: audit?.scoreComponents ?? [],
    scoreTrusted: audit?.scoreTrusted ?? preferred.view.score.trusted,
    scoreReasons: preferred.view.score.reasons,
    recommendedAction: preferred.view.recommendedAction,
    lineageRows: preferred.view.lineage.runtimeLineageRuns,
    contactRouteCount,
    outreachPlayCount,
    outreachPlayStatus: preferred.view.outreachPlays.map((play) => play.status),
    defensibleSourceBackedOpportunity: audit?.defensibleSourceBackedOpportunity ?? false,
    defensibleActionableLead: audit?.defensibleActionableLead ?? false,
  }
}

async function main() {
  const database = sanitizedDatabaseMetadata()
  console.log('DATABASE_URL_PRESENT=true')
  console.log('FIRECRAWL_API_KEY_PRESENT=true')
  console.log('CP21B_POSTGRES_PROOF_DB_APPROVED_VALID=true')
  console.log('CP21C_LIVE_TDLR_DFW_APPROVED_VALID=true')
  console.log(`SERPAPI_KEY_PRESENT=${Boolean(process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY)}`)

  const { db } = await loadDb()
  const tables = await tableVerification(db)
  assert.equal(tables.expectedCoreTablesVisible, true)

  await cleanupCp21cRows(db)

  const first = await runLive(MAIN_WORKSPACE_ID)
  assert.equal(first.report.ok, true)
  assert.equal(first.report.mode, 'cp21c_live_tdlr_conductor')
  assert.equal(first.metrics.liveRecords, true)
  assert(first.metrics.rawRecordsReturned > 0)
  assert(first.metrics.dedupedCandidates > 0)
  assert(first.metrics.hydratedCandidates > 0)
  assert(first.metrics.liveRecordsPersisted > 0)
  assert.equal(first.metrics.budgetExceeded, false)
  assert.equal(first.metrics.budgetAbortTriggered, false)
  assert.equal(first.metrics.serpApiCalls, 0)
  assert.equal(first.report.providerCalls, first.metrics.providerCalls)
  assert.equal(first.report.prospectUrgencyLeaks, 0)
  assert.equal(first.report.labelsApproved, true)
  assert.equal(first.report.scoreReasonsCiteEvidence, true)
  assert.equal(first.report.badCandidateDidNotAbortRun, true)
  assert.equal(first.metrics.hydratedCandidateDispositionCount, first.metrics.hydratedCandidates)
  assert.equal(first.metrics.dispositionAccountingComplete, true)
  assert.equal(first.metrics.noSilentHydratedCandidateDrops, true)
  assert(first.persistedItemAudits.every((audit) => audit.scoreMathConsistent))
  assert(first.persistedItemAudits.every((audit) => audit.scoreTrusted))

  const firstCounts = await workspaceCounts(db, MAIN_WORKSPACE_ID)
  assert.equal(firstCounts.proofs, first.metrics.liveRecordsPersisted)
  assert.equal(firstCounts.runningScoutRuns, 0)

  const second = await runCached(MAIN_WORKSPACE_ID, first.cachedCandidateSet)
  assert.equal(second.report.ok, true)
  assert.equal(second.metrics.providerCalls, 0)
  assert.equal(second.metrics.sourceAdapterCalls, 0)
  assert.equal(second.metrics.firecrawlCalls, 0)
  const secondCounts = await workspaceCounts(db, MAIN_WORKSPACE_ID)
  const duplicateLeadsOnRerun = secondCounts.proofs - firstCounts.proofs
  assert.equal(duplicateLeadsOnRerun, 0)

  let rollbackThrew = false
  try {
    await runRollbackFault(first.cachedCandidateSet)
  } catch {
    rollbackThrew = true
  }
  assert.equal(rollbackThrew, true)
  const rollbackCounts = await workspaceCounts(db, ROLLBACK_WORKSPACE_ID)
  assert.equal(rollbackCounts.proofs, 0)
  assert.equal(rollbackCounts.opportunities, 0)
  assert.equal(rollbackCounts.prospects, 0)
  assert.equal(rollbackCounts.runningScoutRuns, 0)
  assert.equal(rollbackCounts.failedScoutRuns, 1)

  let runFailureThrew = false
  try {
    await runTopLevelFailure(first.cachedCandidateSet)
  } catch {
    runFailureThrew = true
  }
  assert.equal(runFailureThrew, true)
  const runFailureCounts = await workspaceCounts(db, RUN_FAILURE_WORKSPACE_ID)
  assert.equal(runFailureCounts.runningScoutRuns, 0)
  assert.equal(runFailureCounts.failedScoutRuns, 1)

  const strandedRunningRows = await cp21cRunningScoutRows(db)
  assert.equal(strandedRunningRows, 0)

  const prospectUrgencyRows = await prospectUrgencyProof(db, MAIN_WORKSPACE_ID)
  assert.equal(prospectUrgencyRows.leaksPersisted, 0)
  const noOpportunityWithoutSignal = await noOpportunityWithoutSignalProof(db, MAIN_WORKSPACE_ID)
  assert.equal(noOpportunityWithoutSignal, true)

  const displayProof = await cp20cDisplayProof(MAIN_WORKSPACE_ID)
  assert.equal(displayProof.displaysViaCp20cReadModel, true)
  assert.equal(displayProof.cp20cProviderCallsDuringRead, 0)
  assert.equal(displayProof.cp20cDbWritesDuringRead, 0)
  const readbackSourceUrls = new Set(
    displayProof.items.flatMap((item) => item.view.evidence.map((evidence) => evidence.sourceUrl)),
  )
  const candidateDispositions = candidateDispositionsForReadback({
    candidateDispositions: first.candidateDispositions,
    readbackSourceUrls,
  })

  const readBackMatchesWritten =
    displayProof.cp20cLiveReadBackCount === first.metrics.liveRecordsPersisted &&
    displayProof.cp20cLaneCounts.todays_opportunities === first.metrics.persistedOpportunities &&
    displayProof.cp20cLaneCounts.prospect_pool === first.metrics.persistedProspects &&
    displayProof.cp20cLaneCounts.needs_review === first.metrics.persistedNeedsReview
  assert.equal(readBackMatchesWritten, true)
  assert.equal(candidateDispositions.length, first.metrics.hydratedCandidates)
  assert.equal(
    candidateDispositions.filter((disposition) => disposition.includedInCp20cReadbackCounts).length,
    first.metrics.liveRecordsPersisted,
  )

  const actionableLeadCount = first.persistedItemAudits.filter((audit) => audit.leadActionabilityReady).length
  const cost = costAccounting({
    providerSpendUsd: first.metrics.estimatedProviderSpendUsd,
    persistedOpportunities: first.metrics.persistedOpportunities,
    persistedLiveRecords: first.metrics.liveRecordsPersisted,
    actionableLeads: actionableLeadCount,
  })
  const scoreMath = scoreMathProof(first.persistedItemAudits)
  const actionability = actionabilityProof(first.persistedItemAudits)
  const actionabilityByCandidateId = new Map(
    actionability.map((item) => [item.candidateId, item]),
  )
  const unsafeTodaysOpportunities = candidateDispositions.filter((disposition) => {
    if (disposition.finalDisposition !== 'persisted_opportunity') return false
    return actionabilityByCandidateId.get(`cp21c-${disposition.projectNumber}`)?.buyerIdentitySafe !== true
  })
  assert.equal(unsafeTodaysOpportunities.length, 0)
  const persistedRecord = persistedRecordDump({
    displayProof,
    persistedItemAudits: first.persistedItemAudits,
  })
  const firstPersistedOpportunity = persistedRecordDump({
    displayProof,
    persistedItemAudits: first.persistedItemAudits,
    laneId: 'todays_opportunities',
  })
  const firstPersistedNeedsReview = persistedRecordDump({
    displayProof,
    persistedItemAudits: first.persistedItemAudits,
    laneId: 'needs_review',
  })

  const proof = {
    ok: true,
    mode: 'cp21c_live_tdlr_conductor',
    database,
    sourcePath: CP21C_SOURCE_PATH,
    market: CP21C_MARKET,
    vertical: CP21C_VERTICAL,
    liveRecords: first.metrics.liveRecords,
    recordedReal: false,
    preTargetedProjectNumber: false,
    sourceAdapterListingCalls: first.metrics.sourceAdapterListingCalls,
    rawRecordsReturned: first.metrics.rawRecordsReturned,
    discoveredCandidates: first.metrics.discoveredCandidates,
    dedupedCandidates: first.metrics.dedupedCandidates,
    hydratedCandidates: first.metrics.hydratedCandidates,
    liveRecordsPersisted: first.metrics.liveRecordsPersisted,
    opportunityGradeSignalAvailable: first.metrics.opportunityGradeSignalAvailable,
    noOpportunityGradeSignalReason: first.metrics.noOpportunityGradeSignalReason,
    persistedOpportunities: first.metrics.persistedOpportunities,
    persistedProspects: first.metrics.persistedProspects,
    persistedNeedsReview: first.metrics.persistedNeedsReview,
    failedCandidates: first.metrics.failedCandidates,
    demotedCandidates: first.metrics.demotedCandidates,
    blockedCandidates: first.metrics.blockedCandidates,
    hydratedCandidateDispositionCount: first.metrics.hydratedCandidateDispositionCount,
    dispositionAccountingComplete: first.metrics.dispositionAccountingComplete,
    noSilentHydratedCandidateDrops: first.metrics.noSilentHydratedCandidateDrops,
    candidateDispositions,
    survivalRate: {
      rawRecordsReturned: first.metrics.rawRecordsReturned,
      dedupedCandidates: first.metrics.dedupedCandidates,
      hydratedCandidates: first.metrics.hydratedCandidates,
      persistedOpportunities: first.metrics.persistedOpportunities,
      persistedProspects: first.metrics.persistedProspects,
      persistedNeedsReview: first.metrics.persistedNeedsReview,
      failedCandidates: first.metrics.failedCandidates,
      demotedCandidates: first.metrics.demotedCandidates,
      blockedCandidates: first.metrics.blockedCandidates,
    },
    providerCalls: first.metrics.providerCalls,
    sourceAdapterCalls: first.metrics.sourceAdapterCalls,
    firecrawlCalls: first.metrics.firecrawlCalls,
    firecrawlCallType: cost.firecrawlCallType,
    estimatedFirecrawlCostUsd: cost.estimatedFirecrawlCostUsd,
    estimatedCostPerFirecrawlHydrationUsd: cost.estimatedCostPerFirecrawlHydrationUsd,
    sourceAdapterEstimatedSpendUsd: cost.sourceAdapterEstimatedSpendUsd,
    serpApiCalls: first.metrics.serpApiCalls,
    estimatedProviderSpendUsd: first.metrics.estimatedProviderSpendUsd,
    costPerPersistedLiveRecordUsd: cost.costPerPersistedLiveRecordUsd,
    costPerPersistedOpportunityUsd: cost.costPerPersistedOpportunityUsd,
    costPerActionableLeadUsd: cost.costPerActionableLeadUsd,
    budgetExceeded: first.metrics.budgetExceeded,
    budgetAbortTriggered: first.metrics.budgetAbortTriggered,
    perCandidateErrorsIsolated: first.metrics.perCandidateErrorsIsolated,
    scoreMath,
    actionability,
    persistedRecord,
    firstPersistedOpportunity,
    firstPersistedNeedsReview,
    buyerIdentityUnsafeTodaysOpportunities: unsafeTodaysOpportunities.length,
    sourceBackedButNotActionable:
      actionability.some((item) => item.defensibleSourceBackedOpportunity && !item.defensibleActionableLead),
    strandedRunningRows,
    duplicateLeadsOnRerun,
    transactionRollbackCleanOnFault:
      rollbackCounts.proofs === 0 &&
      rollbackCounts.opportunities === 0 &&
      rollbackCounts.prospects === 0,
    readBackMatchesWritten,
    displaysViaCp20cReadModel: displayProof.displaysViaCp20cReadModel,
    cp20cLaneCounts: displayProof.cp20cLaneCounts,
    prospectUrgencyLeaksPersisted: prospectUrgencyRows.leaksPersisted,
    prospectUrgencyRowsChecked: prospectUrgencyRows.checkedRows,
    approvedLabelsOnly: first.report.labelsApproved,
    scoreReasonsCiteEvidence: first.report.scoreReasonsCiteEvidence,
    noOpportunityWithoutSignal,
    cp21cWorkspaceId: MAIN_WORKSPACE_ID,
    cp21cRunId: first.report.runId,
    readBackScopedToCp21cRun: true,
    cp21bFixtureRowsExcludedFromReadback: displayProof.cp21bFixtureRowsExcludedFromReadback,
    proofOnlyFaultRowsExcludedFromLiveCounts:
      first.report.failedCandidates.some((candidate) =>
        candidate.candidateId === 'cp21c-proof-only-fault-candidate'
      ) && first.metrics.liveRecordsPersisted === firstCounts.proofs,
    idempotencyUsedCachedCandidateSet: true,
    providerCallsOnIdempotencyRerun: second.metrics.providerCalls,
    liveProviders: true,
    llmCalls: 0,
    schemaChanged: false,
    persistenceMode: first.report.persistence.mode,
    tableCount: tables.tableCount,
    expectedCoreMissing: tables.expectedCoreMissing,
    expectedCoreTablesVisible: tables.expectedCoreTablesVisible,
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
