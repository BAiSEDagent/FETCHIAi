import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'

export const dynamic = 'force-dynamic'

type SensitivityId = 'conservative' | 'balanced' | 'aggressive'

const SENSITIVITIES: { id: SensitivityId; label: string; desc: string; volume: string; recommended?: boolean }[] = [
  { id: 'conservative', label: 'Conservative', desc: 'Fewer leads, all very strong signals.', volume: '~12/wk' },
  { id: 'balanced', label: 'Balanced', desc: 'Recommended — good mix of strength and volume.', volume: '~22/wk', recommended: true },
  { id: 'aggressive', label: 'Aggressive', desc: 'More leads, weaker signals still surface.', volume: '~38/wk' },
]

export default async function SignalSensitivityPage() {
  const ctx = await requireWorkspaceContext()
  const prefs = await db.query.signalPreferences.findFirst({ where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId) })
  const threshold = prefs?.minScoreThreshold ?? 70
  const active: SensitivityId = threshold >= 85 ? 'conservative' : threshold <= 60 ? 'aggressive' : 'balanced'
  const signals = [
    { key: 'storm', label: 'Storm damage', hint: 'Hail ≥ 1.0" in last 14 days', on: prefs?.stormEnabled ?? true },
    { key: 'permits', label: 'New permits', hint: 'Roof or HVAC permits', on: prefs?.permitsEnabled ?? true },
    { key: 'listings', label: 'New business filings', hint: 'LLCs in your area', on: prefs?.newListingsEnabled ?? true },
    { key: 'jobs', label: 'Hiring posts', hint: 'Growth-stage hiring signals', on: prefs?.jobPostingsEnabled ?? false },
    { key: 'events', label: 'Local events', hint: 'Civic events and local happenings', on: prefs?.eventsEnabled ?? false },
  ]

  return (
    <div className="max-w-3xl">
      <MobileScreenHeader title="Signal sensitivity" backHref="/app/settings" backLabel="Settings · How Fetchi works for you" description="How aggressive should Fetchi be when picking your leads? You can always change this later." />
      <div className="px-4 lg:px-7 pb-10 space-y-6">
        <div className="flex flex-col gap-3">
          {SENSITIVITIES.map(s => {
            const selected = s.id === active
            return (
              <div key={s.id} aria-pressed={selected} role="button" tabIndex={-1} className={`text-left rounded-2xl p-4 lg:p-5 transition-all min-h-[88px] flex items-start gap-3.5 ${selected ? 'bg-text text-bg shadow-fetchi-card' : 'bg-surface text-text shadow-fetchi-soft'}`}>
                <span className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0 ${selected ? 'border-ok' : 'border-text/20'}`} aria-hidden>{selected && <span className="w-3 h-3 rounded-full bg-ok" />}</span>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-[16px] font-bold">{s.label}</span>{s.recommended && <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] uppercase ${selected ? 'bg-ok/20 text-bg border border-ok/40' : 'bg-ok/15 text-ok border border-ok/30'}`}>Recommended</span>}</div><p className={`text-[13px] mt-1 leading-relaxed ${selected ? 'text-bg/70' : 'text-text/60'}`}>{s.desc}</p></div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold tabular-nums flex-shrink-0 ${selected ? 'bg-ok/20 text-bg' : 'bg-raised text-text/70 border border-text/10'}`}>{s.volume}</span>
              </div>
            )
          })}
          <p className="text-[12px] text-text/45 px-1 leading-relaxed">Live tuning of these thresholds ships with the signal-detection agent.</p>
        </div>
        <div><div className="text-[11px] font-bold uppercase tracking-[1.2px] text-text/45 px-1 mb-2.5">Which signals to watch</div><div className="rounded-2xl bg-surface shadow-fetchi-soft overflow-hidden">{signals.map((s, i) => <div key={s.key} className={`flex items-center gap-3 px-4 lg:px-5 py-3.5 min-h-[64px] ${i < signals.length - 1 ? 'border-b border-text/8' : ''}`}><div className="flex-1 min-w-0"><div className="text-[14.5px] font-bold text-text leading-tight">{s.label}</div><div className="text-[12.5px] text-text/55 mt-0.5">{s.hint}</div></div><TogglePreview on={s.on} /></div>)}</div></div>
      </div>
    </div>
  )
}

function TogglePreview({ on }: { on: boolean }) {
  return <span className={`relative inline-flex items-center w-12 h-7 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-ok' : 'bg-text/15'}`} aria-label={on ? 'On' : 'Off'} role="img"><span className={`absolute top-0.5 w-6 h-6 rounded-full bg-surface shadow-sm transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} /></span>
}
