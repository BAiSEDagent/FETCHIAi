import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'

export const dynamic = 'force-dynamic'

export default async function UsagePage() {
  const ctx = await requireWorkspaceContext()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  const inTrial = (sub?.status ?? 'trialing') === 'trialing'
  const used = inTrial
    ? sub?.trialOpportunitiesUsed ?? 0
    : sub?.opportunitiesUsed ?? 0
  const cap = inTrial
    ? sub?.trialOpportunitiesLimit ?? 0
    : sub?.opportunitiesLimit ?? 0
  const unlimited = !inTrial && (sub?.opportunitiesLimit ?? null) === null
  const remaining = unlimited ? null : Math.max(cap - used, 0)
  const pct = unlimited ? 0 : cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0

  return (
    <div className="px-5 lg:px-7 py-6 lg:py-8 max-w-3xl">
      <h1 className="font-outfit text-2xl text-brand-near-black mb-1">Usage</h1>
      <p className="text-sm text-brand-near-black/60 mb-6">
        {inTrial
          ? 'Tracking your free trial credits. Top-ups and post-trial usage detail land with the billing checkpoint (Checkpoint 4).'
          : 'Real-time usage detail, daily spend caps, and top-up CTAs ship with the billing checkpoint (Checkpoint 4).'}
      </p>
      <div className="rounded-2xl border border-brand-near-black/10 bg-white p-5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand-near-black/55">
              {inTrial ? 'Trial opportunities' : 'Opportunities this cycle'}
            </div>
            <div className="font-outfit text-2xl text-brand-near-black">
              {used}{' '}
              <span className="text-brand-near-black/40 text-base">
                / {unlimited ? '∞' : cap}
              </span>
            </div>
          </div>
          <div className="text-sm text-brand-dark font-semibold">
            {unlimited ? 'Unlimited' : `${remaining} left`}
          </div>
        </div>
        {!unlimited && (
          <div className="h-2 rounded-full bg-brand-near-black/8 overflow-hidden">
            <div className="h-full bg-brand-green" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
