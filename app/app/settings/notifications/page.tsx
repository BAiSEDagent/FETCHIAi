import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const ctx = await requireWorkspaceContext()
  const prefs = await db.query.notificationPreferences.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  return (
    <div className="px-5 lg:px-7 py-6 lg:py-8 max-w-3xl">
      <h1 className="font-outfit text-2xl text-brand-near-black mb-1">
        Notifications
      </h1>
      <p className="text-sm text-brand-near-black/60 mb-6">
        Email-only at launch. Toggle UI for digest cadence and quiet hours
        lands alongside the notification agent in Checkpoint 6.
      </p>
      <div className="rounded-2xl border border-brand-near-black/10 bg-white p-5 space-y-3">
        <Row label="Daily digest" on={prefs?.dailyDigestEnabled ?? true} />
        <Row
          label="High-score lead alerts"
          on={prefs?.pushOnHighScore ?? true}
        />
        <Row label="Expiring leads" on={prefs?.pushOnExpiringLeads ?? true} />
        <Row label="Weekly summary" on={prefs?.weeklySummaryEnabled ?? false} />
        <Row
          label="Usage limit warnings"
          on={prefs?.limitWarningEnabled ?? true}
        />
        <div className="flex items-center justify-between text-sm pt-2 border-t border-brand-near-black/8">
          <span className="text-brand-near-black/60">Digest delivery time</span>
          <span className="text-brand-near-black font-mono text-[13px]">
            {prefs?.dailyDigestTime ?? '07:00'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-brand-near-black">{label}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
          on
            ? 'bg-brand-light text-brand-dark border-brand-green/20'
            : 'bg-brand-near-black/6 text-brand-near-black/55 border-brand-near-black/10'
        }`}
      >
        {on ? 'On' : 'Off'}
      </span>
    </div>
  )
}
