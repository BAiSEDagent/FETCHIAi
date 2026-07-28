import { sql, type SQL } from 'drizzle-orm'
import type {
  CompletedSignalCheck,
  InvestigationUsageSnapshot,
  SavedLeadIdentity,
  SavedLeadProfileFinding,
  TriggerResult,
} from './contracts'
import { createInvestigationUsage } from './budget'
import type {
  OwnedSavedLeadForInvestigation,
  SavedLeadInvestigationRepository,
} from './executor'

export interface DrizzleLikeExecutor {
  execute(statement: SQL): Promise<unknown>
  transaction?<T>(callback: (tx: DrizzleLikeExecutor) => Promise<T>): Promise<T>
}

export interface PostgresSavedLeadInvestigationRepositoryOptions {
  db: DrizzleLikeExecutor
}

const DUPLICATED_SOURCE_METADATA = new Set([
  'provider',
  'providerRunId',
  'query',
  'engine',
  'sourceUrl',
  'authority',
  'cost',
  'timing',
  'requestMetadata',
  'responseMetadata',
])

function rows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  if (typeof result === 'object' && result !== null && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[]
  }
  return []
}

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : null
}

function json<T>(value: unknown, fallback: T): T {
  return typeof value === 'object' && value !== null ? value as T : fallback
}

function noSignalReason(value: unknown) {
  return value === 'identity_ambiguous' ||
    value === 'identity_unresolved' ||
    value === 'insufficient_evidence' ||
    value === 'none_found'
    ? value
    : 'none_found'
}

function savedLeadIdentity(row: Record<string, unknown>): SavedLeadIdentity {
  return {
    name: String(row.business_name ?? ''),
    domain: typeof row.website === 'string' ? row.website : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    address: typeof row.address === 'string' ? row.address : null,
    city: typeof row.market === 'string' ? row.market.split(',')[0]?.trim() : null,
    state: typeof row.market === 'string' ? row.market.split(',')[1]?.trim() : null,
    countryCode: 'US',
  }
}

export function validateInvestigationSourceInsert(
  input: Record<string, unknown>,
): void {
  if (Object.keys(input).some((key) => DUPLICATED_SOURCE_METADATA.has(key))) {
    throw new Error(
      'saved_lead_investigation_sources rejected duplicated canonical metadata',
    )
  }
}

