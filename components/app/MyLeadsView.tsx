'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileJson,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportSavedLeadsCsv, exportSavedLeadsJson } from '@/lib/runtime/sweep/export'
import type {
  SavedLeadLifecycleStatus,
  SavedLeadPipelineRow,
} from '@/lib/runtime/sweep/saved-leads'
import { updateSavedLeadNote, updateSavedLeadStatus } from '@/app/app/sweep/actions'
import { cn } from '@/lib/utils'

type Props = {
  leads: SavedLeadPipelineRow[]
}

type StatusFilter = 'all' | SavedLeadLifecycleStatus
type SortMode =
  | 'status_pipeline'
  | 'date_desc'
  | 'date_asc'
  | 'business_asc'
  | 'business_desc'
  | 'market_asc'

type PipelineGroup = {
  key: 'won' | 'contacted' | 'saved' | 'closed'
  label: string
  statuses: SavedLeadLifecycleStatus[]
  railClass: string
  borderClass: string
  badgeClass: string
  segmentClass: string
  cardHoverClass: string
  statusControlClass: string
  avatarClass: string
}

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'won', label: 'Won' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'saved', label: 'Saved' },
  { key: 'lost', label: 'Lost' },
  { key: 'dismissed', label: 'Dismissed' },
]

const STATUS_OPTIONS: Array<{ key: SavedLeadLifecycleStatus; label: string }> = [
  { key: 'saved', label: 'Saved' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'dismissed', label: 'Dismissed' },
]

const PIPELINE_GROUPS: PipelineGroup[] = [
  {
    key: 'won',
    label: 'Won',
    statuses: ['won'],
    railClass: 'bg-ok',
    borderClass: 'border-l-ok',
    badgeClass: 'border-ok/25 bg-ok/12 text-ok',
    segmentClass: 'bg-ok',
    cardHoverClass: 'hover:border-ok/35',
    statusControlClass: 'border-ok/25 bg-ok/10 text-ok',
    avatarClass: 'border-ok/35 bg-ok/10 text-ok',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    statuses: ['contacted'],
    railClass: 'bg-blue',
    borderClass: 'border-l-blue',
    badgeClass: 'border-blue/20 bg-blue/10 text-blue',
    segmentClass: 'bg-blue',
    cardHoverClass: 'hover:border-blue/35',
    statusControlClass: 'border-blue/25 bg-blue/10 text-blue',
    avatarClass: 'border-blue/35 bg-blue/10 text-blue',
  },
  {
    key: 'saved',
    label: 'Saved',
    statuses: ['saved'],
    railClass: 'bg-text/28',
    borderClass: 'border-l-text/25',
    badgeClass: 'border-text/10 bg-text/6 text-text/70',
    segmentClass: 'bg-text/35',
    cardHoverClass: 'hover:border-text/20',
    statusControlClass: 'border-text/12 bg-bg text-text/76',
    avatarClass: 'border-border bg-raised text-text',
  },
  {
    key: 'closed',
    label: 'Lost/Dismissed',
    statuses: ['lost', 'dismissed'],
    railClass: 'bg-bad/60',
    borderClass: 'border-l-bad/60',
    badgeClass: 'border-bad/20 bg-bad/8 text-bad',
    segmentClass: 'bg-bad/60',
    cardHoverClass: 'hover:border-bad/25',
    statusControlClass: 'border-bad/20 bg-bad/8 text-bad',
    avatarClass: 'border-bad/25 bg-bad/8 text-bad',
  },
]

const SORT_OPTIONS: Array<{ key: SortMode; label: string }> = [
  { key: 'status_pipeline', label: 'Lifecycle status: pipeline order' },
  { key: 'date_desc', label: 'Saved/updated date: newest first' },
  { key: 'date_asc', label: 'Saved/updated date: oldest first' },
  { key: 'business_asc', label: 'Business name: A-Z' },
  { key: 'business_desc', label: 'Business name: Z-A' },
  { key: 'market_asc', label: 'Market: A-Z' },
]

const STATUS_SORT_RANK: Record<SavedLeadLifecycleStatus, number> = {
  won: 0,
  contacted: 1,
  saved: 2,
  lost: 3,
  dismissed: 4,
}

