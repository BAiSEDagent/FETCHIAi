import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import {
  CP19_PROOF_ROUTE,
  getCp19LiveProof,
  type Cp19ProviderCall,
  type Cp19ProofResult,
} from '@/lib/runtime/cp19-commercial-cleaning-live'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEnabled(): boolean {
  return process.env.CP19_PROOF_ENABLED === '1'
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

function ProviderCallList({ calls }: { calls: Cp19ProviderCall[] }) {
  if (calls.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-text/62">
        No provider calls were made.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {calls.map((call, index) => (
        <div
          key={`${call.provider}-${call.runId ?? index}`}
          className="rounded-lg border border-text/10 bg-bg px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-text/45">
                {call.provider}
              </div>
              <div className="mt-1 text-[14px] font-bold text-text">
                {call.status.toUpperCase()}
              </div>
            </div>
            <div className="text-right text-[12px] font-bold text-text/55">
              {money(call.estimatedCostUsd)}
            </div>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-text/64">
            {call.detail}
          </p>
          {call.runId ? (
            <code className="mt-2 block break-all text-[12px] text-text">
              {call.runId}
            </code>
          ) : null}
          {call.sourceUrl ? (
            <a
              className="mt-2 inline-flex max-w-full items-center gap-1 text-[12px] font-semibold text-blue hover:underline"
              href={call.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">{call.sourceUrl}</span>
              <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function Header({ proof }: { proof: Cp19ProofResult }) {
  const statusText =
    proof.status === 'ready' ? 'Live opportunity rendered' : 'Live proof blocked'

  return (
    <header className="flex flex-col gap-4 border-b border-text/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-text/10 bg-white px-3 py-1.5 text-[12px] font-bold text-text/65">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Internal admin proof - {CP19_PROOF_ROUTE}
        </div>
        <h1 className="font-outfit text-[38px] font-bold leading-tight text-text md:text-[52px]">
          CP19 Live Commercial Cleaning Proof
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-text/65">
          Live-only DFW building permit proof. There is no recorded-real fallback
          on this route.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-text/10 bg-white px-4 py-3 text-[13px] text-text/70">
          <div className="font-bold text-text">Provider mode</div>
          <div className="mt-1 uppercase tracking-[0.08em] text-blue">
            {proof.providerMode}
          </div>
        </div>
        <div className="rounded-lg border border-text/10 bg-white px-4 py-3 text-[13px] text-text/70">
          <div className="font-bold text-text">Status</div>
          <div className="mt-1 uppercase tracking-[0.08em] text-text">
            {statusText}
          </div>
        </div>
      </div>
    </header>
  )
}

function BlockedProof({ proof }: { proof: Extract<Cp19ProofResult, { status: 'blocked' }> }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
        <div className="mb-5 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-coral" aria-hidden="true" />
          <h2 className="font-outfit text-[26px] font-bold text-text">
            CP19 Not Done
          </h2>
        </div>
        <dl>
          <ProofRow label="Blocker code" value={proof.blockerCode} />
          <ProofRow label="Blocker" value={proof.blocker} />
          <ProofRow
            label="Missing env"
            value={proof.missingEnv.length > 0 ? proof.missingEnv.join(', ') : 'None reported'}
          />
          <ProofRow
            label="Search run ID"
            value={
              proof.liveLineage.searchProviderRunId ? (
                <code className="break-all text-[13px]">
                  {proof.liveLineage.searchProviderRunId}
                </code>
              ) : (
                'Not available'
              )
            }
          />
          <ProofRow
            label="Evidence run ID"
            value={
              proof.liveLineage.evidenceProviderRunId ? (
                <code className="break-all text-[13px]">
                  {proof.liveLineage.evidenceProviderRunId}
                </code>
              ) : (
                'Not available'
              )
            }
          />
          <ProofRow label="CP19 done" value="No - live provider opportunity is not rendered." />
        </dl>
      </article>

      <aside className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
        <div className="mb-5 flex items-center gap-2">
          <RadioTower className="h-5 w-5 text-blue" aria-hidden="true" />
          <h2 className="font-outfit text-[24px] font-bold text-text">Provider Calls</h2>
        </div>
        <ProviderCallList calls={proof.proof.providerCalls} />
      </aside>
    </section>
  )
}

function ReadyProof({ proof }: { proof: Extract<Cp19ProofResult, { status: 'ready' }> }) {
  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-text/45">
                Prospect
              </div>
              <h2 className="mt-2 font-outfit text-[32px] font-bold leading-tight text-text">
                {proof.prospect.businessName}
              </h2>
              <p className="mt-2 text-[15px] font-semibold text-text/70">
                {proof.prospect.location}
              </p>
              {proof.prospect.address ? (
                <p className="mt-1 text-[13px] leading-relaxed text-text/55">
                  {proof.prospect.address}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg bg-blue/10 px-4 py-3 text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue">
                Score
              </div>
              <div className="font-outfit text-[46px] font-bold leading-none text-text">
                {proof.score.value}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
              {proof.evidence.signalLabel}
            </span>
            <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
              {proof.evidence.verticalFitLabel}
            </span>
            <span className="rounded-md bg-text/[0.06] px-3 py-1.5 text-[12px] font-bold text-text">
              Signal id: {proof.evidence.signalId}
            </span>
          </div>

          <dl className="mt-7">
            <ProofRow label="Why now" value={proof.score.whyNow} />
            <ProofRow label="Score reason" value={proof.score.reason} />
            <ProofRow
              label="Next action"
              value={
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-text px-4 text-[13px] font-bold text-bg transition-colors hover:bg-text/85"
                >
                  {proof.nextAction.label}
                </button>
              }
            />
            <ProofRow label="Action detail" value={proof.nextAction.detail} />
          </dl>
        </article>

        <aside className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue" aria-hidden="true" />
            <h2 className="font-outfit text-[24px] font-bold text-text">Evidence</h2>
          </div>
          <dl>
            <ProofRow label="Source title" value={proof.evidence.sourceTitle} />
            <ProofRow
              label="Source URL"
              value={
                <a
                  className="inline-flex max-w-full items-center gap-1 text-blue hover:underline"
                  href={proof.evidence.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="truncate">{proof.evidence.sourceUrl}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                </a>
              }
            />
            <ProofRow label="Source date" value={formatDate(proof.evidence.sourceDate)} />
            <ProofRow label="Source excerpt" value={proof.evidence.sourceExcerpt} />
          </dl>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
          <h2 className="font-outfit text-[24px] font-bold text-text">Provider Lineage</h2>
          <dl className="mt-5">
            <ProofRow label="SearchProvider" value={proof.lineage.searchProvider} />
            <ProofRow
              label="Search run ID"
              value={<code className="break-all text-[13px]">{proof.lineage.searchProviderRunId}</code>}
            />
            <ProofRow label="EvidenceProvider" value={proof.lineage.evidenceProvider} />
            <ProofRow
              label="Evidence run ID"
              value={<code className="break-all text-[13px]">{proof.lineage.evidenceProviderRunId}</code>}
            />
            <ProofRow
              label="Live fingerprint"
              value={<code className="break-all text-[13px]">{proof.lineage.liveFingerprint}</code>}
            />
          </dl>
        </article>

        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
          <h2 className="font-outfit text-[24px] font-bold text-text">Run Proof</h2>
          <dl className="mt-5">
            <ProofRow label="Captured" value={formatDateTime(proof.proof.capturedAt)} />
            <ProofRow label="Evaluated" value={formatDateTime(proof.proof.evaluatedAt)} />
            <ProofRow label="Market" value={proof.proof.market} />
            <ProofRow label="Search query" value={proof.proof.searchQuery} />
            <ProofRow label="Provider calls" value={proof.proof.providerCalls.length} />
            <ProofRow label="Estimated spend" value={money(proof.proof.estimatedCostUsd)} />
            <ProofRow label="Replayable lineage" value={proof.proof.replayableLineage} />
            <ProofRow
              label="Color proof"
              value="The score uses neutral text on a blue-tinted block; coral is not derived from score."
            />
          </dl>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
          <h2 className="font-outfit text-[24px] font-bold text-text">Provider Calls</h2>
          <div className="mt-5">
            <ProviderCallList calls={proof.proof.providerCalls} />
          </div>
        </article>

        <div className="grid gap-4 md:grid-cols-2">
          <GateList title="Evidence Gate" items={proof.proof.evidenceGateReasons} />
          <GateList title="Classification Gate" items={proof.proof.classificationGateReasons} />
          <GateList title="Scoring Gate" items={proof.proof.scoringGateReasons} />
          <GateList title="Claim Guard" items={proof.proof.claimGuardReasons} />
        </div>
      </section>
    </>
  )
}

export default async function Cp19InternalProofPage() {
  if (!isEnabled()) notFound()

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!adminIds().includes(userId)) notFound()

  const proof = await getCp19LiveProof()

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Header proof={proof} />
        {proof.status === 'ready' ? (
          <ReadyProof proof={proof} />
        ) : (
          <BlockedProof proof={proof} />
        )}
      </div>
    </main>
  )
}
