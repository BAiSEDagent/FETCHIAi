import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SettingsGroup, SettingsRow } from '@/components/app/SettingsGroup'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const ctx = await requireWorkspaceContext()
  const prefs = await db.query.notificationPreferences.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  const rows: Array<{ label: string; hint?: string; on: boolean }> = [
    { label: 'Daily digest', hint: 'Top picks of the day in one email.', on: prefs?.dailyDigestEnabled ?? true },
    { label: 'Lead alerts', hint: 'Current preference shown from your workspace settings.', on: prefs?.pushOnHighScore ?? true },
    { label: 'Lead reminders', hint: 'Current reminder preference for saved leads.', on: prefs?.pushOnExpiringLeads ?? true },
    { label: 'Weekly summary', hint: 'Sunday recap of the week.', on: prefs?.weeklySummaryEnabled ?? false },
    { label: 'Usage limit warnings', hint: 'Heads-up before you hit your monthly cap.', on: prefs?.limitWarningEnabled ?? true },
  ]

  return (
    <div data-fetchi-notifications-v5 className="max-w-3xl">
      <MobileScreenHeader
        title="Notifications"
        description="Review email preferences for this workspace. Changes are not editable from this screen yet."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        <SettingsGroup
          mode="rows"
          title="Email preferences"
          description="Read-only view of the notification settings currently on file."
        >
          {rows.map(r => (
            <SettingsRow
              key={r.label}
              label={r.label}
              hint={r.hint}
              value={<StatePreview label={r.label} on={r.on} />}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup mode="rows" title="Delivery schedule">
          <SettingsRow
            label="Digest delivery time"
            hint="Local time, your time zone."
            value={
              <span className="text-[14px] font-bold text-text tabular-nums">
                {prefs?.dailyDigestTime ?? '07:00'}
              </span>
            }
          />
        </SettingsGroup>
      </div>
    </div>
  )
}

function StatePreview({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      data-fetchi-settings-state-v5
      aria-label={`${label}: ${on ? 'on' : 'off'}`}
      className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full border border-text/10 bg-fetchiOverlay px-2.5 text-[11px] font-semibold text-text/60"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-fetchiAccent' : 'bg-text/25'}`} aria-hidden />
      {on ? 'On' : 'Off'}
    </span>
  )
}
