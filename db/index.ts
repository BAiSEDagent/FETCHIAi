// db/index.ts
// Database connection for Fetchi
// Replit auto-injects DATABASE_URL — never hardcode it
// Uses Drizzle ORM with postgres-js driver

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Replit should auto-inject this.')
}

export function shouldRequireDatabaseSsl(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv === 'production') return true

  const rawUrl = databaseUrl ?? ''
  const hasRequiredSslMode = rawUrl.toLowerCase().includes('sslmode=require')
  let hostname = ''

  try {
    hostname = new URL(rawUrl).hostname.toLowerCase()
  } catch {
    // Keep local/dev behavior for non-URL connection strings unless sslmode is explicit.
  }

  return hostname.includes('.neon.tech') || hasRequiredSslMode
}

const shouldRequireSsl = shouldRequireDatabaseSsl(process.env.DATABASE_URL)

// Connection pool — postgres-js handles pooling automatically
const client = postgres(process.env.DATABASE_URL, {
  // Max connections in pool
  max: 10,
  // Idle timeout — important for Replit's serverless-like environment
  idle_timeout: 20,
  // Connection timeout
  connect_timeout: 10,
  // SSL required for Replit's Neon-backed production database
  ssl: shouldRequireSsl ? 'require' : false,
})

export const db = drizzle(client, { schema })

// Re-export schema for convenience
export * from './schema'

// ─────────────────────────────────────────────
// ATOMIC OPPORTUNITY COUNTER
// Always use this — never read-then-write
// Returns true only when status is active, limit is a finite positive number,
// and used < limit. Returns false in all other cases (no write occurs).
// ─────────────────────────────────────────────
import { sql } from 'drizzle-orm'

export async function consumeOpportunityCredit(workspaceId: string): Promise<boolean> {
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  })

  // No subscription row, or not an active paid plan — never consume
  if (!sub || sub.status !== 'active') return false

  // Limit must be a finite positive number — null/zero/negative = no consumption
  const limit = sub.opportunitiesLimit
  if (limit === null || limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return false
  }

  // Atomic increment — only if used < limit (no null-as-unlimited escape)
  const result = await db.execute(sql`
    UPDATE workspace_subscriptions
    SET opportunities_used = opportunities_used + 1,
        updated_at = now()
    WHERE workspace_id = ${workspaceId}
      AND status = 'active'
      AND opportunities_limit IS NOT NULL
      AND opportunities_limit > 0
      AND opportunities_used < opportunities_limit
    RETURNING opportunities_used, opportunities_limit
  `)
  return result.length > 0
}

// ─────────────────────────────────────────────
// ENTITLEMENT GATE
// Call before consumeOpportunityCredit in search_signals tool.
// Returns { allowed: false } whenever opportunity delivery must be blocked.
// No trial language. No null-as-unlimited. No legacy trial behavior.
// ─────────────────────────────────────────────
export interface GateResult {
  allowed: boolean
  reason?: 'plan_required' | 'payment_required' | 'limit_syncing' | 'limit_reached'
    // Legacy reason codes kept in the union for any existing switch statements:
    | 'trial_card_gate' | 'trial_expired'
  leadsSeen?: number
  message?: string
}

// Rule A — no subscription row
const MSG_PLAN_REQUIRED = 'Choose a capped plan to start receiving opportunities.'
// Rule C — past_due
const MSG_PAST_DUE = 'Payment needs attention. Update your plan to keep opportunities flowing.'
// Rule E — active but limit not yet valid
const MSG_LIMIT_SYNCING = 'Your plan limit is syncing. Check Plan & Billing before receiving more opportunities.'
// Rule F — active finite plan, limit reached
const MSG_LIMIT_REACHED = "You've reached your opportunity limit for this cycle. Manage your plan to keep opportunities flowing."

export async function checkTrialGate(workspaceId: string): Promise<GateResult> {
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  })

  // Rule A: missing subscription row
  if (!sub) {
    return { allowed: false, reason: 'plan_required', message: MSG_PLAN_REQUIRED }
  }

  const status = sub.status ?? 'unknown'

  // Rule B: legacy / pre-payment states — trialing, expired, canceled, or any
  // unrecognised status. None of these allow real opportunity delivery.
  if (status !== 'active' && status !== 'past_due') {
    return { allowed: false, reason: 'plan_required', message: MSG_PLAN_REQUIRED }
  }

  // Rule C: past_due — payment action required
  if (status === 'past_due') {
    return { allowed: false, reason: 'payment_required', message: MSG_PAST_DUE }
  }

  // status === 'active' from here on

  // Rules D / E: limit must be a finite positive number
  const limit = sub.opportunitiesLimit
  if (limit === null || limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return { allowed: false, reason: 'limit_syncing', message: MSG_LIMIT_SYNCING }
  }

  // Rule F: at or over limit
  const used = sub.opportunitiesUsed ?? 0
  if (used >= limit) {
    return {
      allowed: false,
      reason: 'limit_reached',
      leadsSeen: used,
      message: MSG_LIMIT_REACHED,
    }
  }

  // Rule E: active finite plan with capacity remaining
  return { allowed: true }
}
