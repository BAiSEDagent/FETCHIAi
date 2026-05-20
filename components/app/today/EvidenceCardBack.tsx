'use client'

import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_RADIUS, CARD_SHADOW, CARD_SURFACE } from './tokens'
import type { EvidenceItem, TodayRunCardData } from './types'

const EVIDENCE_KIND_BADGE: Record<EvidenceItem['kind'], string> = {
  storm: 'Storm',
  property: 'Property',
  permit: 'Permit',
  ownership: 'Ownership',
  market: 'Market',
  other: 'Source',
}

type Props = {
  card: TodayRunCardData
  onBack: () => void
}

export function EvidenceCardBack({ card, onBack }: Props) {
  return (
    <article
      className={cn(
        'relative p-6 lg:p-7 text-brand-near-black',
        CARD_SURFACE,
        CARD_RADIUS,
        CARD_SHADOW,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-near-black/65 hover:text-brand-near-black min-h-[44px] -ml-1 pl-1 pr-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to card
        </button>
        <span className="text-[10.5px] uppercase tracking-[0.12em] font-bold text-brand-near-black/45">
          Evidence
        </span>
      </div>

      <h3 className="font-outfit text-[18px] lg:text-[20px] font-bold mt-3 leading-tight">
        {card.businessName}
      </h3>
      {card.cityState && (
        <p className="text-[12.5px] text-brand-near-black/60 mt-0.5">{card.cityState}</p>
      )}

      <ul className="mt-5 space-y-2.5">
        {card.evidence.length === 0 ? (
          <li className="text-[13px] text-brand-near-black/60 italic">
            We&rsquo;re still gathering evidence for this lead. Add it to My Leads to
            keep watching.
          </li>
        ) : (
          card.evidence.map(ev => (
            <li
              key={ev.id}
              className="flex items-start gap-3 rounded-2xl bg-brand-cream/60 px-3.5 py-3"
            >
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-1.5 h-[20px] mt-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0',
                  ev.accent === 'coral'
                    ? 'bg-brand-coral/12 text-brand-coral'
                    : 'bg-brand-green/14 text-brand-dark',
                )}
              >
                {EVIDENCE_KIND_BADGE[ev.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-brand-near-black leading-snug">
                  {ev.title}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-brand-near-black/55">
                  {ev.sourceDomain && <span className="truncate">{ev.sourceDomain}</span>}
                  {ev.sourceDomain && ev.recencyLabel && <span>·</span>}
                  {ev.recencyLabel && (
                    <span className="tabular-nums">{ev.recencyLabel}</span>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </article>
  )
}
