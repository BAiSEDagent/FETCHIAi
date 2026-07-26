'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  FileJson,
  ListFilter,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { LeadActionSheet } from '@/components/app/LeadActionSheet'
import { CoverageIndicator } from '@/components/fetchi-ui/CoverageIndicator'
import { SignalBars } from '@/components/fetchi-ui/SignalBars'
import { SourceAttribution } from '@/components/fetchi-ui/SourceAttribution'
import { StatusGlyph } from '@/components/fetchi-ui/StatusGlyph'
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

type FilterKey = 'all' | 'saved' | 'contacted' | 'won' | 'lost'

type LifecycleMeta = {
  label: string
  quietClass: string
}

type LifecycleFilter = {
  key: FilterKey
  label: string
  statuses: SavedLeadLifecycleStatus[]
}

type UndoToast = {
  id: string
  rowId: string
  businessName: string
  previousStatus: SavedLeadLifecycleStatus
  nextStatus: SavedLeadLifecycleStatus
}

type MailboxNoticeTone = 'success' | 'error'

type MailboxNotice = {
  text: string
  tone: MailboxNoticeTone
}

const ACTIVE_FILTER_CLASS =
  'border-fetchiAccent bg-fetchiAccent text-text shadow-[0_1px_2px_rgba(0,0,0,0.30),0_8px_20px_-10px_rgba(94,106,210,0.50)] group-hover:bg-[var(--fetchi-accent-hover)] group-active:bg-[var(--fetchi-accent-press)]'

const STATUS_META: Record<SavedLeadLifecycleStatus, LifecycleMeta> = {
  saved: {
    label: 'Saved',
    quietClass: 'text-lifecycleSaved',
  },
  contacted: {
    label: 'Contacted',
    quietClass: 'text-lifecycleContacted',
  },
  won: {
    label: 'Won',
    quietClass: 'text-lifecycleWon',
  },
  lost: {
    label: 'Lost',
    quietClass: 'text-lifecycleLost',
  },
  dismissed: {
    label: 'Dismissed',
    quietClass: 'text-lifecycleLost',
  },
}

const LIFECYCLE_FILTERS: LifecycleFilter[] = [
  {
    key: 'all',
    label: 'All',
    statuses: ['saved', 'contacted', 'won', 'lost', 'dismissed'],
  },
  {
    key: 'saved',
    label: 'Saved',
    statuses: ['saved'],
  },
  {
    key: 'contacted',
    label: 'Contacted',
    statuses: ['contacted'],
  },
  {
    key: 'won',
    label: 'Won',
    statuses: ['won'],
  },
  {
    key: 'lost',
    label: 'Lost',
    statuses: ['lost', 'dismissed'],
  },
]

const FILTER_MOTION_CLASS =
  'transition-colors duration-200 motion-reduce:transition-none'

const SYSTEM_COVERAGE_NOTES = new Set([
  'no website',
  'website unavailable',
  'no phone',
  'phone unavailable',
  'no address',
  'address unavailable',
  'no location',
  'location unavailable',
])

