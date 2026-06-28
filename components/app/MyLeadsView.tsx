'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowDownToLine,
  CheckCircle2,
  ExternalLink,
  FileJson,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Search,
  UserRound,
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

const STATUS_TABS: Array<{ key: 'all' | SavedLeadLifecycleStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'saved', label: 'Saved' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'won', label: 'Won' },
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

function statusLabel(status: SavedLeadLifecycleStatus): string {
  return STATUS_OPTIONS.find((option) => option.key === status)?.label ?? status
}

function createNoteDrafts(leads: readonly SavedLeadPipelineRow[]): Record<string, string> {
  return Object.fromEntries(leads.map((lead) => [lead.id, lead.note ?? '']))
}

export function MyLeadsView({ leads }: Props) {
  const [rows, setRows] = useState<SavedLeadPipelineRow[]>(leads)
  const [activeStatus, setActiveStatus] = useState<'all' | SavedLeadLifecycleStatus>('all')
  const [search, setSearch] = useState('')
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() => createNoteDrafts(leads))
  const [message, setMessage] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(leads)
    setNoteDrafts(createNoteDrafts(leads))
  }, [leads])

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: rows.length }
    for (const tab of STATUS_TABS) if (tab.key !== 'all') next[tab.key] = 0
    for (const row of rows) {
      next[row.lifecycleStatus] = (next[row.lifecycleStatus] ?? 0) + 1
    }
    return next
  }, [rows])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (activeStatus !== 'all' && row.lifecycleStatus !== activeStatus) return false
      if (!query) return true
      return [
        row.businessName,
        row.phone,
        row.website,
        row.email,
        row.owner,
        row.market,
        row.address,
        row.category,
        row.note,
      ].some((value) => (value ?? '').toLowerCase().includes(query))
    })
  }, [rows, activeStatus, search])

  function exportCsv() {
    downloadText('fetchi-saved-leads.csv', 'text/csv;charset=utf-8', exportSavedLeadsCsv(filtered))
  }

  function exportJson() {
    downloadText('fetchi-saved-leads.json', 'application/json;charset=utf-8', exportSavedLeadsJson(filtered))
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
        setMessage(`Saved note for ${row.businessName}.`)
      }
      setPendingId(null)
    })
  }

  return (
    <div className="min-h-full bg-bg text-text">
      <div className="mx-auto flex w-full max-w-[1420px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-outfit text-[30px] lg:text-[34px] font-extrabold leading-tight">
              My Leads
            </h1>
            <div className="mt-1 text-[13.5px] text-text/55">
              {rows.length === 0
                ? 'No saved leads yet'
                : `${rows.length} saved lead${rows.length === 1 ? '' : 's'} in your pipeline`}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex h-10 min-w-0 items-center gap-2 rounded-lg bg-surface border border-text/10 px-3 sm:w-[320px]">
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
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2 bg-ok text-bg hover:bg-ok/90">
                <Link href="/app/sweep">
                  <Search className="h-4 w-4" />
                  Run a sweep
                </Link>
              </Button>
              <Button type="button" variant="outline" disabled={filtered.length === 0} onClick={exportCsv} className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" disabled={filtered.length === 0} onClick={exportJson} className="gap-2">
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const active = activeStatus === tab.key
            const count = counts[tab.key] ?? 0
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatus(tab.key)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition-colors',
                  active
                    ? 'bg-text text-bg'
                    : 'bg-surface text-text/70 border border-text/8 hover:text-text',
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
          <div className="min-h-[420px] rounded-lg border border-text/8 bg-surface px-4 py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-text/8 text-text/55">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-outfit text-[24px]">Your pipeline is empty — run a sweep to fill it.</h2>
            <Button asChild className="mt-5 gap-2 bg-ok text-bg hover:bg-ok/90">
              <Link href="/app/sweep">
                <Search className="h-4 w-4" />
                Run a sweep
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-text/8 bg-surface">
            <div className="flex min-h-[54px] items-center justify-between gap-3 px-4 py-3">
              <div className="text-[13px] font-semibold text-text">
                {filtered.length} visible lead{filtered.length === 1 ? '' : 's'}
              </div>
              <div className="text-[12px] text-text/42">
                Export uses current filters
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <h2 className="font-outfit text-[22px]">No matching saved leads.</h2>
                <p className="mt-2 text-[14px] text-text/50">Clear search or change the status filter.</p>
              </div>
            ) : (
              <div className="max-h-[720px] overflow-auto">
                <table className="w-full border-collapse text-left text-[13.5px]">
                  <thead className="sticky top-0 z-10 bg-raised text-[11px] uppercase tracking-[0.9px] text-text/42">
                    <tr>
                      <th className="px-4 py-3 font-bold">Business</th>
                      <th className="px-4 py-3 font-bold">Contact</th>
                      <th className="px-4 py-3 font-bold">Market</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Note</th>
                      <th className="px-4 py-3 font-bold">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const isRowPending = isPending && pendingId === row.id
                      return (
                        <tr key={row.id} className="border-t border-text/8 align-top">
                          <td className="min-w-[240px] px-4 py-3">
                            <div className="font-semibold leading-snug text-text">{row.businessName}</div>
                            {row.category && (
                              <div className="mt-1 text-[12px] text-text/45">{row.category}</div>
                            )}
                            {row.website && (
                              <a
                                href={row.website}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-ok hover:text-ok/80"
                              >
                                <Globe2 className="h-3.5 w-3.5" />
                                <span className="break-all">{displayUrl(row.website)}</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </a>
                            )}
                          </td>
                          <td className="min-w-[220px] px-4 py-3">
                            <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 font-medium text-text">
                              <Phone className="h-3.5 w-3.5 text-text/45" />
                              {row.phone}
                            </a>
                            {row.email && (
                              <a href={`mailto:${row.email}`} className="mt-2 flex items-center gap-1.5 text-ok">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="break-all">{row.email}</span>
                              </a>
                            )}
                            {row.owner && (
                              <div className="mt-2 flex items-center gap-1.5 text-text/70">
                                <UserRound className="h-3.5 w-3.5 text-text/38" />
                                {row.owner}
                              </div>
                            )}
                          </td>
                          <td className="min-w-[240px] px-4 py-3">
                            {row.address && (
                              <div className="flex gap-1.5 leading-snug text-text/75">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text/38" />
                                <span>{row.address}</span>
                              </div>
                            )}
                            <div className="mt-1 text-[12px] text-text/45">{row.market ?? ''}</div>
                          </td>
                          <td className="min-w-[150px] px-4 py-3">
                            <select
                              value={row.lifecycleStatus}
                              disabled={isRowPending || row.lifecycleStatus === 'dismissed'}
                              onChange={(event) => changeStatus(row, event.target.value as SavedLeadLifecycleStatus)}
                              className="h-9 w-full rounded-lg border border-text/10 bg-bg px-2 text-[13px] text-text outline-none disabled:opacity-60"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {isRowPending && (
                              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-text/45">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving
                              </div>
                            )}
                          </td>
                          <td className="min-w-[280px] px-4 py-3">
                            <textarea
                              value={noteDrafts[row.id] ?? ''}
                              onChange={(event) => {
                                const value = event.target.value
                                setNoteDrafts((current) => ({ ...current, [row.id]: value }))
                              }}
                              className="min-h-[74px] w-full resize-y rounded-lg border border-text/10 bg-bg px-3 py-2 text-[13px] leading-relaxed text-text outline-none placeholder:text-text/35"
                              placeholder="Add note"
                            />
                            <button
                              type="button"
                              disabled={isRowPending || (noteDrafts[row.id] ?? '') === (row.note ?? '')}
                              onClick={() => saveNote(row)}
                              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-ok px-3 text-[12px] font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save note
                            </button>
                          </td>
                          <td className="min-w-[130px] px-4 py-3 text-text/55">
                            <div>{displayDate(row.updatedAtIso)}</div>
                            <div className="mt-1 text-[12px] text-text/38">Saved {displayDate(row.savedAtIso)}</div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
