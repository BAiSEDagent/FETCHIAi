import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const ctx = await requireWorkspaceContext()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  const tier = sub?.tier ?? 'trial'
  const status = sub?.status ?? 'trialing'

  return (
    <div className="px-5 lg:px-7 py-6 lg:py-8 max-w-3xl">
      <h1 className="font-outfit text-2xl text-brand-near-black mb-1">
        Plan &amp; Billing
      </h1>
      <p className="text-sm text-brand-near-black/60 mb-6">
        Stripe checkout, the billing portal, and top-ups land in Checkpoint 4.
      </p>
      <div className="rounded-2xl border border-brand-near-black/10 bg-white p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-near-black/55">
            Current plan
          </span>
          <span className="font-outfit text-lg text-brand-near-black capitalize">
            {tier}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-near-black/55">
            Billing interval
          </span>
          <span className="text-sm text-brand-near-black capitalize">
            {sub?.billingInterval ?? 'monthly'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-near-black/55">
            Status
          </span>
          <span className="text-sm font-semibold text-brand-dark capitalize">
            {status.replace(/_/g, ' ')}
          </span>
        </div>
        {sub?.trialEndsAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-brand-near-black/55">
              Trial ends
            </span>
            <span className="text-sm text-brand-near-black">
              {new Date(sub.trialEndsAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
