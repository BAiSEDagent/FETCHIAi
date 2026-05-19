import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SectionCard } from '@/components/app/SectionCard'

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
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Usage"
        description={
          inTrial
            ? 'Tracking your free trial credits. Top-ups and post-trial usage detail land with the billing checkpoint (Checkpoint 4).'
            : 'Real-time usage detail, daily spend caps, and top-up CTAs ship with the billing checkpoint (Checkpoint 4).'
        }
      />
      <div className="px-4 lg:px-7 pb-10">
        <SectionCard
          eyebrow={inTrial ? 'Trial opportunities' : 'Opportunities this cycle'}
          actions={
            <div className="text-right">
              <div className="text-[13px] font-bold text-brand-dark">
                {unlimited ? 'Unlimited' : `${remaining} left`}
              </div>
            </div>
          }
        >
          <div className="flex items-baseline gap-2 mb-3">
            <div className="font-outfit text-[40px] lg:text-[44px] leading-none font-bold text-brand-near-black tabular-nums">
              {used}
            </div>
            <div className="text-[16px] text-brand-near-black/45 tabular-nums">
              / {unlimited ? '∞' : cap}
            </div>
          </div>
          {!unlimited && (
            <div className="h-2 rounded-full bg-brand-near-black/8 overflow-hidden">
              <div
                className="h-full bg-brand-green transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
