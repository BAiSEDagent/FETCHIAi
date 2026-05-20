'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CARD_RADIUS, CARD_SHADOW, CARD_SURFACE } from './tokens'
import type { TodayRunCardData } from './types'

type Props = {
  card: TodayRunCardData
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const EVIDENCE_KIND_LABEL: Record<string, string> = {
  storm: 'Storm',
  property: 'Property',
  permit: 'Permit',
  ownership: 'Ownership',
  market: 'Market',
  other: 'Source',
}

export function TodayRunCard({ card }: Props) {
  const bestContact = card.contacts.find(c => c.isBest) ?? card.contacts[0] ?? null
  const otherContacts = card.contacts.filter(c => c !== bestContact).slice(0, 2)

  // Build the contextual subline beneath business name.
  const sublineParts: string[] = []
  if (card.vertical) sublineParts.push(card.vertical)
  if (card.squareFootageLabel) sublineParts.push(card.squareFootageLabel)
  if (card.claimStatusLabel) sublineParts.push(card.claimStatusLabel)
  const subline = sublineParts.join(' · ')

  return (
    <article
      className={cn(
        'relative p-6 lg:p-7 text-brand-near-black',
        CARD_SURFACE,
        CARD_RADIUS,
        CARD_SHADOW,
      )}
    >
      {/* Top row: score chip + status pill + age */}
      <div className="flex items-start justify-between gap-3">
        <ScoreChip score={card.score} />
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold bg-brand-light text-brand-dark">
            {card.status === 'saved' ? 'Saved' : 'New'}
          </span>
          {card.signalAgeLabel && (
            <span className="text-[11.5px] text-brand-near-black/55 tabular-nums">
              {card.signalAgeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Business name */}
      <h2 className="font-outfit text-[24px] lg:text-[28px] font-bold leading-tight mt-5">
        {card.businessName}
      </h2>
      {(card.cityState || subline) && (
        <div className="mt-1.5 text-[13px] text-brand-near-black/60 leading-snug">
          {card.cityState}
          {card.cityState && subline ? ' · ' : ''}
          {subline}
        </div>
      )}

      {/* Reason ribbon */}
      {card.reason && (
        <div className="mt-5 rounded-2xl bg-brand-light/70 px-4 py-3 text-[14px] leading-[1.55] text-brand-dark">
          {card.reason}
        </div>
      )}

      {/* Evidence chips */}
      <div className="mt-5">
        <div className="text-[10.5px] uppercase tracking-[0.1em] font-bold text-brand-near-black/45 mb-2">
          Evidence
        </div>
        {card.evidence.length === 0 ? (
          <p className="text-[12.5px] text-brand-near-black/55 italic">
            We&rsquo;re still gathering evidence for this lead.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {card.evidence.slice(0, 5).map(ev => (
              <span
                key={ev.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 h-[24px] text-[11.5px] font-mono font-semibold',
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
                {EVIDENCE_KIND_LABEL[ev.kind] ?? 'Source'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contact block */}
      <div className="mt-6 pt-5 border-t border-brand-near-black/8">
        <div className="text-[10.5px] uppercase tracking-[0.1em] font-bold text-brand-near-black/45 mb-2.5">
          Best contact
        </div>
        {bestContact ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-light text-brand-dark text-[13px] font-bold flex items-center justify-center flex-shrink-0">
                {initialsFor(bestContact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-brand-near-black truncate">
                    {bestContact.name}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-brand-green px-1.5 h-[16px] text-[9.5px] font-bold tracking-wide text-white">
                    BEST
                  </span>
                </div>
                {bestContact.title && (
                  <div className="text-[12.5px] text-brand-near-black/60 truncate">
                    {bestContact.title}
                  </div>
                )}
              </div>
              <ConfidenceDots confidence={bestContact.confidence} />
            </div>
            {otherContacts.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {otherContacts.map(c => (
                  <li
                    key={`${c.name}-${c.email ?? c.phone ?? c.title ?? ''}`}
                    className="flex items-center gap-2 text-[12.5px] text-brand-near-black/65"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-near-black/20" />
                    <span className="truncate">
                      {c.name}
                      {c.title ? ` · ${c.title}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-[12.5px] text-brand-near-black/55">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-near-black/20" />
            Finding best contact
          </div>
        )}
      </div>
    </article>
  )
}

function ScoreChip({ score }: { score: number }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-[68px] h-[68px] rounded-full bg-brand-cream text-brand-dark',
        'shadow-[inset_0_0_0_2px_rgba(88,147,126,0.35),inset_0_-3px_6px_rgba(45,43,42,0.05),0_1px_2px_rgba(45,43,42,0.05)]',
      )}
    >
      <div className="font-outfit text-[26px] font-bold leading-none tabular-nums text-brand-green">
        {score}
      </div>
      <div className="text-[8.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45 mt-0.5">
        score
      </div>
    </div>
  )
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const filled = Math.max(0, Math.min(3, Math.round((confidence / 100) * 3)))
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Contact confidence ${filled} of 3`}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={cn(
            'w-2 h-2 rounded-full',
            i < filled ? 'bg-brand-green' : 'bg-brand-near-black/15',
          )}
        />
      ))}
    </div>
  )
}