class PostgresSavedLeadInvestigationRepository
  implements SavedLeadInvestigationRepository {
  constructor(private readonly db: DrizzleLikeExecutor) {}

  private transaction<T>(fn: (executor: DrizzleLikeExecutor) => Promise<T>) {
    return this.db.transaction ? this.db.transaction(fn) : fn(this.db)
  }

  async loadOwnedSavedLead({ workspaceId, savedLeadId }: {
    workspaceId: string
    savedLeadId: string
  }): Promise<OwnedSavedLeadForInvestigation | null> {
    const result = await this.db.execute(sql`
      select id, workspace_id, business_name, website, phone, address, market, category
      from saved_leads
      where workspace_id = ${workspaceId} and id = ${savedLeadId}::uuid
      limit 1
    `)
    const row = rows(result)[0]
    return row ? {
      workspaceId: String(row.workspace_id),
      id: String(row.id),
      identity: savedLeadIdentity(row),
      serviceProfileAlias: typeof row.category === 'string' ? row.category : null,
    } : null
  }

  async loadLatestRunState({ workspaceId, savedLeadId }: {
    workspaceId: string
    savedLeadId: string
  }) {
    const state = rows(await this.db.execute(sql`
      select latest_successful_run_id, recheck_eligible_at
      from saved_lead_investigation_state
      where workspace_id = ${workspaceId} and saved_lead_id = ${savedLeadId}::uuid
      limit 1
    `))[0] ?? {}
    const active = rows(await this.db.execute(sql`
      select id from saved_lead_investigation_runs
      where workspace_id = ${workspaceId}
        and saved_lead_id = ${savedLeadId}::uuid
        and status in ('created', 'running')
      order by created_at desc
      limit 1
    `))[0]
    return {
      activeRunId: active?.id ? String(active.id) : null,
      latestCompletedRunId: state.latest_successful_run_id
        ? String(state.latest_successful_run_id)
        : null,
      recheckEligibleAt: iso(state.recheck_eligible_at),
    }
  }

  async createOrGetRun(input: Parameters<SavedLeadInvestigationRepository['createOrGetRun']>[0]) {
    const inserted = rows(await this.db.execute(sql`
      insert into saved_lead_investigation_runs
        (id, workspace_id, saved_lead_id, client_request_id, playbook_id, playbook_version, budget_ceiling)
      values
        (${input.runId}::uuid, ${input.workspaceId}, ${input.savedLeadId}::uuid, ${input.clientRequestId}, ${input.playbook.id}, ${input.playbook.version}, '{}'::jsonb)
      on conflict (workspace_id, client_request_id) do nothing
      returning id
    `))[0]?.id
    if (inserted) return { runId: String(inserted), idempotent: false }
    const existing = rows(await this.db.execute(sql`
      select id from saved_lead_investigation_runs
      where workspace_id = ${input.workspaceId} and client_request_id = ${input.clientRequestId}
      limit 1
    `))[0]?.id
    return { runId: String(existing ?? input.runId), idempotent: true }
  }

  async admitRun(input: Parameters<SavedLeadInvestigationRepository['admitRun']>[0]) {
    return this.transaction(async (executor) => {
      const admitted = rows(await executor.execute(sql`
        with usage_row as (
          insert into saved_lead_investigation_daily_usage
            (workspace_id, workspace_day_key, timezone, reset_at, used_count, limit_snapshot)
          values (${input.workspaceId}, to_char(now() at time zone 'UTC', 'YYYY-MM-DD'), 'UTC', date_trunc('day', now()) + interval '1 day', 0, 10)
          on conflict (workspace_id, workspace_day_key) do update set updated_at = now()
          returning workspace_day_key
        ),
        admitted_usage as (
          update saved_lead_investigation_daily_usage usage
          set used_count = used_count + 1, updated_at = now()
          from usage_row
          where usage.workspace_id = ${input.workspaceId}
            and usage.workspace_day_key = usage_row.workspace_day_key
            and usage.used_count < usage.limit_snapshot
          returning usage.workspace_day_key, usage.used_count, usage.limit_snapshot
        )
        update saved_lead_investigation_runs run
        set status = 'running',
            started_at = now(),
            heartbeat_at = now(),
            workspace_day_key = admitted_usage.workspace_day_key,
            usage_counted_at = now()
        from admitted_usage
        where run.workspace_id = ${input.workspaceId}
          and run.saved_lead_id = ${input.savedLeadId}::uuid
          and run.id = ${input.runId}::uuid
          and run.usage_counted_at is null
        returning run.id, run.saved_lead_id, admitted_usage.used_count, admitted_usage.limit_snapshot
      `))[0]
      if (!admitted) {
        return {
          state: 'daily_limit_reached' as const,
          runId: input.runId,
          savedLeadId: input.savedLeadId,
          usedCount: 10,
          usageCounted: false,
          externalCalls: 0 as const,
          limit: 10,
        }
      }
      return {
        state: 'admitted' as const,
        runId: String(admitted.id),
        savedLeadId: String(admitted.saved_lead_id),
        usedCount: Number(admitted.used_count),
        usageCounted: true,
        externalCalls: 0 as const,
        limit: Number(admitted.limit_snapshot),
      }
    })
  }

  async markPhase(runId: string, phase: string) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set current_phase = ${phase}, heartbeat_at = now(), updated_at = now()
      where id = ${runId}::uuid
    `)
  }

  async persistInitialIdentity(runId: string, identity: unknown) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set initial_identity_resolution = ${identity}::jsonb, identity_resolution = ${identity}::jsonb
      where id = ${runId}::uuid
    `)
  }

  async persistSourcePlan(runId: string, plan: unknown) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs set source_plan = ${plan}::jsonb
      where id = ${runId}::uuid
    `)
  }

  async reserveUsage() {
    return { state: 'reserved', usage: createInvestigationUsage() }
  }

  async creditUsage() {
    return { state: 'credited', usage: createInvestigationUsage() }
  }

  async recordLineage(input: Parameters<SavedLeadInvestigationRepository['recordLineage']>[0]) {
    const row = rows(await this.db.execute(sql`
      insert into runtime_lineage_runs
        (provider, provider_run_id, run_role, status, source_url, query, request_metadata, response_metadata)
      values
        (${input.provider}, ${input.providerRunId}, ${input.runRole}, ${input.status}, ${input.sourceUrl ?? null}, ${input.query ?? null}, ${input.requestMetadata ?? {}}::jsonb, ${input.responseMetadata ?? {}}::jsonb)
      on conflict (provider_run_id) do update set completed_at = now()
      returning id
    `))[0]
    return { id: String(row?.id ?? input.providerRunId) }
  }

  async recordEvidence(input: Parameters<SavedLeadInvestigationRepository['recordEvidence']>[0]) {
    const row = rows(await this.db.execute(sql`
      insert into evidence_sources
        (source_type, source_authority, external_id, source_url, source_title, source_date, evidence_fingerprint, source_metadata)
      values
        (${input.sourceType}, ${input.sourceAuthority}, ${input.externalId}, ${input.sourceUrl}, ${input.sourceTitle ?? null}, ${input.sourceDate}::timestamptz, ${input.evidenceFingerprint}, ${input.sourceMetadata}::jsonb)
      on conflict (source_type, external_id) do update
        set last_seen_at = now(), evidence_fingerprint = excluded.evidence_fingerprint
      returning id
    `))[0]
    return { id: String(row?.id ?? input.externalId) }
  }

  async linkInvestigationSource(input: Parameters<SavedLeadInvestigationRepository['linkInvestigationSource']>[0]) {
    validateInvestigationSourceInsert(input)
    const row = rows(await this.db.execute(sql`
      insert into saved_lead_investigation_sources
        (workspace_id, investigation_run_id, registry_source_key, tier, availability, check_state, candidate_rank, fallback_reason, runtime_lineage_run_id, evidence_source_id)
      values
        (${input.workspaceId}, ${input.runId}::uuid, ${input.registrySourceKey}, ${input.tier}, ${input.availability}, ${input.checkState}, ${input.candidateRank ?? null}, ${input.fallbackReason ?? null}, ${input.runtimeLineageRunId ?? null}::uuid, ${input.evidenceSourceId ?? null}::uuid)
      on conflict do nothing
      returning id
    `))[0]
    return { id: String(row?.id ?? input.runtimeLineageRunId ?? input.registrySourceKey) }
  }

  async persistProfileFindings(runId: string, findings: SavedLeadProfileFinding[]) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set category_ids_checked = ${findings.map((finding) => finding.factKey)}::jsonb
      where id = ${runId}::uuid
    `)
  }

  async persistTriggerFinding(runId: string, trigger: TriggerResult) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set trigger_state = ${trigger.state},
          trigger_reason_code = ${trigger.state === 'no_signal' ? trigger.reasonCode : null}
      where id = ${runId}::uuid
    `)
  }

  async persistCompletedResult(result: CompletedSignalCheck) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set status = 'completed',
          current_phase = 'completed',
          checked_at = ${result.checkedAt}::timestamptz,
          recheck_eligible_at = ${result.recheckEligibleAt}::timestamptz,
          result_expires_at = ${result.resultExpiresAt}::timestamptz,
          identity_resolution = ${result.identity}::jsonb
      where id = ${result.runId}::uuid
    `)
  }

  async persistRetryableFailure(input: Parameters<SavedLeadInvestigationRepository['persistRetryableFailure']>[0]) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set status = 'failed',
          failure_code = ${input.failureCode},
          failure_retryable = true,
          updated_at = now()
      where id = ${input.runId}::uuid
    `)
  }

  async readLatestSuccessfulResult({ workspaceId, savedLeadId }: {
    workspaceId: string
    savedLeadId: string
  }): Promise<CompletedSignalCheck | null> {
    const row = rows(await this.db.execute(sql`
      select identity_resolution, trigger_state, trigger_reason_code, checked_at,
             recheck_eligible_at, result_expires_at, usage_actual, id
      from saved_lead_investigation_runs
      where workspace_id = ${workspaceId}
        and saved_lead_id = ${savedLeadId}::uuid
        and status = 'completed'
      order by checked_at desc
      limit 1
    `))[0]
    return row ? latestResult(row, savedLeadId) : null
  }

  async reconcileAbandonedRuns() {}
}

function latestResult(row: Record<string, unknown>, savedLeadId: string): CompletedSignalCheck {
  return {
    status: 'completed',
    savedLeadId,
    runId: String(row.id),
    checkedAt: iso(row.checked_at) ?? new Date(0).toISOString(),
    identity: json(row.identity_resolution, {
      state: 'unresolved',
      confidence: 0,
      matchedOn: [],
      conflicts: [],
      reasonCodes: ['missing_snapshot'],
      evaluatedAt: new Date(0).toISOString(),
    }),
    trigger: row.trigger_state === 'signal_found'
      ? { state: 'no_signal', reasonCode: 'insufficient_evidence' }
      : { state: 'no_signal', reasonCode: noSignalReason(row.trigger_reason_code) },
    profileReport: {
      findings: [],
      sourcesChecked: 0,
      structuredSourcesChecked: 0,
      webQueriesRun: 0,
      hydratedSources: 0,
      categoryIdsChecked: [],
      unavailableSourceKeys: [],
      checkedSourceKeys: [],
      usage: json<InvestigationUsageSnapshot>(row.usage_actual, createInvestigationUsage()),
      expiresAt: iso(row.result_expires_at) ?? new Date(0).toISOString(),
    },
    recheckEligibleAt: iso(row.recheck_eligible_at) ?? new Date(0).toISOString(),
    resultExpiresAt: iso(row.result_expires_at) ?? new Date(0).toISOString(),
  }
}

export function createPostgresSavedLeadInvestigationRepository({
  db,
}: PostgresSavedLeadInvestigationRepositoryOptions): SavedLeadInvestigationRepository {
  return new PostgresSavedLeadInvestigationRepository(db)
}
