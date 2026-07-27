'use client'

import { useRef } from 'react'
import Link from 'next/link'
import {
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  NotebookPen,
  Phone,
  RefreshCw,
  X,
} from 'lucide-react'

import type { SignalBarsLevel } from '@/components/fetchi-ui/SignalBars'
import {
  StatusGlyph,
  type StatusGlyphState,
} from '@/components/fetchi-ui/StatusGlyph'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type {
  SavedLeadLifecycleStatus,
  SavedLeadPipelineRow,
} from '@/lib/runtime/sweep/saved-leads'
import { cn } from '@/lib/utils'

export type LeadActionSheetSignalSummary = {
  level: SignalBarsLevel
  label: string
  checkedAt?: string
  signalType?: string
  evidenceCount?: number
  evidenceDate?: string
  whyNow?: string
}

type Props = {
  row: SavedLeadPipelineRow | null
  nowMs: number
  isPending: boolean
  pendingId: string | null
  editingNoteId: string | null
  noteDraft: string
  displayNote: string | null
  signalSummary?: LeadActionSheetSignalSummary
  onOpenChange: (open: boolean) => void
  onStartEditingNote: (row: SavedLeadPipelineRow) => void
  onCancelEditingNote: () => void
  onNoteDraftChange: (rowId: string, value: string) => void
  onSaveNote: (row: SavedLeadPipelineRow) => void
  onChangeStatus: (row: SavedLeadPipelineRow, status: SavedLeadLifecycleStatus) => void
  onCheckSignals?: (row: SavedLeadPipelineRow) => void
  isSignalCheckPending?: boolean
}

type LifecycleActionMeta = {
  actionLabel: string
  accessibleLabel: string
}

const SIGNAL_NOT_CHECKED: LeadActionSheetSignalSummary = {
  level: 'unchecked',
  label: 'Signal not checked',
}

const LIFECYCLE_SELECTOR_OPTIONS: SavedLeadLifecycleStatus[] = [
  'saved',
  'contacted',
  'won',
  'lost',
]

const LIFECYCLE_ACTION_META: Record<SavedLeadLifecycleStatus, LifecycleActionMeta> = {
  saved: {
    actionLabel: 'Saved',
    accessibleLabel: 'Mark as Saved',
  },
  contacted: {
    actionLabel: 'Contacted',
    accessibleLabel: 'Mark as Contacted',
  },
  won: {
    actionLabel: 'Won',
    accessibleLabel: 'Mark as Won',
  },
  lost: {
    actionLabel: 'Lost',
    accessibleLabel: 'Mark as Lost',
  },
  dismissed: {
    actionLabel: 'Lost',
    accessibleLabel: 'Mark as Lost',
  },
}

const PRIMARY_ACTION_CLASS =
  'bg-[var(--fetchi-accent)] text-[var(--fetchi-accent-contrast)] hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] focus-visible:ring-fetchiAccent'

