'use client'

import { useRef } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Save,
} from 'lucide-react'

import { CoverageIndicator } from '@/components/fetchi-ui/CoverageIndicator'
import {
  SignalBars,
  type SignalBarsLevel,
} from '@/components/fetchi-ui/SignalBars'
import { SourceAttribution } from '@/components/fetchi-ui/SourceAttribution'
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
  'dismissed',
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
    actionLabel: 'Dismiss',
    accessibleLabel: 'Dismiss lead',
  },
}

const PRIMARY_ACTION_CLASS =
  'bg-fetchiAccent text-white hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] focus-visible:ring-fetchiAccent'

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
  return status === 'lost' || status === 'dismissed' ? 'dismissed' : status
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

  const currentLabel =
    optionStatus === 'dismissed'
      ? currentStatus === 'lost'
        ? 'Lost'
        : 'Dismissed'
      : meta.actionLabel

  return {
    visibleLabel: currentLabel,
    accessibleLabel: `${currentLabel}, current lifecycle`,
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

function MetaSeparator() {
  return (
    <span aria-hidden="true" className="shrink-0 text-[11px] text-textMuted">
      ·
    </span>
  )
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
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const isEditingNote = row ? editingNoteId === row.id : false
  const isRowPending = Boolean(row && isPending && pendingId === row.id)
  const directions = row ? directionsHref(row) : null
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
        className="max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-x border-t border-border bg-fetchiOverlay px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 text-text shadow-[0_-18px_48px_-28px_rgba(0,0,0,0.88)] outline-none sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(460px,calc(100%-32px))] sm:-translate-x-1/2 sm:rounded-2xl sm:border"
        data-cp23b-action-sheet
        data-fetchi-action-sheet-v5
        data-fetchi-reduced-motion-sheet
      >
        {row ? (
          <div className="space-y-5">
            <div
              aria-hidden="true"
              className="mx-auto h-1 w-10 rounded-full bg-white/15"
              data-fetchi-action-sheet-drag-handle
            />
            <SheetHeader
              className="space-y-0 pr-8 text-left"
              data-fetchi-action-sheet-header
            >
              <div className="flex items-start gap-3">
                <span
                  aria-label={lifecycleLabel(row.lifecycleStatus)}
                  className="mt-0.5 inline-flex shrink-0"
                  role="img"
                >
                  <StatusGlyph
                    aria-hidden="true"
                    size={40}
                    state={lifecycleGlyphState(row.lifecycleStatus)}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate font-fetchi text-[18px] font-semibold leading-tight tracking-[-0.02em] text-text">
                    {row.businessName}
                  </SheetTitle>
                  <SheetDescription className="mt-1 truncate text-[13px] leading-snug text-text2">
                    {detailLine(row) || 'Saved lead'}
                  </SheetDescription>
                  <div className="mt-1 text-[12px] font-medium text-textMuted">
                    {lifecycleLabel(row.lifecycleStatus)} · {formatCompactAge(row.updatedAtMs, nowMs)}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <section
              aria-labelledby="lead-lifecycle-selector-label"
              data-fetchi-action-sheet-lifecycle-selector
            >
              <h3
                id="lead-lifecycle-selector-label"
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted"
              >
                Lifecycle
              </h3>
              <div
                aria-label="Lead lifecycle"
                className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-fetchiSurface p-1"
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
                        'fetchi-focus-ring inline-flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        isSelected
                          ? 'bg-fetchiRaised text-text shadow-[inset_0_0_0_1px_var(--fetchi-border-strong)]'
                          : 'text-textMuted hover:bg-fetchiOverlayHover hover:text-text2',
                      )}
                    >
                      <StatusGlyph
                        aria-hidden="true"
                        size={20}
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
              <div className="rounded-xl border border-border bg-fetchiSurface px-3 py-3">
                <div className="flex items-center gap-2 text-[13px] font-medium text-text2">
                  <SignalBars aria-hidden="true" level={displayedSignal.level} />
                  <span>{displayedSignal.label}</span>
                </div>
                {displayedSignal.level === 'unchecked' ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-textMuted">
                    Saved from Fetch. This lead has not been checked for fresh buying signals yet.
                  </p>
                ) : null}
                {displayedSignal.level === 'none' && displayedSignal.checkedAt ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-textMuted">
                    Checked {displayedSignal.checkedAt}
                  </p>
                ) : null}
                {displayedSignal.level !== 'unchecked' &&
                displayedSignal.level !== 'none' ? (
                  <div className="mt-2 grid gap-0.5 text-[12px] leading-relaxed text-textMuted">
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
                ) : null}
                <div
                  className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden"
                  data-fetchi-action-sheet-truth-row
                >
                  <CoverageIndicator
                    addressAvailable={hasAddress(row)}
                    phoneAvailable={hasPhone(row)}
                    websiteAvailable={hasWebsite(row)}
                  />
                  <MetaSeparator />
                  <span className="min-w-0 flex-1 overflow-hidden">
                    {row.sourceUrl ? (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="fetchi-focus-ring block min-w-0 rounded-sm"
                        data-fetchi-source-link
                      >
                        <SourceAttribution
                          className="max-w-full"
                          source={row.source}
                          variant="inline"
                        />
                      </a>
                    ) : (
                      <SourceAttribution
                        className="max-w-full"
                        source={row.source}
                        variant="inline"
                      />
                    )}
                  </span>
                </div>
              </div>
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
                  className="grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-2"
                  data-fetchi-action-sheet-contact-routes
                >
                  {hasPhone(row) ? (
                    <a
                      href={`tel:${row.phone}`}
                      data-fetchi-contact-route="phone"
                      className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-border bg-fetchiRaised px-2 text-[12px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  ) : null}
                  {textValue(row.email) ? (
                    <a
                      href={`mailto:${row.email}`}
                      data-fetchi-contact-route="email"
                      className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-border bg-fetchiRaised px-2 text-[12px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  ) : null}
                  {hasWebsite(row) && row.website ? (
                    <a
                      href={row.website}
                      data-fetchi-contact-route="website"
                      target="_blank"
                      rel="noreferrer"
                      className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-border bg-fetchiRaised px-2 text-[12px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                    >
                      <Globe2 className="h-4 w-4" />
                      Website
                    </a>
                  ) : null}
                  {directions ? (
                    <a
                      href={directions}
                      data-fetchi-contact-route="directions"
                      target="_blank"
                      rel="noreferrer"
                      className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-border bg-fetchiRaised px-2 text-[12px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
                    >
                      <MapPin className="h-4 w-4" />
                      Directions
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}

            {displayNote && !isEditingNote ? (
              <div
                className="rounded-lg border border-border bg-fetchiSurface px-3 py-2.5 text-[13px] leading-relaxed text-text2"
                data-fetchi-action-sheet-note-preview
              >
                {displayNote}
              </div>
            ) : null}

            <div
              className="grid grid-cols-2 gap-2"
              data-fetchi-action-sheet-utilities
            >
              <button
                type="button"
                onClick={() => onStartEditingNote(row)}
                className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-fetchiRaised px-3 text-[13px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
              >
                <NotebookPen className="h-4 w-4" />
                {displayNote ? 'Edit note' : 'Add note'}
              </button>
              <Link
                href={`/app/leads/${row.id}`}
                className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-fetchiRaised px-3 text-[13px] font-medium text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text"
              >
                <ExternalLink className="h-4 w-4" />
                Open lead
              </Link>
            </div>

            {isEditingNote ? (
              <div className="rounded-xl border border-border bg-fetchiRaised p-3">
                <textarea
                  value={noteDraft}
                  onChange={(event) => onNoteDraftChange(row.id, event.target.value)}
                  aria-label={`Note for ${row.businessName}`}
                  className="fetchi-focus-ring min-h-[92px] w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-[14px] leading-relaxed text-text placeholder:text-textMuted"
                  placeholder="Add note"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isRowPending || noteDraft === (displayNote ?? '')}
                    onClick={() => onSaveNote(row)}
                    className={cn(
                      'fetchi-focus-ring inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      PRIMARY_ACTION_CLASS,
                    )}
                  >
                    <Save className="h-4 w-4" />
                    Save note
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEditingNote}
                    className="fetchi-focus-ring inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-4 text-[13px] font-medium text-text2 hover:border-[var(--fetchi-border-strong)] hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
