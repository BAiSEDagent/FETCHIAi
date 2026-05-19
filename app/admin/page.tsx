import { count, eq, gte, sql, sum } from 'drizzle-orm'
import {
  db,
  workspaceSettings,
  workspaceSubscriptions,
  opportunities,
  pricingTiers,
  agentRegistry,
} from '@/db'

export const dynamic = 'force-dynamic'

async function loadDashboard() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [
    [{ value: totalWorkspaces }],
    [{ value: activeCount }],
    [{ value: trialingCount }],
    [{ value: pastDueCount }],
    [{ value: canceledCount }],
    [{ value: leadsToday }],
    mrrRow,
    recentSignups,
    tierRows,
    agentRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(workspaceSettings),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, 'active')),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, 'trialing')),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, 'past_due')),
    db
      .select({ value: count() })
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, 'canceled')),
    db
      .select({ value: count() })
      .from(opportunities)
      .where(gte(opportunities.createdAt, since24h)),
    db
      .select({
        cents: sum(
          sql<number>`CASE WHEN ${workspaceSubscriptions.billingInterval} = 'annual'
                       THEN COALESCE(${pricingTiers.annualPriceCents}, 0) / 12
                       ELSE COALESCE(${pricingTiers.monthlyPriceCents}, 0) END`,
        ),
      })
      .from(workspaceSubscriptions)
      .leftJoin(pricingTiers, eq(pricingTiers.slug, workspaceSubscriptions.tier))
      .where(eq(workspaceSubscriptions.status, 'active')),
    db
      .select({
        workspaceId: workspaceSettings.workspaceId,
        businessName: workspaceSettings.businessName,
        signupMethod: workspaceSettings.signupMethod,
        createdAt: workspaceSettings.createdAt,
        tier: workspaceSubscriptions.tier,
        status: workspaceSubscriptions.status,
      })
      .from(workspaceSettings)
      .leftJoin(
        workspaceSubscriptions,
        eq(workspaceSubscriptions.workspaceId, workspaceSettings.workspaceId),
      )
      .orderBy(sql`${workspaceSettings.createdAt} DESC`)
      .limit(8),
    db
      .select({ tier: workspaceSubscriptions.tier, value: count() })
      .from(workspaceSubscriptions)
      .groupBy(workspaceSubscriptions.tier),
    db.select().from(agentRegistry),
  ])

  const mrrCents = Number(mrrRow[0]?.cents ?? 0)
  return {
    totalWorkspaces,
    activeCount,
    trialingCount,
    pastDueCount,
    canceledCount,
    leadsToday,
    mrrCents,
    recentSignups,
    tierRows,
    agentRows,
  }
}

function tierColor(tier: string | null | undefined): string {
  switch (tier) {
    case 'starter': return 'bg-[#E3F2FD] text-[#1565C0]'
    case 'growth':  return 'bg-[#E8F5E9] text-[#2E7D32]'
    case 'pro':     return 'bg-[#EDE7F6] text-[#5E35B1]'
    case 'scale':   return 'bg-[#FFE0B2] text-[#8B5E1A]'
    default:        return 'bg-[#EFEBE9] text-[#6D4C41]'
  }
}

