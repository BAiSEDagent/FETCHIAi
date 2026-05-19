import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { SettingsGroup, SettingsRow } from '@/components/app/SettingsGroup'

export const dynamic = 'force-dynamic'

export default async function SignalPreferencesPage() {
  const ctx = await requireWorkspaceContext()
  const prefs = await db.query.signalPreferences.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  const rows: Array<{ key: string; label: string; hint?: string; on: boolean }> = [
    { key: 'permits', label: 'Building permits', hint: 'New permits filed in your service area.', on: prefs?.permitsEnabled ?? true },
    { key: 'storm', label: 'Storm & weather damage', hint: 'NOAA hail, wind, and storm reports.', on: prefs?.stormEnabled ?? true },
    { key: 'listings', label: 'New business listings', hint: 'Businesses opening near you.', on: prefs?.newListingsEnabled ?? true },
    { key: 'jobs', label: 'Job postings', hint: 'Hiring signals tied to growth.', on: prefs?.jobPostingsEnabled ?? false },
    { key: 'events', label: 'Local events', hint: 'Civic events and gatherings.', on: prefs?.eventsEnabled ?? false },
  ]

  return (
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Signal Preferences"
        description="Which buying signals should ツ surface for you? Editing these thresholds goes live with the signal-detection wiring in Checkpoint 6."
      />
      <div className="px-4 lg:px-7 pb-10 space-y-3 lg:space-y-4">
        <SettingsGroup
          title="Signal sources"
          description="Read-only preview — toggles ship with Checkpoint 6."
        >
          {rows.map(r => (
            <SettingsRow
              key={r.key}
              label={r.label}
              hint={r.hint}
              value={<TogglePreview on={r.on} />}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title="Scoring threshold">
          <SettingsRow
            label="Minimum score"
            hint="Signals below this score never reach your inbox."
            value={
              <span className="text-[16px] font-bold text-brand-near-black tabular-nums">
                {prefs?.minScoreThreshold ?? 70}
              </span>
            }
          />
        </SettingsGroup>

        {prefs?.excludedKeywords && prefs.excludedKeywords.length > 0 && (
          <SettingsGroup
            title="Excluded keywords"
            description="Signals matching any of these are dropped automatically."
          >
            <ul className="flex flex-wrap gap-2">
              {prefs.excludedKeywords.map(k => (
                <li
                  key={k}
                  className="rounded-full bg-brand-cream-muted border border-brand-near-black/10 px-3 py-1 text-[12px] text-brand-near-black/70"
                >
                  {k}
                </li>
              ))}
            </ul>
          </SettingsGroup>
        )}
      </div>
    </div>
  )
}

function TogglePreview({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${
        on
          ? 'bg-brand-light text-brand-dark border-brand-green/30'
          : 'bg-brand-cream-muted text-brand-near-black/55 border-brand-near-black/10'
      }`}
    >
      {on ? 'On' : 'Off'}
    </span>
  )
}
