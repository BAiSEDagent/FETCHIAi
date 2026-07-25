import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { cn } from '@/lib/utils'

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
    <div data-fetchi-signals-v5 className="max-w-3xl">
      <MobileScreenHeader title="Signal sensitivity" backHref="/app/settings" backLabel="Settings · How Fetchi works for you" description="Current signal settings for this workspace. Editing is not available on this screen." />
      <div className="px-4 lg:px-7 pb-10 space-y-6">
        <div data-fetchi-signal-settings-readonly-v5 className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-dashed border-text/15 bg-fetchiOverlay px-3 text-[12px] text-text/60">
          <span className="font-medium text-text/75">Current workspace settings</span>
          <span className="rounded-full border border-text/10 px-2 py-0.5 font-semibold uppercase tracking-[0.08em] text-text/50">Read-only</span>
        </div>
        <div data-fetchi-signal-settings-list-v5 aria-label="Current signal sensitivity" className="flex flex-col gap-3">
          {SENSITIVITIES.map(s => {
            const selected = s.id === active
            return (
              <div
                key={s.id}
                data-fetchi-sensitivity-state-v5
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'flex min-h-[88px] items-start gap-3.5 rounded-xl border border-[var(--fetchi-border-subtle)] bg-[var(--fetchi-surface)] p-4 text-left text-text',
                  selected && 'fetchi-selected-row',
                )}
              >
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[16px] font-semibold">{s.label}</span>{selected && <span className="inline-flex min-h-[22px] items-center rounded-full border border-[var(--fetchi-accent-border)] bg-[var(--fetchi-accent-tint)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fetchiAccent">Current</span>}{s.recommended && <span className="inline-flex min-h-[22px] items-center rounded-full border border-text/10 bg-fetchiOverlay px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text/60">Recommended</span>}</div><p className="mt-1 text-[13px] leading-[1.45] text-text/60">{s.desc}</p></div>
                <span className="inline-flex min-h-[26px] flex-shrink-0 items-center rounded-full border border-text/10 bg-fetchiOverlay px-3 py-1 text-[12px] font-semibold tabular-nums text-text/70">{s.volume}</span>
              </div>
            )
          })}
          <p className="text-[12px] text-text/45 px-1 leading-relaxed">Live tuning of these thresholds ships with the signal-detection agent.</p>
        </div>
        <div><div className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text/45">Which signals to watch</div><div className="overflow-hidden rounded-xl border border-[var(--fetchi-border-subtle)] bg-[var(--fetchi-surface)]">{signals.map((s, i) => <div key={s.key} className={`flex min-h-[64px] items-center gap-3 px-4 py-3 lg:px-5 ${i < signals.length - 1 ? 'border-b border-text/10' : ''}`}><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold leading-tight text-text">{s.label}</div><div className="mt-0.5 text-[12.5px] text-text/55">{s.hint}</div></div><StatePreview label={s.label} on={s.on} /></div>)}</div></div>
      </div>
    </div>
  )
}

function StatePreview({ label, on }: { label: string; on: boolean }) {
  return <span data-fetchi-settings-state-v5 className="inline-flex min-h-[26px] flex-shrink-0 items-center gap-1.5 rounded-full border border-text/10 bg-fetchiOverlay px-2.5 text-[11px] font-semibold text-text/60" aria-label={`${label}: ${on ? 'on' : 'off'}`}><span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-fetchiAccent' : 'bg-text/25')} aria-hidden />{on ? 'On' : 'Off'}</span>
}
