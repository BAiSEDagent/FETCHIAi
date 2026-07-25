'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleDot,
  CloudLightning,
  FileCheck2,
  FileText,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EvidenceItem, TodayRunCardData } from './types'

type Props = {
  card: TodayRunCardData
  isDemo?: boolean
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

export function TodayRunCard({ card, isDemo = false }: Props) {
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
      data-fetchi-today-card-v5
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-text/10 bg-raised text-text',
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
                'bg-text/8 text-text/75',
              )}
              title={card.signalLabel}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  'bg-text/40',
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
                'border border-evidence/25 bg-evidence/10 text-evidence',
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
            <h2 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] lg:text-[26px]">
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
          <FitBadge score={card.score} />
        </div>

        {/* Reason ribbon — neutral elevated chip; coral spend reserved. */}
        {card.reason && (
          <div className="mt-3.5 rounded-lg border border-text/10 bg-fetchiOverlay px-3.5 py-2.5 text-[13px] font-medium leading-[1.5] text-text/85 lg:text-[13.5px]">
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
            No saved evidence is available for this lead yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {evidence.map(ev => {
              const KindIcon = KIND_ICON[ev.kind]
              const isFormalPermit = ev.kind === 'permit'
              return (
                <li
                  key={ev.id}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2',
                    isFormalPermit
                      ? 'border-parchMute bg-parch text-[#26241F]'
                      : 'border-text/10 bg-fetchiOverlay',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                      KIND_ACCENT_BG[ev.kind],
                    )}
                    aria-hidden
                  >
                    <KindIcon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          'text-[10px] font-bold uppercase leading-none tracking-[0.12em]',
                          isFormalPermit ? 'text-[#26241F]/60' : 'text-text/45',
                        )}
                      >
                        {EVIDENCE_KIND_LABEL[ev.kind]}
                      </p>
                      {ev.confidence >= 75 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide',
                            isFormalPermit ? 'text-[#26241F]/70' : 'text-evidence',
                          )}
                          title={`Confidence ${ev.confidence}%`}
                        >
                          <Check className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-[13px] font-semibold leading-snug',
                        isFormalPermit ? 'text-[#26241F]' : 'text-text',
                      )}
                    >
                      {ev.title}
                    </p>
                    {(ev.sourceDomain || ev.recencyLabel) && (
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
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 px-5 lg:px-6 pt-2 pb-5 lg:pb-6">
        <div className="rounded-lg border border-text/10 bg-fetchiOverlay px-3.5 py-3">
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
                    <span className="inline-flex h-[16px] items-center rounded-full bg-fetchiAccent px-1.5 text-[9.5px] font-bold tracking-wide text-white">
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
          {isDemo ? (
            <span
              className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-1 text-[11.5px] font-semibold text-text/35"
              aria-disabled="true"
            >
              Open lead
              <ArrowUpRight className="h-3 w-3" />
            </span>
          ) : (
            <Link
              href={`/app/leads/${card.opportunityId}`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-fetchiAccent hover:bg-fetchiOverlayHover hover:text-[var(--fetchi-accent-hover)] active:text-[var(--fetchi-accent-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              onClick={e => e.stopPropagation()}
            >
              Open lead
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
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
        'border border-text/10 bg-fetchiOverlay',
      )}
      aria-label={`Fit score ${score} out of 100`}
    >
      <div className="text-[24px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-text lg:text-[28px]">
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
            i < filled ? 'bg-evidence' : 'bg-text/15',
          )}
        />
      ))}
    </div>
  )
}
