'use client'

import * as React from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_RADIUS, CARD_SHADOW, CARD_SURFACE } from './tokens'
import type { EvidenceItem, TodayRunCardData } from './types'

type Props = {
  card: TodayRunCardData
  /** Called when the user wants to flip to the evidence side. */
  onFlip?: () => void
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const EVIDENCE_KIND_LABEL: Record<EvidenceItem['kind'], string> = {
  storm: 'Storm',
  property: 'Property',
  permit: 'Permit',
  ownership: 'Ownership',
  market: 'Market',
  other: 'Source',
}

export function TodayRunCard({ card, onFlip }: Props) {
  const bestContact = card.contacts.find(c => c.isBest) ?? card.contacts[0] ?? null
  const otherContactsCount = Math.max(0, card.contacts.length - 1)

  // Build the contextual subline beneath business name.
  const sublineParts: string[] = []
  if (card.vertical) sublineParts.push(card.vertical)
  if (card.squareFootageLabel) sublineParts.push(card.squareFootageLabel)
  const subline = sublineParts.join(' \u00b7 ')

  const evidenceCount = card.evidence.length

  return (
    <article
      className={cn(
        'relative p-5 lg:p-7 text-brand-near-black',
        CARD_SURFACE,
        CARD_RADIUS,
        CARD_SHADOW,
      )}
    >
      {/* Top chip row: signal token + optional claim status */}
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
      </div>

      {/* Title + score row */}
      <div className="mt-4 flex items-start justify-between gap-4">
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
        <div className="mt-4 rounded-2xl bg-brand-light/75 px-3.5 py-2.5 text-[13px] lg:text-[13.5px] leading-[1.5] text-brand-dark font-medium">
          {card.reason}
        </div>
      )}

      {/* Why now */}
      {card.reason && card.reason.length < 110 ? null : null}

      {/* Evidence section */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/50">
            Evidence
            {evidenceCount > 0 && (
              <span className="ml-1.5 text-brand-near-black/35 normal-case tracking-normal font-medium">
                · {evidenceCount} source{evidenceCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {onFlip && evidenceCount > 0 && (
            <button
              type="button"
              onClick={onFlip}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold text-brand-green hover:text-brand-dark',
                'rounded-md px-1 -mr-1 min-h-[28px]',
              )}
            >
              <ArrowUp className="h-3 w-3" />
              Tap to flip
            </button>
          )}
        </div>
        {evidenceCount === 0 ? (
          <p className="mt-2 text-[12.5px] text-brand-near-black/55 italic">
            We&rsquo;re still gathering evidence for this lead.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.evidence.slice(0, 5).map(ev => (
              <span
                key={ev.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 h-[24px] text-[11px] font-mono font-semibold tracking-wide',
                  ev.accent === 'coral'
                    ? 'bg-brand-coral/10 text-brand-coral'
                    : 'bg-brand-green/12 text-brand-dark',
                )}
                title={ev.title}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    ev.accent === 'coral' ? 'bg-brand-coral' : 'bg-brand-green',
                  )}
                />
                <span className="uppercase">{EVIDENCE_KIND_LABEL[ev.kind]}</span>
                {ev.chipSuffix && (
                  <>
                    <span className="text-brand-near-black/30">·</span>
                    <span className="uppercase">{ev.chipSuffix}</span>
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Best-contact card */}
      <div className="mt-5 rounded-2xl bg-white/85 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(45,43,42,0.08)]">
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
    </article>
  )
}

function FitBadge({ score }: { score: number }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-full flex-shrink-0',
        'w-[68px] h-[68px] lg:w-[72px] lg:h-[72px]',
        'bg-brand-light/70',
        'shadow-[inset_0_0_0_2px_rgba(88,147,126,0.45),0_2px_4px_rgba(45,43,42,0.06)]',
      )}
      aria-label={`Fit score ${score} out of 100`}
    >
      <div className="font-outfit text-[26px] lg:text-[28px] font-bold leading-none tabular-nums text-brand-dark">
        {score}
      </div>
      <div className="text-[8.5px] uppercase tracking-[0.18em] font-bold text-brand-near-black/55 mt-0.5">
        Fit
      </div>
    </div>
  )
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  // 4-dot scale per Claude Design 09 reference.
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
