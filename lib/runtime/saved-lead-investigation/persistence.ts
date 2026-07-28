/**
 * CP26C.2A — concurrency-safe persistence seam.
 *
 * The future database implementation must perform `admitAtomically` in one
 * transaction. This contract remains dependency-injected so contract proof does
 * not import the database, connect, or write.
 */

import type {
  InvestigationUsageCategory,
  InvestigationUsageSnapshot,
} from './contracts'
import { INVESTIGATION_USAGE_CATEGORIES } from './contracts'
import {
  SAVED_LEAD_INVESTIGATION_CEILINGS,
} from './budget'
import {
  resolveWorkspaceDay,
  SAVED_LEAD_INVESTIGATION_USAGE_POLICY,
} from './run-state'

export type InvestigationAdmissionEligibility =
  | 'eligible'
  | 'cooldown'
  | 'already_running'
  | 'ownership_rejected'
  | 'invalid_request'
  | 'inactive_playbook'
  | 'missing_configuration'

export interface InvestigationAdmissionInput {
  workspaceId: string
  savedLeadId: string
  runId: string
  clientRequestId: string
  eligibility: InvestigationAdmissionEligibility
  /**
   * Required when eligibility was derived from an existing active or completed
   * run. It prevents the rejection response from falsely returning a newly
   * proposed run ID.
   */
  existingRunId?: string
}

export interface InvestigationAtomicAdmissionInput
  extends InvestigationAdmissionInput {
  admissionAt: string
  workspaceDayKey: string
  timezone: string
  resetAt: string
  limit: typeof SAVED_LEAD_INVESTIGATION_USAGE_POLICY.maxNewInvestigationsPerWorkspaceDay
}

export type InvestigationAtomicAdmission =
  | {
      state: 'admitted'
      /** The newly admitted run. */
      runId: string
      savedLeadId: string
      usedCount: number
      usageCounted: true
      externalCalls: 0
    }
  | {
      state: 'idempotent_replay'
      /** The original run admitted for this workspace/clientRequestId. */
      runId: string
      savedLeadId: string
      usedCount: number
      usageCounted: false
      externalCalls: 0
    }
  | {
      state: 'already_running'
      /** The active run holding this workspace/saved-lead execution lock. */
      runId: string
      savedLeadId: string
      usedCount: number
      usageCounted: false
      externalCalls: 0
    }
  | {
      state: 'daily_limit_reached'
      runId: string
      savedLeadId: string
      usedCount: number
      resetAt: string
      limit: number
      usageCounted: false
      externalCalls: 0
    }

export interface InvestigationAdmissionStore {
  /**
   * Resolve the persisted workspace timezone from trusted server-side state.
   * The request must never select the timezone used to key daily usage.
   */
  resolveWorkspaceTimezone(workspaceId: string): Promise<string | null>

  /**
   * Atomically:
   * - deduplicate the workspace/clientRequestId;
   * - enforce one active run for the workspace/saved lead;
   * - increment usage only while used_count < limit_snapshot;
   * - mark this run usage-counted exactly once.
   */
  admitAtomically(
    input: InvestigationAtomicAdmissionInput,
  ): Promise<InvestigationAtomicAdmission>
}

export interface InvestigationAdmissionClock {
  /** Trusted server clock. Never substitute a client-provided timestamp. */
  now(): string
}

const SYSTEM_ADMISSION_CLOCK: InvestigationAdmissionClock = {
  now: () => new Date().toISOString(),
}

export type InvestigationRejectedAdmission = {
  state: Exclude<InvestigationAdmissionEligibility, 'eligible'>
  runId: string
  savedLeadId: string
  externalCalls: 0
  usageCounted: false
}

export async function admitInvestigationExecution(
  store: InvestigationAdmissionStore,
  input: InvestigationAdmissionInput,
  clock: InvestigationAdmissionClock = SYSTEM_ADMISSION_CLOCK,
): Promise<InvestigationAtomicAdmission | InvestigationRejectedAdmission> {
  if (
    !nonEmpty(input.workspaceId) ||
    !nonEmpty(input.savedLeadId) ||
    !nonEmpty(input.runId) ||
    !nonEmpty(input.clientRequestId)
  ) {
    return {
      state: 'invalid_request',
      runId: input.runId,
      savedLeadId: input.savedLeadId,
      externalCalls: 0,
      usageCounted: false,
    }
  }
  if (input.eligibility !== 'eligible') {
    const requiresExistingRun =
      input.eligibility === 'already_running' ||
      input.eligibility === 'cooldown'
    const existingRunId = input.existingRunId?.trim()
    if (requiresExistingRun && !existingRunId) {
      return {
        state: 'invalid_request',
        runId: input.runId,
        savedLeadId: input.savedLeadId,
        externalCalls: 0,
        usageCounted: false,
      }
    }
    return {
      state: input.eligibility,
      runId: requiresExistingRun ? existingRunId! : input.runId,
      savedLeadId: input.savedLeadId,
      externalCalls: 0,
      usageCounted: false,
    }
  }
  const admissionAt = clock.now()
  if (Number.isNaN(Date.parse(admissionAt))) {
    return {
      state: 'invalid_request',
      runId: input.runId,
      savedLeadId: input.savedLeadId,
      externalCalls: 0,
      usageCounted: false,
    }
  }
  const workspaceTimezone =
    (await store.resolveWorkspaceTimezone(input.workspaceId)) ?? 'UTC'
  const workspaceDay = resolveWorkspaceDay(admissionAt, workspaceTimezone)
  return store.admitAtomically({
    workspaceId: input.workspaceId,
    savedLeadId: input.savedLeadId,
    runId: input.runId,
    clientRequestId: input.clientRequestId,
    eligibility: input.eligibility,
    existingRunId: input.existingRunId,
    admissionAt,
    ...workspaceDay,
    limit:
      SAVED_LEAD_INVESTIGATION_USAGE_POLICY.maxNewInvestigationsPerWorkspaceDay,
  })
}

