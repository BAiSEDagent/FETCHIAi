import Link from 'next/link'
import { and, eq, desc } from 'drizzle-orm'
import { db, opportunities } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { formatDistanceToNow } from 'date-fns'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-brand-light text-brand-dark',
  saved: 'bg-brand-light text-brand-dark',
  contacted: 'bg-[#EEF2FF] text-[#3730A3]',
  responded: 'bg-[#FEF3E7] text-[#854F0B]',
  won: 'bg-[#F0FDF4] text-[#166534]',
  lost: 'bg-brand-near-black/10 text-brand-near-black/60',
  skipped: 'bg-brand-near-black/10 text-brand-near-black/60',
  expired: 'bg-brand-near-black/10 text-brand-near-black/60',
}

function scoreColor(score: number) {
  if (score >= 85) return 'bg-brand-light text-brand-dark border-brand-green/30'
  if (score >= 70) return 'bg-[#FEF3E7] text-[#854F0B] border-[#854F0B]/15'
  return 'bg-brand-near-black/5 text-brand-near-black/60 border-brand-near-black/10'
}

function signalLabel(type: string | null | undefined): string {
  switch (type) {
    case 'storm_damage': return 'Storm damage'
    case 'building_permit': return 'Building permit'
    case 'new_business_listing': return 'New listing'
    case 'job_posting': return 'Job posting'
    case 'event': return 'Event'
    default: return 'Signal'
  }
}

export default async function LeadsPage() {
  const ctx = await requireWorkspaceContext()

  const rows = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.workspaceId, ctx.workspaceId))
    .orderBy(desc(opportunities.score), desc(opportunities.createdAt))

  const enriched = await Promise.all(
    rows.map(async opp => {
      const [prospect, signal] = await Promise.all([
        opp.prospectId
          ? db.query.prospects.findFirst({
              where: (t, { eq: e, and: a }) =>
                a(e(t.id, opp.prospectId!), e(t.workspaceId, ctx.workspaceId)),
            })
          : Promise.resolve(null),
        opp.signalId
          ? db.query.signals.findFirst({
              where: (t, { eq: e, and: a }) =>
                a(e(t.id, opp.signalId!), e(t.workspaceId, ctx.workspaceId)),
            })
          : Promise.resolve(null),
      ])
      return { opp, prospect, signal }
    }),
  )

  return (
    <div className="flex flex-col">
      <div className="px-5 lg:px-7 py-5 lg:py-6 border-b border-brand-near-black/8 bg-white">
        <h1 className="font-outfit text-2xl lg:text-[28px] text-brand-near-black">My Leads</h1>
        <p className="text-[13px] text-brand-near-black/55 mt-0.5">
          Every signal Fetchi surfaced for {ctx.workspace.businessName ?? 'your workspace'}.
        </p>
      </div>

      <div className="px-4 lg:px-7 py-4 lg:py-5 flex flex-col gap-2.5">
        {enriched.length === 0 && (
          <div className="bg-white border border-brand-near-black/10 rounded-2xl p-10 text-center">
            <div className="text-brand-near-black/65 text-sm">
              No leads yet — ツ will fill this up as scouting runs.
            </div>
          </div>
        )}
        {enriched.map(({ opp, prospect, signal }) => (
          <Link
            key={opp.id}
            href={`/app/leads/${opp.id}`}
            className="bg-white border border-brand-near-black/10 rounded-xl p-4 lg:p-[18px] flex items-center gap-3 lg:gap-4 hover:border-brand-green transition-colors min-h-[72px]"
          >
            <div className="w-10 h-10 rounded-lg border border-brand-near-black/10 flex items-center justify-center bg-brand-light text-base flex-shrink-0">
              {signal?.signalType === 'storm_damage' ? '⛈️' : signal?.signalType === 'building_permit' ? '🏗️' : signal?.signalType === 'new_business_listing' ? '📍' : '✦'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-brand-near-black truncate">
                {prospect?.businessName ?? 'Unknown business'}
              </div>
              <div className="text-[12px] text-brand-near-black/55 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                {signalLabel(signal?.signalType)}
                {prospect?.city ? ` · ${prospect.city}, ${prospect.state}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              <span
                className={`hidden sm:inline-flex text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                  STATUS_STYLES[opp.status] ?? STATUS_STYLES.new
                }`}
              >
                {opp.status}
              </span>
              <span className="hidden md:inline text-[11px] text-brand-near-black/40">
                {formatDistanceToNow(new Date(opp.createdAt), { addSuffix: true })}
              </span>
              <span
                className={`text-[12px] font-bold rounded-full px-2.5 py-1 border ${scoreColor(
                  opp.score,
                )}`}
              >
                {opp.score}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
