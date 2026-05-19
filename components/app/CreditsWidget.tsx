import { differenceInDays } from 'date-fns'
import type { workspaceSubscriptions } from '@/db/schema'

type Sub = typeof workspaceSubscriptions.$inferSelect | null

export function CreditsWidget({ subscription }: { subscription: Sub }) {
  if (!subscription) {
    return (
      <div className="px-[18px] py-4 border-t border-white/10">
        <div className="text-[10px] uppercase tracking-[1px] text-white/30 mb-1.5">
          Opportunities
        </div>
        <div className="text-[13px] font-semibold text-white">Not provisioned</div>
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
    <div className="px-[18px] py-4 border-t border-white/10">
      <div className="text-[10px] uppercase tracking-[1px] text-white/30 mb-1.5">
        Opportunities
      </div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[13px] font-semibold text-white">
          {used} / {limit ?? '∞'}
        </div>
        {resetLabel && (
          <div className="text-[10px] text-white/30">{resetLabel}</div>
        )}
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-green rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