const FILTER_MOTION_STYLE = {
  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

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

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function textValue(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function denseRowNote(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? ''
  if (!normalized || SYSTEM_COVERAGE_NOTES.has(normalized)) return null
  return value ?? null
}

function displayTitleCase(value: string): string {
  return value.replace(/[A-Za-z][A-Za-z']*/g, (word) => {
    if (word.length <= 2 && word === word.toUpperCase()) return word
    return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
  })
}

function displayMarket(value: string | null | undefined): string {
  const trimmed = textValue(value)
  if (!trimmed) return ''
  return trimmed
    .split(',')
    .map((part, index) => {
      const next = part.trim()
      if (index > 0 && /^[a-z]{2}$/i.test(next)) return next.toUpperCase()
      return displayTitleCase(next)
    })
    .join(', ')
}

function displayCategory(value: string | null | undefined): string {
  const trimmed = textValue(value)
  return trimmed ? displayTitleCase(trimmed) : ''
}

function statusLabel(status: SavedLeadLifecycleStatus): string {
  return STATUS_META[status]?.label ?? status
}

function hasPhone(row: SavedLeadPipelineRow): boolean {
  return textValue(row.phone).length > 0
}

function hasWebsite(row: SavedLeadPipelineRow): boolean {
  return textValue(row.website).length > 0
}

function hasAddress(row: SavedLeadPipelineRow): boolean {
  return textValue(row.address).length > 0
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

function countForFilter(
  counts: Record<SavedLeadLifecycleStatus, number>,
  filter: LifecycleFilter,
): number {
  return filter.statuses.reduce((total, status) => total + counts[status], 0)
}

function filterAccessibleLabel(filter: LifecycleFilter, count: number): string {
  if (filter.key === 'all') return `All leads, ${count}`
  if (filter.key === 'lost') return `Lost and dismissed leads, ${count}`
  return `${filter.label} leads, ${count}`
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

function compareBusinessName(a: SavedLeadPipelineRow, b: SavedLeadPipelineRow): number {
  return textValue(a.businessName).localeCompare(textValue(b.businessName), undefined, { sensitivity: 'base' }) ||
    b.updatedAtMs - a.updatedAtMs
}

function formatAge(valueMs: number, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - valueMs)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks}w ago`
  return displayDate(new Date(valueMs).toISOString())
}

function detailLine(row: SavedLeadPipelineRow): string {
  return [
    displayCategory(row.category),
    displayMarket(row.market ?? row.address),
  ].filter(Boolean).join(' · ')
}

function formatCompactAge(valueMs: number, nowMs: number): string {
  return formatAge(valueMs, nowMs).replace(' ago', '').replace('just now', 'now')
}

function OpenLeadLink({ row, className }: { row: SavedLeadPipelineRow; className?: string }) {
  return (
    <Link
      href={`/app/leads/${row.id}`}
      className={className}
    >
      {row.businessName}
    </Link>
  )
}

export function MyLeadsView({ leads }: Props) {
  const [rows, setRows] = useState<SavedLeadPipelineRow[]>(leads)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() => createNoteDrafts(leads))
  const [message, setMessage] = useState<MailboxNotice | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(leads)
    setActiveLeadId(null)
    setEditingNoteId(null)
    setNoteDrafts(createNoteDrafts(leads))
    setUndoToast(null)
  }, [leads])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [])

  const statusCounts = useMemo(() => countByStatus(rows), [rows])
  const activeFilterMeta = LIFECYCLE_FILTERS.find((filter) => filter.key === activeFilter) ?? LIFECYCLE_FILTERS[0]

  const sortedRows = useMemo(() => [...rows].sort(compareBusinessName), [rows])

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sortedRows.filter((row) => {
      if (activeFilter !== 'all' && !activeFilterMeta.statuses.includes(row.lifecycleStatus)) return false
      return rowMatchesSearch(row, query)
    })
  }, [sortedRows, activeFilter, activeFilterMeta.statuses, search])

  useEffect(() => {
    if (visibleRows.length === 0) setExportMenuOpen(false)
  }, [visibleRows.length])

  const activeLead = useMemo(
    () => rows.find((row) => row.id === activeLeadId) ?? null,
    [rows, activeLeadId],
  )

  const latestUpdateMs = useMemo(() => {
    return rows.reduce((latest, row) => Math.max(latest, row.updatedAtMs), 0)
  }, [rows])

  const leadCountLabel = rows.length === 1 ? '1 saved lead' : `${rows.length} saved leads`
  const updatedLabel = latestUpdateMs > 0 ? `Updated ${formatAge(latestUpdateMs, nowMs)}` : 'No saved leads yet'

  function exportCsv() {
    downloadText('fetchi-saved-leads.csv', 'text/csv;charset=utf-8', exportSavedLeadsCsv(visibleRows))
  }

  function exportJson() {
    downloadText('fetchi-saved-leads.json', 'application/json;charset=utf-8', exportSavedLeadsJson(visibleRows))
  }

  function startEditingNote(row: SavedLeadPipelineRow) {
    setEditingNoteId(row.id)
    setNoteDrafts((current) => ({ ...current, [row.id]: denseRowNote(row.note) ?? '' }))
  }

  function closeSheet() {
    setActiveLeadId(null)
    setEditingNoteId(null)
  }

  function changeStatus(
    row: SavedLeadPipelineRow,
    status: SavedLeadLifecycleStatus,
    options: { showUndo?: boolean; closeSheet?: boolean } = {},
  ) {
    if (row.lifecycleStatus === status || isPending) return
    const showUndo = options.showUndo ?? true
    const previousStatus = row.lifecycleStatus
    const before = rows
    const now = new Date().toISOString()
    setPendingId(row.id)
    setMessage(null)
    if (options.closeSheet) closeSheet()
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
        setUndoToast(null)
        setMessage({ text: result.error ?? 'Status was not updated.', tone: 'error' })
      } else if (showUndo) {
        setUndoToast({
          id: `${row.id}-${Date.now()}`,
          rowId: row.id,
          businessName: row.businessName,
          previousStatus,
          nextStatus: status,
        })
      } else {
        setUndoToast(null)
      }
      setPendingId(null)
    })
  }

  function undoStatusChange(toast: UndoToast) {
    if (isPending) return
    const row = rows.find((item) => item.id === toast.rowId)
    if (!row) return
    setUndoToast(null)
    changeStatus(row, toast.previousStatus, { showUndo: false })
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
        setMessage({ text: result.error ?? 'Note was not saved.', tone: 'error' })
      } else {
        setEditingNoteId(null)
        setMessage({ text: `Saved note for ${row.businessName}.`, tone: 'success' })
      }
      setPendingId(null)
    })
  }

  return (
    <div className="min-h-full bg-bg text-text" data-cp23b-mailbox-surface data-fetchi-my-leads-v5>
      <div className="mx-auto flex w-full max-w-[760px] flex-col px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
        <header className="flex flex-col gap-5">
          <div
            className="flex items-start justify-between gap-3"
            data-cp24a-my-leads-action-row
          >
            <div className="min-w-0 pt-0.5">
              <h1 className="font-fetchi text-[22px] font-semibold leading-tight tracking-[-0.02em]">
                My Leads
              </h1>
              <div className="mt-1 text-[13px] font-medium leading-snug text-text2">
                {leadCountLabel} · {updatedLabel}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label={filtersVisible ? 'Hide lead filters' : 'Show lead filters'}
                aria-controls="fetchi-my-leads-filters"
                aria-expanded={filtersVisible}
                onClick={() => setFiltersVisible((visible) => !visible)}
                className={cn(
                  'fetchi-focus-ring inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border bg-fetchiOverlay text-text2 transition-colors hover:border-[var(--fetchi-border-strong)] hover:bg-fetchiOverlayHover hover:text-text',
                  filtersVisible && 'border-[var(--fetchi-border-strong)] text-text',
                )}
                data-fetchi-filter-utility
              >
                <ListFilter className="h-5 w-5" />
              </button>

              <div
                className="relative"
                data-cp24a-export-utility
                data-cp24b-export-utility
                data-fetchi-export-utility
              >
                <button
                  type="button"
                  disabled={visibleRows.length === 0}
                  aria-label="Export saved leads"
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  onClick={() => setExportMenuOpen((open) => !open)}
                  className="fetchi-focus-ring inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-fetchiOverlay text-text2 transition-colors hover:border-[var(--fetchi-border-strong)] hover:bg-fetchiOverlayHover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  data-fetchi-export-control
                >
                  <ArrowDownToLine className="h-5 w-5" />
                </button>

                {exportMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-20 w-40 overflow-hidden rounded-xl border border-border bg-fetchiOverlay p-1.5 shadow-[0_18px_45px_-22px_rgba(0,0,0,0.9)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false)
                        exportCsv()
                      }}
                      className="fetchi-focus-ring flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-semibold text-text transition-colors hover:bg-fetchiOverlayHover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDownToLine className="h-4 w-4 text-text2" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false)
                        exportJson()
                      }}
                      className="fetchi-focus-ring flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-semibold text-text transition-colors hover:bg-fetchiOverlayHover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FileJson className="h-4 w-4 text-text2" />
                      Export JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border bg-fetchiOverlay px-3.5 text-text2 focus-within:border-[var(--fetchi-accent-border)] focus-within:shadow-[var(--fetchi-focus-ring)]" data-fetchi-search-control>
            <Search className="h-5 w-5 flex-shrink-0 text-textMuted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search saved leads"
              aria-label="Search saved leads"
              className="min-h-[44px] min-w-0 flex-1 bg-transparent text-[14px] font-medium text-text outline-none placeholder:text-textMuted"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="fetchi-focus-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-textMuted transition-colors hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {filtersVisible && (
          <nav
            data-fetchi-filter-fit-v5
            id="fetchi-my-leads-filters"
            aria-label="Lifecycle filters"
            className="mt-5 w-full"
            data-cp23b-filter-rail
            data-cp23c-mailbox-filter-rail
            data-cp24b-smooth-filter-motion
            data-cp24c-filter-final-grammar
            data-cp24c-smooth-filter-motion
            data-cp24c-hover-edge-safe
          >
            <div
              className="grid w-full gap-1.5"
              style={{ gridTemplateColumns: '0.78fr 1fr 1.45fr 0.82fr 0.85fr' }}
              data-fetchi-separated-filter-tabs
            >
              {LIFECYCLE_FILTERS.map((filter) => {
                const isActive = filter.key === activeFilter
                const count = filter.key === 'all' ? rows.length : countForFilter(statusCounts, filter)

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className="group inline-flex h-11 min-h-[44px] min-w-0 items-center justify-center bg-transparent p-0 focus-visible:outline-none"
                    aria-label={filterAccessibleLabel(filter, count)}
                    aria-pressed={isActive}
                    data-fetchi-filter-hit-target
                    data-cp24c-lifecycle-active-color={isActive ? true : undefined}
                    data-cp24c-hover-edge-safe
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-flex h-8 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-[8px] border px-1 text-[13px] font-medium leading-none group-focus-visible:[box-shadow:var(--fetchi-focus-ring)]',
                        FILTER_MOTION_CLASS,
                        isActive
                          ? ACTIVE_FILTER_CLASS
                          : 'border-border bg-transparent text-text2 shadow-none group-hover:border-[var(--fetchi-border-strong)] group-hover:bg-fetchiOverlay group-hover:text-text',
                      )}
                      style={FILTER_MOTION_STYLE}
                      data-fetchi-filter-visible-pill
                    >
                      <span className="whitespace-nowrap" data-fetchi-filter-label>{filter.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}

        {message && (
          <div
            role={message.tone === 'error' ? 'alert' : 'status'}
            aria-live={message.tone === 'error' ? 'assertive' : 'polite'}
            className={cn(
              'mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold',
              message.tone === 'error'
                ? 'border-semanticRed/25 bg-semanticRed/10 text-semanticRed'
                : 'border-semanticGreen/25 bg-semanticGreen/10 text-semanticGreen',
            )}
          >
            {message.tone === 'error'
              ? <AlertCircle className="h-4 w-4" aria-hidden="true" />
              : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {message.text}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-5 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fetchiOverlay text-textMuted">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-fetchi text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              Your lead mailbox is empty.
            </h2>
            <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-text2">
              Use Fetch to build your list.
            </p>
            <Link
              href="/app/sweep"
              aria-label="Open Fetch leads"
              className="fetchi-focus-ring mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-fetchiAccent px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)]"
            >
              Open Fetch
            </Link>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-16 text-center">
            <h2 className="font-fetchi text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              No leads in this view.
            </h2>
            <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-text2">
              Clear search or change the lifecycle filter.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border/70" data-cp23b-flat-list>
            {visibleRows.map((row) => {
              const meta = STATUS_META[row.lifecycleStatus]
              const detail = detailLine(row)
              const source = textValue(row.source)
              const denseNote = denseRowNote(row.note)
              const isRowPending = isPending && pendingId === row.id
              return (
                <div
                  key={row.id}
                  className={cn(
                    'group relative grid min-h-[96px] grid-cols-[44px_minmax(0,1fr)_68px] items-center gap-3 rounded-lg py-3 transition-colors',
                    activeLeadId === row.id && 'fetchi-selected-row',
                  )}
                  data-cp23b-mailbox-row
                  data-fetchi-dense-row
                  data-fetchi-selected-row={activeLeadId === row.id ? true : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setActiveLeadId(row.id)}
                    aria-label={`Open actions for ${row.businessName}`}
                    aria-expanded={activeLeadId === row.id}
                    aria-controls={`fetchi-lead-action-sheet-${row.id}`}
                    className="fetchi-focus-ring absolute inset-0 cursor-pointer rounded-lg transition-colors hover:bg-fetchiOverlay active:bg-fetchiOverlayHover"
                    data-fetchi-row-action
                  >
                  </button>
                  <div
                    className={cn(
                      'pointer-events-none relative z-10 flex h-10 w-10 items-center justify-center',
                      meta.quietClass,
                    )}
                    role="img"
                    aria-label={statusLabel(row.lifecycleStatus)}
                    data-fetchi-lifecycle-glyph
                  >
                    <StatusGlyph
                      aria-hidden="true"
                      size={40}
                      state={row.lifecycleStatus === 'dismissed' ? 'lost' : row.lifecycleStatus}
                      strokeWidth={1.65}
                    />
                  </div>

                  <div className="pointer-events-none relative z-10 min-w-0">
                    <OpenLeadLink
                      row={row}
                      className="fetchi-focus-ring pointer-events-auto block truncate rounded-md py-0.5 font-fetchi text-[15px] font-semibold leading-[1.35] text-text no-underline visited:text-text hover:no-underline"
                    />
                    {detail ? (
                      <div className="truncate text-[12.5px] font-normal leading-snug text-text2">
                        {detail}
                      </div>
                    ) : null}
                    <div
                      className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden"
                      data-fetchi-dense-contact-metadata
                    >
                      <CoverageIndicator
                        addressAvailable={hasAddress(row)}
                        className="shrink-0"
                        phoneAvailable={hasPhone(row)}
                        websiteAvailable={hasWebsite(row)}
                      />
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[12px] text-[#4A4E54]"
                      >
                        ·
                      </span>
                      <SignalBars
                        data-fetchi-dense-signal-state
                        level="unchecked"
                        size={16}
                      />
                      {source ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-[12px] text-[#4A4E54]"
                          >
                            ·
                          </span>
                          <SourceAttribution
                            className="min-w-0 flex-1"
                            source={row.source}
                            variant="inline"
                          />
                        </>
                      ) : null}
                    </div>
                    {denseNote && (
                      <div className="mt-1 hidden truncate text-[12px] font-medium leading-snug text-text2/80 sm:block">
                        {denseNote}
                      </div>
                    )}
                    {isRowPending && (
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-textMuted" role="status" aria-live="polite">
                        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        Saving
                      </div>
                    )}
                  </div>

                  <div
                    className="pointer-events-none relative z-10 flex items-center justify-end gap-2 text-textMuted"
                    data-fetchi-row-metadata
                  >
                    <span className="tabular-nums text-[11.5px] font-medium">
                      {formatCompactAge(row.updatedAtMs, nowMs)}
                    </span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {undoToast && (
        <div className="fixed inset-x-4 bottom-[142px] z-40 mx-auto flex max-w-[420px] items-center gap-3 rounded-xl border border-border bg-fetchiOverlayHover px-4 py-3 text-[13px] font-semibold text-text shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] sm:bottom-6">
          <CheckCircle2 className={cn('h-4 w-4 flex-shrink-0', STATUS_META[undoToast.nextStatus].quietClass)} />
          <div className="min-w-0 flex-1 truncate">
            {undoToast.businessName} moved to {statusLabel(undoToast.nextStatus)}.
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => undoStatusChange(undoToast)}
            className="fetchi-focus-ring min-h-[44px] flex-shrink-0 rounded-lg bg-fetchiAccent px-3 text-[12px] font-semibold text-white hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      )}

      <LeadActionSheet
        row={activeLead}
        nowMs={nowMs}
        isPending={isPending}
        pendingId={pendingId}
        editingNoteId={editingNoteId}
        noteDraft={activeLead ? denseRowNote(noteDrafts[activeLead.id]) ?? '' : ''}
        displayNote={activeLead ? denseRowNote(activeLead.note) : null}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        onStartEditingNote={startEditingNote}
        onCancelEditingNote={() => setEditingNoteId(null)}
        onNoteDraftChange={(rowId, value) => {
          setNoteDrafts((current) => ({ ...current, [rowId]: value }))
        }}
        onSaveNote={saveNote}
        onChangeStatus={(row, status) => changeStatus(row, status, { closeSheet: true })}
      />
    </div>
  )
}

function createNoteDrafts(leads: readonly SavedLeadPipelineRow[]): Record<string, string> {
  return Object.fromEntries(leads.map((lead) => [lead.id, lead.note ?? '']))
}
