'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownToLine,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  ExternalLink,
  FileJson,
  Globe2,
  ListFilter,
  Loader2,
  MapPin,
  NotebookPen,
  Phone,
  PhoneCall,
  Save,
  Search,
  Trophy,
  X,
  XCircle,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

type FilterKey = 'all' | 'saved' | 'contacted' | 'won' | 'closed'

type LifecycleMeta = {
  label: string
  actionLabel: string
  discClass: string
  activeFilterClass: string
  quietClass: string
  actionClass: string
  icon: LucideIcon
}

type LifecycleFilter = {
  key: FilterKey
  label: string
  statuses: SavedLeadLifecycleStatus[]
  activeClass: string
  icon: LucideIcon
}

type UndoToast = {
  id: string
  rowId: string
  businessName: string
  previousStatus: SavedLeadLifecycleStatus
  nextStatus: SavedLeadLifecycleStatus
}

const GREEN_ACTION_CLASS =
  'bg-[#2EE08C] text-[#0B0D0C] hover:bg-[#29cc7f] active:bg-[#24b873]'

const STATUS_META: Record<SavedLeadLifecycleStatus, LifecycleMeta> = {
  saved: {
    label: 'Saved',
    actionLabel: 'Save',
    discClass: 'bg-[#FFCC00] text-[#0B0D0C]',
    activeFilterClass: 'border-[#FFCC00] bg-[#FFCC00] text-[#0B0D0C]',
    quietClass: 'text-[#FFCC00]',
    actionClass: 'bg-[#FFCC00]/10 text-[#FFCC00] hover:bg-[#FFCC00]/15',
    icon: Bookmark,
  },
  contacted: {
    label: 'Contacted',
    actionLabel: 'Mark as Contacted',
    discClass: 'bg-[#38B6F5] text-[#0B0D0C]',
    activeFilterClass: 'border-[#38B6F5] bg-[#38B6F5] text-[#0B0D0C]',
    quietClass: 'text-[#38B6F5]',
    actionClass: 'bg-[#38B6F5]/10 text-[#38B6F5] hover:bg-[#38B6F5]/15',
    icon: PhoneCall,
  },
  won: {
    label: 'Won',
    actionLabel: 'Mark as Won',
    discClass: 'bg-[#2EE08C] text-[#0B0D0C]',
    activeFilterClass: 'border-[#2EE08C] bg-[#2EE08C] text-[#0B0D0C]',
    quietClass: 'text-[#2EE08C]',
    actionClass: 'bg-[#2EE08C]/10 text-[#2EE08C] hover:bg-[#2EE08C]/15',
    icon: Trophy,
  },
  lost: {
    label: 'Lost',
    actionLabel: 'Dismiss',
    discClass: 'bg-[#EF5A4E] text-[#0B0D0C]',
    activeFilterClass: 'border-[#EF5A4E] bg-[#EF5A4E] text-[#0B0D0C]',
    quietClass: 'text-[#EF5A4E]',
    actionClass: 'bg-[#EF5A4E]/10 text-[#EF5A4E] hover:bg-[#EF5A4E]/15',
    icon: XCircle,
  },
  dismissed: {
    label: 'Dismissed',
    actionLabel: 'Dismiss',
    discClass: 'bg-[#EF5A4E] text-[#0B0D0C]',
    activeFilterClass: 'border-[#EF5A4E] bg-[#EF5A4E] text-[#0B0D0C]',
    quietClass: 'text-[#EF5A4E]',
    actionClass: 'bg-[#EF5A4E]/10 text-[#EF5A4E] hover:bg-[#EF5A4E]/15',
    icon: XCircle,
  },
}

const LIFECYCLE_FILTERS: LifecycleFilter[] = [
  {
    key: 'all',
    label: 'All',
    statuses: ['saved', 'contacted', 'won', 'lost', 'dismissed'],
    activeClass: 'border-[#F7F3E8] bg-[#F7F3E8] text-[#0B0D0C]',
    icon: ListFilter,
  },
  {
    key: 'saved',
    label: 'Saved',
    statuses: ['saved'],
    activeClass: STATUS_META.saved.activeFilterClass,
    icon: Bookmark,
  },
  {
    key: 'contacted',
    label: 'Contacted',
    statuses: ['contacted'],
    activeClass: STATUS_META.contacted.activeFilterClass,
    icon: PhoneCall,
  },
  {
    key: 'won',
    label: 'Won',
    statuses: ['won'],
    activeClass: STATUS_META.won.activeFilterClass,
    icon: Trophy,
  },
  {
    key: 'closed',
    label: 'Lost / Dismissed',
    statuses: ['lost', 'dismissed'],
    activeClass: STATUS_META.dismissed.activeFilterClass,
    icon: CircleSlash,
  },
]

