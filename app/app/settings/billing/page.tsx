import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SectionCard } from '@/components/app/SectionCard'
import { SettingsGroup, SettingsRow } from '@/components/app/SettingsGroup'
import { Button } from '@/components/ui/button'
import { PlanPicker } from '@/components/billing/PlanPicker'
import { UsageBar } from '@/components/billing/UsageBar'
import { getActiveTiers, getTierBySlug, topupRateForTier } from '@/lib/stripe/config'
import { stripeConfigured } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string; message?: string }>
}

export default async function BillingPage({ searchParams }: PageProps) {
  const ctx = await requireWorkspaceContext()
  const params = await searchParams
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  const tiers = await getActiveTiers()
  const tier = sub ? await getTierBySlug((sub.tier as any) ?? 'starter') : null
  const interval = (sub?.billingInterval as 'monthly' | 'annual' | null) ?? 'monthly'
  const topupRate = tier ? topupRateForTier(tier, interval) : sub?.topupRateCents ?? 80

  const status = sub?.status ?? 'trialing'
  const isTrial = status === 'trialing'
  const used = isTrial ? sub?.trialOpportunitiesUsed ?? 0 : sub?.opportunitiesUsed ?? 0
  const limit = isTrial
    ? sub?.trialOpportunitiesLimit ?? 0
    : sub?.opportunitiesLimit ?? null

  const banner = bannerFor(params.status, params.message)

  return (
    <div className="max-w-4xl">
      <MobileScreenHeader
        title="Plan & Billing"
        description="Manage your subscription, top-ups, and payment method."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        {banner}
        {!stripeConfigured() && (
          <SectionCard tone="muted">
            <p className="text-[13px] text-brand-near-black/70">
              Stripe is not configured in this environment yet. Add
              <code className="mx-1 px-1 rounded bg-brand-near-black/5">STRIPE_SECRET_KEY</code>
              and price IDs to enable checkout.
            </p>
          </SectionCard>
        )}

        <SettingsGroup title="Current subscription">
          <SettingsRow
            label="Plan"
            value={
              <span className="font-outfit text-[17px] font-semibold text-brand-near-black capitalize">
                {tier?.name ?? sub?.tier ?? 'Starter'}
              </span>
            }
          />
          <SettingsRow
            label="Billing interval"
            value={<span className="text-[13.5px] capitalize">{interval}</span>}
          />
          <SettingsRow
            label="Status"
            value={
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                  status === 'active'
                    ? 'bg-brand-light text-brand-dark border-brand-green/30'
                    : status === 'trialing'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : status === 'past_due'
                    ? 'bg-brand-coral/10 text-brand-coral border-brand-coral/30'
                    : 'bg-brand-cream-muted text-brand-near-black/65 border-brand-near-black/10'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </span>
            }
          />
          {sub?.trialEndsAt && isTrial && (
            <SettingsRow
              label="Trial ends"
              value={
                <span className="text-[13.5px]">
                  {new Date(sub.trialEndsAt).toLocaleDateString()}
                </span>
              }
            />
          )}
          <SettingsRow
            label={isTrial ? 'Trial usage' : 'This period'}
            value={<UsageBar used={used} limit={limit} label="" />}
          />
        </SettingsGroup>

        {sub?.stripeCustomerId && (
          <SectionCard
            title="Payment method"
            description="Update card, view invoices, or cancel through the Stripe portal."
          >
            <form method="post" action="/api/stripe/portal">
              <Button type="submit" variant="secondary">Manage in Stripe portal</Button>
            </form>
          </SectionCard>
        )}

        <SectionCard
          title="Top up"
          description={`Add extra leads at $${(topupRate / 100).toFixed(2)} each on your ${tier?.name ?? 'current'} plan.`}
        >
          <form method="post" action="/api/stripe/topup" className="flex flex-wrap items-center gap-3">
            <label className="text-[13px] text-brand-near-black/70">Quantity</label>
            <input
              type="number"
              name="quantity"
              defaultValue={25}
              min={1}
              max={1000}
              className="h-11 w-24 rounded-xl border border-brand-near-black/15 bg-white px-3 text-[14px]"
            />
            <Button type="submit" disabled={!sub?.stripeCustomerId && !stripeConfigured()}>
              Buy top-up
            </Button>
            {!sub?.stripeCustomerId && (
              <span className="text-[12px] text-brand-near-black/60">
                Start a subscription first to unlock top-ups.
              </span>
            )}
          </form>
        </SectionCard>

        <SectionCard
          title={status === 'active' ? 'Change plan' : 'Choose a plan'}
          description="All prices are read live from the admin pricing table."
        >
          <PlanPicker
            tiers={tiers}
            currentTier={sub?.tier}
            currentInterval={interval}
          />
        </SectionCard>
      </div>
    </div>
  )
}

function bannerFor(status?: string, message?: string) {
  if (!status) return null
  if (status === 'success') {
    return (
      <SectionCard tone="highlight">
        <p className="text-[13.5px] text-brand-dark font-semibold">
          Subscription activated. Welcome aboard.
        </p>
      </SectionCard>
    )
  }
  if (status === 'topup_success') {
    return (
      <SectionCard tone="highlight">
        <p className="text-[13.5px] text-brand-dark font-semibold">
          Top-up applied &mdash; new credits are available now.
        </p>
      </SectionCard>
    )
  }
  if (status === 'cancel' || status === 'topup_cancel') {
    return (
      <SectionCard tone="muted">
        <p className="text-[13px] text-brand-near-black/70">Checkout was canceled. No charge was made.</p>
      </SectionCard>
    )
  }
  if (status === 'error') {
    return (
      <SectionCard tone="muted">
        <p className="text-[13px] text-brand-coral font-semibold">
          {message ?? 'Something went wrong with billing. Please try again.'}
        </p>
      </SectionCard>
    )
  }
  return null
}
