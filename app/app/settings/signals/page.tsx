import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'

export const dynamic = 'force-dynamic'

export default async function SignalPreferencesPage() {
  const ctx = await requireWorkspaceContext()
  const prefs = await db.query.signalPreferences.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  const rows: Array<{ key: string; label: string; on: boolean }> = [
    { key: 'permits', label: 'Building permits', on: prefs?.permitsEnabled ?? true },
    { key: 'storm', label: 'Storm & weather damage', on: prefs?.stormEnabled ?? true },
    { key: 'listings', label: 'New business listings', on: prefs?.newListingsEnabled ?? true },
    { key: 'jobs', label: 'Job postings', on: prefs?.jobPostingsEnabled ?? false },
    { key: 'events', label: 'Local events', on: prefs?.eventsEnabled ?? false },
  ]

  return (
    <div className="px-5 lg:px-7 py-6 lg:py-8 max-w-3xl">
      <h1 className="font-outfit text-2xl text-brand-near-black mb-1">
        Signal Preferences
      </h1>
      <p className="text-sm text-brand-near-black/60 mb-6">
        Which buying signals should ツ surface for you? Editing these
        thresholds goes live with the signal-detection wiring in Checkpoint 6.
      </p>
      <div className="rounded-2xl border border-brand-near-black/10 bg-white p-5 space-y-3">
        {rows.map(r => (
          <div key={r.key} className="flex items-center justify-between text-sm">
            <span className="text-brand-near-black">{r.label}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                r.on
                  ? 'bg-brand-light text-brand-dark border-brand-green/20'
                  : 'bg-brand-near-black/6 text-brand-near-black/55 border-brand-near-black/10'
              }`}
            >
              {r.on ? 'On' : 'Off'}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-brand-near-black/8">
          <span className="text-brand-near-black/60">Minimum score</span>
          <span className="text-brand-near-black font-semibold">
            {prefs?.minScoreThreshold ?? 70}
          </span>
        </div>
        {prefs?.excludedKeywords && prefs.excludedKeywords.length > 0 && (
          <div className="pt-2 border-t border-brand-near-black/8">
            <div className="text-xs uppercase tracking-wider text-brand-near-black/55 mb-2">
              Excluded keywords
            </div>
            <ul className="flex flex-wrap gap-2">
              {prefs.excludedKeywords.map(k => (
                <li
                  key={k}
                  className="rounded-full bg-brand-near-black/6 border border-brand-near-black/10 px-2.5 py-1 text-[11px] text-brand-near-black/70"
                >
                  {k}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
