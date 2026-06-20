import { createHash } from 'node:crypto'
import { sql, type SQL } from 'drizzle-orm'
import type {
  Cp21aBlockedOrReviewItem,
  Cp21aConductorRunReport,
  Cp21aEvidencePlan,
  Cp21aFailedCandidate,
  Cp21aOpportunityPlan,
  Cp21aPersistenceReport,
  Cp21aProspectPlan,
  Cp21aRunRequest,
} from './types'
import {
  CP21A_TABLES_PLANNED,
  type Cp21aBudgetUsagePlan,
  type Cp21aCandidateStageResultPlan,
  type Cp21aConductorPersister,
  type Cp21aLineagePlan,
} from './persistence'

type PersistableLeadPlan = Cp21aOpportunityPlan | Cp21aProspectPlan
type DbModule = typeof import('@/db')
type DbExecutor = {
  execute(statement: SQL): Promise<unknown>
  transaction<T>(callback: (tx: DbExecutor) => Promise<T>): Promise<T>
}

export interface PostgresCp21aConductorPersisterOptions {
  /**
   * Fixture-only guard. CP21B writes must stay under workspace IDs prefixed
   * with this value.
   */
  fixtureWorkspacePrefix?: `cp21b-fixture-${string}`
  /**
   * Test hook used by the smoke proof to force a top-level conductor failure
   * after recordRunStarted has created the running scout row.
   */
  failOnBudgetUsage?: boolean
  /**
   * Test hook used by the smoke proof to throw inside the lead-write
   * transaction after N lead plans have been written.
   */
  faultAfterLeadPlans?: number
}

const DEFAULT_FIXTURE_PREFIX = 'cp21b-fixture-' as const
const OWNER_USER_ID = 'cp21b-fixture-owner'
const PROVIDER_MODE = 'fixture'

function assertSafeDatabaseUrl() {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL is not available to the CP21B Postgres persister.')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('DATABASE_URL is present but is not a valid Postgres URL.')
  }

  if (!parsed.hostname.endsWith('.neon.tech')) {
    throw new Error('DATABASE_URL host is not classified as Neon; refusing CP21B fixture writes.')
  }
  if (parsed.pathname.replace(/^\//, '') !== 'neondb') {
    throw new Error('DATABASE_URL database is not the approved CP21B proof database name.')
  }
}

async function loadDb(): Promise<DbModule> {
  assertSafeDatabaseUrl()
  return import('@/db')
}

