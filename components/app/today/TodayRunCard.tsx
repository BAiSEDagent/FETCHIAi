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

const KIND_ACCENT_BG: Record<EvidenceItem['kind'], string> = {
  storm: 'bg-brand-coral/14 text-brand-coral',
  property: 'bg-brand-green/14 text-brand-dark',
  permit: 'bg-amber-100 text-amber-800',
  ownership: 'bg-brand-near-black/10 text-brand-near-black/75',
  market: 'bg-brand-green/10 text-brand-dark',
  other: 'bg-brand-near-black/10 text-brand-near-black/65',
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

  return (
    <article
      className={cn(
        'relative h-full w-full flex flex-col text-brand-near-black overflow-hidden',
        CARD_SURFACE,
        CARD_RADIUS,
      )}
    >
      {/* Header — fixed at top, never scrolls. Holds chips, title, score, reason. */}
      <header className="flex-shrink-0 px-5 lg:px-6 pt-5 lg:pt-6 pb-3.5">
        {/* Top chip row: signal token + optional claim status + verified badge */}
        <div className="flex flex-wrap items-center gap-2">
          {card.signalToken && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 h-[26px]',
                'text-[11px] font-mono font-semibold tracking-wide',
                'bg-brand-coral/10 text-brand-coral',
              )}
              title={card.signalLabel}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
              {card.signalToken}
            </span>
          )}
          {card.claimStatusLabel && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 h-[26px]',
                'text-[11px] font-semibold text-brand-near-black/65',
                'shadow-[inset_0_0_0_1px_rgba(45,43,42,0.12)]',
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
                'text-brand-dark bg-brand-green/10 shadow-[inset_0_0_0_1px_rgba(88,147,126,0.45)]',
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
              <p className="mt-1.5 text-[12.5px] lg:text-[13px] text-brand-near-black/60 leading-snug">
                {card.cityState}
                {card.cityState && subline ? ' \u00b7 ' : ''}
                {subline}
              </p>
            )}
          </div>
          <FitBadge score={card.score} />
        </div>

        {/* Reason ribbon */}
        {card.reason && (
          <div className="mt-3.5 rounded-2xl bg-brand-light/75 px-3.5 py-2.5 text-[13px] lg:text-[13.5px] leading-[1.5] text-brand-dark font-medium">
            {card.reason}
          </div>
        )}
      </header>

      {/* Scrollable middle — evidence rows. Card frame stays stable. */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 lg:px-6 pb-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <p className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/50">
          Evidence
          {evidence.length > 0 && (
            <span className="ml-1.5 text-brand-near-black/35 normal-case tracking-normal font-medium">
              · {evidence.length} source{evidence.length === 1 ? '' : 's'}
            </span>
          )}
        </p>

        {evidence.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-brand-near-black/55 italic">
            We&rsquo;re still gathering evidence for this lead.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {evidence.map(ev => (
              <li
                key={ev.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-2xl px-3 py-2',
                  'bg-white/75 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.06)]',
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
                  <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45 leading-none">
                    {EVIDENCE_KIND_LABEL[ev.kind]}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-brand-near-black leading-snug">
                    {ev.title}
                  </p>
                  {(ev.sourceDomain || ev.recencyLabel) && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-brand-near-black/55">
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

      {/* Footer — pinned to bottom. Best contact + optional draft status. */}
      <footer className="flex-shrink-0 px-5 lg:px-6 pt-2 pb-5 lg:pb-6">
        <div className="rounded-2xl bg-white/90 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.08)]">
          {bestContact ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green/15 text-brand-dark text-[12.5px] font-bold flex items-center justify-center flex-shrink-0">
                {initialsFor(bestContact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-brand-near-black truncate">
                    {bestContact.name}
                  </span>
                  {bestContact.isBest && (
                    <span className="inline-flex items-center rounded-full bg-brand-green px-1.5 h-[16px] text-[9.5px] font-bold tracking-wide text-white">
                      BEST
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-brand-near-black/55 truncate">
                  {bestContact.title ?? 'Contact'}
                  {otherContactsCount > 0 && (
                    <>
                      <span className="mx-1 text-brand-near-black/30">·</span>
                      <span>+{otherContactsCount} more</span>
                    </>
                  )}
                </div>
              </div>
              <ConfidenceDots confidence={bestContact.confidence} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12.5px] text-brand-near-black/55 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-near-black/20" />
              Finding best contact
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {card.draftPreview ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-dark">
              <FileText className="h-3 w-3" />
              Draft prepared, not sent
            </span>
          ) : (
            <span aria-hidden />
          )}
          <Link
            href={`/app/leads/${card.opportunityId}`}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-near-black/55 hover:text-brand-near-black"
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

function FitBadge({ score }: { score: number }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-full flex-shrink-0',
        'w-[64px] h-[64px] lg:w-[72px] lg:h-[72px]',
        'bg-brand-light/70',
        'shadow-[inset_0_0_0_2px_rgba(88,147,126,0.45),0_2px_4px_rgba(45,43,42,0.06)]',
      )}
      aria-label={`Fit score ${score} out of 100`}
    >
      <div className="font-outfit text-[24px] lg:text-[28px] font-bold leading-none tabular-nums text-brand-dark">
        {score}
      </div>
      <div className="text-[8.5px] uppercase tracking-[0.18em] font-bold text-brand-near-black/55 mt-0.5">
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
            i < filled ? 'bg-brand-green' : 'bg-brand-near-black/15',
          )}
        />
      ))}
    </div>
  )
}
