import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  Database,
  FileText,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import {
  CP20B_PROOF_ROUTE,
  getCp20bPersistedOpportunityProof,
  type Cp20bPersistedLineageRun,
  type Cp20bProofResult,
} from '@/lib/runtime/cp20b-persisted-cp20a-opportunity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEnabled(): boolean {
  return process.env.CP20B_PROOF_ENABLED === '1'
}

function adminIds(): string[] {
  return (process.env.FETCHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function formatDate(value: string): string {
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
    <div className="grid gap-1 border-t border-text/10 py-3 first:border-t-0 md:grid-cols-[210px_1fr] md:gap-5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
        {label}
      </dt>
      <dd className="min-w-0 text-[14px] font-semibold leading-relaxed text-text">
        {value}
      </dd>
    </div>
  )
}

function JsonList({
  title,
  value,
}: {
  title: string
  value: unknown
}) {
  const entries =
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>)
      : []

  return (
    <section className="rounded-lg border border-text/10 bg-white p-4 shadow-[0_8px_24px_rgba(10,10,10,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue" aria-hidden="true" />
        <h2 className="text-[14px] font-bold text-text">{title}</h2>
      </div>
      <div className="space-y-3">
        {entries.map(([key, item]) => (
          <div key={key}>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
              {key}
            </div>
            <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-text/68">
              {Array.isArray(item) ? (
                item.map((reason) => <li key={String(reason)}>{String(reason)}</li>)
              ) : (
                <li>{String(item)}</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function LineageRunList({ runs }: { runs: Cp20bPersistedLineageRun[] }) {
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
        <div
          key={run.providerRunId}
          className="rounded-lg border border-text/10 bg-bg px-4 py-3"
        >
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

function Header({ proof }: { proof: Cp20bProofResult }) {
  return (
    <header className="flex flex-col gap-4 border-b border-text/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-text/10 bg-white px-3 py-1.5 text-[12px] font-bold text-text/65">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Internal admin proof - {CP20B_PROOF_ROUTE}
        </div>
        <h1 className="font-outfit text-[38px] font-bold leading-tight text-text md:text-[52px]">
          CP20B Persisted Opportunity Proof
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-text/65">
          Persistence-only proof for one accepted CP20A-style Commercial Cleaning
          opportunity. The rendered card is read back from DB storage.
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
            {proof.status === 'ready' ? 'Persisted DB readback' : 'Blocked'}
          </div>
        </div>
      </div>
    </header>
  )
}

function SanitizerDiagnostics({
  proof,
}: {
  proof: Extract<Cp20bProofResult, { status: 'blocked' }>
}) {
  const diagnostics = proof.sanitizerDiagnostics
  if (!diagnostics) return null

  return (
    <section className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue" aria-hidden="true" />
        <h2 className="font-outfit text-[24px] font-bold text-text">
          Sanitizer Diagnostics
        </h2>
      </div>
      <dl>
        <ProofRow label="Candidate count" value={String(diagnostics.candidateCount)} />
        <ProofRow
          label="Fallback accepted"
          value={diagnostics.fallbackExtractionAccepted ? 'Yes' : 'No'}
        />
        <ProofRow
          label="No accepted fallback"
          value={diagnostics.fallbackExtractionFoundNoAcceptedCandidate ? 'Yes' : 'No'}
        />
      </dl>
      <div className="mt-4 space-y-3">
        {diagnostics.candidates.map((candidate, index) => (
          <div
            key={`${candidate.sourceLabel}-${candidate.candidateType}-${index}`}
            className="rounded-lg border border-text/10 bg-bg px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-text/45">
                  {candidate.sourceLabel} / {candidate.candidateType}
                </div>
                <div className="mt-1 text-[13px] font-semibold text-text/70">
                  Length {candidate.length} - Source labels{' '}
                  {candidate.hadSourceLabels ? 'yes' : 'no'} - Over length{' '}
                  {candidate.overLength ? 'yes' : 'no'}
                </div>
              </div>
              <div className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text/55">
                {candidate.rejectionReason ? 'Rejected' : 'Accepted'}
              </div>
            </div>
            <code className="mt-3 block break-words rounded-md bg-white px-3 py-2 text-[12px] leading-relaxed text-text">
              {candidate.preview || 'Empty candidate'}
            </code>
            <p className="mt-2 text-[12px] leading-relaxed text-text/62">
              {candidate.rejectionReason ?? 'Candidate passed sanitizer checks.'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function BlockedProof({ proof }: { proof: Extract<Cp20bProofResult, { status: 'blocked' }> }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-coral" aria-hidden="true" />
            <h2 className="font-outfit text-[26px] font-bold text-text">
              CP20B Not Persisted
            </h2>
          </div>
          <dl>
            <ProofRow label="Blocker code" value={proof.blockerCode} />
            <ProofRow label="Blocker" value={proof.blocker} />
            <ProofRow
              label="Missing env"
              value={proof.missingEnv.length > 0 ? proof.missingEnv.join(', ') : 'None reported'}
            />
            <ProofRow label="DB writes" value={String(proof.dbWrites)} />
            <ProofRow
              label="Search run ID"
              value={proof.liveLineage.searchProviderRunId ?? 'Not available'}
            />
            <ProofRow
              label="TDLR adapter run IDs"
              value={
                proof.liveLineage.sourceAdapterRunIds.length > 0
                  ? proof.liveLineage.sourceAdapterRunIds.join(', ')
                  : 'Not available'
              }
            />
            <ProofRow
              label="Firecrawl run ID"
              value={proof.liveLineage.evidenceProviderRunId ?? 'Not available'}
            />
          </dl>
        </article>

        <aside className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue" aria-hidden="true" />
            <h2 className="font-outfit text-[24px] font-bold text-text">
              Persistence Guard
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed text-text/65">
            CP20B writes nothing unless CP20A live gates pass and the prospect
            sanitizer accepts a bounded business name.
          </p>
        </aside>
      </section>

      <SanitizerDiagnostics proof={proof} />
    </div>
  )
}

function ReadyProof({ proof }: { proof: Extract<Cp20bProofResult, { status: 'ready' }> }) {
  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_14px_36px_rgba(10,10,10,0.07)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-text/45">
                Persisted prospect
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
            <h2 className="font-outfit text-[24px] font-bold text-text">
              Persisted Evidence
            </h2>
          </div>
          <dl>
            <ProofRow label="Source title" value={proof.source.sourceTitle ?? 'Untitled source'} />
            <ProofRow
              label="Source URL"
              value={
                <a
                  className="inline-flex max-w-full items-center gap-1 text-blue hover:underline"
                  href={proof.source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="truncate">{proof.source.sourceUrl}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                </a>
              }
            />
            <ProofRow label="Source date" value={formatDate(proof.source.sourceDate)} />
            <ProofRow label="Source fingerprint" value={<code>{proof.source.evidenceFingerprint}</code>} />
            <ProofRow label="Source excerpt" value={proof.evidence.sourceExcerpt} />
          </dl>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
          <h2 className="font-outfit text-[24px] font-bold text-text">
            Persisted Lineage
          </h2>
          <dl className="mt-5">
            <ProofRow label="Proof hash" value={<code className="break-all text-[13px]">{proof.proof.proofHash}</code>} />
            <ProofRow label="SearchProvider run ID" value={<code className="break-all text-[13px]">{proof.lineage.searchProviderRunId}</code>} />
            <ProofRow
              label="TDLR adapter run IDs"
              value={
                <div className="space-y-1">
                  {proof.lineage.sourceAdapterRunIds.map((runId) => (
                    <code key={runId} className="block break-all text-[13px]">
                      {runId}
                    </code>
                  ))}
                </div>
              }
            />
            <ProofRow
              label="TDLR listing URLs"
              value={
                <div className="space-y-1">
                  {proof.lineage.sourceAdapterListingUrls.map((url) => (
                    <a
                      key={url}
                      className="block break-all text-[13px] text-blue hover:underline"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              }
            />
            <ProofRow label="Firecrawl run ID" value={<code className="break-all text-[13px]">{proof.lineage.evidenceProviderRunId}</code>} />
          </dl>
        </article>

        <article className="rounded-lg border border-text/10 bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <RadioTower className="h-5 w-5 text-blue" aria-hidden="true" />
            <h2 className="font-outfit text-[24px] font-bold text-text">
              Runtime Lineage Rows
            </h2>
          </div>
          <LineageRunList runs={proof.lineage.runtimeLineageRuns} />
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <JsonList title="Persisted Gate Reasons" value={proof.proof.gateReasons} />
        <JsonList title="Persisted Proof Metadata" value={proof.proof.proofMetadata} />
      </section>
    </>
  )
}

export default async function Cp20bInternalProofPage() {
  if (!isEnabled()) notFound()

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  if (!adminIds().includes(userId)) notFound()

  const proof = await getCp20bPersistedOpportunityProof(userId)

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
