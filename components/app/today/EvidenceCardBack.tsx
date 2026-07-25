'use client'

import * as React from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  CircleDot,
  CloudLightning,
  FileCheck2,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EvidenceItem, TodayRunCardData } from './types'

const EVIDENCE_KIND_LABEL: Record<EvidenceItem['kind'], string> = {
  storm: 'Storm report',
  property: 'Property record',
  permit: 'Building permit',
  ownership: 'Ownership',
  market: 'Market conf.',
  other: 'Source',
}

const KIND_ACCENT_BG: Record<EvidenceItem['kind'], string> = {
  storm: 'bg-evidence/10 text-evidence',
  property: 'bg-evidence/10 text-evidence',
  permit: 'bg-parchMute text-[#26241F]',
  ownership: 'bg-evidence/10 text-evidence',
  market: 'bg-evidence/10 text-evidence',
  other: 'bg-evidence/10 text-evidence',
}

const KIND_ICON: Record<EvidenceItem['kind'], LucideIcon> = {
  storm: CloudLightning,
  property: Building2,
  permit: FileCheck2,
  ownership: UserRound,
  market: TrendingUp,
  other: CircleDot,
}

type Props = {
  card: TodayRunCardData
  onBack: () => void
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function shortName(name: string): string {
  // "Parkview Office Complex" → "Parkview" for the header chip.
  const first = name.trim().split(/\s+/)[0]
  return first?.length ? first : name
}

export function EvidenceCardBack({ card, onBack }: Props) {
  const evidence = card.evidence
  const verified = evidence.length >= 2
  const contacts = card.contacts

  return (
    <article
      data-fetchi-evidence-card-v5
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-text/10 bg-raised text-text',
      )}
    >
      {/* Header — fixed at top, doesn't scroll */}
      <div className="flex items-start justify-between gap-3 px-5 lg:px-7 pt-5 lg:pt-7 pb-3 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] lg:text-[20px]">
            Evidence <span className="text-text/45">·</span>{' '}
            {shortName(card.businessName)}
          </h3>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] font-bold text-text/45">
            Showing back of card{' '}
            <span className="text-text/25">·</span> tap to flip back
          </p>
        </div>
        {verified ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 h-[24px]',
              'text-[10.5px] font-bold uppercase tracking-wide',
              'border border-evidence/25 bg-evidence/10 text-evidence',
            )}
          >
            <Check className="h-3 w-3" />
            Verified
          </span>
        ) : (
          <span className="inline-flex h-[24px] items-center rounded-full border border-text/10 px-2 text-[10.5px] font-bold uppercase tracking-wide text-text/55">
            {evidence.length} source
          </span>
        )}
      </div>

      {/* Scrollable region — evidence + contact route. Bottom fade hints at more. */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 lg:px-7 pb-5 lg:pb-7"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Evidence rows */}
        <ul className="mt-1 space-y-2">
          {evidence.length === 0 ? (
            <li className="px-1 text-[13px] italic text-text/60">
              Add this lead to My Leads to review later.
            </li>
          ) : (
            evidence.map(ev => {
              const KindIcon = KIND_ICON[ev.kind]
              const isFormalPermit = ev.kind === 'permit'
              return (
                <li
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border px-3 py-2.5',
                    isFormalPermit
                      ? 'border-parchMute bg-parch text-[#26241F]'
                      : 'border-text/10 bg-fetchiOverlay',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                      KIND_ACCENT_BG[ev.kind],
                    )}
                    aria-hidden
                  >
                    <KindIcon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-[10px] font-bold uppercase leading-none tracking-[0.12em]',
                        isFormalPermit ? 'text-[#26241F]/60' : 'text-text/45',
                      )}
                    >
                      {EVIDENCE_KIND_LABEL[ev.kind]}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-[13.5px] font-semibold leading-snug',
                        isFormalPermit ? 'text-[#26241F]' : 'text-text',
                      )}
                    >
                      {ev.title}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 flex items-center gap-1.5 text-[11px]',
                        isFormalPermit ? 'text-[#26241F]/65' : 'text-text/55',
                      )}
                    >
                      {ev.sourceDomain && <span className="truncate">{ev.sourceDomain}</span>}
                      {ev.sourceDomain && ev.recencyLabel && <span>·</span>}
                      {ev.recencyLabel && <span className="tabular-nums">{ev.recencyLabel}</span>}
                    </p>
                    {ev.detailLine && (
                      <p
                        className={cn(
                          'mt-1 text-[12px] leading-snug',
                          isFormalPermit ? 'text-[#26241F]/75' : 'text-text/65',
                        )}
                      >
                        {ev.detailLine}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <ConfidenceDotsRow confidence={ev.confidence} />
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-[10.5px] font-semibold',
                        isFormalPermit ? 'text-[#26241F]/70' : 'text-evidence',
                      )}
                    >
                      View
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </li>
              )
            })
          )}
        </ul>

        {/* Contact route — ranked */}
        {contacts.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-text/45">
              Contact route <span className="text-text/25">·</span> ranked
            </p>
            <ul className="space-y-1.5">
              {contacts.slice(0, 4).map((c, i) => {
                const channels: string[] = []
                if (c.email) channels.push('email')
                if (c.phone) channels.push('phone')
                const channelLine = channels.length ? channels.join(' + ') : null
                return (
                  <li
                    key={`${c.name}-${i}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5',
                      c.isBest
                        ? 'border border-fetchiAccent/40 bg-[var(--fetchi-accent-tint)]'
                        : 'border border-text/10 bg-fetchiOverlay',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                        c.isBest
                          ? 'bg-fetchiAccent text-white'
                          : 'bg-text/8 text-text/65',
                      )}
                    >
                      {initialsFor(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-text">
                          {c.name}
                        </span>
                        {c.isBest && (
                          <span className="inline-flex h-[15px] items-center rounded-full bg-fetchiAccent px-1.5 text-[9px] font-bold tracking-wide text-white">
                            BEST
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11.5px] text-text/55">
                        {c.title ?? 'Contact'}
                        {channelLine && (
                          <>
                            <span className="mx-1 text-text/30">·</span>
                            {channelLine}
                          </>
                        )}
                      </p>
                    </div>
                    <ConfidenceDotsRow confidence={c.confidence} />
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Back button — last item in scroll region, with padding so it's always reachable */}
        <div className="mt-5 flex justify-center pb-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold text-text/60 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to card
          </button>
        </div>
      </div>
      {/* Subtle bottom fade — hints at scrollable overflow. Pinned to card bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-raised to-transparent"
      />
    </article>
  )
}

function ConfidenceDotsRow({ confidence }: { confidence: number }) {
  const filled = Math.max(0, Math.min(4, Math.round((confidence / 100) * 4)))
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Confidence ${filled} of 4`}
    >
      {[0, 1, 2, 3].map(i => (
        <span
          key={i}
          className={cn(
            'w-[6px] h-[6px] rounded-full',
            i < filled ? 'bg-evidence' : 'bg-text/15',
          )}
        />
      ))}
    </div>
  )
}
