import Stripe from 'stripe'
import { db, workspaceSubscriptions } from '@/db'
import { eq } from 'drizzle-orm'
import { getStripe } from './client'
import {
  resolvePriceId,
  getTierBySlug,
  topupRateForTier,
  type BillingInterval,
  type TierSlug,
} from './config'

interface CheckoutInput {
  workspaceId: string
  email: string | null
  tier: TierSlug
  interval: BillingInterval
  origin: string
  promoCode?: string | null
}

async function ensureCustomer(
  stripe: Stripe,
  workspaceId: string,
  email: string | null,
): Promise<string> {
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  })
  if (sub?.stripeCustomerId) return sub.stripeCustomerId

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { workspaceId },
  })
  await db
    .update(workspaceSubscriptions)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
  return customer.id
}

export async function createSubscriptionCheckoutSession(
  input: CheckoutInput,
): Promise<string> {
  const stripe = getStripe()
  const priceId = await resolvePriceId(input.tier, input.interval)
  if (!priceId) {
    throw new Error(
      `No Stripe price configured for ${input.tier} (${input.interval}). Set it in the admin panel or env.`,
    )
  }
  const customerId = await ensureCustomer(stripe, input.workspaceId, input.email)

  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, input.workspaceId),
  })

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: { workspaceId: input.workspaceId, tier: input.tier, interval: input.interval },
  }
  if (sub?.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()) {
    const epoch = Math.floor(sub.trialEndsAt.getTime() / 1000)
    subscriptionData.trial_end = epoch
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: input.workspaceId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: subscriptionData,
    success_url: `${input.origin}/app/settings/billing?status=success`,
    cancel_url: `${input.origin}/app/settings/billing?status=cancel`,
    allow_promotion_codes: !input.promoCode,
    discounts: input.promoCode ? [{ promotion_code: input.promoCode }] : undefined,
    metadata: { workspaceId: input.workspaceId, kind: 'subscription' },
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return session.url
}

interface TopupInput {
  workspaceId: string
  email: string | null
  quantity: number
  origin: string
}

export async function createTopupCheckoutSession(input: TopupInput): Promise<string> {
  const stripe = getStripe()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, input.workspaceId),
  })
  if (!sub) throw new Error('No subscription found for workspace.')

  const tierSlug = (sub.tier as TierSlug) ?? 'starter'
  const tier = await getTierBySlug(tierSlug)
  if (!tier) throw new Error('Active tier could not be loaded.')

  const interval = (sub.billingInterval as BillingInterval) ?? 'monthly'
  const unitAmount = topupRateForTier(tier, interval)
  const qty = Math.max(1, Math.floor(input.quantity))

  const customerId = await ensureCustomer(stripe, input.workspaceId, input.email)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: input.workspaceId,
    line_items: [
      {
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: {
            name: `Fetchi top-up — ${qty} lead${qty === 1 ? '' : 's'}`,
            description: `Top-up credit for ${tier.name} plan`,
          },
        },
      },
    ],
    payment_intent_data: {
      metadata: {
        workspaceId: input.workspaceId,
        kind: 'topup',
        quantity: String(qty),
      },
    },
    success_url: `${input.origin}/app/settings/billing?status=topup_success`,
    cancel_url: `${input.origin}/app/settings/billing?status=topup_cancel`,
    metadata: {
      workspaceId: input.workspaceId,
      kind: 'topup',
      quantity: String(qty),
    },
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return session.url
}

export async function createBillingPortalSession(
  workspaceId: string,
  origin: string,
): Promise<string> {
  const stripe = getStripe()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  })
  if (!sub?.stripeCustomerId) {
    throw new Error('No Stripe customer on file. Start a subscription first.')
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/app/settings/billing`,
  })
  return session.url
}