export interface InvestigationUsageReservationInput {
  workspaceId: string
  runId: string
  operationKey: string
  category: InvestigationUsageCategory
  units: number
}

export interface InvestigationAtomicUsageReservationInput
  extends InvestigationUsageReservationInput {
  categoryCeiling: number
  totalProviderEquivalentCeiling: number
}

export type InvestigationUsageReservation =
  | {
      state: 'reserved' | 'idempotent_replay'
      runId: string
      operationKey: string
      reservedUnits: number
      usage: InvestigationUsageSnapshot
      externalCalls: 0
    }
  | {
      state: 'budget_refused'
      runId: string
      operationKey: string
      reasonCode:
        | 'category_ceiling'
        | 'total_provider_equivalent_ceiling'
      externalCalls: 0
    }
  | {
      state: 'run_not_active' | 'invalid_request'
      runId: string
      operationKey: string
      externalCalls: 0
    }

export interface InvestigationUsageCreditInput {
  workspaceId: string
  runId: string
  operationKey: string
  providerKey: string
  actualUnits: number
  providerRequestCount: number
  providerReportedCredits: number | null
}

export type InvestigationUsageCredit =
  | {
      state: 'credited' | 'idempotent_replay'
      runId: string
      operationKey: string
      usage: InvestigationUsageSnapshot
      externalCalls: 0
    }
  | {
      state:
        | 'reservation_missing'
        | 'actual_units_exceed_reservation'
        | 'run_not_active'
        | 'invalid_request'
      runId: string
      operationKey: string
      externalCalls: 0
    }

export interface InvestigationRunUsageStore {
  /**
   * Atomically verifies an active run, deduplicates workspace/run/operationKey,
   * and reserves both the category and total provider-equivalent budget before
   * transport begins.
   */
  reserveUsageAtomically(
    input: InvestigationAtomicUsageReservationInput,
  ): Promise<InvestigationUsageReservation>

  /**
   * Atomically converts an existing reservation to actual usage, releases any
   * unused reserved units, and records provider request/credit counters once.
   */
  creditUsageAtomically(
    input: InvestigationUsageCreditInput,
  ): Promise<InvestigationUsageCredit>
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0
}

const INVESTIGATION_USAGE_CATEGORY_SET = new Set<InvestigationUsageCategory>(
  INVESTIGATION_USAGE_CATEGORIES,
)

export async function reserveInvestigationRunUsage(
  store: InvestigationRunUsageStore,
  input: InvestigationUsageReservationInput,
): Promise<InvestigationUsageReservation> {
  if (
    !nonEmpty(input.workspaceId) ||
    !nonEmpty(input.runId) ||
    !nonEmpty(input.operationKey) ||
    !INVESTIGATION_USAGE_CATEGORY_SET.has(input.category) ||
    !Number.isInteger(input.units) ||
    input.units <= 0
  ) {
    return {
      state: 'invalid_request',
      runId: input.runId,
      operationKey: input.operationKey,
      externalCalls: 0,
    }
  }

  const categoryCeiling = SAVED_LEAD_INVESTIGATION_CEILINGS[input.category]
  if (
    input.units > categoryCeiling ||
    input.units >
      SAVED_LEAD_INVESTIGATION_CEILINGS.totalProviderEquivalents
  ) {
    return {
      state: 'budget_refused',
      runId: input.runId,
      operationKey: input.operationKey,
      reasonCode:
        input.units > categoryCeiling
          ? 'category_ceiling'
          : 'total_provider_equivalent_ceiling',
      externalCalls: 0,
    }
  }

  return store.reserveUsageAtomically({
    ...input,
    categoryCeiling,
    totalProviderEquivalentCeiling:
      SAVED_LEAD_INVESTIGATION_CEILINGS.totalProviderEquivalents,
  })
}

export async function creditInvestigationRunUsage(
  store: InvestigationRunUsageStore,
  input: InvestigationUsageCreditInput,
): Promise<InvestigationUsageCredit> {
  if (
    !nonEmpty(input.workspaceId) ||
    !nonEmpty(input.runId) ||
    !nonEmpty(input.operationKey) ||
    !nonEmpty(input.providerKey) ||
    !Number.isInteger(input.actualUnits) ||
    input.actualUnits < 0 ||
    !Number.isInteger(input.providerRequestCount) ||
    input.providerRequestCount < 0 ||
    input.providerRequestCount > input.actualUnits ||
    (input.providerReportedCredits !== null &&
      (!Number.isFinite(input.providerReportedCredits) ||
        input.providerReportedCredits < 0))
  ) {
    return {
      state: 'invalid_request',
      runId: input.runId,
      operationKey: input.operationKey,
      externalCalls: 0,
    }
  }
  return store.creditUsageAtomically(input)
}

export type InvestigationExecutionFailure =
  | 'failed_before_execution'
  | 'failed_after_execution'

export function executionFailureConsumesUsage(
  failure: InvestigationExecutionFailure,
): boolean {
  return failure === 'failed_after_execution'
}
