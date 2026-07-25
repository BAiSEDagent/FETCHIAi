import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SectionCard } from '@/components/app/SectionCard'
import { fetchiButtonVariants } from '@/components/fetchi-ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const BILLING_HREF = '/app/settings/billing'

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Meter({ used, cap, atLimit }: { used: number; cap: number; atLimit: boolean }) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0
  return (
    <>
      <div className="flex items-baseline gap-2 mb-3">
        <div className="font-fetchi text-[40px] font-bold leading-none tracking-[-0.02em] text-text tabular-nums lg:text-[44px]">
          {used}
        </div>
        <div className="text-[16px] text-text/45 tabular-nums">/ {cap}</div>
      </div>
      <div className="h-2 rounded-full bg-text/8 overflow-hidden" role="presentation">
        <div
          className={cn('h-full transition-all', atLimit ? 'bg-semanticAmber' : 'bg-fetchiAccent')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  )
}

function RemainingBadge({ atLimit, label }: { atLimit: boolean; label: string }) {
  return (
    <div className={cn('text-[13px] font-semibold tabular-nums', atLimit ? 'text-semanticAmber' : 'text-text2')}>
      {label}
    </div>
  )
}

function BillingCta({ label }: { label: string }) {
  return (
    <Link
      href={BILLING_HREF}
      className={cn(fetchiButtonVariants({ variant: 'primary', size: 'lg' }), 'min-h-[44px] w-full sm:w-auto')}
    >
      {label}
    </Link>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div data-fetchi-usage-v5 className="max-w-3xl">
      <MobileScreenHeader
        title="Usage"
        description="Track opportunities used, your plan limit, and reset timing."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">{children}</div>
    </div>
  )
}

export default async function UsagePage() {
  const ctx = await requireWorkspaceContext()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  // ── E. Missing / unsynced subscription row ──────────────────────────
  if (!sub) {
    return (
      <Shell>
        <SectionCard density="compact" eyebrow="Usage" title="Usage is syncing">
          <p className="text-[14px] text-text/65 leading-relaxed">
            {'Usage is syncing — check back shortly.'}
          </p>
        </SectionCard>
        <SectionCard density="compact" eyebrow="What happens next">
          <p className="text-[14px] text-text/65 leading-relaxed">
            {'Your workspace is still finishing setup. Once it syncs, your opportunity usage and reset timing will appear here.'}
          </p>
          <div className="mt-4">
            <BillingCta label="View plans & top-ups" />
          </div>
        </SectionCard>
      </Shell>
    )
  }

  const status = sub.status ?? ''

  // ── C. Past due ─────────────────────────────────────────────────────
  if (status === 'past_due') {
    return (
      <Shell>
        <SectionCard density="compact" eyebrow="Usage" title="Payment needs attention">
          <p className="text-[14px] text-text/65 leading-relaxed">
            {'Update your plan to keep opportunities flowing.'}
          </p>
          <div className="mt-4">
            <BillingCta label="Manage plan" />
          </div>
        </SectionCard>
      </Shell>
    )
  }

  // ── Active plan ─────────────────────────────────────────────────────
  if (status === 'active') {
    const limit = sub.opportunitiesLimit

    // D. Null limit — render a safe syncing/custom fallback, never a meter,
    // never a progress bar, never an unbounded usage promise.
    if (limit === null || limit === undefined) {
      return (
        <Shell>
          <SectionCard density="compact" eyebrow="Usage limit syncing" title="Custom limit pending">
            <p className="text-[14px] text-text/65 leading-relaxed">
              {"Your plan's opportunity limit isn't configured yet. This can happen while billing finishes syncing, or when your workspace is on a custom capped agreement."}
            </p>
          </SectionCard>
          <SectionCard density="compact" eyebrow="What happens next">
            <p className="text-[14px] text-text/65 leading-relaxed">
              {"We'll show your usage meter here as soon as your limit is confirmed. If this persists, review your plan from Plan & Billing."}
            </p>
            <div className="mt-4">
              <BillingCta label="View plans & top-ups" />
            </div>
          </SectionCard>
        </Shell>
      )
    }

    // A. Active finite plan.
    const used = sub.opportunitiesUsed ?? 0
    const cap = limit
    const remaining = Math.max(cap - used, 0)
    const atLimit = remaining === 0
    const resetAt = formatDate(sub.opportunitiesResetAt)

    return (
      <Shell>
        <SectionCard
          density="compact"
          eyebrow="Opportunities this cycle"
          actions={<RemainingBadge atLimit={atLimit} label={atLimit ? 'Limit reached' : `${remaining} left`} />}
        >
          <Meter used={used} cap={cap} atLimit={atLimit} />
          <div className="mt-3 text-[13px] text-text/55">
            {resetAt ? `Resets ${resetAt}` : 'Reset date pending'}
          </div>
        </SectionCard>
        <SectionCard density="compact" eyebrow="What happens next">
          <p className="text-[14px] text-text/65 leading-relaxed">
            {atLimit
              ? "You've hit your opportunity limit. Add a top-up or upgrade your plan to keep finding buyers this cycle."
              : `You have ${remaining} ${remaining === 1 ? 'opportunity' : 'opportunities'} left this cycle${
                  resetAt ? `, renewing on ${resetAt}` : ''
                }. Need more sooner? Add a top-up or upgrade from Plan & Billing.`}
          </p>
          <div className="mt-4">
            <BillingCta label="View plans & top-ups" />
          </div>
        </SectionCard>
      </Shell>
    )
  }

  // ── B. Legacy / pre-payment state ───────────────────────────────────
  // Applies to legacy trialing, expired, canceled, or any non-active status.
  // Treated as plan-required in customer-facing UI — no trial framing.
  return (
    <Shell>
      <SectionCard density="compact" eyebrow="Usage" title="Plan required">
        <p className="text-[14px] text-text/65 leading-relaxed">
          {'Choose a plan to start receiving opportunities.'}
        </p>
        <div className="mt-4">
          <BillingCta label="Choose a plan" />
        </div>
      </SectionCard>
    </Shell>
  )
}
