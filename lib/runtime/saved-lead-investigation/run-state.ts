/**
 * CP26C.2A — pure run lifecycle, cooldown, and workspace-day policies.
 */

import type {
  SavedLeadInvestigationRunSnapshot,
  TriggerResult,
} from './contracts'
import type { SavedLeadInvestigationPlaybook } from '@/lib/playbooks/saved-lead-investigation-registry'

export const SAVED_LEAD_INVESTIGATION_RUN_POLICY = {
  staleRunningAfterMs: 120000,
} as const

export const SAVED_LEAD_INVESTIGATION_USAGE_POLICY = {
  maxNewInvestigationsPerWorkspaceDay: 10,
} as const

interface WorkspaceDay {
  workspaceDayKey: string
  timezone: string
  resetAt: string
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

function zonedParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  }
}

function timezoneOffsetMs(instant: Date, timezone: string): number {
  const parts = zonedParts(instant, timezone)
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return representedAsUtc - Math.floor(instant.getTime() / 1000) * 1000
}

function nextLocalMidnight(
  year: number,
  month: number,
  day: number,
  timezone: string,
): Date {
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1))
  const localMidnightAsUtc = Date.UTC(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth(),
    nextDate.getUTCDate(),
  )

  let resolved = new Date(localMidnightAsUtc)
  for (let pass = 0; pass < 2; pass += 1) {
    resolved = new Date(
      localMidnightAsUtc - timezoneOffsetMs(resolved, timezone),
    )
  }
  return resolved
}

export function resolveWorkspaceDay(
  instantIso: string,
  requestedTimezone: string,
): WorkspaceDay {
  const instant = new Date(instantIso)
  if (Number.isNaN(instant.getTime())) {
    throw new Error('Workspace day requires a valid instant')
  }

  const timezone = validTimezone(requestedTimezone)
    ? requestedTimezone
    : 'UTC'
  const parts = zonedParts(instant, timezone)
  const workspaceDayKey = [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')

  return {
    workspaceDayKey,
    timezone,
    resetAt: nextLocalMidnight(
      parts.year,
      parts.month,
      parts.day,
      timezone,
    ).toISOString(),
  }
}

export function reconcileAbandonedRun(
  run: SavedLeadInvestigationRunSnapshot,
  nowIso: string,
): SavedLeadInvestigationRunSnapshot {
  if (run.status !== 'created' && run.status !== 'running') return run

  const nowMs = Date.parse(nowIso)
  const heartbeatMs = Date.parse(run.heartbeatAt || run.updatedAt)
  if (Number.isNaN(nowMs) || Number.isNaN(heartbeatMs)) return run
  if (
    nowMs - heartbeatMs <
    SAVED_LEAD_INVESTIGATION_RUN_POLICY.staleRunningAfterMs
  ) {
    return run
  }

  return {
    ...run,
    status: 'failed',
    failureCode: 'abandoned_request',
    failureRetryable: true,
    updatedAt: nowIso,
  }
}

interface DeriveTimingInput {
  checkedAt: string
  trigger: TriggerResult
  playbook: SavedLeadInvestigationPlaybook
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString()
}

function earlierIso(left: string, right: string): string {
  return Date.parse(left) <= Date.parse(right) ? left : right
}

export function deriveResultTiming({
  checkedAt,
  trigger,
  playbook,
}: DeriveTimingInput): {
  recheckEligibleAt: string
  resultExpiresAt: string
} {
  const profileExpiration = addHours(
    checkedAt,
    playbook.profileTtlDays * 24,
  )
  if (trigger.state === 'signal_found') {
    return {
      recheckEligibleAt: addHours(
        checkedAt,
        playbook.signalFoundCooldownHours,
      ),
      resultExpiresAt: earlierIso(
        profileExpiration,
        trigger.finding.freshnessEndsAt,
      ),
    }
  }

  return {
    recheckEligibleAt: addHours(
      checkedAt,
      playbook.noSignalCooldownHours,
    ),
    resultExpiresAt: profileExpiration,
  }
}

interface RecheckDecisionInput {
  now: string
  recheckEligibleAt: string | null
  latestCompletedRunId: string | null
  activeRunId: string | null
}

export type RecheckDecision =
  | { state: 'eligible' }
  | { state: 'already_running'; runId: string; externalCalls: 0 }
  | { state: 'cooldown'; runId: string; externalCalls: 0 }

export function getRecheckDecision({
  now,
  recheckEligibleAt,
  latestCompletedRunId,
  activeRunId,
}: RecheckDecisionInput): RecheckDecision {
  if (activeRunId) {
    return { state: 'already_running', runId: activeRunId, externalCalls: 0 }
  }
  if (
    latestCompletedRunId &&
    recheckEligibleAt &&
    Date.parse(now) < Date.parse(recheckEligibleAt)
  ) {
    return {
      state: 'cooldown',
      runId: latestCompletedRunId,
      externalCalls: 0,
    }
  }
  return { state: 'eligible' }
}