const ACTION_STATUS_OPTIONS: SavedLeadLifecycleStatus[] = [
  'saved',
  'contacted',
  'won',
  'dismissed',
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

function statusLabel(status: SavedLeadLifecycleStatus): string {
  return STATUS_META[status]?.label ?? status
}

function initialsForName(value: string): string {
  const letters = value
    .split(/\s+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return letters || 'FL'
}

function hasPhone(row: SavedLeadPipelineRow): boolean {
  return textValue(row.phone).length > 0
}

function hasWebsite(row: SavedLeadPipelineRow): boolean {
  return textValue(row.website).length > 0
}

function hasLocation(row: SavedLeadPipelineRow): boolean {
  return textValue(row.address).length > 0 || textValue(row.market).length > 0
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
  return [row.category, row.market ?? row.address].filter(Boolean).join(' · ')
}

function formatCompactAge(valueMs: number, nowMs: number): string {
  return formatAge(valueMs, nowMs).replace(' ago', '').replace('just now', 'now')
}

function statusAgeLabel(row: SavedLeadPipelineRow, nowMs: number): string {
  return `${statusLabel(row.lifecycleStatus)} ${formatCompactAge(row.updatedAtMs, nowMs)}`
}

function statusActionsFor(row: SavedLeadPipelineRow): SavedLeadLifecycleStatus[] {
  return ACTION_STATUS_OPTIONS.filter((status) => {
    if (row.lifecycleStatus === status) return false
    if ((row.lifecycleStatus === 'lost' || row.lifecycleStatus === 'dismissed') && status === 'dismissed') {
      return false
    }
    return true
  })
}

function OpenLeadLink({ row, className }: { row: SavedLeadPipelineRow; className?: string }) {
  return (
    <Link
      href={`/app/leads/${row.id}`}
      className={className}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {row.businessName}
    </Link>
  )
}

function FieldPresenceIcon({
  icon: Icon,
  available,
  label,
  missingLabel,
}: {
  icon: LucideIcon
  available: boolean
  label: string
  missingLabel: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full',
        available ? 'text-[#B8B0A2]' : 'text-[#4E4A43]',
      )}
      title={available ? label : missingLabel}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{available ? label : missingLabel}</span>
    </span>
  )
}

function LeadIconStatusStrip({
  row,
  nowMs,
}: {
  row: SavedLeadPipelineRow
  nowMs: number
}) {
  return (
    <div
      className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] font-semibold leading-snug text-[#7E786D]"
      data-cp23c-icon-status-strip
    >
      <FieldPresenceIcon
        icon={Phone}
        available={hasPhone(row)}
        label="Phone available"
        missingLabel="No phone"
      />
      <FieldPresenceIcon
        icon={Globe2}
        available={hasWebsite(row)}
        label="Website available"
        missingLabel="No website"
      />
      <FieldPresenceIcon
        icon={MapPin}
        available={hasLocation(row)}
        label="Location available"
        missingLabel="No location"
      />
      <span
        className={cn(
          'ml-1 inline-flex min-w-0 items-center rounded-full bg-[#20241F] px-2 py-1 text-[11.5px] font-extrabold leading-none',
          STATUS_META[row.lifecycleStatus].quietClass,
        )}
      >
        <span className="truncate">{statusAgeLabel(row, nowMs)}</span>
      </span>
    </div>
  )
}

