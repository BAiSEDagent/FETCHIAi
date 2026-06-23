'use client'

import * as React from 'react'
import {
  ArrowDownToLine,
  Building2,
  ExternalLink,
  FileJson,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Table2,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exportSweepCsv, exportSweepJson } from '@/lib/runtime/sweep/export'
import type { SweepEnrichmentStats, SweepLead, SweepRunResult } from '@/lib/runtime/sweep'
import { enrichSweep, runSweep } from './actions'

type Example = {
  service: string
  icp: string
  market: string
}

const EXAMPLES: Example[] = [
  { service: 'commercial cleaning', icp: 'restaurants', market: 'Denver, CO' },
  { service: 'roofing', icp: 'commercial property managers', market: 'Texas' },
  { service: 'dumpster rental', icp: 'tenant improvement contractors', market: 'nationwide' },
]

const PROGRESS_LINES = [
  'Spreading query variants across the market',
  'Pulling Maps records with phone contact routes',
  'Merging duplicates into one clean lead list',
  'Preparing export rows',
]

function downloadText(filename: string, mimeType: string, value: string) {
  const blob = new Blob([value], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function displayUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function StatTile({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="min-h-[78px] rounded-lg bg-surface border border-text/8 px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[1px] text-text/38">
        {label}
      </div>
      <div className="mt-2 text-[24px] leading-none font-outfit text-text tabular-nums">
        {value}
      </div>
    </div>
  )
}

function ResultRow({ lead }: { lead: SweepLead }) {
  return (
    <tr className="border-t border-text/8 align-top">
      <td className="px-4 py-3 min-w-[210px]">
        <div className="font-semibold text-text leading-snug">{lead.businessName}</div>
        {lead.category && (
          <div className="mt-1 text-[12px] text-text/45">{lead.category}</div>
        )}
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        {lead.website && (
          <a
            href={lead.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-ok hover:text-ok/80 font-medium"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="break-all">{displayUrl(lead.website)}</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}
      </td>
      <td className="px-4 py-3 min-w-[140px]">
        <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-text font-medium">
          <Phone className="h-3.5 w-3.5 text-text/45" />
          {lead.phone}
        </a>
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-ok font-medium">
            <Mail className="h-3.5 w-3.5" />
            <span className="break-all">{lead.email}</span>
          </a>
        )}
      </td>
      <td className="px-4 py-3 min-w-[150px] text-text/70">
        {lead.owner && (
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-text/38" />
            {lead.owner}
          </span>
        )}
      </td>
      <td className="px-4 py-3 min-w-[260px]">
        {lead.address && (
          <div className="flex gap-1.5 text-text/75 leading-snug">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text/38" />
            <span>{lead.address}</span>
          </div>
        )}
        <div className="mt-1 text-[12px] text-text/38">{lead.market}</div>
      </td>
      <td className="px-4 py-3 min-w-[120px] text-text/65">{lead.source}</td>
      <td className="px-4 py-3 min-w-[240px] text-text/55 leading-snug">
        {lead.hook ?? ''}
      </td>
    </tr>
  )
}

export function SweepClient() {
  const [service, setService] = React.useState('')
  const [icp, setIcp] = React.useState('')
  const [market, setMarket] = React.useState('')
  const [pending, startTransition] = React.useTransition()
  const [enrichmentPending, startEnrichmentTransition] = React.useTransition()
  const [result, setResult] = React.useState<SweepRunResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [enrichmentMessage, setEnrichmentMessage] = React.useState<string | null>(null)
  const [enrichmentStats, setEnrichmentStats] = React.useState<SweepEnrichmentStats | null>(null)
  const [progressIndex, setProgressIndex] = React.useState(0)

  React.useEffect(() => {
    if (!pending) return
    const id = window.setInterval(() => {
      setProgressIndex((value) => (value + 1) % PROGRESS_LINES.length)
    }, 900)
    return () => window.clearInterval(id)
  }, [pending])

  const leads = result?.leads ?? []
  const hasResults = leads.length > 0

  function applyExample(example: Example) {
    setService(example.service)
    setIcp(example.icp)
    setMarket(example.market)
    setError(null)
    setEnrichmentMessage(null)
    setEnrichmentStats(null)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEnrichmentMessage(null)
    setEnrichmentStats(null)
    setResult(null)
    startTransition(async () => {
      const response = await runSweep({ service, icp, market })
      setResult(response)
      if (!response.ok) {
        setError(response.error?.message ?? 'The sweep could not run.')
      }
    })
  }

  function enrichResults() {
    if (!hasResults || enrichmentPending) return
    setError(null)
    setEnrichmentMessage(null)
    startEnrichmentTransition(async () => {
      const response = await enrichSweep({ leads, maxScrapes: 50 })
      setEnrichmentStats(response.stats)
      setResult((current) => current
        ? {
          ...current,
          leads: response.leads,
          stats: {
            ...current.stats,
            exportCount: response.leads.length,
          },
        }
        : current)

      if (!response.ok) {
        setEnrichmentMessage(response.error?.message ?? 'Website enrichment is unavailable.')
        return
      }

      setEnrichmentMessage(
        `Checked ${response.stats.attemptedScrapes} websites and found ${response.stats.emailsFound} emails.`,
      )
    })
  }

  function exportCsv() {
    if (!hasResults) return
    downloadText('fetchi-sweep-leads.csv', 'text/csv;charset=utf-8', exportSweepCsv(leads))
  }

  function exportJson() {
    if (!hasResults) return
    downloadText('fetchi-sweep-leads.json', 'application/json;charset=utf-8', exportSweepJson(leads))
  }

  return (
    <div className="min-h-full bg-bg text-text">
      <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className="rounded-lg bg-surface border border-text/8 p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ok/14 text-ok">
                <Search className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-outfit text-[30px] leading-tight">Sweep</h1>
                <p className="mt-1 text-[13px] text-text/55">
                  Build a contactable Maps lead list from one market.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service">What do you sell?</Label>
                <Input
                  id="service"
                  value={service}
                  onChange={(event) => setService(event.target.value)}
                  placeholder="commercial cleaning"
                  className="h-12 bg-bg text-[15px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icp">Who do you want?</Label>
                <Input
                  id="icp"
                  value={icp}
                  onChange={(event) => setIcp(event.target.value)}
                  placeholder="restaurants"
                  className="h-12 bg-bg text-[15px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market">Market to target</Label>
                <Input
                  id="market"
                  value={market}
                  onChange={(event) => setMarket(event.target.value)}
                  placeholder="Denver, CO"
                  className="h-12 bg-bg text-[15px]"
                />
              </div>

              <Button
                type="submit"
                disabled={pending}
                className="h-12 w-full gap-2 bg-ok text-bg hover:bg-ok/90"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Run sweep
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={`${example.service}-${example.icp}-${example.market}`}
                  type="button"
                  onClick={() => applyExample(example)}
                  className="rounded-lg bg-bg px-3 py-2 text-left text-[12.5px] leading-tight text-text/70 hover:bg-text/8"
                >
                  <span className="font-semibold text-text">{example.icp}</span>
                  <span className="block text-text/45">{example.market}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-surface border border-text/8 p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[1.2px] text-ok">
                  <Building2 className="h-4 w-4" />
                  Maps-first contact sweep
                </div>
                <h2 className="mt-3 font-outfit text-[28px] leading-tight">
                  Find businesses with phone contact routes and richer Maps details.
                </h2>
                <p className="mt-2 max-w-[720px] text-[14px] leading-relaxed text-text/58">
                  Fetchi fans out deterministic Maps searches across city, state, or national markets, then merges overlapping listings into one exportable lead list.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!hasResults || pending || enrichmentPending}
                  onClick={enrichResults}
                  className="gap-2"
                >
                  {enrichmentPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Find emails
                </Button>
                <Button type="button" variant="outline" disabled={!hasResults} onClick={exportCsv} className="gap-2">
                  <ArrowDownToLine className="h-4 w-4" />
                  CSV
                </Button>
                <Button type="button" variant="outline" disabled={!hasResults} onClick={exportJson} className="gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </Button>
              </div>
            </div>

            {hasResults && (
              <div className="mt-4 rounded-lg border border-text/8 bg-bg px-4 py-3 text-[13px] text-text/55">
                {enrichmentPending
                  ? 'Checking websites for emails and context'
                  : enrichmentMessage ?? 'Enrich up to 50 websites'}
                {enrichmentStats && !enrichmentPending && (
                  <span className="ml-2 text-text/38">
                    {enrichmentStats.successfulScrapes} checked
                  </span>
                )}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatTile label="sources hit" value={result?.stats.sourcesHit.join(', ') || 'Maps'} />
              <StatTile label="queries run" value={result?.stats.queriesRun ?? 0} />
              <StatTile label="raw scanned" value={result?.stats.rawScanned ?? 0} />
              <StatTile label="leads found" value={result?.stats.dedupedLeadCount ?? 0} />
              <StatTile label="export count" value={result?.stats.exportCount ?? 0} />
            </div>
          </div>
        </section>

        {pending && (
          <section className="rounded-lg bg-surface border border-ok/18 p-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-ok" />
              <div>
                <div className="font-semibold text-text">Sweeping the market</div>
                <div className="mt-1 text-[13px] text-text/55">{PROGRESS_LINES[progressIndex]}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2" aria-hidden>
              {PROGRESS_LINES.map((line, index) => (
                <span
                  key={line}
                  className={[
                    'h-1.5 rounded-full transition-colors',
                    index <= progressIndex ? 'bg-ok' : 'bg-text/10',
                  ].join(' ')}
                />
              ))}
            </div>
          </section>
        )}

        {error && (
          <section role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-[14px] text-red-100">
            {error}
          </section>
        )}

        <section className="overflow-hidden rounded-lg bg-surface border border-text/8">
          <div className="flex min-h-[58px] items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-text/45" />
              <h2 className="font-semibold">Lead list</h2>
            </div>
            {hasResults && (
              <div className="text-[13px] text-text/45 tabular-nums">
                {leads.length} export-ready rows
              </div>
            )}
          </div>

          {!hasResults && !pending ? (
            <div className="min-h-[320px] px-4 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-text/8 text-text/55">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-outfit text-[24px]">Run a sweep to fill the list.</h3>
              <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-relaxed text-text/50">
                Results appear as a single table focused on business, phone, website, address, market, and source.
              </p>
            </div>
          ) : (
            <div className="max-h-[680px] overflow-auto">
              <table className="w-full border-collapse text-left text-[13.5px]">
                <thead className="sticky top-0 z-10 bg-raised text-[11px] uppercase tracking-[0.9px] text-text/42">
                  <tr>
                    <th className="px-4 py-3 font-bold">Business</th>
                    <th className="px-4 py-3 font-bold">Website</th>
                    <th className="px-4 py-3 font-bold">Phone</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">Address / market</th>
                    <th className="px-4 py-3 font-bold">Source</th>
                    <th className="px-4 py-3 font-bold">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <ResultRow key={lead.id} lead={lead} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
