import { and, eq, desc, inArray } from 'drizzle-orm'
import { formatDistanceToNow } from 'date-fns'
import { db, opportunities, prospects, signals } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { LeadCard } from '@/components/app/LeadCard'
import { EmptyState } from '@/components/app/EmptyState'

export const dynamic = 'force-dynamic'

const SIGNAL_LABELS: Record<string, string> = {
  storm_damage: 'Storm damage',
  weather_hail: 'Hail event',
  weather_wind: 'High-wind event',
  building_permit: 'Building permit',
  new_business_listing: 'New listing',
  job_posting: 'Job posting',
  event: 'Local event',
  funding: 'Funding announcement',
  news: 'News mention',
  review: 'Review activity',
  social: 'Social signal',
  expansion: 'Expansion',
  ownership_change: 'Ownership change',
  other: 'Signal detected',
}

export default async function LeadsPage() {
  const ctx = await requireWorkspaceContext()

  const rows = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.workspaceId, ctx.workspaceId))
    .orderBy(desc(opportunities.score), desc(opportunities.createdAt))

  // Two batched workspace-scoped lookups instead of N+1. The explicit
  // workspaceId predicate is kept so any future FK drift can't leak a row
  // from another tenant through this query.
  const prospectIds = Array.from(
    new Set(rows.map(r => r.prospectId).filter((v): v is string => Boolean(v))),
  )
  const signalIds = Array.from(
    new Set(rows.map(r => r.signalId).filter((v): v is string => Boolean(v))),
  )
  const [prospectRows, signalRows] = await Promise.all([
    prospectIds.length > 0
      ? db
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.workspaceId, ctx.workspaceId),
              inArray(prospects.id, prospectIds),
            ),
          )
      : Promise.resolve([] as Array<typeof prospects.$inferSelect>),
    signalIds.length > 0
      ? db
          .select()
          .from(signals)
          .where(
            and(
              eq(signals.workspaceId, ctx.workspaceId),
              inArray(signals.id, signalIds),
            ),
          )
      : Promise.resolve([] as Array<typeof signals.$inferSelect>),
  ])
  const prospectById = new Map(prospectRows.map(p => [p.id, p]))
  const signalById = new Map(signalRows.map(s => [s.id, s]))

  return (
    <div className="flex flex-col">
      <MobileScreenHeader
        title="My Leads"
        description={`Every signal Fetchi surfaced for ${
          ctx.workspace.businessName ?? 'your workspace'
        }.`}
      />

      <div className="px-4 lg:px-7 pb-8 flex flex-col gap-3">
        {rows.length === 0 && (
          <EmptyState
            icon="✦"
            title="No leads yet"
            body="ツ is still listening for the first signal in your area. New leads land here automatically as scouting runs."
          />
        )}

        {rows.map(opp => {
          const prospect = opp.prospectId ? prospectById.get(opp.prospectId) ?? null : null
          const signal = opp.signalId ? signalById.get(opp.signalId) ?? null : null
          return (
            <LeadCard
              key={opp.id}
              href={`/app/leads/${opp.id}`}
              businessName={prospect?.businessName ?? 'Unknown business'}
              signalLabel={SIGNAL_LABELS[signal?.signalType ?? ''] ?? 'Signal'}
              signalType={signal?.signalType}
              score={opp.score}
              whyNow={opp.whyNow ?? signal?.whyRelevant ?? null}
              status={opp.status}
              location={
                prospect?.city ? `${prospect.city}, ${prospect.state}` : null
              }
              ageLabel={formatDistanceToNow(new Date(opp.createdAt), {
                addSuffix: true,
              })}
              variant="list"
            />
          )
        })}
      </div>
    </div>
  )
}
