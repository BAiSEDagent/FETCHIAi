import Stripe from 'stripe'
import { and, eq, sql } from 'drizzle-orm'
import {
  db,
  workspaceSubscriptions,
  promoCodes,
  promoRedemptions,
  events,
} from '@/db'
import { tierForPriceId, topupRateForTier } from './config'

type SubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'

function mapStatus(s: Stripe.Subscription.Status): SubStatus {
  switch (s) {
    case 'trialing':           return 'trialing'
    case 'active':             return 'active'
    case 'past_due':
    case 'unpaid':             return 'past_due'
    case 'canceled':
    case 'incomplete_expired': return 'canceled'
    case 'incomplete':         return 'past_due'
    case 'paused':             return 'canceled'
    default:                   return 'expired'
  }
}

function workspaceIdFrom(sub: Stripe.Subscription): string | null {
  const v = (sub.metadata ?? {}).workspaceId ?? (sub.metadata ?? {}).workspace_id
  return typeof v === 'string' && v.length > 0 ? v : null
}

export async function syncSubscriptionFromStripe(
  sub: Stripe.Subscription,
): Promise<void> {
  const workspaceId = workspaceIdFrom(sub)
  if (!workspaceId) return

  const item = sub.items.data[0]
  const priceId = item?.price?.id
  if (!priceId) return

  const resolved = await tierForPriceId(priceId)
  if (!resolved) return

  const { slug, interval, tier } = resolved
  const status = mapStatus(sub.status)
  const topupRate = topupRateForTier(tier, interval)
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null
  const periodEndSec =
    (item as unknown as { current_period_end?: number }).current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000) : null

  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null

  const paymentMethodOnFile = Boolean(sub.default_payment_method)

  const existing = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  })

  const sameSub = existing?.stripeSubscriptionId === sub.id
  const isNewPeriod =
    sameSub &&
    existing?.opportunitiesResetAt != null &&
    periodEnd != null &&
    existing.opportunitiesResetAt.getTime() !== periodEnd.getTime()

  const shouldResetUsage = !sameSub || isNewPeriod

  await db
    .update(workspaceSubscriptions)
    .set({
      tier: slug,
      billingInterval: interval,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      selectedStripePriceId: priceId,
      ...(shouldResetUsage
        ? {
            opportunitiesLimit: tier.opportunitiesLimit ?? null,
            opportunitiesUsed: 0,
          }
        : {}),
      opportunitiesResetAt: periodEnd ?? null,
      topupRateCents: topupRate,
      paymentMethodOnFile,
      trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
}

export async function markSubscriptionCanceled(sub: Stripe.Subscription): Promise<void> {
  const workspaceId = workspaceIdFrom(sub)
  if (!workspaceId) return
  await db
    .update(workspaceSubscriptions)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
}

export async function markPaymentFailed(workspaceId: string): Promise<void> {
  await db
    .update(workspaceSubscriptions)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
}

export async function applyTopupCredit(
  workspaceId: string,
  quantity: number,
  paymentIntentId: string,
): Promise<void> {
  if (!Number.isFinite(quantity) || quantity <= 0) return
  const q = Math.floor(quantity)

  const already = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.workspaceId, workspaceId),
        eq(events.eventType, 'stripe_topup_applied'),
        sql`metadata->>'paymentIntentId' = ${paymentIntentId}`,
      ),
    )
    .limit(1)
  if (already.length > 0) return

  await db.execute(sql`
    UPDATE workspace_subscriptions
    SET opportunities_limit = opportunities_limit + ${q},
        updated_at = now()
    WHERE workspace_id = ${workspaceId}
      AND opportunities_limit IS NOT NULL
  `)

  await db.insert(events).values({
    workspaceId,
    userId: 'stripe_webhook',
    eventType: 'stripe_topup_applied',
    metadata: { paymentIntentId, quantity: q },
  })
}

export async function setCustomerOnWorkspace(
  workspaceId: string,
  customerId: string,
): Promise<void> {
  await db
    .update(workspaceSubscriptions)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
}

export async function markPaymentMethodOnFile(workspaceId: string): Promise<void> {
  await db
    .update(workspaceSubscriptions)
    .set({ paymentMethodOnFile: true, updatedAt: new Date() })
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
}

export async function recordPromoRedemption(
  workspaceId: string,
  promoCode: string,
): Promise<void> {
  const promo = await db.query.promoCodes.findFirst({
    where: (t, { eq: e }) => e(t.code, promoCode.toUpperCase()),
  })
  if (!promo) return
  await db
    .insert(promoRedemptions)
    .values({ promoCodeId: promo.id, workspaceId })
    .onConflictDoNothing()
  await db
    .update(promoCodes)
    .set({
      redemptionsSoFar: sql`${promoCodes.redemptionsSoFar} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(promoCodes.id, promo.id))
}
