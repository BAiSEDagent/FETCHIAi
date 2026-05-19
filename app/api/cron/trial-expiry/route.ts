import { NextResponse } from 'next/server'
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm'
import { db, workspaceSubscriptions } from '@/db'
import { getStripe, stripeConfigured } from '@/lib/stripe/client'
import { resolvePriceId, parseTierSlug, parseBillingInterval } from '@/lib/stripe/config'
import { syncSubscriptionFromStripe } from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${expected}`
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ skipped: 'stripe_not_configured' })
  }
  const stripe = getStripe()
  const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const candidates = await db
    .select()
    .from(workspaceSubscriptions)
    .where(
      and(
        eq(workspaceSubscriptions.status, 'trialing'),
        eq(workspaceSubscriptions.paymentMethodOnFile, true),
        isNull(workspaceSubscriptions.stripeSubscriptionId),
        isNotNull(workspaceSubscriptions.stripeCustomerId),
        isNotNull(workspaceSubscriptions.trialEndsAt),
        lte(workspaceSubscriptions.trialEndsAt, horizon),
      ),
    )

  const results: Array<{ workspaceId: string; ok: boolean; reason?: string }> = []

  for (const row of candidates) {
    try {
      const tier = parseTierSlug(row.tier)
      const interval = parseBillingInterval(row.billingInterval) ?? 'monthly'
      if (!tier) {
        results.push({ workspaceId: row.workspaceId, ok: false, reason: 'invalid_tier' })
        continue
      }
      const priceId = row.selectedStripePriceId ?? (await resolvePriceId(tier, interval))
      if (!priceId) {
        results.push({ workspaceId: row.workspaceId, ok: false, reason: 'no_price' })
        continue
      }
      const now = Date.now()
      const trialEndMs = row.trialEndsAt?.getTime() ?? 0
      const trialEnd: number | 'now' =
        trialEndMs > now ? Math.floor(trialEndMs / 1000) : 'now'
      const sub = await stripe.subscriptions.create({
        customer: row.stripeCustomerId!,
        items: [{ price: priceId }],
        trial_end: trialEnd,
        metadata: { workspaceId: row.workspaceId, tier, interval },
      })
      await syncSubscriptionFromStripe(sub)
      results.push({ workspaceId: row.workspaceId, ok: true })
    } catch (err) {
      console.error('[cron.trial-expiry] failed for', row.workspaceId, err)
      results.push({ workspaceId: row.workspaceId, ok: false, reason: 'stripe_error' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