const RUN_SWEEP_PRIMARY_ACTION_CLASS = 'gap-2 bg-coral text-white hover:bg-coralDeep'

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

function externalHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function displayUrl(value: string): string {
  try {
    const url = new URL(externalHref(value))
    return url.hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function statusLabel(status: SavedLeadLifecycleStatus): string {
  return STATUS_OPTIONS.find((option) => option.key === status)?.label ?? status
}

function groupForStatus(status: SavedLeadLifecycleStatus): PipelineGroup {
  return PIPELINE_GROUPS.find((group) => group.statuses.includes(status)) ?? PIPELINE_GROUPS[2]
}

function createNoteDrafts(leads: readonly SavedLeadPipelineRow[]): Record<string, string> {
  return Object.fromEntries(leads.map((lead) => [lead.id, lead.note ?? '']))
}

function textValue(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return textValue(a).localeCompare(textValue(b), undefined, { sensitivity: 'base' })
}

function compareBySortMode(a: SavedLeadPipelineRow, b: SavedLeadPipelineRow, sortMode: SortMode): number {
  switch (sortMode) {
    case 'date_asc':
      return a.updatedAtMs - b.updatedAtMs || compareText(a.businessName, b.businessName)
    case 'date_desc':
      return b.updatedAtMs - a.updatedAtMs || compareText(a.businessName, b.businessName)
    case 'business_asc':
      return compareText(a.businessName, b.businessName) || b.updatedAtMs - a.updatedAtMs
    case 'business_desc':
      return compareText(b.businessName, a.businessName) || b.updatedAtMs - a.updatedAtMs
    case 'market_asc':
      return compareText(a.market ?? a.address, b.market ?? b.address) ||
        compareText(a.businessName, b.businessName)
    case 'status_pipeline':
    default:
      return STATUS_SORT_RANK[a.lifecycleStatus] - STATUS_SORT_RANK[b.lifecycleStatus] ||
        b.updatedAtMs - a.updatedAtMs ||
        compareText(a.businessName, b.businessName)
  }
}

function countByStatus(rows: readonly SavedLeadPipelineRow[]): Record<SavedLeadLifecycleStatus, number> {
  return rows.reduce<Record<SavedLeadLifecycleStatus, number>>((next, row) => {
    next[row.lifecycleStatus] += 1
    return next
  }, {
    saved: 0,
    contacted: 0,
    won: 0,
    lost: 0,
    dismissed: 0,
  })
}

function countForGroup(
  counts: Record<SavedLeadLifecycleStatus, number>,
  group: PipelineGroup,
): number {
  return group.statuses.reduce((total, status) => total + counts[status], 0)
}

function rowMatchesSearch(row: SavedLeadPipelineRow, query: string): boolean {
  if (!query) return true
  return [
    row.businessName,
    row.phone,
    row.website,
    row.market,
    row.address,
    row.category,
    row.note,
    row.source,
  ].some((value) => (value ?? '').toLowerCase().includes(query))
}

function initialsForName(name: string): string {
  const parts = name
    .replace(/[^a-z0-9\s'-]/gi, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const first = parts[0]?.[0] ?? 'L'
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]
  return `${first}${second ?? ''}`.toUpperCase()
}

function supportLine(row: SavedLeadPipelineRow): string {
  const values = [row.category, row.market ?? row.address, row.source].filter(Boolean)
  return values.length > 0 ? values.join(' · ') : 'Saved lead'
}

function hasAddress(row: SavedLeadPipelineRow): boolean {
  return Boolean(row.address ?? row.market)
}

export function MyLeadsView({ leads }: Props) {
  const [rows, setRows] = useState<SavedLeadPipelineRow[]>(leads)
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('status_pipeline')
  const [search, setSearch] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() => createNoteDrafts(leads))
  const [message, setMessage] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(leads)
    setEditingNoteId(null)
    setNoteDrafts(createNoteDrafts(leads))
  }, [leads])

  const statusCounts = useMemo(() => countByStatus(rows), [rows])

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (activeStatus !== 'all' && row.lifecycleStatus !== activeStatus) return false
      return rowMatchesSearch(row, query)
    })
  }, [rows, activeStatus, search])

  const sortedVisibleRows = useMemo(() => {
    return [...visibleRows].sort((a, b) => compareBySortMode(a, b, sortMode))
  }, [visibleRows, sortMode])

  const visibleStatusCounts = useMemo(() => countByStatus(visibleRows), [visibleRows])

  const groupedRows = useMemo(() => {
    return PIPELINE_GROUPS
      .map((group) => ({
        ...group,
        rows: sortedVisibleRows.filter((row) => group.statuses.includes(row.lifecycleStatus)),
      }))
      .filter((group) => group.rows.length > 0)
  }, [sortedVisibleRows])

  const pipelineTotal = visibleRows.length

  function exportCsv() {
    downloadText('fetchi-saved-leads.csv', 'text/csv;charset=utf-8', exportSavedLeadsCsv(sortedVisibleRows))
  }

  function exportJson() {
    downloadText('fetchi-saved-leads.json', 'application/json;charset=utf-8', exportSavedLeadsJson(sortedVisibleRows))
  }

  function startEditingNote(row: SavedLeadPipelineRow) {
    setEditingNoteId(row.id)
    setNoteDrafts((current) => ({ ...current, [row.id]: row.note ?? '' }))
  }

  function changeStatus(row: SavedLeadPipelineRow, status: SavedLeadLifecycleStatus) {
    if (row.lifecycleStatus === status || isPending) return
    setPendingId(row.id)
    setMessage(null)
    const before = rows
    const now = new Date().toISOString()
    setRows((current) => current.map((item) =>
      item.id === row.id
        ? {
            ...item,
            lifecycleStatus: status,
            updatedAtIso: now,
            updatedAtMs: Date.now(),
          }
        : item,
    ))

    startTransition(async () => {
      const result = await updateSavedLeadStatus({
        savedLeadIds: [row.id],
        status,
      })
      if (!result.ok || result.updated === 0) {
        setRows(before)
        setMessage(result.error ?? 'Status was not updated.')
      } else {
        setMessage(`Updated ${row.businessName} to ${statusLabel(status)}.`)
      }
      setPendingId(null)
    })
  }

  function saveNote(row: SavedLeadPipelineRow) {
    if (isPending) return
    setPendingId(row.id)
    setMessage(null)
    const note = noteDrafts[row.id] ?? ''
    const before = rows
    const now = new Date().toISOString()
    setRows((current) => current.map((item) =>
      item.id === row.id
        ? {
            ...item,
            note,
            updatedAtIso: now,
            updatedAtMs: Date.now(),
          }
        : item,
    ))

    startTransition(async () => {
      const result = await updateSavedLeadNote({
        savedLeadId: row.id,
        note,
      })
      if (!result.ok || result.updated === 0) {
        setRows(before)
        setMessage(result.error ?? 'Note was not saved.')
      } else {
        setEditingNoteId(null)
        setMessage(`Saved note for ${row.businessName}.`)
      }
      setPendingId(null)
    })
  }

  return (
    <div className="min-h-full bg-bg text-text">
      <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="font-outfit text-[32px] font-extrabold leading-none lg:text-[38px]">
              My Leads
            </h1>
            <div className="mt-2 text-[13.5px] font-medium text-text/55">
              {rows.length === 0
                ? '0 saved leads'
                : `${rows.length} saved lead${rows.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 sm:w-[300px]">
              <Search className="h-4 w-4 flex-shrink-0 text-text/45" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved leads"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-text outline-none placeholder:text-text/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="text-text/45 hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] text-text/70">
              <span className="font-semibold text-text/55">Sort</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="min-w-[210px] bg-transparent text-text outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={sortedVisibleRows.length === 0} onClick={exportCsv} className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" disabled={sortedVisibleRows.length === 0} onClick={exportJson} className="gap-2">
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
              <Button asChild className={RUN_SWEEP_PRIMARY_ACTION_CLASS}>
                <Link href="/app/sweep">
                  <Search className="h-4 w-4" />
                  Run a sweep
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface px-4 py-4 shadow-fetchi-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-outfit text-[18px] font-bold text-text">
                Status overview
              </div>
              <div className="mt-1 text-[12.5px] text-text/45">
                {pipelineTotal} visible lead{pipelineTotal === 1 ? '' : 's'} from the current view
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE_GROUPS.map((group) => {
                const count = countForGroup(visibleStatusCounts, group)
                return (
                  <div key={group.key} className="rounded-lg border border-border bg-raised px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', group.segmentClass)} />
                      <span className="text-[12px] font-semibold text-text/60">{group.label}</span>
                    </div>
                    <div className="mt-1 font-outfit text-[22px] font-extrabold leading-none text-text tabular-nums">
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-bg">
            {pipelineTotal === 0 ? (
              <div className="h-full w-full bg-text/8" />
            ) : (
              <div className="flex h-full w-full">
                {PIPELINE_GROUPS.map((group) => {
                  const count = countForGroup(visibleStatusCounts, group)
                  if (count === 0) return null
                  return (
                    <div
                      key={group.key}
                      className={group.segmentClass}
                      style={{ width: `${(count / pipelineTotal) * 100}%` }}
                      aria-label={`${group.label} ${count}`}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((tab) => {
            const active = activeStatus === tab.key
            const count = tab.key === 'all' ? rows.length : statusCounts[tab.key]
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatus(tab.key)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition-colors',
                  active
                    ? 'bg-text text-bg'
                    : 'border border-border bg-surface text-text/70 hover:bg-raised hover:text-text',
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('tabular-nums', active ? 'text-bg/70' : 'text-text/45')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-ok/20 bg-ok/10 px-4 py-3 text-[13px] text-ok">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="min-h-[420px] rounded-xl border border-border bg-surface px-4 py-20 text-center shadow-fetchi-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-text/8 text-text/55">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-outfit text-[24px]">Your pipeline is empty — run a sweep to fill it.</h2>
            <Button asChild className={RUN_SWEEP_PRIMARY_ACTION_CLASS}>
              <Link href="/app/sweep" className="mt-5">
                <Search className="h-4 w-4" />
                Run a sweep
              </Link>
            </Button>
          </div>
        ) : sortedVisibleRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-14 text-center shadow-fetchi-card">
            <h2 className="font-outfit text-[22px]">No saved leads in this view.</h2>
            <p className="mt-2 text-[14px] text-text/50">Clear search or change the lifecycle filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedRows.map((group) => {
              const phoneCount = group.rows.filter((row) => Boolean(row.phone)).length
              const websiteCount = group.rows.filter((row) => Boolean(row.website)).length
              const addressCount = group.rows.filter((row) => hasAddress(row)).length

              return (
                <section key={group.key} className="grid grid-cols-[5px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-surface shadow-fetchi-card">
                  <div className={group.railClass} aria-hidden />
                  <div className="min-w-0">
                    <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[12px] font-bold', group.badgeClass)}>
                          {group.label}
                        </span>
                        <span className="text-[13px] font-semibold text-text">
                          {group.rows.length} lead{group.rows.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="text-[12.5px] text-text/45">
                        Contact coverage: {phoneCount} have phone · {websiteCount} have website · {addressCount} have address
                      </div>
                    </div>

                    <div className={cn('border-l-[3px]', group.borderClass)}>
                      {group.rows.map((row) => {
                        const isRowPending = isPending && pendingId === row.id
                        const groupMeta = groupForStatus(row.lifecycleStatus)
                        const isEditingNote = editingNoteId === row.id
                        const noteDraft = noteDrafts[row.id] ?? ''

                        return (
                          <article
                            key={row.id}
                            className={cn(
                              'grid gap-3 border-t border-border bg-surface p-3 transition-colors first:border-t-0 hover:bg-raised/70 sm:p-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,280px)_minmax(190px,230px)] xl:items-center',
                              groupMeta.cardHoverClass,
                            )}
                          >
                            <Link
                              href={`/app/leads/${row.id}`}
                              className="group/card flex min-w-0 items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                            >
                              <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border font-outfit text-[15px] font-extrabold', groupMeta.avatarClass)}>
                                {initialsForName(row.businessName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-outfit text-[18px] font-extrabold leading-tight text-text lg:text-[19px]">
                                      {row.businessName}
                                    </h3>
                                    <div className="mt-1 truncate text-[13px] font-medium text-text/52">
                                      {supportLine(row)}
                                    </div>
                                  </div>
                                  <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-text/28 transition-colors group-hover/card:text-text/55" />
                                </div>

                                {row.address && row.market && (
                                  <div className="mt-2 flex gap-1.5 text-[12.5px] leading-snug text-text/45">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text/32" />
                                    <span className="line-clamp-2">{row.address}</span>
                                  </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-text/55">
                                  {row.phone && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <Phone className="h-3.5 w-3.5 text-text/35" />
                                      {row.phone}
                                    </span>
                                  )}
                                  {row.website && (
                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                      <Globe2 className="h-3.5 w-3.5 flex-shrink-0 text-text/35" />
                                      <span className="truncate">{displayUrl(row.website)}</span>
                                    </span>
                                  )}
                                  <span className="text-text/38">
                                    Updated {displayDate(row.updatedAtIso)}
                                  </span>
                                </div>
                              </div>
                            </Link>

                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={`tel:${row.phone}`}
                                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 text-[11.5px] font-semibold text-text/65 hover:text-text"
                                >
                                  <Phone className="h-3.5 w-3.5 text-text/38" />
                                  Phone
                                </a>
                                {row.website ? (
                                  <a
                                    href={externalHref(row.website)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 text-[11.5px] font-semibold text-text/65 hover:text-text"
                                  >
                                    <Globe2 className="h-3.5 w-3.5 flex-shrink-0 text-text/38" />
                                    <span className="truncate">Website</span>
                                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-text/35" />
                                  </a>
                                ) : (
                                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-dashed border-text/14 bg-bg px-2.5 text-[11.5px] font-semibold text-text/40">
                                    <Globe2 className="h-3.5 w-3.5 text-text/30" />
                                    Missing website
                                  </span>
                                )}
                                {hasAddress(row) && (
                                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 text-[11.5px] font-semibold text-text/65">
                                    <MapPin className="h-3.5 w-3.5 text-text/38" />
                                    Address
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-text/34">
                                Contact coverage
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 xl:items-end">
                              <label className="flex w-full flex-col gap-1 xl:max-w-[190px]">
                                <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-text/34">Status</span>
                                <select
                                  value={row.lifecycleStatus}
                                  disabled={isRowPending || row.lifecycleStatus === 'dismissed'}
                                  onChange={(event) => changeStatus(row, event.target.value as SavedLeadLifecycleStatus)}
                                  className={cn('h-9 rounded-lg border px-3 text-[12.5px] font-bold outline-none disabled:cursor-not-allowed disabled:opacity-60', groupMeta.statusControlClass)}
                                >
                                  {STATUS_OPTIONS.map((option) => (
                                    <option key={option.key} value={option.key}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {isRowPending && (
                                <div className="flex items-center gap-1.5 text-[12px] text-text/45">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Saving
                                </div>
                              )}
                              <div className="text-[11.5px] text-text/38 xl:text-right">
                                Saved {displayDate(row.savedAtIso)}
                              </div>
                            </div>

                            <div className="xl:col-span-3">
                              {isEditingNote ? (
                                <div className="rounded-lg border border-border bg-bg p-3">
                                  <textarea
                                    value={noteDraft}
                                    onChange={(event) => {
                                      const value = event.target.value
                                      setNoteDrafts((current) => ({ ...current, [row.id]: value }))
                                    }}
                                    className="min-h-[78px] w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-text outline-none placeholder:text-text/35"
                                    placeholder="Add note"
                                  />
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={isRowPending || noteDraft === (row.note ?? '')}
                                      onClick={() => saveNote(row)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text px-3 text-[12px] font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                      Save note
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingNoteId(null)}
                                      className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-[12px] font-semibold text-text/60 hover:text-text"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : row.note ? (
                                <button
                                  type="button"
                                  onClick={() => startEditingNote(row)}
                                  className="block w-full rounded-lg border border-border bg-bg px-3 py-2 text-left transition-colors hover:bg-raised"
                                >
                                  <span className="block text-[11px] font-bold uppercase tracking-[0.8px] text-text/34">Note</span>
                                  <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-text/75">{row.note}</span>
                                  <span className="mt-1 block text-[11px] font-semibold text-text/38">Edit note</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditingNote(row)}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-text/18 px-3 text-[12px] font-semibold text-text/50 transition-colors hover:border-text/30 hover:text-text"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  + note
                                </button>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
