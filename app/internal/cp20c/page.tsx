import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowUpRight,
  Database,
  FileText,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import {
  CP20C_DB_WRITES_DURING_READ,
  CP20C_PROOF_ROUTE,
  CP20C_PROVIDER_CALLS_DURING_READ,
  getLeadFunnelReadModelFromStorage,
  type LeadFunnelLane,
  type LeadFunnelLineageRun,
  type LeadFunnelViewItem,
} from '@/lib/read-model/lead-funnel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEnabled(): boolean {
  return process.env.CP20C_PROOF_ENABLED === '1'
}

function adminIds(): string[] {
  return (process.env.FETCHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function formatDate(value: string): string {
  if (value === 'undated') return 'Undated'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function moneyFromCents(value: number): string {
  return `$${(value / 100).toFixed(2)}`
}

function ProofRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-t border-text/10 py-3 first:border-t-0 md:grid-cols-[180px_1fr] md:gap-5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
        {label}
      </dt>
      <dd className="min-w-0 text-[14px] font-semibold leading-relaxed text-text">
        {value}
      </dd>
    </div>
  )
}

function Header({
  itemCount,
  partialLaneCount,
}: {
  itemCount: number
  partialLaneCount: number
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-text/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-text/10 bg-white px-3 py-1.5 text-[12px] font-bold text-text/65">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Internal admin proof - {CP20C_PROOF_ROUTE}
        </div>
        <h1 className="font-outfit text-[38px] font-bold leading-tight text-text md:text-[52px]">
          CP20C Lead Funnel Read Model
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-text/65">
          Storage-only normalized Lead Funnel readback. The route reads persisted
          rows and does not run CP20A, CP20B, providers, seed scripts, or writes.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-text/10 bg-white px-4 py-3 text-[13px] text-text/70">
          <div className="font-bold text-text">Read source</div>
          <div className="mt-1 uppercase tracking-[0.08em] text-blue">
            DB storage
          </div>
        </div>
        <div className="rounded-lg border border-text/10 bg-white px-4 py-3 text-[13px] text-text/70">
          <div className="font-bold text-text">Items / empty lanes</div>
          <div className="mt-1 uppercase tracking-[0.08em] text-text">
            {itemCount} / {partialLaneCount}
          </div>
        </div>
      </div>
    </header>
  )
}

function LineageRunList({ runs }: { runs: LeadFunnelLineageRun[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-text/62">
        No persisted runtime lineage rows were found.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div key={run.providerRunId} className="rounded-lg border border-text/10 bg-bg px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-text/45">
                {run.provider} / {run.runRole}
              </div>
              <div className="mt-1 text-[14px] font-bold text-text">
                {run.status.toUpperCase()}
              </div>
            </div>
            <div className="text-right text-[12px] font-bold text-text/55">
              {moneyFromCents(run.estimatedCostCents)}
            </div>
          </div>
          <code className="mt-2 block break-all text-[12px] text-text">
            {run.providerRunId}
          </code>
          {run.sourceUrl ? (
            <a
              className="mt-2 inline-flex max-w-full items-center gap-1 text-[12px] font-semibold text-blue hover:underline"
              href={run.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">{run.sourceUrl}</span>
              <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ScoreReasons({ item }: { item: LeadFunnelViewItem }) {
  const reasons = item.view.score.reasons

  if (reasons.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-text/62">
        No persisted score reasons were found for this lane item.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {reasons.map((reason) => (
        <div
          key={`${item.view.id}-${reason.subscore}-${reason.evidenceId}`}
          className="rounded-lg border border-text/10 bg-bg px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
                {reason.subscore.replace(/_/g, ' ')}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text/70">
                {reason.reason}
              </p>
            </div>
            <div className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-text/55">
              {reason.points}
            </div>
          </div>
          <code className="mt-2 block break-all text-[12px] text-text/70">
            evidence: {reason.evidenceId}
          </code>
        </div>
      ))}
    </div>
  )
}

function ContactRoutes({ item }: { item: LeadFunnelViewItem }) {
  if (item.view.contactRoutes.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-text/62">
        No persisted contact route rows were found for this item.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {item.view.contactRoutes.map((route) => (
        <div key={route.id} className="rounded-lg border border-text/10 bg-bg px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-text/45">
                {route.routeType}
              </div>
              <div className="mt-1 text-[14px] font-bold text-text">
                {route.contactName ?? 'Unknown contact'}
              </div>
              <p className="mt-1 text-[13px] text-text/62">
                {[route.contactTitle, route.contactEmail, route.contactPhone]
                  .filter(Boolean)
                  .join(' - ') || 'No persisted contact detail'}
              </p>
            </div>
            <div className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-text/55">
              {route.verified ? 'Verified' : 'Review'} / {route.confidence}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoreBadge({ item }: { item: LeadFunnelViewItem }) {
  const score = item.view.score

  return (
    <div className={`rounded-lg bg-blue/10 px-4 py-3 text-right ${item.view.theme.score}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em]">
        {score.trusted ? 'Score' : 'Score review'}
      </div>
      <div className={`mt-1 font-outfit font-bold leading-none ${score.trusted ? 'text-[34px]' : 'text-[20px]'}`}>
        {score.trusted ? score.total : 'Review'}
      </div>
    </div>
  )
}

function LeadCard({ item }: { item: LeadFunnelViewItem }) {
  const firstEvidence = item.view.evidence[0] ?? null

  return (
    <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
            {item.view.leadKind.replace(/_/g, ' ')} / {item.view.state.replace(/_/g, ' ')}
          </div>
          <h3 className="mt-2 font-outfit text-[26px] font-bold leading-tight text-text">
            {item.view.businessName}
          </h3>
          <p className="mt-1 text-[13px] font-semibold text-text/62">
            {[item.view.city, item.view.stateCode].filter(Boolean).join(', ') || item.view.market}
          </p>
        </div>
        <ScoreBadge item={item} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.kind === 'opportunity' ? (
          <>
            <span className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${item.view.theme.signalChip}`}>
              {item.view.urgency.signalLabel ?? 'Signal'}
            </span>
            {item.view.urgency.signalDate ? (
              <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
                {formatDate(item.view.urgency.signalDate)}
              </span>
            ) : null}
          </>
        ) : (
          <span className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${item.view.theme.chip}`}>
            {item.view.noSignalLine}
          </span>
        )}
        {item.view.verticalFitLabel ? (
          <span className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${item.view.theme.chip}`}>
            {item.view.verticalFitLabel}
          </span>
        ) : null}
      </div>

      <dl className="mt-5">
        {item.kind === 'opportunity' ? (
          <ProofRow label="Why now" value={item.view.urgency.whyNow ?? 'No why-now stored.'} />
        ) : null}
        <ProofRow
          label="Action"
          value={
            <div>
              <div className="font-bold">{item.view.recommendedAction.label}</div>
              <p className="mt-1 text-[13px] font-medium text-text/62">
                {item.view.recommendedAction.detail}
              </p>
            </div>
          }
        />
        <ProofRow
          label="Lifecycle"
          value={
            <div className="space-y-1">
              <div>State: {item.view.lifecycle.state.replace(/_/g, ' ')}</div>
              <div>Status: {item.view.lifecycle.opportunityStatus ?? 'No opportunity status'}</div>
              <div>Today run: {item.view.lifecycle.todayRunStatus ?? 'No persisted today-run row'}</div>
            </div>
          }
        />
      </dl>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-text/10 bg-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue" aria-hidden="true" />
            <h4 className="text-[14px] font-bold text-text">Evidence</h4>
          </div>
          {firstEvidence ? (
            <dl>
              <ProofRow label="Source title" value={firstEvidence.sourceTitle ?? 'Untitled source'} />
              <ProofRow
                label="Source URL"
                value={
                  <a
                    className="inline-flex max-w-full items-center gap-1 text-blue hover:underline"
                    href={firstEvidence.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="truncate">{firstEvidence.sourceUrl}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  </a>
                }
              />
              <ProofRow label="Source date" value={formatDate(firstEvidence.sourceDate)} />
              <ProofRow label="Summary" value={firstEvidence.evidenceSummary} />
            </dl>
          ) : (
            <p className="text-[13px] leading-relaxed text-text/62">
              No persisted evidence source row was found.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-text/10 bg-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue" aria-hidden="true" />
            <h4 className="text-[14px] font-bold text-text">Score Reasons</h4>
          </div>
          <ScoreReasons item={item} />
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-text/10 bg-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-blue" aria-hidden="true" />
            <h4 className="text-[14px] font-bold text-text">Lineage</h4>
          </div>
          <dl>
            <ProofRow
              label="Search run"
              value={
                item.view.lineage.searchProviderRunId ? (
                  <code className="break-all text-[12px]">{item.view.lineage.searchProviderRunId}</code>
                ) : (
                  'No search run ID on this view'
                )
              }
            />
            <ProofRow
              label="Evidence run"
              value={
                item.view.lineage.evidenceProviderRunId ? (
                  <code className="break-all text-[12px]">{item.view.lineage.evidenceProviderRunId}</code>
                ) : (
                  'No evidence run ID on this view'
                )
              }
            />
            <ProofRow
              label="Source URLs"
              value={
                item.view.lineage.sourceUrls.length > 0 ? (
                  <div className="space-y-1">
                    {item.view.lineage.sourceUrls.map((url) => (
                      <a
                        key={url}
                        className="block break-all text-[12px] text-blue hover:underline"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                ) : (
                  'No persisted source URL lineage'
                )
              }
            />
          </dl>
          <div className="mt-4">
            <LineageRunList runs={item.view.lineage.runtimeLineageRuns} />
          </div>
        </section>

        <section className="rounded-lg border border-text/10 bg-bg p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-blue" aria-hidden="true" />
            <h4 className="text-[14px] font-bold text-text">Contact / Outreach</h4>
          </div>
          <ContactRoutes item={item} />
          <div className="mt-4 text-[13px] leading-relaxed text-text/62">
            Persisted outreach drafts: {item.view.outreachPlays.length}
          </div>
        </section>
      </div>
    </article>
  )
}

function LaneSection({ lane }: { lane: LeadFunnelLane }) {
  return (
    <section className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-outfit text-[26px] font-bold text-text">
            {lane.title}
          </h2>
          <p className={`mt-1 text-[13px] font-semibold ${lane.theme.line}`}>
            {lane.items.length} persisted item{lane.items.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {lane.items.length > 0 ? (
        <div className="space-y-5">
          {lane.items.map((item) => (
            <LeadCard key={`${item.kind}-${item.view.proofId}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-text/15 bg-bg px-4 py-5 text-[14px] font-semibold text-text/62">
          {lane.emptyState}
        </div>
      )}
    </section>
  )
}

export default async function Cp20cInternalProofPage() {
  if (!isEnabled()) notFound()

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!adminIds().includes(userId)) notFound()

  const funnel = await getLeadFunnelReadModelFromStorage()

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Header itemCount={funnel.itemCount} partialLaneCount={funnel.partialLaneIds.length} />

        <section className="grid gap-4 rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:grid-cols-4 md:p-6">
          <ProofRow label="Provider calls in read" value={String(CP20C_PROVIDER_CALLS_DURING_READ)} />
          <ProofRow label="DB writes in read" value={String(CP20C_DB_WRITES_DURING_READ)} />
          <ProofRow label="Storage source" value={funnel.source} />
          <ProofRow
            label="Latest scout run"
            value={funnel.latestScoutRun ? funnel.latestScoutRun.status : 'No persisted scout run row'}
          />
        </section>

        <div className="space-y-6">
          {funnel.lanes.map((lane) => (
            <LaneSection key={lane.id} lane={lane} />
          ))}
        </div>
      </div>
    </main>
  )
}
