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

// Connection pool — postgres-js handles pooling automatically
const client = postgres(process.env.DATABASE_URL, {
  // Max connections in pool
  max: 10,
  // Idle timeout — important for Replit's serverless-like environment
  idle_timeout: 20,
  // Connection timeout
  connect_timeout: 10,
  // SSL required for Replit's Neon-backed production database
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
})

export const db = drizzle(client, { schema })

// Re-export schema for convenience
export * from './schema'

// ─────────────────────────────────────────────
// ATOMIC OPPORTUNITY COUNTER
// Always use this — never read-then-write
// Returns false if limit reached (don't create opportunity)
// ─────────────────────────────────────────────
import { sql } from 'drizzle-orm'

export async function consumeOpportunityCredit(workspaceId: string): Promise<boolean> {
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  })

  if (!sub) return false

  if (sub.status === 'trialing') {
    // Use trial counter — atomic increment with limit check
    const result = await db.execute(sql`
      UPDATE workspace_subscriptions
      SET trial_opportunities_used = trial_opportunities_used + 1,
          updated_at = now()
      WHERE workspace_id = ${workspaceId}
        AND trial_opportunities_used < trial_opportunities_limit
      RETURNING trial_opportunities_used, trial_opportunities_limit
    `)
    return result.length > 0
  }

  // Active/past_due — use paid counter
  const result = await db.execute(sql`
    UPDATE workspace_subscriptions
    SET opportunities_used = opportunities_used + 1,
        updated_at = now()
    WHERE workspace_id = ${workspaceId}
      AND (
        opportunities_limit IS NULL
        OR opportunities_used < opportunities_limit
      )
    RETURNING opportunities_used, opportunities_limit
  `)
  return result.length > 0
}

// ─────────────────────────────────────────────
// TRIAL GATE CHECK
// Call before consumeOpportunityCredit in search_signals tool
// Returns { allowed: false } when card gate should fire
// ─────────────────────────────────────────────
export interface GateResult {
  allowed: boolean
  reason?: 'trial_card_gate' | 'trial_expired' | 'limit_reached'
  leadsSeen?: number
  message?: string
}

export async function checkTrialGate(workspaceId: string): Promise<GateResult> {
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, workspaceId),
  })

  if (!sub) return { allowed: false, reason: 'trial_expired' }

  // Not trialing — use normal limit check
  if (sub.status !== 'trialing') return { allowed: true }

  // Trial expired — block lead creation until billing flow resolves status
  if (sub.trialEndsAt && sub.trialEndsAt < new Date()) {
    return {
      allowed: false,
      reason: 'trial_expired',
      leadsSeen: sub.trialOpportunitiesUsed,
      message: 'Your 7-day Fetchi trial has ended. Add a payment method or choose a plan to keep finding leads.',
    }
  }

  // Card already on file — full trial access to all 10 leads
  if (sub.paymentMethodOnFile) return { allowed: true }

  // Under 5 leads seen — free access, no gate
  if (sub.trialOpportunitiesUsed < 5) return { allowed: true }

  // 5+ leads seen, no card on file — gate fires
  return {
    allowed: false,
    reason: 'trial_card_gate',
    leadsSeen: sub.trialOpportunitiesUsed,
    message: `You've seen ${sub.trialOpportunitiesUsed} leads — Fetchi is working. Add a card to see all 10 in your trial. We won't charge anything until your 7-day trial ends.`,
  }
}
