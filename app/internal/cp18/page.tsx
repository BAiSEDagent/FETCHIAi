import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { ArrowUpRight, FileText, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  CP18_PROOF_ROUTE,
  getCp18ProofOpportunity,
} from '@/lib/runtime/cp18-commercial-cleaning'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEnabled(): boolean {
  return process.env.CP18_PROOF_ENABLED === '1'
}

function adminIds(): string[] {
  return (process.env.FETCHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function ProofRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-t border-text/10 py-3 first:border-t-0 md:grid-cols-[190px_1fr] md:gap-5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
        {label}
      </dt>
      <dd className="min-w-0 text-[14px] font-semibold leading-relaxed text-text">
        {value}
      </dd>
    </div>
  )
}

function GateList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-text/10 bg-white p-4 shadow-[0_8px_24px_rgba(10,10,10,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue" aria-hidden="true" />
        <h2 className="text-[14px] font-bold text-text">{title}</h2>
      </div>
      <ul className="space-y-2 text-[13px] leading-relaxed text-text/68">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export default async function Cp18InternalProofPage() {
  if (!isEnabled()) notFound()

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!adminIds().includes(userId)) notFound()

  const opportunity = await getCp18ProofOpportunity()

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-text/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-text/10 bg-white px-3 py-1.5 text-[12px] font-bold text-text/65">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Internal admin proof · {CP18_PROOF_ROUTE}
            </div>
            <h1 className="font-outfit text-[38px] font-bold leading-tight text-text md:text-[52px]">
              CP18 Commercial Cleaning Opportunity
            </h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-text/65">
              One DFW building permit signal rendered from a {opportunity.providerMode}
              {' '}provider path, isolated from customer demo and seed surfaces.
            </p>
          </div>
          <div className="rounded-lg border border-text/10 bg-white px-4 py-3 text-[13px] text-text/70">
            <div className="font-bold text-text">Provider mode</div>
            <div className="mt-1 uppercase tracking-[0.08em] text-blue">
              {opportunity.providerMode}
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-text/45">
                  Prospect
                </div>
                <h2 className="mt-2 font-outfit text-[32px] font-bold leading-tight text-text">
                  {opportunity.prospect.businessName}
                </h2>
                <p className="mt-2 text-[15px] font-semibold text-text/70">
                  {opportunity.prospect.location}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-text/55">
                  {opportunity.prospect.address}
                </p>
              </div>

              <div className="rounded-lg bg-blue/10 px-4 py-3 text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue">
                  Score
                </div>
                <div className="font-outfit text-[46px] font-bold leading-none text-text">
                  {opportunity.score.value}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
                {opportunity.evidence.signalLabel}
              </span>
              <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
                {opportunity.evidence.verticalFitLabel}
              </span>
              <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
                Signal id: {opportunity.evidence.signalId}
              </span>
            </div>

            <dl className="mt-7">
              <ProofRow label="Why now" value={opportunity.score.whyNow} />
              <ProofRow label="Score reason" value={opportunity.score.reason} />
              <ProofRow
                label="Next action"
                value={
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-text px-4 text-[13px] font-bold text-bg transition-colors hover:bg-text/85"
                  >
                    {opportunity.nextAction.label}
                  </button>
                }
              />
              <ProofRow label="Action detail" value={opportunity.nextAction.detail} />
            </dl>
          </article>

          <aside className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue" aria-hidden="true" />
              <h2 className="font-outfit text-[24px] font-bold text-text">Evidence</h2>
            </div>
            <dl>
              <ProofRow label="Source title" value={opportunity.evidence.sourceTitle} />
              <ProofRow
                label="Source URL"
                value={
                  <a
                    className="inline-flex max-w-full items-center gap-1 text-blue hover:underline"
                    href={opportunity.evidence.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="truncate">{opportunity.evidence.sourceUrl}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  </a>
                }
              />
              <ProofRow label="Source date" value={formatDate(opportunity.evidence.sourceDate)} />
              <ProofRow label="Source excerpt" value={opportunity.evidence.sourceExcerpt} />
            </dl>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
            <h2 className="font-outfit text-[24px] font-bold text-text">Provider Lineage</h2>
            <dl className="mt-5">
              <ProofRow label="SearchProvider" value={opportunity.lineage.searchProvider} />
              <ProofRow
                label="Search run ID"
                value={<code className="break-all text-[13px]">{opportunity.lineage.searchProviderRunId}</code>}
              />
              <ProofRow label="EvidenceProvider" value={opportunity.lineage.evidenceProvider} />
              <ProofRow
                label="Evidence run ID"
                value={<code className="break-all text-[13px]">{opportunity.lineage.evidenceProviderRunId}</code>}
              />
              <ProofRow
                label="Replay fingerprint"
                value={<code className="break-all text-[13px]">{opportunity.lineage.replayFingerprint}</code>}
              />
            </dl>
          </article>

          <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
            <h2 className="font-outfit text-[24px] font-bold text-text">Run Proof</h2>
            <dl className="mt-5">
              <ProofRow label="Captured" value={formatDateTime(opportunity.proof.capturedAt)} />
              <ProofRow label="Evaluated" value={formatDateTime(opportunity.proof.evaluatedAt)} />
              <ProofRow label="Market" value={opportunity.proof.market} />
              <ProofRow label="Search query" value={opportunity.proof.searchQuery} />
              <ProofRow label="Capture method" value={opportunity.proof.sourceCaptureMethod} />
              <ProofRow label="Estimated spend" value={money(opportunity.proof.estimatedCostUsd)} />
              <ProofRow label="Replay path" value={opportunity.proof.replayableStoragePath} />
              <ProofRow
                label="Color proof"
                value="The score uses neutral text on a blue-tinted block; coral is not derived from score."
              />
            </dl>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <GateList title="Evidence Gate" items={opportunity.proof.evidenceGateReasons} />
          <GateList title="Classification Gate" items={opportunity.proof.classificationGateReasons} />
          <GateList title="Scoring Gate" items={opportunity.proof.scoringGateReasons} />
          <GateList title="Claim Guard" items={opportunity.proof.claimGuardReasons} />
        </section>
      </div>
    </main>
  )
}
