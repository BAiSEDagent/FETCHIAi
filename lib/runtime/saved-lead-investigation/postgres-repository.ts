import { createHash } from 'node:crypto'
import { sql, type SQL } from 'drizzle-orm'
import type {
  CompletedSignalCheck,
  IdentityResolution,
  InvestigationUsageCategory,
  InvestigationUsageSnapshot,
  SavedLeadIdentity,
  SavedLeadProfileFinding,
  SavedLeadSignalFinding,
  TriggerResult,
} from './contracts'
import {
  createInvestigationUsage,
  SAVED_LEAD_INVESTIGATION_CEILINGS,
} from './budget'
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
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }
  return null
}

function json<T>(value: unknown, fallback: T): T {
  return typeof value === 'object' && value !== null ? value as T : fallback
}

function jsonParam(value: unknown): string {
  return JSON.stringify(value ?? {})
}

type UsageLedgerEntry = {
  category: InvestigationUsageCategory
  reservedUnits: number
  credited: boolean
  actualUnits?: number
  providerKey?: string
  providerRequestCount?: number
  providerReportedCredits?: number | null
}

type UsageState = InvestigationUsageSnapshot & {
  _reservations?: Record<string, UsageLedgerEntry>
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function publicUsage(value: unknown): InvestigationUsageSnapshot {
  const current = json<Partial<UsageState>>(value, {})
  return {
    structuredCalls: numeric(current.structuredCalls),
    serpApiCalls: numeric(current.serpApiCalls),
    hydrationPages: numeric(current.hydrationPages),
    interpretationCalls: numeric(current.interpretationCalls),
    totalProviderEquivalents: numeric(current.totalProviderEquivalents),
    providerRequestCounts: typeof current.providerRequestCounts === 'object' &&
      current.providerRequestCounts !== null
      ? current.providerRequestCounts as Record<string, number>
      : {},
    providerReportedCredits: typeof current.providerReportedCredits === 'object' &&
      current.providerReportedCredits !== null
      ? current.providerReportedCredits as Record<string, number>
      : {},
  }
}

function usageState(value: unknown): UsageState {
  const current = json<Partial<UsageState>>(value, {})
  return {
    ...publicUsage(current),
    _reservations: typeof current._reservations === 'object' &&
      current._reservations !== null
      ? current._reservations as Record<string, UsageLedgerEntry>
      : {},
  }
}

function usageWithLedger(
  usage: InvestigationUsageSnapshot,
  reservations: Record<string, UsageLedgerEntry>,
): UsageState {
  return {
    ...usage,
    _reservations: reservations,
  }
}

function proofHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

function eventDate(value: string | undefined): string | null {
  return value ? new Date(value).toISOString() : null
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

function uniqueViolation(error: unknown, constraintName: string): boolean {
  if (typeof error !== 'object' || error === null) return false
  const code = 'code' in error ? String(error.code) : ''
  const constraint = [
    'constraint_name' in error ? error.constraint_name : null,
    'constraint' in error ? error.constraint : null,
  ].filter(Boolean).map(String).join(' ')
  return code === '23505' && constraint.includes(constraintName)
}

class PostgresSavedLeadInvestigationRepository
  implements SavedLeadInvestigationRepository {
  constructor(private readonly db: DrizzleLikeExecutor) {}

  private transaction<T>(fn: (executor: DrizzleLikeExecutor) => Promise<T>) {
    return this.db.transaction ? this.db.transaction(fn) : fn(this.db)
  }

  private async lockedAdmissionRun(
    executor: DrizzleLikeExecutor,
    input: Parameters<SavedLeadInvestigationRepository['admitRun']>[0],
  ) {
    return rows(await executor.execute(sql`
      select id, saved_lead_id, client_request_id, status, workspace_day_key,
             usage_counted_at is not null as usage_counted
      from saved_lead_investigation_runs
      where workspace_id = ${input.workspaceId}
        and saved_lead_id = ${input.savedLeadId}::uuid
        and id = ${input.runId}::uuid
      for update
    `))[0]
  }

  private async usageForRun(
    executor: DrizzleLikeExecutor,
    workspaceId: string,
    workspaceDayKey: unknown,
  ) {
    return rows(await executor.execute(sql`
      select used_count, limit_snapshot, reset_at
      from saved_lead_investigation_daily_usage
      where workspace_id = ${workspaceId}
        and workspace_day_key = ${workspaceDayKey}
      limit 1
    `))[0] ?? {}
  }

  private async ensureWorkspaceDay(
    executor: DrizzleLikeExecutor,
    workspaceId: string,
  ) {
    return rows(await executor.execute(sql`
      insert into saved_lead_investigation_daily_usage
        (workspace_id, workspace_day_key, timezone, reset_at, used_count, limit_snapshot)
      values (${workspaceId}, to_char(now() at time zone 'UTC', 'YYYY-MM-DD'), 'UTC', date_trunc('day', now()) + interval '1 day', 0, 10)
      on conflict (workspace_id, workspace_day_key) do update set updated_at = now()
      returning workspace_day_key
    `))[0]
  }

  private async incrementWorkspaceDay(
    executor: DrizzleLikeExecutor,
    workspaceId: string,
    workspaceDayKey: unknown,
  ) {
    return rows(await executor.execute(sql`
      update saved_lead_investigation_daily_usage
      set used_count = used_count + 1, updated_at = now()
      where workspace_id = ${workspaceId}
        and workspace_day_key = ${workspaceDayKey}
        and used_count < limit_snapshot
      returning workspace_day_key, used_count, limit_snapshot
    `))[0]
  }

  private async markRunAdmitted(
    executor: DrizzleLikeExecutor,
    input: Parameters<SavedLeadInvestigationRepository['admitRun']>[0],
    workspaceDayKey: unknown,
  ) {
    return rows(await executor.execute(sql`
      update saved_lead_investigation_runs
      set status = 'running',
          started_at = coalesce(started_at, now()),
          heartbeat_at = now(),
          workspace_day_key = ${workspaceDayKey},
          usage_counted_at = now(),
          updated_at = now()
      where workspace_id = ${input.workspaceId}
        and saved_lead_id = ${input.savedLeadId}::uuid
        and id = ${input.runId}::uuid
        and usage_counted_at is null
      returning id, saved_lead_id
    `))[0]
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
    let inserted: unknown
    try {
      inserted = rows(await this.db.execute(sql`
        insert into saved_lead_investigation_runs
          (id, workspace_id, saved_lead_id, client_request_id, playbook_id, playbook_version, budget_ceiling)
        values
          (${input.runId}::uuid, ${input.workspaceId}, ${input.savedLeadId}::uuid, ${input.clientRequestId}, ${input.playbook.id}, ${input.playbook.version}, '{}'::jsonb)
        on conflict (workspace_id, client_request_id) do nothing
        returning id
      `))[0]?.id
    } catch (error) {
      if (!uniqueViolation(error, 'saved_lead_inv_run_active_unique')) {
        throw error
      }
      const active = rows(await this.db.execute(sql`
        select id from saved_lead_investigation_runs
        where workspace_id = ${input.workspaceId}
          and saved_lead_id = ${input.savedLeadId}::uuid
          and status in ('created', 'running')
        order by created_at desc
        limit 1
      `))[0]?.id
      return { runId: String(active ?? input.runId), idempotent: true }
    }
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
      const run = await this.lockedAdmissionRun(executor, input)
      if (!run) {
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
      if (
        String(run.client_request_id) !== input.clientRequestId &&
        (run.status === 'created' || run.status === 'running')
      ) {
        const usage = run.workspace_day_key
          ? await this.usageForRun(executor, input.workspaceId, run.workspace_day_key)
          : {}
        return {
          state: 'already_running' as const,
          runId: String(run.id),
          savedLeadId: String(run.saved_lead_id),
          usedCount: Number(usage.used_count ?? 0),
          usageCounted: false,
          externalCalls: 0 as const,
          limit: Number(usage.limit_snapshot ?? 10),
        }
      }
      if (run.usage_counted) {
        const usage = await this.usageForRun(executor, input.workspaceId, run.workspace_day_key)
        return {
          state: 'idempotent_replay' as const,
          runId: String(run.id),
          savedLeadId: String(run.saved_lead_id),
          usedCount: Number(usage.used_count ?? 0),
          usageCounted: false,
          externalCalls: 0 as const,
          limit: Number(usage.limit_snapshot ?? 10),
        }
      }
      const usageRow = await this.ensureWorkspaceDay(executor, input.workspaceId)
      const admittedUsage = await this.incrementWorkspaceDay(
        executor,
        input.workspaceId,
        usageRow?.workspace_day_key,
      )
      if (!admittedUsage) {
        const usage = await this.usageForRun(
          executor,
          input.workspaceId,
          usageRow?.workspace_day_key,
        )
        return {
          state: 'daily_limit_reached' as const,
          runId: input.runId,
          savedLeadId: input.savedLeadId,
          usedCount: Number(usage.used_count ?? 10),
          usageCounted: false,
          externalCalls: 0 as const,
          limit: Number(usage.limit_snapshot ?? 10),
        }
      }
      const admitted = await this.markRunAdmitted(
        executor,
        input,
        admittedUsage.workspace_day_key,
      )
      if (!admitted) {
        throw new Error('saved lead investigation admission lost locked run')
      }
      return {
        state: 'admitted' as const,
        runId: String(admitted.id),
        savedLeadId: String(admitted.saved_lead_id),
        usedCount: Number(admittedUsage.used_count),
        usageCounted: true,
        externalCalls: 0 as const,
        limit: Number(admittedUsage.limit_snapshot),
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
      set initial_identity_resolution = ${jsonParam(identity)}::jsonb, identity_resolution = ${jsonParam(identity)}::jsonb
      where id = ${runId}::uuid
    `)
  }

  async persistSourcePlan(runId: string, plan: unknown) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs set source_plan = ${jsonParam(plan)}::jsonb
      where id = ${runId}::uuid
    `)
  }

  private async lockedUsageRun(
    executor: DrizzleLikeExecutor,
    input: { workspaceId: string; runId: string },
  ) {
    return rows(await executor.execute(sql`
      select id, usage_actual
      from saved_lead_investigation_runs
      where workspace_id = ${input.workspaceId}
        and id = ${input.runId}::uuid
        and status in ('created', 'running')
      for update
    `))[0]
  }

  async reserveUsage(input: {
    workspaceId: string
    runId: string
    operationKey: string
    category: InvestigationUsageCategory
    units: number
  }) {
    return this.transaction(async (executor) => {
      const run = await this.lockedUsageRun(executor, input)
      if (!run || input.units <= 0 || !Number.isInteger(input.units)) {
        return { state: 'budget_refused', usage: createInvestigationUsage() }
      }
      const current = usageState(run.usage_actual)
      const reservations = { ...current._reservations }
      const existing = reservations[input.operationKey]
      if (existing) {
        if (
          existing.category === input.category &&
          existing.reservedUnits === input.units
        ) {
          return { state: 'idempotent_replay', usage: publicUsage(current) }
        }
        return { state: 'budget_refused', usage: publicUsage(current) }
      }
      const nextCategory = current[input.category] + input.units
      const nextTotal = current.totalProviderEquivalents + input.units
      if (
        nextCategory > SAVED_LEAD_INVESTIGATION_CEILINGS[input.category] ||
        nextTotal > SAVED_LEAD_INVESTIGATION_CEILINGS.totalProviderEquivalents
      ) {
        return { state: 'budget_refused', usage: publicUsage(current) }
      }
      const nextUsage: InvestigationUsageSnapshot = {
        ...publicUsage(current),
        [input.category]: nextCategory,
        totalProviderEquivalents: nextTotal,
      }
      reservations[input.operationKey] = {
        category: input.category,
        reservedUnits: input.units,
        credited: false,
      }
      await executor.execute(sql`
        update saved_lead_investigation_runs
        set usage_actual = ${jsonParam(usageWithLedger(nextUsage, reservations))}::jsonb,
            updated_at = now()
        where id = ${input.runId}::uuid
      `)
      return { state: 'reserved', usage: nextUsage }
    })
  }

  async creditUsage(input: {
    workspaceId: string
    runId: string
    operationKey: string
    providerKey: string
    actualUnits: number
    providerRequestCount: number
    providerReportedCredits: number | null
  }) {
    return this.transaction(async (executor) => {
      const run = await this.lockedUsageRun(executor, input)
      if (!run) return { state: 'budget_refused', usage: createInvestigationUsage() }
      const current = usageState(run.usage_actual)
      const reservations = { ...current._reservations }
      const reservation = reservations[input.operationKey]
      if (!reservation || input.actualUnits > reservation.reservedUnits) {
        return { state: 'budget_refused', usage: publicUsage(current) }
      }
      if (reservation.credited) {
        if (
          reservation.actualUnits === input.actualUnits &&
          reservation.providerKey === input.providerKey &&
          reservation.providerRequestCount === input.providerRequestCount &&
          reservation.providerReportedCredits === input.providerReportedCredits
        ) {
          return { state: 'idempotent_replay', usage: publicUsage(current) }
        }
        return { state: 'budget_refused', usage: publicUsage(current) }
      }
      const release = reservation.reservedUnits - input.actualUnits
      const nextUsage: InvestigationUsageSnapshot = {
        ...publicUsage(current),
        [reservation.category]: current[reservation.category] - release,
        totalProviderEquivalents: current.totalProviderEquivalents - release,
        providerRequestCounts: {
          ...current.providerRequestCounts,
          [input.providerKey]:
            (current.providerRequestCounts[input.providerKey] ?? 0) +
            input.providerRequestCount,
        },
        providerReportedCredits: {
          ...current.providerReportedCredits,
          [input.providerKey]:
            (current.providerReportedCredits[input.providerKey] ?? 0) +
            (input.providerReportedCredits ?? 0),
        },
      }
      reservations[input.operationKey] = {
        ...reservation,
        credited: true,
        actualUnits: input.actualUnits,
        providerKey: input.providerKey,
        providerRequestCount: input.providerRequestCount,
        providerReportedCredits: input.providerReportedCredits,
      }
      await executor.execute(sql`
        update saved_lead_investigation_runs
        set usage_actual = ${jsonParam(usageWithLedger(nextUsage, reservations))}::jsonb,
            updated_at = now()
        where id = ${input.runId}::uuid
      `)
      return { state: 'credited', usage: nextUsage }
    })
  }

  async readUsageSnapshot(input: { workspaceId: string; runId: string }) {
    const row = rows(await this.db.execute(sql`
      select usage_actual
      from saved_lead_investigation_runs
      where workspace_id = ${input.workspaceId}
        and id = ${input.runId}::uuid
      limit 1
    `))[0]
    return publicUsage(row?.usage_actual)
  }

  async recordLineage(input: Parameters<SavedLeadInvestigationRepository['recordLineage']>[0]) {
    const row = rows(await this.db.execute(sql`
      insert into runtime_lineage_runs
        (provider, provider_run_id, run_role, status, source_url, query, request_metadata, response_metadata)
      values
        (${input.provider}, ${input.providerRunId}, ${input.runRole}, ${input.status}, ${input.sourceUrl ?? null}, ${input.query ?? null}, ${jsonParam(input.requestMetadata)}::jsonb, ${jsonParam(input.responseMetadata)}::jsonb)
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
        (${input.sourceType}, ${input.sourceAuthority}, ${input.externalId}, ${input.sourceUrl}, ${input.sourceTitle ?? null}, ${input.sourceDate}::timestamptz, ${input.evidenceFingerprint}, ${jsonParam(input.sourceMetadata)}::jsonb)
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
      set category_ids_checked = ${jsonParam(findings.map((finding) => finding.factKey))}::jsonb
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

  private async ownedRunForPersistence(
    executor: DrizzleLikeExecutor,
    result: Pick<CompletedSignalCheck, 'runId' | 'savedLeadId'>,
  ) {
    return rows(await executor.execute(sql`
      select id, workspace_id, saved_lead_id
      from saved_lead_investigation_runs
      where id = ${result.runId}::uuid
        and saved_lead_id = ${result.savedLeadId}::uuid
      for update
    `))[0]
  }

  private async insertProfileFinding(
    executor: DrizzleLikeExecutor,
    workspaceId: string,
    result: CompletedSignalCheck,
    finding: SavedLeadProfileFinding,
  ) {
    await executor.execute(sql`
      insert into saved_lead_profile_findings
        (id, workspace_id, investigation_run_id, investigation_source_id,
         evidence_source_id, fact_key, value, exact_excerpt,
         structured_evidence_snapshot, observed_date, event_date,
         identity_match_reason_codes, identity_match_keys, conflict_group_id,
         conflict_reason_codes, fact_expiration, proof_hash)
      values
        (${finding.id}::uuid, ${workspaceId}, ${result.runId}::uuid,
         ${finding.investigationSourceId}::uuid, ${finding.evidenceSourceId}::uuid,
         ${finding.factKey}, ${finding.value}, ${finding.exactExcerpt ?? null},
         ${jsonParam(finding.structuredEvidenceSnapshot ?? null)}::jsonb,
         ${finding.observedAt}::timestamptz,
         ${eventDate(finding.eventDate)}::timestamptz,
         ${jsonParam(finding.identityMatch.reasonCodes)}::jsonb,
         ${jsonParam(finding.identityMatch.matchedOn)}::jsonb,
         ${finding.conflict?.groupId ?? null},
         ${jsonParam(finding.conflict?.reasonCodes ?? [])}::jsonb,
         ${result.resultExpiresAt}::timestamptz,
         ${proofHash({ workspaceId, type: 'profile', finding })})
      on conflict (workspace_id, proof_hash) do update set
        value = excluded.value,
        exact_excerpt = excluded.exact_excerpt,
        structured_evidence_snapshot = excluded.structured_evidence_snapshot,
        observed_date = excluded.observed_date,
        event_date = excluded.event_date,
        identity_match_reason_codes = excluded.identity_match_reason_codes,
        identity_match_keys = excluded.identity_match_keys,
        conflict_group_id = excluded.conflict_group_id,
        conflict_reason_codes = excluded.conflict_reason_codes,
        fact_expiration = excluded.fact_expiration
    `)
  }

  private async insertTriggerFinding(
    executor: DrizzleLikeExecutor,
    workspaceId: string,
    runId: string,
    finding: SavedLeadSignalFinding,
  ) {
    await executor.execute(sql`
      insert into saved_lead_trigger_findings
        (id, workspace_id, investigation_run_id, investigation_source_id,
         evidence_source_id, approved_signal_family_id,
         approved_signal_label_id, exact_excerpt,
         structured_evidence_snapshot, event_date, freshness_end,
         identity_match_reason_codes, qualification_reason_codes, proof_hash)
      values
        (${finding.id}::uuid, ${workspaceId}, ${runId}::uuid,
         ${finding.investigationSourceId}::uuid, ${finding.evidenceSourceId}::uuid,
         ${finding.approvedSignalFamilyId}, ${finding.approvedSignalLabelId},
         ${finding.exactExcerpt ?? null},
         ${jsonParam(finding.structuredEvidenceSnapshot ?? null)}::jsonb,
         ${finding.eventDate}::timestamptz,
         ${finding.freshnessEndsAt}::timestamptz,
         ${jsonParam(finding.identityMatchReasonCodes)}::jsonb,
         ${jsonParam(finding.qualificationReasonCodes)}::jsonb,
         ${proofHash({ workspaceId, type: 'trigger', finding })})
      on conflict (workspace_id, investigation_run_id) do update set
        investigation_source_id = excluded.investigation_source_id,
        evidence_source_id = excluded.evidence_source_id,
        approved_signal_family_id = excluded.approved_signal_family_id,
        approved_signal_label_id = excluded.approved_signal_label_id,
        exact_excerpt = excluded.exact_excerpt,
        structured_evidence_snapshot = excluded.structured_evidence_snapshot,
        event_date = excluded.event_date,
        freshness_end = excluded.freshness_end,
        identity_match_reason_codes = excluded.identity_match_reason_codes,
        qualification_reason_codes = excluded.qualification_reason_codes,
        proof_hash = excluded.proof_hash
    `)
  }

  async persistCompletedResult(result: CompletedSignalCheck) {
    await this.transaction(async (executor) => {
      const run = await this.ownedRunForPersistence(executor, result)
      if (!run) throw new Error('saved lead investigation completed result run not found')
      const workspaceId = String(run.workspace_id)
      await executor.execute(sql`
        delete from saved_lead_profile_findings
        where workspace_id = ${workspaceId}
          and investigation_run_id = ${result.runId}::uuid
      `)
      await executor.execute(sql`
        delete from saved_lead_trigger_findings
        where workspace_id = ${workspaceId}
          and investigation_run_id = ${result.runId}::uuid
      `)
      for (const finding of result.profileReport.findings) {
        await this.insertProfileFinding(executor, workspaceId, result, finding)
      }
      if (result.trigger.state === 'signal_found') {
        await this.insertTriggerFinding(
          executor,
          workspaceId,
          result.runId,
          result.trigger.finding,
        )
      }
      await executor.execute(sql`
        update saved_lead_investigation_runs
        set status = 'completed',
            current_phase = 'completed',
            checked_at = ${result.checkedAt}::timestamptz,
            recheck_eligible_at = ${result.recheckEligibleAt}::timestamptz,
            result_expires_at = ${result.resultExpiresAt}::timestamptz,
            identity_resolution = ${jsonParam(result.identity)}::jsonb,
            usage_actual = ${jsonParam(result.profileReport.usage)}::jsonb,
            category_ids_checked = ${jsonParam(result.profileReport.categoryIdsChecked)}::jsonb,
            trigger_state = ${result.trigger.state},
            trigger_reason_code = ${result.trigger.state === 'no_signal'
              ? result.trigger.reasonCode
              : null},
            updated_at = now()
        where id = ${result.runId}::uuid
      `)
      await executor.execute(sql`
        insert into saved_lead_investigation_state
          (workspace_id, saved_lead_id, latest_attempt_run_id,
           latest_successful_run_id, checked_at, recheck_eligible_at,
           result_expires_at, updated_at)
        values
          (${workspaceId}, ${result.savedLeadId}::uuid, ${result.runId}::uuid,
           ${result.runId}::uuid, ${result.checkedAt}::timestamptz,
           ${result.recheckEligibleAt}::timestamptz,
           ${result.resultExpiresAt}::timestamptz, now())
        on conflict (workspace_id, saved_lead_id) do update set
          latest_attempt_run_id = excluded.latest_attempt_run_id,
          latest_successful_run_id = excluded.latest_successful_run_id,
          checked_at = excluded.checked_at,
          recheck_eligible_at = excluded.recheck_eligible_at,
          result_expires_at = excluded.result_expires_at,
          updated_at = now()
      `)
    })
  }

  async persistRetryableFailure(input: Parameters<SavedLeadInvestigationRepository['persistRetryableFailure']>[0]) {
    await this.transaction(async (executor) => {
      const run = rows(await executor.execute(sql`
        select id, workspace_id, saved_lead_id
        from saved_lead_investigation_runs
        where id = ${input.runId}::uuid
        for update
      `))[0]
      if (!run) throw new Error('saved lead investigation failed run not found')
      const workspaceId = String(run.workspace_id)
      const savedLeadId = String(run.saved_lead_id)
      const existingState = rows(await executor.execute(sql`
        select latest_successful_run_id, checked_at, recheck_eligible_at, result_expires_at
        from saved_lead_investigation_state
        where workspace_id = ${workspaceId}
          and saved_lead_id = ${savedLeadId}::uuid
        for update
      `))[0]
      const latestSuccessfulRunId =
        input.latestSuccessfulRunId ??
        (existingState?.latest_successful_run_id
          ? String(existingState.latest_successful_run_id)
          : null)
      await executor.execute(sql`
        update saved_lead_investigation_runs
        set status = 'failed',
            failure_code = ${input.failureCode},
            failure_retryable = true,
            updated_at = now()
        where id = ${input.runId}::uuid
      `)
      await executor.execute(sql`
        insert into saved_lead_investigation_state
          (workspace_id, saved_lead_id, latest_attempt_run_id,
           latest_successful_run_id, checked_at, recheck_eligible_at,
           result_expires_at, updated_at)
        values
          (${workspaceId}, ${savedLeadId}::uuid, ${input.runId}::uuid,
           ${latestSuccessfulRunId}::uuid,
           ${iso(existingState?.checked_at)}::timestamptz,
           ${iso(existingState?.recheck_eligible_at)}::timestamptz,
           ${iso(existingState?.result_expires_at)}::timestamptz,
           now())
        on conflict (workspace_id, saved_lead_id) do update set
          latest_attempt_run_id = excluded.latest_attempt_run_id,
          latest_successful_run_id = excluded.latest_successful_run_id,
          checked_at = coalesce(saved_lead_investigation_state.checked_at, excluded.checked_at),
          recheck_eligible_at = coalesce(saved_lead_investigation_state.recheck_eligible_at, excluded.recheck_eligible_at),
          result_expires_at = coalesce(saved_lead_investigation_state.result_expires_at, excluded.result_expires_at),
          updated_at = now()
      `)
    })
  }

  async readLatestSuccessfulResult({ workspaceId, savedLeadId }: {
    workspaceId: string
    savedLeadId: string
  }): Promise<CompletedSignalCheck | null> {
    const row = rows(await this.db.execute(sql`
      with selected_state as (
        select latest_successful_run_id
        from saved_lead_investigation_state
        where workspace_id = ${workspaceId}
          and saved_lead_id = ${savedLeadId}::uuid
        limit 1
      )
      select identity_resolution, trigger_state, trigger_reason_code, checked_at,
             recheck_eligible_at, result_expires_at, usage_actual,
             category_ids_checked, id
      from saved_lead_investigation_runs
      where workspace_id = ${workspaceId}
        and saved_lead_id = ${savedLeadId}::uuid
        and status = 'completed'
        and id = coalesce(
          (select latest_successful_run_id from selected_state),
          id
        )
      order by checked_at desc, created_at desc
      limit 1
    `))[0]
    if (!row) return null
    const runId = String(row.id)
    const sources = rows(await this.db.execute(sql`
      select registry_source_key, tier, availability, check_state, candidate_rank
      from saved_lead_investigation_sources
      where workspace_id = ${workspaceId}
        and investigation_run_id = ${runId}::uuid
      order by candidate_rank nulls first, registry_source_key
    `))
    const triggerRow = rows(await this.db.execute(sql`
      select id::text, investigation_source_id::text, evidence_source_id::text,
             approved_signal_family_id, approved_signal_label_id, exact_excerpt,
             structured_evidence_snapshot, event_date, freshness_end,
             identity_match_reason_codes, qualification_reason_codes
      from saved_lead_trigger_findings
      where workspace_id = ${workspaceId}
        and investigation_run_id = ${runId}::uuid
      limit 1
    `))[0]
    const profileRows = rows(await this.db.execute(sql`
      select id::text, investigation_source_id::text, evidence_source_id::text,
             fact_key, value, exact_excerpt, structured_evidence_snapshot,
             observed_date, event_date, identity_match_reason_codes,
             identity_match_keys, conflict_group_id, conflict_reason_codes
      from saved_lead_profile_findings
      where workspace_id = ${workspaceId}
        and investigation_run_id = ${runId}::uuid
      order by created_at, id
    `))
    return latestResult(row, savedLeadId, sources, triggerRow, profileRows)
  }

  async reconcileAbandonedRuns(input: Parameters<SavedLeadInvestigationRepository['reconcileAbandonedRuns']>[0]) {
    await this.db.execute(sql`
      update saved_lead_investigation_runs
      set status = 'failed',
          failure_code = 'abandoned_request',
          failure_retryable = true,
          updated_at = ${input.now}::timestamptz
      where workspace_id = ${input.workspaceId}
        and saved_lead_id = ${input.savedLeadId}::uuid
        and status in ('created', 'running')
        and coalesce(heartbeat_at, updated_at, created_at) <=
          ${input.now}::timestamptz - interval '120 seconds'
    `)
  }
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string')))
}

function profileFindingFromRow(
  row: Record<string, unknown>,
): SavedLeadProfileFinding {
  const conflictGroupId = typeof row.conflict_group_id === 'string'
    ? row.conflict_group_id
    : null
  return {
    id: String(row.id),
    factKey: String(row.fact_key) as SavedLeadProfileFinding['factKey'],
    value: String(row.value),
    investigationSourceId: String(row.investigation_source_id),
    evidenceSourceId: String(row.evidence_source_id),
    ...(typeof row.exact_excerpt === 'string'
      ? { exactExcerpt: row.exact_excerpt }
      : {}),
    ...(row.structured_evidence_snapshot
      ? { structuredEvidenceSnapshot: json(row.structured_evidence_snapshot, null) as never }
      : {}),
    observedAt: iso(row.observed_date) ?? new Date(0).toISOString(),
    ...(iso(row.event_date) ? { eventDate: iso(row.event_date) as string } : {}),
    identityMatch: {
      matchedOn: json<SavedLeadProfileFinding['identityMatch']['matchedOn']>(
        row.identity_match_keys,
        [],
      ),
      reasonCodes: json<string[]>(row.identity_match_reason_codes, []),
    },
    ...(conflictGroupId
      ? {
          conflict: {
            groupId: conflictGroupId,
            reasonCodes: json<string[]>(row.conflict_reason_codes, []),
          },
        }
      : {}),
  }
}

function triggerFindingFromRow(row: Record<string, unknown>): SavedLeadSignalFinding {
  return {
    id: String(row.id),
    approvedSignalFamilyId: String(row.approved_signal_family_id),
    approvedSignalLabelId: String(row.approved_signal_label_id),
    investigationSourceId: String(row.investigation_source_id),
    evidenceSourceId: String(row.evidence_source_id),
    ...(typeof row.exact_excerpt === 'string'
      ? { exactExcerpt: row.exact_excerpt }
      : {}),
    ...(row.structured_evidence_snapshot
      ? { structuredEvidenceSnapshot: json(row.structured_evidence_snapshot, null) as never }
      : {}),
    eventDate: iso(row.event_date) ?? new Date(0).toISOString(),
    freshnessEndsAt: iso(row.freshness_end) ?? new Date(0).toISOString(),
    identityMatchReasonCodes: json<string[]>(row.identity_match_reason_codes, []),
    qualificationReasonCodes: json<string[]>(row.qualification_reason_codes, []),
  }
}

function latestResult(
  row: Record<string, unknown>,
  savedLeadId: string,
  sources: Record<string, unknown>[],
  triggerRow: Record<string, unknown> | undefined,
  profileRows: Record<string, unknown>[],
): CompletedSignalCheck {
  const primarySources = sources.filter((source) => source.candidate_rank === null)
  const checkedSources = primarySources.filter((source) => source.check_state === 'checked')
  const unavailableSources = primarySources.filter((source) => source.availability !== 'available')
  const identity = json<IdentityResolution>(row.identity_resolution, {
    state: 'unresolved',
    confidence: 0,
    matchedOn: [],
    conflicts: [],
    reasonCodes: ['missing_snapshot'],
    evaluatedAt: new Date(0).toISOString(),
  })
  return {
    status: 'completed',
    savedLeadId,
    runId: String(row.id),
    checkedAt: iso(row.checked_at) ?? new Date(0).toISOString(),
    identity,
    trigger: row.trigger_state === 'signal_found'
      ? triggerRow
        ? { state: 'signal_found', finding: triggerFindingFromRow(triggerRow) }
        : { state: 'no_signal', reasonCode: 'insufficient_evidence' }
      : { state: 'no_signal', reasonCode: noSignalReason(row.trigger_reason_code) },
    profileReport: {
      findings: profileRows.map((profileRow) =>
        profileFindingFromRow(profileRow),
      ),
      sourcesChecked: checkedSources.length,
      structuredSourcesChecked: checkedSources.filter((source) => Number(source.tier) === 1).length,
      webQueriesRun: checkedSources.filter((source) => Number(source.tier) === 3).length,
      hydratedSources: checkedSources.filter((source) => Number(source.tier) === 2).length,
      categoryIdsChecked: json<string[]>(row.category_ids_checked, []),
      unavailableSourceKeys: uniqueStrings(
        unavailableSources.map((source) => source.registry_source_key),
      ),
      checkedSourceKeys: uniqueStrings(
        checkedSources.map((source) => source.registry_source_key),
      ),
      usage: publicUsage(row.usage_actual),
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
