'use client'

import * as React from 'react'
import { ArrowLeft, ArrowUpRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_RADIUS, CARD_SHADOW, CARD_SURFACE } from './tokens'
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
  storm: 'bg-blue/15 text-blue',
  // v2.1 — only success/verified states wear green. Property + market are
  // evidence categories (source signal), so they take Evidence Blue.
  property: 'bg-blue/15 text-blue',
  permit: 'bg-warn/15 text-warn',
  ownership: 'bg-text/8 text-text/75',
  market: 'bg-blue/10 text-blue',
  other: 'bg-text/8 text-text/65',
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
      className={cn(
        'relative h-full w-full flex flex-col text-text overflow-hidden',
        CARD_SURFACE,
        CARD_RADIUS,
      )}
    >
      {/* Header — fixed at top, doesn't scroll */}
      <div className="flex items-start justify-between gap-3 px-5 lg:px-7 pt-5 lg:pt-7 pb-3 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="font-outfit text-[18px] lg:text-[20px] font-bold leading-tight">
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
              'text-text2 shadow-[inset_0_0_0_1px_rgba(88,147,126,0.5)] bg-ok/8',
            )}
          >
            <Check className="h-3 w-3" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 h-[24px] text-[10.5px] font-bold uppercase tracking-wide text-text/55 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.12)]">
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
          <li className="text-[13px] text-text/60 italic px-1">
            Add this lead to My Leads to review later.
          </li>
        ) : (
          evidence.map(ev => (
            <li
              key={ev.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl px-3 py-2.5',
                'bg-white/75 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.06)]',
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-9 h-9 rounded-xl mt-0.5 flex-shrink-0 text-[12px] font-bold uppercase',
                  KIND_ACCENT_BG[ev.kind],
                )}
                aria-hidden
              >
                {ev.kind === 'storm'
                  ? '\u26A1'
                  : ev.kind === 'property'
                    ? '\u25C6'
                    : ev.kind === 'permit'
                      ? '\u2630'
                      : ev.kind === 'ownership'
                        ? '\u00A7'
                        : ev.kind === 'market'
                          ? '\u25D4'
                          : '\u25CB'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-text/45 leading-none">
                  {EVIDENCE_KIND_LABEL[ev.kind]}
                </p>
                <p className="mt-1 text-[13.5px] font-semibold text-text leading-snug">
                  {ev.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text/55">
                  {ev.sourceDomain && <span className="truncate">{ev.sourceDomain}</span>}
                  {ev.sourceDomain && ev.recencyLabel && <span>·</span>}
                  {ev.recencyLabel && <span className="tabular-nums">{ev.recencyLabel}</span>}
                </p>
                {ev.detailLine && (
                  <p className="mt-1 text-[12px] text-text/65 leading-snug">
                    {ev.detailLine}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <ConfidenceDotsRow confidence={ev.confidence} />
                <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-text/55">
                  View
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Contact route — ranked */}
      {contacts.length > 0 && (
        <div className="mt-5">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-text/45 mb-2">
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
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5',
                    c.isBest
                      ? 'bg-white shadow-[inset_0_0_0_1.5px_rgba(88,147,126,0.45),0_2px_6px_-3px_rgba(88,147,126,0.25)]'
                      : 'bg-white/65 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.06)]',
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0',
                      c.isBest
                        ? 'bg-ok text-white'
                        : 'bg-text/8 text-text/65',
                    )}
                  >
                    {initialsFor(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-text truncate">
                        {c.name}
                      </span>
                      {c.isBest && (
                        <span className="inline-flex items-center rounded-full bg-ok px-1.5 h-[15px] text-[9px] font-bold tracking-wide text-white">
                          BEST
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-text/55 truncate">
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
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text/60 hover:text-text min-h-[36px] px-2 rounded-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to card
        </button>
      </div>
      </div>
      {/* Subtle bottom fade — hints at scrollable overflow. Pinned to card bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#FBF8EF] to-transparent"
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
            i < filled ? 'bg-ok' : 'bg-text/15',
          )}
        />
      ))}
    </div>
  )
}