function textValue(value: string | null | undefined): string {
  return (value ?? '').trim()
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

function hasCoordinates(row: SavedLeadPipelineRow): boolean {
  return Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
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

function detailLine(row: SavedLeadPipelineRow): string {
  return [
    row.category ? displayTitleCase(row.category) : '',
    displayMarket(row.market ?? row.address),
  ].filter(Boolean).join(' · ')
}

function formatCompactAge(valueMs: number, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - valueMs)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks}w`
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(valueMs))
}

function lifecycleLabel(status: SavedLeadLifecycleStatus): string {
  if (status === 'dismissed') return 'Dismissed'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function lifecycleGlyphState(status: SavedLeadLifecycleStatus): StatusGlyphState {
  return status === 'dismissed' ? 'lost' : status
}

function selectedLifecycleStatus(
  status: SavedLeadLifecycleStatus,
): SavedLeadLifecycleStatus {
  return status === 'lost' || status === 'dismissed' ? 'lost' : status
}

function lifecycleSelectorLabels(
  optionStatus: SavedLeadLifecycleStatus,
  currentStatus: SavedLeadLifecycleStatus,
  isSelected: boolean,
): { visibleLabel: string; accessibleLabel: string } {
  const meta = LIFECYCLE_ACTION_META[optionStatus]
  if (!isSelected) {
    return {
      visibleLabel: meta.actionLabel,
      accessibleLabel: meta.accessibleLabel,
    }
  }

  return {
    visibleLabel: meta.actionLabel,
    accessibleLabel:
      currentStatus === 'dismissed' && optionStatus === 'lost'
        ? 'Lost, current lifecycle; persisted as Dismissed'
        : `${meta.actionLabel}, current lifecycle`,
  }
}

function effectiveSignalSummary(
  row: SavedLeadPipelineRow,
  summary: LeadActionSheetSignalSummary,
): LeadActionSheetSignalSummary {
  if (summary.level === 'none' && !summary.checkedAt) {
    return SIGNAL_NOT_CHECKED
  }
  if (
    summary.level === 'time-sensitive' &&
    (!summary.signalType ||
      !summary.evidenceDate ||
      !summary.whyNow ||
      !row.sourceUrl)
  ) {
    return SIGNAL_NOT_CHECKED
  }
  return summary
}

function directionsHref(row: SavedLeadPipelineRow): string | null {
  const query = hasCoordinates(row)
    ? `${row.latitude},${row.longitude}`
    : textValue(row.address)
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function websiteHref(value: string | null | undefined): string | null {
  const website = textValue(value)
  if (!website) return null
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function websiteDisplayValue(value: string | null | undefined): string {
  const website = textValue(value)
  if (!website) return ''
  try {
    return new URL(websiteHref(website) ?? website).hostname.replace(/^www\./i, '')
  } catch {
    return website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
  }
}

function shortSourceLabel(value: string | null | undefined): string {
  const source = textValue(value)
  if (!source) return 'Fetch'
  if (/google[\s_-]*(maps|places)|maps[\s_-]*google/i.test(source)) {
    return 'Google Maps'
  }
  return source
}

export function LeadActionSheet({
  row,
  nowMs,
  isPending,
  pendingId,
  editingNoteId,
  noteDraft,
  displayNote,
  signalSummary = SIGNAL_NOT_CHECKED,
  onOpenChange,
  onStartEditingNote,
  onCancelEditingNote,
  onNoteDraftChange,
  onSaveNote,
  onChangeStatus,
  onCheckSignals,
  isSignalCheckPending = false,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const isEditingNote = row ? editingNoteId === row.id : false
  const isRowPending = Boolean(row && isPending && pendingId === row.id)
  const directions = row ? directionsHref(row) : null
  const website = row ? websiteHref(row.website) : null
  const updatedAge = row ? formatCompactAge(row.updatedAtMs, nowMs) : ''
  const displayedSignal = row
    ? effectiveSignalSummary(row, signalSummary)
    : SIGNAL_NOT_CHECKED

  return (
    <Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        ref={contentRef}
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          contentRef.current?.focus({ preventScroll: true })
        }}
        id={row ? `fetchi-lead-action-sheet-${row.id}` : undefined}
        className="flex max-h-[90dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[24px] border-x border-t border-white/[0.08] bg-[var(--fetchi-bg-elevated)] p-0 text-text shadow-[0_-20px_56px_-30px_rgba(0,0,0,0.92)] outline-none [&>button]:hidden sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(460px,calc(100%-32px))] sm:-translate-x-1/2 sm:rounded-[24px] sm:border"
        data-cp23b-action-sheet
        data-fetchi-action-sheet-v6
        data-fetchi-reduced-motion-sheet
      >
        {row ? (
          <>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3"
              data-fetchi-action-sheet-scroll-region
            >
              <div className="space-y-6">
                <div
                  aria-hidden="true"
                  className="mx-auto h-1 w-10 rounded-full bg-white/15"
                  data-fetchi-action-sheet-drag-handle
                />

                <SheetHeader
                  className="space-y-0 text-left"
                  data-fetchi-action-sheet-header
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-label={lifecycleLabel(row.lifecycleStatus)}
                      className="mt-1 inline-flex shrink-0"
                      role="img"
                    >
                      <StatusGlyph
                        aria-hidden="true"
                        size={20}
                        state={lifecycleGlyphState(row.lifecycleStatus)}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1">
                        <SheetTitle className="min-w-0 flex-1 font-fetchi text-[19px] font-semibold leading-tight tracking-[-0.02em] text-text">
                          {row.businessName}
                        </SheetTitle>
                        <div
                          className="-mr-2 -mt-2 flex shrink-0 items-center"
                          data-fetchi-action-sheet-header-actions
                        >
                          <Link
                            href={`/app/leads/${row.id}`}
                            aria-label={`Open ${row.businessName}`}
                            className="fetchi-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg text-textMuted transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                            data-fetchi-action-sheet-open-lead
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label="Close lead sheet"
                            onClick={() => onOpenChange(false)}
                            className="fetchi-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg text-textMuted transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                            data-fetchi-action-sheet-close
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <SheetDescription className="mt-1 text-[13px] leading-snug text-text2">
                        {detailLine(row) || 'Saved lead'}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <section
                  aria-labelledby="lead-lifecycle-selector-label"
                  data-fetchi-action-sheet-lifecycle-selector
                >
                  <div
                    className="mb-2 flex items-center justify-between gap-4"
                    data-fetchi-action-sheet-lifecycle-heading
                  >
                    <h3
                      id="lead-lifecycle-selector-label"
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted"
                    >
                      Lifecycle
                    </h3>
                    <span
                      className="text-[12px] text-textMuted"
                      data-fetchi-updated-age
                    >
                      updated {updatedAge === 'now' ? 'now' : `${updatedAge} ago`}
                    </span>
                  </div>
                  <div
                    aria-label="Lead lifecycle"
                    className="grid grid-cols-4 gap-0 rounded-xl bg-[var(--fetchi-raised)] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    data-fetchi-lifecycle-group-surface
                    role="group"
                  >
                    {LIFECYCLE_SELECTOR_OPTIONS.map((status) => {
                      const isSelected =
                        selectedLifecycleStatus(row.lifecycleStatus) === status
                      const labels = lifecycleSelectorLabels(
                        status,
                        row.lifecycleStatus,
                        isSelected,
                      )
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-label={labels.accessibleLabel}
                          aria-pressed={isSelected}
                          disabled={isRowPending}
                          onClick={() => {
                            if (isSelected) return
                            onChangeStatus(row, status)
                          }}
                          className={cn(
                            'fetchi-focus-ring inline-flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-[8px] px-1 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                            isSelected
                              ? 'bg-[var(--fetchi-overlay-active)] text-text shadow-[inset_0_0_0_1px_var(--fetchi-border-strong)]'
                              : 'text-textMuted hover:bg-fetchiOverlayHover hover:text-text2',
                          )}
                          data-fetchi-lifecycle-segment={status}
                          data-fetchi-lifecycle-selected-surface={
                            isSelected ? 'true' : undefined
                          }
                        >
                          <StatusGlyph
                            aria-hidden="true"
                            size={18}
                            state={lifecycleGlyphState(status)}
                          />
                          <span className="truncate">{labels.visibleLabel}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section
                  aria-labelledby="lead-signal-summary-label"
                  data-fetchi-action-sheet-signal-summary
                >
                  <h3
                    id="lead-signal-summary-label"
                    className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted"
                  >
                    Signal
                  </h3>
                  {displayedSignal.level === 'unchecked' ? (
                    <div
                      className="rounded-xl border border-dashed border-white/[0.14] bg-white/[0.025] px-4 py-4"
                      data-fetchi-signal-fallback
                    >
                      <div className="flex items-center gap-2 text-[14px] font-semibold text-text2">
                        <span
                          aria-hidden="true"
                          className="text-[14px] tracking-[0.12em] text-textMuted"
                          data-fetchi-signal-fallback-ellipsis
                        >
                          •••
                        </span>
                        <span>{displayedSignal.label}</span>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-text2">
                        Saved from Fetch. I haven’t checked this one for fresh buying signals yet.
                      </p>
                      <div
                        className={cn(
                          'mt-4 flex items-center gap-3',
                          onCheckSignals ? 'justify-between' : 'justify-end',
                        )}
                      >
                        {onCheckSignals ? (
                          <button
                            type="button"
                            disabled={isSignalCheckPending}
                            onClick={() => onCheckSignals(row)}
                            className="fetchi-focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[var(--fetchi-raised)] px-3 text-[13px] font-semibold text-text shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-fetchiOverlayHover disabled:cursor-wait disabled:opacity-60"
                            data-fetchi-signal-check-action
                          >
                            {isSignalCheckPending ? (
                              <Loader2
                                aria-hidden="true"
                                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                              />
                            ) : (
                              <RefreshCw aria-hidden="true" className="h-4 w-4" />
                            )}
                            {isSignalCheckPending
                              ? 'Checking signals…'
                              : 'Check for signals'}
                          </button>
                        ) : null}
                        <div
                          className="min-w-0 text-right text-[12px] text-textMuted"
                          data-fetchi-action-sheet-source
                        >
                          {row.sourceUrl ? (
                            <a
                              href={row.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="fetchi-focus-ring rounded-sm whitespace-nowrap"
                              data-fetchi-source-link
                            >
                              source {shortSourceLabel(row.source)}
                            </a>
                          ) : (
                            <span className="whitespace-nowrap">
                              source {shortSourceLabel(row.source)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[var(--fetchi-raised)] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                      <div className="text-[14px] font-semibold text-text2">
                        {displayedSignal.label}
                      </div>
                      <div className="mt-2 grid gap-0.5 text-[13px] leading-relaxed text-textMuted">
                        {displayedSignal.signalType ? (
                          <span>{displayedSignal.signalType}</span>
                        ) : null}
                        {displayedSignal.checkedAt ? (
                          <span>Checked {displayedSignal.checkedAt}</span>
                        ) : null}
                        {typeof displayedSignal.evidenceCount === 'number' ? (
                          <span>
                            {displayedSignal.evidenceCount}{' '}
                            {displayedSignal.evidenceCount === 1
                              ? 'evidence item'
                              : 'evidence items'}
                          </span>
                        ) : null}
                        {displayedSignal.evidenceDate ? (
                          <span>{displayedSignal.evidenceDate}</span>
                        ) : null}
                        {displayedSignal.whyNow ? (
                          <span>{displayedSignal.whyNow}</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </section>

                {(hasPhone(row) ||
                  textValue(row.email) ||
                  hasWebsite(row) ||
                  directions) ? (
                  <section aria-labelledby="lead-contact-routes">
                    <h3
                      id="lead-contact-routes"
                      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted"
                    >
                      Contact
                    </h3>
                    <div
                      className="divide-y divide-white/[0.06]"
                      data-fetchi-action-sheet-contact-routes
                    >
                      {hasPhone(row) ? (
                        <a
                          href={`tel:${row.phone}`}
                          data-fetchi-contact-route="phone"
                          data-fetchi-contact-row="phone"
                          className="fetchi-focus-ring flex min-h-[44px] items-center gap-3 py-2 text-[15px] leading-5 text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                        >
                          <Phone className="h-4 w-4 shrink-0 text-textMuted" />
                          <span
                            className="min-w-0 flex-1 text-[var(--fetchi-text-strong-muted,#D0D6E0)]"
                            data-fetchi-contact-value
                          >
                            {row.phone}
                          </span>
                          <Phone className="h-4 w-4 shrink-0 text-textMuted" />
                        </a>
                      ) : null}
                      {textValue(row.email) ? (
                        <a
                          href={`mailto:${row.email}`}
                          data-fetchi-contact-route="email"
                          data-fetchi-contact-row="email"
                          className="fetchi-focus-ring flex min-h-[44px] items-center gap-3 py-2 text-[15px] leading-5 text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                        >
                          <Mail className="h-4 w-4 shrink-0 text-textMuted" />
                          <span
                            className="min-w-0 flex-1 break-words text-[var(--fetchi-text-strong-muted,#D0D6E0)]"
                            data-fetchi-contact-value
                          >
                            {row.email}
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-textMuted" />
                        </a>
                      ) : null}
                      {website ? (
                        <a
                          href={website}
                          data-fetchi-contact-route="website"
                          data-fetchi-contact-row="website"
                          target="_blank"
                          rel="noreferrer"
                          className="fetchi-focus-ring flex min-h-[44px] items-center gap-3 py-2 text-[15px] leading-5 text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                        >
                          <Globe className="h-4 w-4 shrink-0 text-textMuted" />
                          <span
                            className="min-w-0 flex-1 break-words text-[var(--fetchi-text-strong-muted,#D0D6E0)]"
                            data-fetchi-contact-value
                          >
                            {websiteDisplayValue(row.website)}
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-textMuted" />
                        </a>
                      ) : null}
                      {directions ? (
                        <a
                          href={directions}
                          data-fetchi-contact-route="directions"
                          data-fetchi-contact-row="address"
                          target="_blank"
                          rel="noreferrer"
                          className="fetchi-focus-ring flex min-h-[44px] items-center gap-3 py-2 text-[15px] leading-5 text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-textMuted" />
                          <span
                            className="min-w-0 flex-1 text-[var(--fetchi-text-strong-muted,#D0D6E0)]"
                            data-fetchi-contact-value
                          >
                            {row.address}
                          </span>
                          <Navigation className="h-4 w-4 shrink-0 text-textMuted" />
                        </a>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section
                  aria-labelledby="lead-note-label"
                  data-fetchi-action-sheet-note
                >
                  <h3
                    id="lead-note-label"
                    className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted"
                  >
                    Note
                  </h3>
                  {isEditingNote ? (
                    <textarea
                      value={noteDraft}
                      onChange={(event) =>
                        onNoteDraftChange(row.id, event.target.value)
                      }
                      aria-label={`Note for ${row.businessName}`}
                      className="fetchi-focus-ring min-h-[112px] w-full resize-y rounded-xl bg-[var(--fetchi-overlay)] px-3 py-3 text-[15px] leading-relaxed text-text shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-textMuted"
                      placeholder="Add note"
                    />
                  ) : displayNote ? (
                    <button
                      type="button"
                      onClick={() => onStartEditingNote(row)}
                      className="fetchi-focus-ring min-h-[72px] w-full rounded-xl bg-[var(--fetchi-overlay)] px-3 py-3 text-left text-[15px] leading-relaxed text-text2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                      data-fetchi-action-sheet-note-preview
                    >
                      {displayNote}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartEditingNote(row)}
                      className="fetchi-focus-ring inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--fetchi-raised)] px-3 text-[13px] font-medium text-text2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                      data-fetchi-action-sheet-add-note
                    >
                      <NotebookPen aria-hidden="true" className="h-4 w-4" />
                      Add note
                    </button>
                  )}
                </section>
              </div>
            </div>

            {isEditingNote ? (
              <div
                className="sticky bottom-0 z-20 flex shrink-0 items-center gap-2 border-t border-white/[0.08] bg-[var(--fetchi-bg-elevated)] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_32px_-28px_rgba(0,0,0,0.95)]"
                data-fetchi-note-sticky-footer
              >
                <button
                  type="button"
                  disabled={isRowPending || noteDraft === (displayNote ?? '')}
                  onClick={() => onSaveNote(row)}
                  className={cn(
                    'fetchi-focus-ring inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[8px] text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                    PRIMARY_ACTION_CLASS,
                  )}
                  data-fetchi-primary-action="save-note"
                >
                  <Check className="h-4 w-4" />
                  Save note
                </button>
                <button
                  type="button"
                  onClick={onCancelEditingNote}
                  className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center rounded-[8px] px-4 text-[14px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
