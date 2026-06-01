import { differenceInDays } from 'date-fns'
import type { ReactNode } from 'react'
import type { workspaceSubscriptions } from '@/db/schema'

type Sub = typeof workspaceSubscriptions.$inferSelect | null

const NEEDS_PLAN_STATUSES = new Set([
  'trialing', 'expired', 'canceled', 'unpaid',
  'incomplete', 'incomplete_expired', 'paused',
])

function WidgetShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-3 mt-4 mb-2 rounded-xl bg-text/[0.04] px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-text/40 mb-1">
        Opportunities
      </div>
      {children}
    </div>
  )
}

function StatusLine({ label }: { label: string }) {
  return <div className="text-[13px] font-semibold text-text/55">{label}</div>
}

export function CreditsWidget({ subscription }: { subscription: Sub }) {
  if (!subscription) {
    return <WidgetShell><StatusLine label="Plan pending" /></WidgetShell>
  }

  const status = subscription.status ?? 'unknown'

  if (NEEDS_PLAN_STATUSES.has(status)) {
    return <WidgetShell><StatusLine label="Plan required" /></WidgetShell>
  }

  if (status === 'past_due') {
    return <WidgetShell><StatusLine label="Payment needed" /></WidgetShell>
  }

  const used = subscription.opportunitiesUsed
  const limit = subscription.opportunitiesLimit

  if (limit === null || limit === undefined) {
    return <WidgetShell><StatusLine label="Usage syncing" /></WidgetShell>
  }

  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  const resetLabel = (() => {
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
    <WidgetShell>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[14px] font-bold text-text tabular-nums">
          {used} <span className="text-text/45 font-medium">/ {limit}</span>
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
    </WidgetShell>
  )
}