function assertFixtureWorkspace(
  workspaceId: string,
  fixtureWorkspacePrefix: string,
) {
  if (!workspaceId.startsWith(fixtureWorkspacePrefix)) {
    throw new Error(`CP21B Postgres persister only writes ${fixtureWorkspacePrefix} workspaces.`)
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

function uuidFor(input: string): string {
  const hex = sha256(input)
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

function jsonb(value: unknown): SQL {
  return sql`${JSON.stringify(value)}::jsonb`
}

function timestampSql(value: Date): SQL {
  return sql`${value.toISOString()}::timestamp`
}

function textArray(values: readonly string[]): SQL {
  const sanitized = values.filter((value) => value.trim().length > 0)
  if (sanitized.length === 0) return sql`ARRAY[]::text[]`
  return sql`ARRAY[${sql.join(sanitized.map((value) => sql`${value}`), sql`, `)}]::text[]`
}

function dateFrom(value: string | null | undefined, fallback: Date): Date {
  if (!value || value === 'undated') return fallback
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function firstEvidence(plan: PersistableLeadPlan): Cp21aEvidencePlan {
  const evidence = plan.evidence[0]
  if (!evidence) {
    throw new Error(`CP21B refuses to persist ${plan.candidateId} without evidence.`)
  }
  return evidence
}

function namespacedSourceUrl({
  evidence,
  workspaceId,
  candidateId,
}: {
  evidence: Cp21aEvidencePlan
  workspaceId: string
  candidateId: string
}): string {
  const base = evidence.sourceUrl.trim().length > 0
    ? evidence.sourceUrl
    : `https://fetchi.fixture.local/cp21b/${workspaceId}/${candidateId}`
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}cp21bWorkspace=${encodeURIComponent(workspaceId)}&candidate=${encodeURIComponent(candidateId)}`
}

function leadKindForStorage(plan: PersistableLeadPlan): string {
  if (plan.leadKind === 'signal_backed_opportunity') return plan.leadKind
  if (plan.laneId === 'needs_review' || plan.state === 'needs_review') {
    return 'exploratory_prospect'
  }
  return plan.leadKind
}

function originalProviderRunId(
  plan: PersistableLeadPlan,
  role: Cp21aLineagePlan['runRole'],
): string | null {
  if (role === 'fixture_discovery') return plan.lineage.searchProviderRunId
  return plan.lineage.evidenceProviderRunId
}

function namespacedProviderRunId({
  workspaceId,
  candidateId,
  role,
  original,
}: {
  workspaceId: string
  candidateId: string
  role: Cp21aLineagePlan['runRole']
  original: string | null
}): string {
  return [
    'cp21b-fixture',
    workspaceId,
    candidateId,
    role,
    original ?? 'none',
  ].join(':')
}

function scoreReason(plan: PersistableLeadPlan): string {
  return plan.score.reasons[0]?.text ?? 'Fixture score reason cites persisted evidence.'
}

function runRowId(workspaceId: string): string {
  return uuidFor(`cp21b:scout_run:${workspaceId}`)
}

function idFor(workspaceId: string, candidateId: string, table: string): string {
  return uuidFor(`cp21b:${table}:${workspaceId}:${candidateId}`)
}

function completedAtFor(request: Cp21aRunRequest): Date {
  return dateFrom(request.requestedAt, new Date())
}

function runStartedAtFor(request: Cp21aRunRequest): Date {
  return dateFrom(request.requestedAt, new Date())
}

function tableNames(): string[] {
  return [...CP21A_TABLES_PLANNED]
}

export class PostgresCp21aConductorPersister implements Cp21aConductorPersister {
  readonly mode = 'postgres' as const

  private readonly fixtureWorkspacePrefix: string
  private readonly failOnBudgetUsage: boolean
  private readonly faultAfterLeadPlans: number | null
  private runRequest: Cp21aRunRequest | null = null
  private writeCount = 0
  private leadPlansWrittenInCurrentTransaction = 0

  private readonly candidateStageResults: Cp21aCandidateStageResultPlan[] = []
  private readonly evidencePlans: Cp21aEvidencePlan[] = []
  private readonly opportunityPlans: Cp21aOpportunityPlan[] = []
  private readonly prospectPlans: Cp21aProspectPlan[] = []
  private readonly blockedOrReviewPlans: Cp21aBlockedOrReviewItem[] = []
  private readonly failedCandidatePlans: Cp21aFailedCandidate[] = []
  private readonly lineagePlans: Cp21aLineagePlan[] = []
  private readonly budgetUsagePlans: Cp21aBudgetUsagePlan[] = []
  private readonly completedRuns: Cp21aConductorRunReport[] = []
  private readonly failedRuns: { request: Cp21aRunRequest; reason: string }[] = []

  constructor(options: PostgresCp21aConductorPersisterOptions = {}) {
    this.fixtureWorkspacePrefix = options.fixtureWorkspacePrefix ?? DEFAULT_FIXTURE_PREFIX
    this.failOnBudgetUsage = options.failOnBudgetUsage ?? false
    this.faultAfterLeadPlans = options.faultAfterLeadPlans ?? null
  }

  async recordRunStarted(request: Cp21aRunRequest): Promise<void> {
    assertFixtureWorkspace(request.workspaceId, this.fixtureWorkspacePrefix)
    this.runRequest = request

    const { db } = await loadDb()
    const startedAt = runStartedAtFor(request)
    await this.ensureWorkspace(db as unknown as DbExecutor, request.workspaceId, startedAt)
    await this.exec(db as unknown as DbExecutor, sql`
      INSERT INTO scout_runs (
        id,
        workspace_id,
        trigger,
        started_at,
        completed_at,
        status,
        sources_checked,
        serp_api_calls_made,
        llm_tokens_used,
        estimated_cost_cents,
        signals_found,
        duplicates_filtered,
        leads_delivered,
        empty_reason,
        credit_consumed,
        metadata
      )
      VALUES (
        ${runRowId(request.workspaceId)},
        ${request.workspaceId},
        ${'admin_test'},
        ${timestampSql(startedAt)},
        NULL,
        ${'running'},
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        NULL,
        false,
        ${jsonb({
          checkpoint: 'CP21B',
          runId: `cp21a-${request.workspaceId}`,
          fixtureOnly: true,
        })}
      )
      ON CONFLICT (id) DO UPDATE SET
        started_at = EXCLUDED.started_at,
        completed_at = NULL,
        status = 'running',
        sources_checked = 0,
        serp_api_calls_made = 0,
        llm_tokens_used = 0,
        estimated_cost_cents = 0,
        signals_found = 0,
        duplicates_filtered = 0,
        leads_delivered = 0,
        empty_reason = NULL,
        credit_consumed = false,
        metadata = EXCLUDED.metadata
    `)
  }

  async recordRunCompleted(report: Cp21aConductorRunReport): Promise<void> {
    const request = this.requireRequest()
    assertFixtureWorkspace(report.workspaceId, this.fixtureWorkspacePrefix)

    const { db } = await loadDb()
    this.leadPlansWrittenInCurrentTransaction = 0
    await (db as unknown as DbExecutor).transaction(async (tx) => {
      for (const plan of [...this.opportunityPlans, ...this.prospectPlans]) {
        await this.writeLeadPlan(tx, request, plan)
        this.leadPlansWrittenInCurrentTransaction += 1
        if (
          this.faultAfterLeadPlans !== null &&
          this.leadPlansWrittenInCurrentTransaction >= this.faultAfterLeadPlans
        ) {
          throw new Error('CP21B injected transaction fault after fixture lead write.')
        }
      }

      await this.exec(tx, sql`
        UPDATE scout_runs
        SET
          completed_at = ${timestampSql(completedAtFor(request))},
          status = 'completed',
          sources_checked = ${report.stageCounts.discovery.discovered},
          serp_api_calls_made = 0,
          llm_tokens_used = 0,
          estimated_cost_cents = 0,
          signals_found = ${report.opportunities.length},
          duplicates_filtered = ${report.stageCounts.discovery.deduped},
          leads_delivered = ${report.opportunities.length + report.prospects.length},
          empty_reason = NULL,
          credit_consumed = false,
          metadata = ${jsonb({
            checkpoint: 'CP21B',
            runId: report.runId,
            fixtureOnly: true,
            failedCandidates: report.failedCandidates.length,
            demotedCandidates: report.demotedCandidates.length,
            providerCalls: report.providerCalls,
            estimatedCostCents: report.estimatedCostCents,
            persistenceMode: 'postgres',
          })}
        WHERE id = ${runRowId(request.workspaceId)}
          AND workspace_id = ${request.workspaceId}
      `)
    })

    this.completedRuns.push(report)
  }

  async recordRunFailed(input: {
    request: Cp21aRunRequest
    reason: string
  }): Promise<void> {
    assertFixtureWorkspace(input.request.workspaceId, this.fixtureWorkspacePrefix)
    this.failedRuns.push(input)

    const { db } = await loadDb()
    const startedAt = runStartedAtFor(input.request)
    await this.ensureWorkspace(db as unknown as DbExecutor, input.request.workspaceId, startedAt)
    await this.exec(db as unknown as DbExecutor, sql`
      INSERT INTO scout_runs (
        id,
        workspace_id,
        trigger,
        started_at,
        completed_at,
        status,
        sources_checked,
        serp_api_calls_made,
        llm_tokens_used,
        estimated_cost_cents,
        signals_found,
        duplicates_filtered,
        leads_delivered,
        empty_reason,
        credit_consumed,
        metadata
      )
      VALUES (
        ${runRowId(input.request.workspaceId)},
        ${input.request.workspaceId},
        ${'admin_test'},
        ${timestampSql(startedAt)},
        ${timestampSql(completedAtFor(input.request))},
        ${'failed'},
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        ${'cp21b_fixture_failure'},
        false,
        ${jsonb({
          checkpoint: 'CP21B',
          runId: `cp21a-${input.request.workspaceId}`,
          fixtureOnly: true,
          failureReason: input.reason,
        })}
      )
      ON CONFLICT (id) DO UPDATE SET
        completed_at = EXCLUDED.completed_at,
        status = 'failed',
        empty_reason = 'cp21b_fixture_failure',
        metadata = EXCLUDED.metadata
    `)
  }

  async recordCandidateStageResult(plan: Cp21aCandidateStageResultPlan): Promise<void> {
    this.candidateStageResults.push(plan)
  }

  async recordEvidencePlan(plan: Cp21aEvidencePlan): Promise<void> {
    this.evidencePlans.push(plan)
  }

  async recordOpportunityPlan(plan: Cp21aOpportunityPlan): Promise<void> {
    this.opportunityPlans.push(plan)
  }

  async recordProspectPlan(plan: Cp21aProspectPlan): Promise<void> {
    this.prospectPlans.push(plan)
  }

  async recordBlockedOrReviewPlan(plan: Cp21aBlockedOrReviewItem): Promise<void> {
    this.blockedOrReviewPlans.push(plan)
    if ('status' in plan && plan.status === 'failed') {
      this.failedCandidatePlans.push(plan)
    }
  }

  async recordLineagePlan(plan: Cp21aLineagePlan): Promise<void> {
    this.lineagePlans.push(plan)
  }

  async recordBudgetUsage(plan: Cp21aBudgetUsagePlan): Promise<void> {
    if (this.failOnBudgetUsage) {
      throw new Error('CP21B injected top-level run failure after run start.')
    }
    this.budgetUsagePlans.push(plan)
  }

  report(): Cp21aPersistenceReport {
    return {
      mode: 'postgres',
      dbWrites: this.writeCount,
      plansCaptured: this.plansCaptured(),
      tablesPlanned: tableNames(),
    }
  }

  private requireRequest(): Cp21aRunRequest {
    if (!this.runRequest) {
      throw new Error('CP21B Postgres persister was used before recordRunStarted.')
    }
    return this.runRequest
  }

  private plansCaptured(): number {
    return (
      (this.runRequest ? 1 : 0) +
      this.completedRuns.length +
      this.failedRuns.length +
      this.candidateStageResults.length +
      this.evidencePlans.length +
      this.opportunityPlans.length +
      this.prospectPlans.length +
      this.blockedOrReviewPlans.length +
      this.lineagePlans.length +
      this.budgetUsagePlans.length
    )
  }

  private async exec(executor: DbExecutor, statement: SQL): Promise<void> {
    await executor.execute(statement)
    this.writeCount += 1
  }

  private async ensureWorkspace(
    executor: DbExecutor,
    workspaceId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.exec(executor, sql`
      INSERT INTO workspace_settings (
        workspace_id,
        owner_user_id,
        business_name,
        is_approved,
        onboarding_step,
        signup_method,
        updated_at
      )
      VALUES (
        ${workspaceId},
        ${OWNER_USER_ID},
        ${'CP21B fixture workspace'},
        false,
        0,
        ${'cp21b_fixture'},
        ${timestampSql(timestamp)}
      )
      ON CONFLICT (workspace_id) DO UPDATE SET
        owner_user_id = EXCLUDED.owner_user_id,
        business_name = EXCLUDED.business_name,
        updated_at = EXCLUDED.updated_at
    `)
  }

  private lineageFor(plan: PersistableLeadPlan): Cp21aLineagePlan[] {
    const recorded = this.lineagePlans.filter((lineage) => lineage.candidateId === plan.candidateId)
    if (recorded.length > 0) return recorded

    return [
      {
        candidateId: plan.candidateId,
        provider: 'fixture',
        providerRunId: plan.lineage.searchProviderRunId,
        runRole: 'fixture_discovery',
        status: plan.lineage.searchProviderRunId ? 'ok' : 'skipped',
        sourceUrl: plan.lineage.sourceUrl,
        estimatedCostCents: 0,
      },
      {
        candidateId: plan.candidateId,
        provider: 'fixture',
        providerRunId: plan.lineage.evidenceProviderRunId,
        runRole: 'fixture_evidence',
        status: plan.lineage.evidenceProviderRunId ? 'ok' : 'skipped',
        sourceUrl: plan.lineage.sourceUrl,
        estimatedCostCents: 0,
      },
    ]
  }

  private async writeLeadPlan(
    tx: DbExecutor,
    request: Cp21aRunRequest,
    plan: PersistableLeadPlan,
  ): Promise<void> {
    const workspaceId = request.workspaceId
    const candidateId = plan.candidateId
    const evidence = firstEvidence(plan)
    const evidenceDate = dateFrom(evidence.sourceDate, completedAtFor(request))
    const evidenceSourceId = idFor(workspaceId, candidateId, 'evidence_sources')
    const prospectId = idFor(workspaceId, candidateId, 'prospects')
    const signalId = plan.leadKind === 'signal_backed_opportunity'
      ? idFor(workspaceId, candidateId, 'signals')
      : null
    const opportunityId = idFor(workspaceId, candidateId, 'opportunities')
    const proofId = idFor(workspaceId, candidateId, 'opportunity_evidence_proofs')
    const contactRouteId = idFor(workspaceId, candidateId, 'contact_routes')
    const outreachPlayId = idFor(workspaceId, candidateId, 'outreach_plays')
    const sourceUrl = namespacedSourceUrl({ evidence, workspaceId, candidateId })
    const lineage = this.lineageFor(plan)
    const searchProviderRunId = namespacedProviderRunId({
      workspaceId,
      candidateId,
      role: 'fixture_discovery',
      original: originalProviderRunId(plan, 'fixture_discovery'),
    })
    const evidenceProviderRunId = namespacedProviderRunId({
      workspaceId,
      candidateId,
      role: 'fixture_evidence',
      original: originalProviderRunId(plan, 'fixture_evidence'),
    })
    const now = completedAtFor(request)
    const isOpportunity = plan.leadKind === 'signal_backed_opportunity'
    const storedLeadKind = leadKindForStorage(plan)

    await this.exec(tx, sql`
      INSERT INTO evidence_sources (
        id,
        source_type,
        source_authority,
        external_id,
        source_url,
        source_title,
        source_date,
        evidence_fingerprint,
        source_metadata,
        first_seen_at,
        last_seen_at
      )
      VALUES (
        ${evidenceSourceId},
        ${'cp21b_fixture_evidence'},
        ${'fetchi_fixture'},
        ${`cp21b-fixture-${workspaceId}-${candidateId}`},
        ${sourceUrl},
        ${evidence.sourceTitle},
        ${timestampSql(evidenceDate)},
        ${sha256(`cp21b:evidence:${workspaceId}:${candidateId}:${evidence.sourceFingerprint}`)},
        ${jsonb({
          checkpoint: 'CP21B',
          fixtureOnly: true,
          originalEvidenceId: evidence.id,
          originalSourceUrl: evidence.sourceUrl,
          sourceAdapterRunIds: [],
          sourceAdapterListingUrls: [],
        })},
        ${timestampSql(now)},
        ${timestampSql(now)}
      )
      ON CONFLICT (source_type, external_id) DO UPDATE SET
        source_url = EXCLUDED.source_url,
        source_title = EXCLUDED.source_title,
        source_date = EXCLUDED.source_date,
        evidence_fingerprint = EXCLUDED.evidence_fingerprint,
        source_metadata = EXCLUDED.source_metadata,
        last_seen_at = EXCLUDED.last_seen_at
    `)

    await this.exec(tx, sql`
      INSERT INTO prospects (
        id,
        workspace_id,
        business_name,
        city,
        state,
        website,
        business_type,
        enrichment_status,
        updated_at
      )
      VALUES (
        ${prospectId},
        ${workspaceId},
        ${plan.businessName},
        ${plan.market},
        ${'TX'},
        ${sourceUrl},
        ${'commercial_cleaning_target'},
        ${'complete'},
        ${timestampSql(now)}
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        business_name = EXCLUDED.business_name,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        website = EXCLUDED.website,
        business_type = EXCLUDED.business_type,
        enrichment_status = EXCLUDED.enrichment_status,
        updated_at = EXCLUDED.updated_at
    `)

    if (isOpportunity && signalId && plan.signal) {
      await this.exec(tx, sql`
        INSERT INTO signals (
          id,
          workspace_id,
          signal_type,
          signal_hash,
          raw_data,
          parsed_data,
          why_relevant,
          detected_at,
          status
        )
        VALUES (
          ${signalId},
          ${workspaceId},
          ${plan.signal.signalType},
          ${sha256(`cp21b:signal:${workspaceId}:${candidateId}:${plan.signal.signalType}`)},
          ${jsonb({
            checkpoint: 'CP21B',
            fixtureOnly: true,
            candidateId,
          })},
          ${jsonb({
            signalLabel: plan.signal.signalLabel,
            freshnessWindow: plan.signal.freshnessWindow,
            sourceUrl,
          })},
          ${plan.signal.whyNow},
          ${timestampSql(evidenceDate)},
          ${'valid'}
        )
        ON CONFLICT (id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          signal_type = EXCLUDED.signal_type,
          signal_hash = EXCLUDED.signal_hash,
          raw_data = EXCLUDED.raw_data,
          parsed_data = EXCLUDED.parsed_data,
          why_relevant = EXCLUDED.why_relevant,
          detected_at = EXCLUDED.detected_at,
          status = EXCLUDED.status
      `)
    }

    await this.exec(tx, sql`
      INSERT INTO opportunities (
        id,
        workspace_id,
        signal_id,
        prospect_id,
        score,
        why_now,
        status,
        updated_at
      )
      VALUES (
        ${opportunityId},
        ${workspaceId},
        ${signalId},
        ${prospectId},
        ${plan.score.total},
        ${isOpportunity ? plan.whyNow : null},
        ${'new'},
        ${timestampSql(now)}
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        signal_id = EXCLUDED.signal_id,
        prospect_id = EXCLUDED.prospect_id,
        score = EXCLUDED.score,
        why_now = EXCLUDED.why_now,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `)

    for (const lineagePlan of lineage) {
      const original = lineagePlan.providerRunId
      const providerRunId = namespacedProviderRunId({
        workspaceId,
        candidateId,
        role: lineagePlan.runRole,
        original,
      })
      await this.exec(tx, sql`
        INSERT INTO runtime_lineage_runs (
          id,
          provider,
          provider_run_id,
          run_role,
          status,
          evidence_source_id,
          source_url,
          query,
          engine,
          estimated_cost_cents,
          started_at,
          completed_at,
          request_metadata,
          response_metadata
        )
        VALUES (
          ${idFor(workspaceId, `${candidateId}:${lineagePlan.runRole}`, 'runtime_lineage_runs')},
          ${lineagePlan.provider},
          ${providerRunId},
          ${lineagePlan.runRole},
          ${lineagePlan.status},
          ${evidenceSourceId},
          ${sourceUrl},
          NULL,
          ${'fixture'},
          0,
          ${timestampSql(now)},
          ${timestampSql(now)},
          ${jsonb({
            checkpoint: 'CP21B',
            fixtureOnly: true,
            originalProviderRunId: original,
          })},
          ${jsonb({
            providerCalls: 0,
            liveProviders: false,
          })}
        )
        ON CONFLICT (provider_run_id) DO UPDATE SET
          provider = EXCLUDED.provider,
          run_role = EXCLUDED.run_role,
          status = EXCLUDED.status,
          evidence_source_id = EXCLUDED.evidence_source_id,
          source_url = EXCLUDED.source_url,
          query = EXCLUDED.query,
          engine = EXCLUDED.engine,
          estimated_cost_cents = EXCLUDED.estimated_cost_cents,
          completed_at = EXCLUDED.completed_at,
          request_metadata = EXCLUDED.request_metadata,
          response_metadata = EXCLUDED.response_metadata
      `)
    }

    await this.exec(tx, sql`
      INSERT INTO opportunity_evidence_proofs (
        id,
        workspace_id,
        opportunity_id,
        evidence_source_id,
        proof_hash,
        lead_kind,
        provider_mode,
        market,
        vertical,
        signal_type,
        signal_label,
        vertical_fit_label,
        score,
        why_now,
        score_reason,
        next_action_label,
        next_action_detail,
        evidence_summary,
        source_excerpt,
        source_fingerprint,
        search_provider_run_id,
        evidence_provider_run_id,
        source_adapter_run_ids,
        source_adapter_listing_urls,
        gate_reasons,
        provider_lineage,
        proof_metadata,
        updated_at
      )
      VALUES (
        ${proofId},
        ${workspaceId},
        ${opportunityId},
        ${evidenceSourceId},
        ${sha256(`cp21b:proof:${workspaceId}:${candidateId}:${storedLeadKind}`)},
        ${storedLeadKind},
        ${PROVIDER_MODE},
        ${plan.market},
        ${plan.vertical},
        ${isOpportunity && plan.signal ? plan.signal.signalType : 'no_fresh_signal'},
        ${isOpportunity && plan.signal ? plan.signal.signalLabel : 'No fresh signal'},
        ${plan.verticalFitLabel ?? 'Fit unconfirmed'},
        ${plan.score.total},
        ${isOpportunity ? plan.whyNow : 'No fresh signal; evidence-backed prospect only.'},
        ${scoreReason(plan)},
        ${plan.recommendedAction.label},
        ${plan.recommendedAction.detail},
        ${evidence.evidenceSummary},
        ${evidence.sourceExcerpt},
        ${evidence.sourceFingerprint},
        ${searchProviderRunId},
        ${evidenceProviderRunId},
        ${textArray([])},
        ${textArray([])},
        ${jsonb({
          claimGuardDisposition: plan.claimGuardDisposition,
          labelApproved: plan.labelApproved,
          demotionReason: 'demotionReason' in plan ? plan.demotionReason : null,
        })},
        ${jsonb({
          searchProviderRunId,
          evidenceProviderRunId,
          originalSearchProviderRunId: plan.lineage.searchProviderRunId,
          originalEvidenceProviderRunId: plan.lineage.evidenceProviderRunId,
        })},
        ${jsonb({
          checkpoint: 'CP21B',
          fixtureOnly: true,
          candidateId,
          originalLeadKind: plan.leadKind,
          storedLeadKind,
          state: plan.state,
          laneId: plan.laneId,
          claimsUrgency: plan.claimsUrgency,
          demotedFromSignal: 'demotedFromSignal' in plan ? plan.demotedFromSignal : false,
          providerCalls: 0,
          liveProviders: false,
        })},
        ${timestampSql(now)}
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        opportunity_id = EXCLUDED.opportunity_id,
        evidence_source_id = EXCLUDED.evidence_source_id,
        proof_hash = EXCLUDED.proof_hash,
        lead_kind = EXCLUDED.lead_kind,
        provider_mode = EXCLUDED.provider_mode,
        market = EXCLUDED.market,
        vertical = EXCLUDED.vertical,
        signal_type = EXCLUDED.signal_type,
        signal_label = EXCLUDED.signal_label,
        vertical_fit_label = EXCLUDED.vertical_fit_label,
        score = EXCLUDED.score,
        why_now = EXCLUDED.why_now,
        score_reason = EXCLUDED.score_reason,
        next_action_label = EXCLUDED.next_action_label,
        next_action_detail = EXCLUDED.next_action_detail,
        evidence_summary = EXCLUDED.evidence_summary,
        source_excerpt = EXCLUDED.source_excerpt,
        source_fingerprint = EXCLUDED.source_fingerprint,
        search_provider_run_id = EXCLUDED.search_provider_run_id,
        evidence_provider_run_id = EXCLUDED.evidence_provider_run_id,
        source_adapter_run_ids = EXCLUDED.source_adapter_run_ids,
        source_adapter_listing_urls = EXCLUDED.source_adapter_listing_urls,
        gate_reasons = EXCLUDED.gate_reasons,
        provider_lineage = EXCLUDED.provider_lineage,
        proof_metadata = EXCLUDED.proof_metadata,
        updated_at = EXCLUDED.updated_at
    `)

    const routeNeedsReview = plan.laneId === 'needs_review'
    await this.exec(tx, sql`
      INSERT INTO contact_routes (
        id,
        workspace_id,
        prospect_id,
        contact_name,
        contact_title,
        contact_email,
        route_type,
        confidence,
        verified
      )
      VALUES (
        ${contactRouteId},
        ${workspaceId},
        ${prospectId},
        ${`${plan.businessName} Facilities`},
        ${'Operations contact'},
        ${`cp21b-fixture-${sha256(`${workspaceId}:${candidateId}`).slice(0, 12)}@example.invalid`},
        ${'email'},
        ${routeNeedsReview ? 55 : 90},
        ${!routeNeedsReview}
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        prospect_id = EXCLUDED.prospect_id,
        contact_name = EXCLUDED.contact_name,
        contact_title = EXCLUDED.contact_title,
        contact_email = EXCLUDED.contact_email,
        route_type = EXCLUDED.route_type,
        confidence = EXCLUDED.confidence,
        verified = EXCLUDED.verified
    `)

    await this.exec(tx, sql`
      INSERT INTO outreach_plays (
        id,
        workspace_id,
        opportunity_id,
        contact_route_id,
        subject_line,
        body,
        signal_reference,
        status,
        updated_at
      )
      VALUES (
        ${outreachPlayId},
        ${workspaceId},
        ${opportunityId},
        ${contactRouteId},
        ${isOpportunity ? `Fixture follow-up for ${plan.businessName}` : `Fixture prospect note for ${plan.businessName}`},
        ${`Fixture-only CP21B draft for ${plan.businessName}. No provider or LLM generated this content.`},
        ${isOpportunity && plan.signal ? plan.signal.signalLabel : null},
        ${'draft'},
        ${timestampSql(now)}
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        opportunity_id = EXCLUDED.opportunity_id,
        contact_route_id = EXCLUDED.contact_route_id,
        subject_line = EXCLUDED.subject_line,
        body = EXCLUDED.body,
        signal_reference = EXCLUDED.signal_reference,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `)

    if (isOpportunity) {
      await this.exec(tx, sql`
        INSERT INTO todays_run_items (
          id,
          workspace_id,
          opportunity_id,
          run_date,
          route_order,
          status,
          outreach_play_id
        )
        VALUES (
          ${idFor(workspaceId, candidateId, 'todays_run_items')},
          ${workspaceId},
          ${opportunityId},
          ${timestampSql(dateFrom(request.requestedAt.slice(0, 10), now))},
          1,
          ${'drafted'},
          ${outreachPlayId}
        )
        ON CONFLICT (id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          opportunity_id = EXCLUDED.opportunity_id,
          run_date = EXCLUDED.run_date,
          route_order = EXCLUDED.route_order,
          status = EXCLUDED.status,
          outreach_play_id = EXCLUDED.outreach_play_id
      `)
    }

    if (plan.laneId === 'needs_review') {
      await this.exec(tx, sql`
        INSERT INTO lead_pass_reasons (
          id,
          workspace_id,
          opportunity_id,
          reason,
          note,
          source
        )
        VALUES (
          ${idFor(workspaceId, candidateId, 'lead_pass_reasons')},
          ${workspaceId},
          ${opportunityId},
          ${'bad_signal'},
          ${'CP21B fixture demotion or review state; not a customer action.'},
          ${'cp21b_fixture'}
        )
        ON CONFLICT (id) DO UPDATE SET
          workspace_id = EXCLUDED.workspace_id,
          opportunity_id = EXCLUDED.opportunity_id,
          reason = EXCLUDED.reason,
          note = EXCLUDED.note,
          source = EXCLUDED.source
      `)
    }
  }
}

export function createPostgresCp21aConductorPersister(
  options: PostgresCp21aConductorPersisterOptions = {},
): PostgresCp21aConductorPersister {
  return new PostgresCp21aConductorPersister(options)
}