export function MyLeadsView({ leads }: Props) {
  const [rows, setRows] = useState<SavedLeadPipelineRow[]>(leads)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() => createNoteDrafts(leads))
  const [message, setMessage] = useState<string | null>(null)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
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

  const activeLead = useMemo(
    () => rows.find((row) => row.id === activeLeadId) ?? null,
    [rows, activeLeadId],
  )

  const latestUpdateMs = useMemo(() => {
    return rows.reduce((latest, row) => Math.max(latest, row.updatedAtMs), 0)
  }, [rows])

  const leadCountLabel = rows.length === 1 ? '1 lead' : `${rows.length} leads`
  const updatedLabel = latestUpdateMs > 0 ? `Updated ${formatAge(latestUpdateMs, nowMs)}` : 'No saved leads yet'

  function exportCsv() {
    downloadText('fetchi-saved-leads.csv', 'text/csv;charset=utf-8', exportSavedLeadsCsv(visibleRows))
  }

  function exportJson() {
    downloadText('fetchi-saved-leads.json', 'application/json;charset=utf-8', exportSavedLeadsJson(visibleRows))
  }

  function startEditingNote(row: SavedLeadPipelineRow) {
    setEditingNoteId(row.id)
    setNoteDrafts((current) => ({ ...current, [row.id]: row.note ?? '' }))
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
        setMessage(result.error ?? 'Status was not updated.')
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
        setMessage(result.error ?? 'Note was not saved.')
      } else {
        setEditingNoteId(null)
        setMessage(`Saved note for ${row.businessName}.`)
      }
      setPendingId(null)
    })
  }

  return (
    <div className="min-h-full bg-[#0B0D0C] text-[#F7F3E8]" data-cp23b-mailbox-surface>
      <div className="mx-auto flex w-full max-w-[760px] flex-col px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-outfit text-[32px] font-extrabold leading-none">
                My Leads
              </h1>
              <div className="mt-2 text-[13px] font-medium text-[#B8B0A2]">
                {leadCountLabel} · {updatedLabel}
              </div>
            </div>
          </div>

          <div className="flex h-12 items-center gap-2 rounded-xl bg-[#171A18] px-4 text-[#B8B0A2]">
            <Search className="h-4 w-4 flex-shrink-0 text-[#7E786D]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#F7F3E8] outline-none placeholder:text-[#7E786D]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="text-[#7E786D] transition-colors hover:text-[#F7F3E8]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            className="grid grid-cols-[minmax(58px,0.72fr)_minmax(66px,0.78fr)_minmax(130px,1.45fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(220px,1.35fr)] sm:gap-3"
            data-cp23b-action-rail
            data-cp23c-compact-action-rail
          >
            <button
              type="button"
              disabled={visibleRows.length === 0}
              onClick={exportCsv}
              className="inline-flex h-[52px] min-w-0 items-center justify-center gap-1.5 rounded-[22px] border border-[#2A2F2B] bg-[#0B0D0C] px-2 text-[12.5px] font-extrabold text-[#F7F3E8] transition-colors hover:border-[#F7F3E8]/25 hover:bg-[#171A18] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:gap-3 sm:px-4 sm:text-[15px]"
            >
              <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5" />
              CSV
            </button>
            <button
              type="button"
              disabled={visibleRows.length === 0}
              onClick={exportJson}
              className="inline-flex h-[52px] min-w-0 items-center justify-center gap-1.5 rounded-[22px] border border-[#2A2F2B] bg-[#0B0D0C] px-2 text-[12.5px] font-extrabold text-[#F7F3E8] transition-colors hover:border-[#F7F3E8]/25 hover:bg-[#171A18] disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:gap-3 sm:px-4 sm:text-[15px]"
            >
              <FileJson className="h-4 w-4 sm:h-5 sm:w-5" />
              JSON
            </button>
            <Link
              href="/app/sweep"
              className={cn(
                'inline-flex h-[52px] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[22px] px-2.5 text-[12.5px] font-extrabold transition-colors sm:h-14 sm:gap-3 sm:px-5 sm:text-[15px]',
                GREEN_ACTION_CLASS,
              )}
            >
              <Search className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
              Run a sweep
            </Link>
          </div>
        </header>

        <nav
          aria-label="Lifecycle filters"
          className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-cp23b-filter-rail
          data-cp23c-mailbox-filter-rail
        >
          {LIFECYCLE_FILTERS.map((filter) => {
            const active = activeFilter === filter.key
            const count = filter.key === 'all' ? rows.length : countForFilter(statusCounts, filter)
            const Icon = filter.icon
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  'inline-flex h-[58px] shrink-0 items-center justify-center rounded-[24px] border text-[13px] font-extrabold transition-all',
                  active
                    ? cn('min-w-[140px] gap-2.5 px-5 shadow-[0_16px_35px_-26px_rgba(247,243,232,0.65)]', filter.activeClass)
                    : 'w-10 border-[#2A2F2B] bg-[#171A18] !h-[58px] !w-[76px] rounded-[24px] text-[#9D98A3] hover:border-[#F7F3E8]/20 hover:text-[#F7F3E8]',
                )}
                aria-label={`${filter.label}: ${count}`}
                title={`${filter.label}: ${count}`}
              >
                <Icon className="h-5 w-5" />
                {active ? (
                  <>
                    <span>{filter.label}</span>
                    <span className="tabular-nums opacity-75">{count}</span>
                  </>
                ) : (
                  <span className="sr-only">
                    {filter.label} {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {message && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#2EE08C]/25 bg-[#2EE08C]/10 px-4 py-3 text-[13px] font-semibold text-[#2EE08C]">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-5 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171A18] text-[#7E786D]">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-outfit text-[24px] font-extrabold leading-tight">
              Your lead mailbox is empty.
            </h2>
            <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-[#B8B0A2]">
              Run a sweep to save leads here.
            </p>
            <Link
              href="/app/sweep"
              className={cn('mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-extrabold transition-colors', GREEN_ACTION_CLASS)}
            >
              <Search className="h-4 w-4" />
              Run a sweep
            </Link>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-16 text-center">
            <h2 className="font-outfit text-[24px] font-extrabold leading-tight">
              No leads in this view.
            </h2>
            <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-[#B8B0A2]">
              Clear search or change the lifecycle filter.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#2A2F2B]/70" data-cp23b-flat-list>
            {visibleRows.map((row) => {
              const meta = STATUS_META[row.lifecycleStatus]
              const detail = detailLine(row)
              const isRowPending = isPending && pendingId === row.id
              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveLeadId(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveLeadId(row.id)
                    }
                  }}
                  className="group grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-4 outline-none transition-colors hover:bg-[#171A18]/55 focus-visible:bg-[#171A18]/75"
                  data-cp23b-mailbox-row
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-extrabold',
                      meta.discClass,
                    )}
                    aria-label={statusLabel(row.lifecycleStatus)}
                  >
                    {initialsForName(row.businessName)}
                  </div>

                  <div className="min-w-0">
                    <OpenLeadLink
                      row={row}
                      className="block truncate font-outfit text-[17.5px] font-extrabold leading-tight text-[#F7F3E8] underline-offset-4 hover:underline"
                    />
                    <div className="mt-1 truncate text-[13.5px] font-normal leading-snug text-[#B8B0A2]">
                      {detail || row.source}
                    </div>
                    <LeadIconStatusStrip row={row} nowMs={nowMs} />
                    {row.note && (
                      <div className="mt-1 truncate text-[12px] font-medium leading-snug text-[#B8B0A2]/80">
                        {row.note}
                      </div>
                    )}
                    {isRowPending && (
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#7E786D]">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pl-1 text-[12px] font-semibold text-[#7E786D]">
                    <span className="hidden tabular-nums sm:inline">
                      {formatAge(row.updatedAtMs, nowMs)}
                    </span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {undoToast && (
        <div className="fixed inset-x-4 bottom-[142px] z-40 mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl border border-[#2A2F2B] bg-[#20241F] px-4 py-3 text-[13px] font-semibold text-[#F7F3E8] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] sm:bottom-6">
          <CheckCircle2 className={cn('h-4 w-4 flex-shrink-0', STATUS_META[undoToast.nextStatus].quietClass)} />
          <div className="min-w-0 flex-1 truncate">
            {undoToast.businessName} moved to {statusLabel(undoToast.nextStatus)}.
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => undoStatusChange(undoToast)}
            className="flex-shrink-0 rounded-full bg-[#F7F3E8] px-3 py-1.5 text-[12px] font-extrabold text-[#0B0D0C] disabled:cursor-not-allowed disabled:opacity-50"
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
        noteDraft={activeLead ? noteDrafts[activeLead.id] ?? '' : ''}
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

function LeadActionSheet({
  row,
  nowMs,
  isPending,
  pendingId,
  editingNoteId,
  noteDraft,
  onOpenChange,
  onStartEditingNote,
  onCancelEditingNote,
  onNoteDraftChange,
  onSaveNote,
  onChangeStatus,
}: {
  row: SavedLeadPipelineRow | null
  nowMs: number
  isPending: boolean
  pendingId: string | null
  editingNoteId: string | null
  noteDraft: string
  onOpenChange: (open: boolean) => void
  onStartEditingNote: (row: SavedLeadPipelineRow) => void
  onCancelEditingNote: () => void
  onNoteDraftChange: (rowId: string, value: string) => void
  onSaveNote: (row: SavedLeadPipelineRow) => void
  onChangeStatus: (row: SavedLeadPipelineRow, status: SavedLeadLifecycleStatus) => void
}) {
  const isEditingNote = row ? editingNoteId === row.id : false
  const isRowPending = Boolean(row && isPending && pendingId === row.id)

  return (
    <Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] w-full max-w-none overflow-y-auto rounded-t-[28px] border-x border-t border-[#2A2F2B] bg-[#171A18] px-5 pb-6 pt-5 text-[#F7F3E8] shadow-[0_-24px_70px_-30px_rgba(0,0,0,0.9)] sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(460px,calc(100%-32px))] sm:-translate-x-1/2 sm:rounded-[28px] sm:border"
        data-cp23b-action-sheet
      >
        {row && (
          <>
            <SheetHeader className="space-y-0 pr-8 text-left">
              <div className="flex items-start gap-3">
                <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold', STATUS_META[row.lifecycleStatus].discClass)}>
                  {initialsForName(row.businessName)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate font-outfit text-[18px] font-extrabold leading-tight text-[#F7F3E8]">
                    {row.businessName}
                  </SheetTitle>
                  <SheetDescription className="mt-1 truncate text-[13px] text-[#B8B0A2]">
                    {detailLine(row) || row.source}
                  </SheetDescription>
                  <div className="mt-1 text-[12px] font-semibold text-[#7E786D]">
                    {statusAgeLabel(row, nowMs)}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {hasPhone(row) ? (
                <a
                  href={`tel:${row.phone}`}
                  className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-[#20241F] text-[11px] font-bold text-[#F7F3E8] transition-colors hover:bg-[#2A2F2B]"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-[#20241F]/55 text-[11px] font-bold text-[#7E786D]"
                >
                  <Phone className="h-4 w-4" />
                  No phone
                </button>
              )}

              {hasWebsite(row) && row.website ? (
                <a
                  href={row.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-[#20241F] text-[11px] font-bold text-[#F7F3E8] transition-colors hover:bg-[#2A2F2B]"
                >
                  <Globe2 className="h-4 w-4" />
                  Website
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-[#20241F]/55 text-[11px] font-bold text-[#7E786D]"
                >
                  <Globe2 className="h-4 w-4" />
                  No website
                </button>
              )}

              <button
                type="button"
                onClick={() => onStartEditingNote(row)}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-[#20241F] text-[11px] font-bold text-[#F7F3E8] transition-colors hover:bg-[#2A2F2B]"
              >
                <NotebookPen className="h-4 w-4" />
                {row.note ? 'Edit note' : 'Add note'}
              </button>

              <Link
                href={`/app/leads/${row.id}`}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-[#20241F] text-[11px] font-bold text-[#F7F3E8] transition-colors hover:bg-[#2A2F2B]"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Link>
            </div>

            {isEditingNote && (
              <div className="mt-4 rounded-2xl bg-[#20241F] p-3">
                <textarea
                  value={noteDraft}
                  onChange={(event) => onNoteDraftChange(row.id, event.target.value)}
                  className="min-h-[92px] w-full resize-y rounded-xl border border-[#2A2F2B] bg-[#0B0D0C] px-3 py-2 text-[14px] leading-relaxed text-[#F7F3E8] outline-none placeholder:text-[#7E786D]"
                  placeholder="Add note"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isRowPending || noteDraft === (row.note ?? '')}
                    onClick={() => onSaveNote(row)}
                    className={cn('inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-45', GREEN_ACTION_CLASS)}
                  >
                    <Save className="h-4 w-4" />
                    Save note
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEditingNote}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#2A2F2B] px-4 text-[13px] font-bold text-[#B8B0A2] hover:text-[#F7F3E8]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {statusActionsFor(row).map((status) => {
                const meta = STATUS_META[status]
                const Icon = meta.icon
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={isRowPending}
                    onClick={() => onChangeStatus(row, status)}
                    className={cn(
                      'flex h-11 w-full items-center justify-between rounded-xl px-4 text-[13px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      meta.actionClass,
                    )}
                  >
                    <span>{meta.actionLabel}</span>
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>

            <div className="mt-4 grid gap-1 text-[12px] font-medium text-[#7E786D]">
              <span>Source: {row.source}</span>
              <span>Saved {displayDate(row.savedAtIso)} · Updated {displayDate(row.updatedAtIso)}</span>
              {hasWebsite(row) && row.website && (
                <span className="truncate">Website: {displayUrl(row.website)}</span>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
