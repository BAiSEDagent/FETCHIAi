import { differenceInDays } from 'date-fns'
import type { workspaceSubscriptions } from '@/db/schema'

type Sub = typeof workspaceSubscriptions.$inferSelect | null

export function CreditsWidget({ subscription }: { subscription: Sub }) {
  if (!subscription) {
    return (
      <div className="mx-3 mt-4 mb-2 rounded-xl bg-text/[0.04] px-3.5 py-3">
        <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-text/40 mb-1">
          Opportunities
        </div>
        <div className="text-[13px] font-semibold text-text">Not provisioned</div>
      </div>
    )
  }

  const isTrial = subscription.status === 'trialing'
  const used = isTrial
    ? subscription.trialOpportunitiesUsed
    : subscription.opportunitiesUsed
  const limit = isTrial
    ? subscription.trialOpportunitiesLimit
    : subscription.opportunitiesLimit

  const pct =
    limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  const resetLabel = (() => {
    if (isTrial && subscription.trialEndsAt) {
      const days = differenceInDays(new Date(subscription.trialEndsAt), new Date())
      if (days <= 0) return 'trial ended'
      return `${days}d trial left`
    }
    if (subscription.opportunitiesResetAt) {
      const days = differenceInDays(
        new Date(subscription.opportunitiesResetAt),
        new Date(),
      )
      return days > 0 ? `resets in ${days}d` : 'resets soon'
    }
    return ''
  })()

  return (
    <div className="mx-3 mt-4 mb-2 rounded-xl bg-text/[0.04] px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-text/45 mb-1.5">
        Opportunities
      </div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[14px] font-bold text-text tabular-nums">
          {used} <span className="text-text/45 font-medium">/ {limit ?? '∞'}</span>
        </div>
        {resetLabel && (
          <div className="text-[10px] text-text/45">{resetLabel}</div>
        )}
      </div>
      <div className="h-1.5 bg-text/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-ok rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
