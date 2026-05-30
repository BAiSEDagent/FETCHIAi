import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SectionCard } from '@/components/app/SectionCard'
import { SettingsGroup, SettingsRow } from '@/components/app/SettingsGroup'

export const dynamic = 'force-dynamic'

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

function StatusPill({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'muted' }) {
  const toneClass =
    tone === 'ok'
      ? 'bg-ok/15 text-text2 border-ok/30'
      : tone === 'warn'
      ? 'bg-warn/15 text-warn border-warn/30'
      : 'bg-raised text-text/65 border-text/10'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${toneClass}`}
    >
      {label}
    </span>
  )
}

function ComingSoonNote() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-text/15 bg-raised px-4 min-h-11 text-[13px] font-semibold text-text/55">
      Plan selection coming soon
    </div>
  )
}

export default async function BillingPage() {
  const ctx = await requireWorkspaceContext()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  // ── D. Missing / unsynced subscription row ──────────────────────────
  if (!sub) {
    return (
      <div className="max-w-3xl">
        <MobileScreenHeader
          title="Plan & Billing"
          description="Your plan and billing details."
        />
        <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
          <SectionCard title="Billing is syncing">
            <p className="text-[14px] text-text/65 leading-relaxed">
              {'Plan details are syncing — check back shortly.'}
            </p>
          </SectionCard>
        </div>
      </div>
    )
  }

  const status = sub.status ?? ''

  // ── C. Past due ─────────────────────────────────────────────────────
  if (status === 'past_due') {
    return (
      <div className="max-w-3xl">
        <MobileScreenHeader
          title="Plan & Billing"
          description="Your plan and billing details."
        />
        <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
          <SectionCard
            title="Payment needs attention"
            actions={<StatusPill label="Payment needed" tone="warn" />}
          >
            <p className="text-[14px] text-text/65 leading-relaxed">
              {'Update your plan to keep opportunities flowing.'}
            </p>
          </SectionCard>
        </div>
      </div>
    )
  }

  // ── B. Active finite paid plan ──────────────────────────────────────
  if (status === 'active') {
    const planName = sub.tier
    const interval = sub.billingInterval
    const limit = sub.opportunitiesLimit
    const resetAt = formatDate(sub.opportunitiesResetAt)

    return (
      <div className="max-w-3xl">
        <MobileScreenHeader
          title="Plan & Billing"
          description="Your current plan, billing interval, and usage limit."
        />
        <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
          <SettingsGroup title="Current subscription">
            {planName && (
              <SettingsRow
                label="Plan"
                value={
                  <span className="font-outfit text-[17px] font-semibold text-text capitalize">
                    {planName}
                  </span>
                }
              />
            )}
            {interval && (
              <SettingsRow
                label="Billing interval"
                value={<span className="text-[13.5px] text-text capitalize">{interval}</span>}
              />
            )}
            <SettingsRow label="Status" value={<StatusPill label="Active" tone="ok" />} />
            {typeof limit === 'number' && (
              <SettingsRow
                label="Opportunity limit"
                value={<span className="text-[13.5px] text-text tabular-nums">{limit}</span>}
              />
            )}
            {resetAt && (
              <SettingsRow
                label="Resets"
                value={<span className="text-[13.5px] text-text">{resetAt}</span>}
              />
            )}
          </SettingsGroup>
        </div>
      </div>
    )
  }

  // ── A. Legacy / pre-payment state ───────────────────────────────────
  // Applies to legacy trialing, expired, canceled, or any non-active status,
  // and to workspaces that only have old pre-payment data. Treated as
  // plan-required in customer-facing UI — never as an active paid plan.
  return (
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Plan & Billing"
        description="Choose a plan before Fetchi starts delivering opportunities."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        <SectionCard
          title="Plan required"
          actions={<StatusPill label="Plan required" tone="muted" />}
        >
          <p className="text-[14px] text-text/65 leading-relaxed">
            {'Choose a capped plan to start receiving opportunities.'}
          </p>
          <p className="mt-2 text-[13px] text-text/45 leading-relaxed">
            {'Fetchi does not offer free trials or unlimited plans.'}
          </p>
          <div className="mt-4">
            <ComingSoonNote />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
