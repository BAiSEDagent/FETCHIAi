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
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Notifications"
        description="Review email preferences for this workspace. Changes are not editable from this screen yet."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        <SettingsGroup
          title="Email preferences"
          description="Read-only view of the notification settings currently on file."
        >
          {rows.map(r => (
            <SettingsRow
              key={r.label}
              label={r.label}
              hint={r.hint}
              value={<TogglePreview on={r.on} />}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title="Delivery schedule">
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

function TogglePreview({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${
        on
          ? 'bg-ok/15 text-text2 border-ok/30'
          : 'bg-raised text-text/55 border-text/10'
      }`}
    >
      {on ? 'On' : 'Off'}
    </span>
  )
}