export default async function AdminDashboardPage() {
  const d = await loadDashboard()
  const enabledAgents = d.agentRows.filter(a => a.isActive).length
  const mrrDollars = (d.mrrCents / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  })

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-outfit text-[22px] font-semibold">Dashboard</h1>
        <span className="text-[11px] text-brand-near-black/45">CP3 — Foundation visible. Live agent metrics land in CP6/CP8.</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Workspaces" value={String(d.totalWorkspaces)} />
        <MetricCard label="Active subs" value={String(d.activeCount)} />
        <MetricCard label="Trialing" value={String(d.trialingCount)} accent="warning" />
        <MetricCard label="MRR (est)" value={mrrDollars} hint="Computed from pricing_tiers × active subs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-7">
        <MetricCard label="Leads (last 24h)" value={String(d.leadsToday)} />
        <MetricCard label="Past due" value={String(d.pastDueCount)} accent={d.pastDueCount > 0 ? 'danger' : 'default'} />
        <MetricCard label="Canceled" value={String(d.canceledCount)} accent={d.canceledCount > 0 ? 'danger' : 'default'} />
      </div>

      <section className="bg-white border border-brand-near-black/10 rounded-[10px] p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-outfit font-semibold text-[15px]">Tier distribution</h2>
          <span className="text-[11px] text-brand-near-black/45">{d.totalWorkspaces} workspaces</span>
        </div>
        {d.tierRows.length === 0 ? (
          <div className="text-[12px] text-brand-near-black/50">No subscriptions yet.</div>
        ) : (
          <div className="flex gap-1 h-7 rounded-md overflow-hidden">
            {d.tierRows.map(row => (
              <div
                key={row.tier ?? 'none'}
                className={`flex items-center justify-center text-[11px] font-medium ${tierColor(row.tier)}`}
                style={{ flex: Math.max(row.value, 1) }}
                title={`${row.tier ?? 'none'} (${row.value})`}
              >
                {row.tier ?? 'none'} ({row.value})
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-brand-near-black/10 rounded-[10px] p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-outfit font-semibold text-[15px]">System health</h2>
          <span className="text-[11px] text-brand-near-black/45">{enabledAgents}/{d.agentRows.length} agents enabled</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {d.agentRows.length === 0 ? (
            <div className="text-[12px] text-brand-near-black/50">No agents seeded yet.</div>
          ) : (
            d.agentRows.map(a => (
              <div key={a.slug} className="flex items-center gap-2 text-[12px]">
                <span className={`inline-block w-2 h-2 rounded-full ${a.isActive ? 'bg-[#4CAF50]' : 'bg-brand-near-black/25'}`} />
                <span className="font-medium">{a.name}</span>
                <span className="text-brand-near-black/45 ml-auto">{a.provider}/{a.model}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="bg-white border border-brand-near-black/10 rounded-[10px] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-outfit font-semibold text-[15px]">Recent signups</h2>
        </div>
        {d.recentSignups.length === 0 ? (
          <div className="text-[12px] text-brand-near-black/50">No workspaces yet.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] text-brand-near-black/55 border-b border-brand-near-black/10">
                <th className="py-2 pr-3 font-normal">Workspace</th>
                <th className="py-2 pr-3 font-normal">Plan</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 pr-3 font-normal">Signup</th>
                <th className="py-2 pr-3 font-normal text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {d.recentSignups.map(r => (
                <tr key={r.workspaceId} className="border-b border-brand-near-black/5">
                  <td className="py-2 pr-3 font-medium">
                    {r.businessName ?? <span className="text-brand-near-black/45">— unnamed —</span>}
                    <div className="text-[11px] text-brand-near-black/40 font-mono">{r.workspaceId.slice(0, 14)}…</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${tierColor(r.tier)}`}>
                      {r.tier ?? 'none'}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-brand-near-black/65">{r.status ?? '—'}</td>
                  <td className="py-2 pr-3 text-brand-near-black/65">{r.signupMethod ?? '—'}</td>
                  <td className="py-2 pr-3 text-right text-brand-near-black/55 text-[12px]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  label, value, hint, accent = 'default',
}: { label: string; value: string; hint?: string; accent?: 'default' | 'warning' | 'danger' }) {
  const accentClass =
    accent === 'warning' ? 'text-[#8B5E1A]' :
    accent === 'danger'  ? 'text-[#C62828]' :
                           'text-brand-near-black'
  return (
    <div className="bg-white border border-brand-near-black/10 rounded-[10px] p-4">
      <div className="text-[11px] text-brand-near-black/55 mb-1">{label}</div>
      <div className={`font-outfit font-semibold text-[24px] leading-none ${accentClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-brand-near-black/45 mt-1.5">{hint}</div>}
    </div>
  )
}
