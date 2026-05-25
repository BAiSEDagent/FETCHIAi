'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_RADIUS, CARD_SURFACE } from './tokens'
import type { EvidenceItem, TodayRunCardData } from './types'

type Props = {
  card: TodayRunCardData
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const EVIDENCE_KIND_LABEL: Record<EvidenceItem['kind'], string> = {
  storm: 'Storm report',
  property: 'Property record',
  permit: 'Building permit',
  ownership: 'Ownership',
  market: 'Market confirmation',
  other: 'Source',
}

// v2.3 evidence tones use the Evidence Blue semantic for source-of-truth
// chips. Coral is reserved for the hot signal ribbon, primary CTA, trial
// gate, hot score, and marketing italic — never spent on evidence.
const KIND_ACCENT_BG: Record<EvidenceItem['kind'], string> = {
  storm: 'bg-blue/15 text-blue',
  property: 'bg-blue/12 text-blue',
  permit: 'bg-mustard/15 text-mustard',
  ownership: 'bg-text/10 text-text/75',
  market: 'bg-ok/12 text-ok',
  other: 'bg-text/10 text-text/65',
}

const KIND_GLYPH: Record<EvidenceItem['kind'], string> = {
  storm: '\u26A1',
  property: '\u25C6',
  permit: '\u2630',
  ownership: '\u00A7',
  market: '\u25D4',
  other: '\u25CB',
}

export function TodayRunCard({ card }: Props) {
  const bestContact = card.contacts.find(c => c.isBest) ?? card.contacts[0] ?? null
  const otherContactsCount = Math.max(0, card.contacts.length - 1)

  const sublineParts: string[] = []
  if (card.vertical) sublineParts.push(card.vertical)
  if (card.squareFootageLabel) sublineParts.push(card.squareFootageLabel)
  const subline = sublineParts.join(' \u00b7 ')

  const evidence = card.evidence
  const verified = evidence.length >= 2
  const isHot = card.score >= 85

  return (
    <article
      className={cn(
        'relative h-full w-full flex flex-col text-text overflow-hidden',
        CARD_SURFACE,
        CARD_RADIUS,
      )}
    >
      {/* Header — fixed at top */}
      <header className="flex-shrink-0 px-5 lg:px-6 pt-5 lg:pt-6 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {card.signalToken && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 h-[26px]',
                'text-[11px] font-mono font-semibold tracking-wide',
                isHot
                  ? 'bg-coral/15 text-coral'
                  : 'bg-text/8 text-text/75',
              )}
              title={card.signalLabel}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isHot ? 'bg-coral' : 'bg-text/40',
                )}
              />
              {card.signalToken}
            </span>
          )}
          {card.claimStatusLabel && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 h-[26px]',
                'text-[11px] font-semibold text-text/65',
                'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]',
              )}
            >
              {card.claimStatusLabel}
            </span>
          )}
          {verified && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 h-[24px] ml-auto',
                'text-[10.5px] font-bold uppercase tracking-wide',
                'text-blue bg-blue/10 shadow-[inset_0_0_0_1px_rgba(60,130,246,0.40)]',
              )}
            >
              <Check className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        {/* Title + score row */}
        <div className="mt-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-outfit text-[22px] lg:text-[26px] font-bold leading-[1.15]">
              {card.businessName}
            </h2>
            {(card.cityState || subline) && (
              <p className="mt-1.5 text-[12.5px] lg:text-[13px] text-text/60 leading-snug">
                {card.cityState}
                {card.cityState && subline ? ' \u00b7 ' : ''}
                {subline}
              </p>
            )}
          </div>
          <FitBadge score={card.score} isHot={isHot} />
        </div>

        {/* Reason ribbon — neutral elevated chip; coral spend reserved. */}
        {card.reason && (
          <div className="mt-3.5 rounded-2xl bg-text/5 px-3.5 py-2.5 text-[13px] lg:text-[13.5px] leading-[1.5] text-text/85 font-medium">
            {card.reason}
          </div>
        )}
      </header>

      {/* Scrollable middle — evidence rows */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 lg:px-6 pb-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <p className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-text/50">
          Evidence
          {evidence.length > 0 && (
            <span className="ml-1.5 text-text/35 normal-case tracking-normal font-medium">
              · {evidence.length} source{evidence.length === 1 ? '' : 's'}
            </span>
          )}
        </p>

        {evidence.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-text/55 italic">
            We&rsquo;re still gathering evidence for this lead.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {evidence.map(ev => (
              <li
                key={ev.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-2xl px-3 py-2',
                  'bg-text/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-8 h-8 rounded-xl mt-0.5 flex-shrink-0 text-[12px] font-bold',
                    KIND_ACCENT_BG[ev.kind],
                  )}
                  aria-hidden
                >
                  {KIND_GLYPH[ev.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-text/45 leading-none">
                      {EVIDENCE_KIND_LABEL[ev.kind]}
                    </p>
                    {ev.confidence >= 75 ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wide font-bold text-blue"
                        title={`Confidence ${ev.confidence}%`}
                      >
                        <Check className="h-2.5 w-2.5" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-text leading-snug">
                    {ev.title}
                  </p>
                  {(ev.sourceDomain || ev.recencyLabel) && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text/55">
                      {ev.sourceDomain && <span className="truncate">{ev.sourceDomain}</span>}
                      {ev.sourceDomain && ev.recencyLabel && <span>·</span>}
                      {ev.recencyLabel && <span className="tabular-nums">{ev.recencyLabel}</span>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 px-5 lg:px-6 pt-2 pb-5 lg:pb-6">
        <div className="rounded-2xl bg-text/[0.06] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          {bestContact ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-text/[0.08] text-text/75 text-[12.5px] font-bold flex items-center justify-center flex-shrink-0">
                {initialsFor(bestContact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-text truncate">
                    {bestContact.name}
                  </span>
                  {bestContact.isBest && (
                    <span className="inline-flex items-center rounded-full bg-ok px-1.5 h-[16px] text-[9.5px] font-bold tracking-wide text-white">
                      BEST
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-text/55 truncate">
                  {bestContact.title ?? 'Contact'}
                  {otherContactsCount > 0 && (
                    <>
                      <span className="mx-1 text-text/30">·</span>
                      <span>+{otherContactsCount} more</span>
                    </>
                  )}
                </div>
              </div>
              <ConfidenceDots confidence={bestContact.confidence} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12.5px] text-text/55 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-text/20" />
              Finding best contact
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {card.draftPreview ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text/65">
              <FileText className="h-3 w-3" />
              Draft prepared, not sent
            </span>
          ) : (
            <span aria-hidden />
          )}
          <Link
            href={`/app/leads/${card.opportunityId}`}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-text/55 hover:text-text"
            onClick={e => e.stopPropagation()}
          >
            Open lead
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </article>
  )
}

function FitBadge({ score, isHot }: { score: number; isHot: boolean }) {
  // Hot lead score gets the coral digit (one of the five coral places).
  // Other scores stay neutral text to keep coral spend disciplined.
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-full flex-shrink-0',
        'w-[64px] h-[64px] lg:w-[72px] lg:h-[72px]',
        isHot
          ? 'bg-coral/12 shadow-[inset_0_0_0_2px_rgba(244,91,59,0.45),0_2px_4px_rgba(0,0,0,0.20)]'
          : 'bg-text/[0.06] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.10),0_2px_4px_rgba(0,0,0,0.20)]',
      )}
      aria-label={`Fit score ${score} out of 100`}
    >
      <div
        className={cn(
          'font-outfit text-[24px] lg:text-[28px] font-bold leading-none tabular-nums',
          isHot ? 'text-coral' : 'text-text',
        )}
      >
        {score}
      </div>
      <div className="text-[8.5px] uppercase tracking-[0.18em] font-bold text-text/55 mt-0.5">
        Fit
      </div>
    </div>
  )
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const filled = Math.max(0, Math.min(4, Math.round((confidence / 100) * 4)))
  return (
    <div
      className="flex items-center gap-1 flex-shrink-0"
      aria-label={`Contact confidence ${filled} of 4`}
    >
      {[0, 1, 2, 3].map(i => (
        <span
          key={i}
          className={cn(
            'w-[7px] h-[7px] rounded-full',
            i < filled ? 'bg-ok' : 'bg-text/15',
          )}
        />
      ))}
    </div>
  )
}
