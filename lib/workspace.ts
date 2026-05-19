import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import {
  db,
  workspaceSettings,
  workspaceSubscriptions,
  workspaceLearning,
  scoutSchedules,
  signalPreferences,
  notificationPreferences,
  serviceProfiles,
  systemSettings,
} from '@/db'
import { isDisposableEmail } from './disposable-email'

export type WorkspaceContext = {
  workspaceId: string
  userId: string
  email: string | null
  fullName: string | null
  workspace: typeof workspaceSettings.$inferSelect
  subscription: typeof workspaceSubscriptions.$inferSelect | null
  serviceProfile: typeof serviceProfiles.$inferSelect | null
}

function deriveReferralCode(seed: string): string {
  const slug = (seed || 'user')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6) || 'USER'
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${slug}-${rand}`
}

async function readSystemNumber(key: string, fallback: number): Promise<number> {
  try {
    const row = await db.query.systemSettings.findFirst({
      where: (t, { eq: e }) => e(t.key, key),
    })
    const v = row?.value as unknown
    if (typeof v === 'number') return v
    if (typeof v === 'string' && !isNaN(Number(v))) return Number(v)
    if (v && typeof v === 'object' && 'value' in (v as any)) {
      const inner = (v as any).value
      if (typeof inner === 'number') return inner
    }
  } catch {}
  return fallback
}

/**
 * Provisions a workspace for a Clerk user if one does not already exist.
 * Idempotent — safe to call on every request. Mirrors the work done in the
 * Clerk webhook so the app remains usable even before the webhook is wired.
 */
export async function ensureWorkspaceForUser(
  userId: string,
  email: string | null,
  signupMethod: 'email' | 'google' | null,
): Promise<typeof workspaceSettings.$inferSelect> {
  const existing = await db.query.workspaceSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, userId),
  })
  if (existing) return existing

  const trialDays = await readSystemNumber('trial_duration_days', 7)
  const trialLimit = await readSystemNumber('trial_opportunities_limit', 10)
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)

  await db
    .insert(workspaceSettings)
    .values({
      workspaceId: userId,
      ownerUserId: userId,
      businessName: null,
      isApproved: true,
      onboardingStep: 0,
      referralCode: deriveReferralCode(email?.split('@')[0] ?? userId.slice(-6)),
      signupMethod: signupMethod ?? 'email',
    })
    .onConflictDoNothing()

  await db
    .insert(workspaceSubscriptions)
    .values({
      workspaceId: userId,
      tier: 'starter',
      billingInterval: 'monthly',
      opportunitiesLimit: null,
      opportunitiesUsed: 0,
      trialOpportunitiesLimit: trialLimit,
      trialOpportunitiesUsed: 0,
      status: 'trialing',
      paymentMethodOnFile: false,
      trialEndsAt,
      topupRateCents: 80,
    })
    .onConflictDoNothing()

  await db
    .insert(workspaceLearning)
    .values({ workspaceId: userId, learningContext: null, outcomesCounted: 0 })
    .onConflictDoNothing()

  await db
    .insert(scoutSchedules)
    .values({
      workspaceId: userId,
      mode: 'off',
      cronExpressions: [],
      timezone: 'UTC',
      status: 'active',
      coverageStatus: 'unchecked',
    })
    .onConflictDoNothing()

  await db
    .insert(signalPreferences)
    .values({
      workspaceId: userId,
      permitsEnabled: true,
      stormEnabled: true,
      newListingsEnabled: true,
      jobPostingsEnabled: false,
      eventsEnabled: false,
      minScoreThreshold: 70,
      excludedKeywords: [],
    })
    .onConflictDoNothing()

  await db
    .insert(notificationPreferences)
    .values({
      workspaceId: userId,
      dailyDigestEnabled: true,
      dailyDigestTime: '07:00',
      pushOnHighScore: true,
      highScoreThreshold: 85,
      pushOnExpiringLeads: true,
      weeklySummaryEnabled: false,
      limitWarningEnabled: true,
      notificationEmail: email,
    })
    .onConflictDoNothing()

  const created = await db.query.workspaceSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, userId),
  })
  return created!
}

/**
 * Resolves the current authenticated user → workspace context.
 * Handles email-verification gate and disposable-email block.
 * Redirects to /sign-in, /verify-email, or /blocked as needed.
 */
export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const primary = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
  const email = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null

  if (email && isDisposableEmail(email)) redirect('/blocked')

  if (primary && primary.verification?.status !== 'verified') {
    redirect('/verify-email')
  }

  const signupMethod: 'email' | 'google' | null =
    user.externalAccounts?.some(a => a.provider === 'oauth_google') ? 'google' : 'email'

  const workspace = await ensureWorkspaceForUser(userId, email, signupMethod)

  const subscription = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, userId),
  })

  const serviceProfile = await db.query.serviceProfiles.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, userId),
  })

  return {
    workspaceId: userId,
    userId,
    email,
    fullName: user.fullName ?? user.firstName ?? null,
    workspace,
    subscription: subscription ?? null,
    serviceProfile: serviceProfile ?? null,
  }
}

/**
 * Update a workspace's onboarding step (monotonic — never goes backwards).
 */
export async function setOnboardingStep(workspaceId: string, step: number) {
  const current = await db.query.workspaceSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  })
  const next = Math.max(current?.onboardingStep ?? 0, step)
  await db
    .update(workspaceSettings)
    .set({ onboardingStep: next, updatedAt: new Date() })
    .where(eq(workspaceSettings.workspaceId, workspaceId))
}
