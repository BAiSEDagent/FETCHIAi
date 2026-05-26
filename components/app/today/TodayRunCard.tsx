'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlyphTile, glyphForSignalType } from '@/components/app/GlyphTile'
import { leadStatusLabel, resolveLeadSurface } from '@/components/app/leadSurfaceResolver'
import { CARD_RADIUS } from './tokens'
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
  storm: 'bg-blue/15 text-blue',
  property: 'bg-blue/12 text-blue',
  permit: 'bg-blue/12 text-blue',
  ownership: 'bg-blue/10 text-blue',
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
  const visual = resolveLeadSurface({
    context: 'today',
    signalType: card.signalType,
    status: card.status,
    score: card.score,
  })

  const sublineParts: string[] = []
  if (card.vertical) sublineParts.push(card.vertical)
  if (card.squareFootageLabel) sublineParts.push(card.squareFootageLabel)
  const subline = sublineParts.join(' · ')
  const evidence = card.evidence
  const verified = evidence.length >= 2
  const signalText = card.signalToken?.trim() || card.signalLabel

  return (
    <article className={cn('relative h-full w-full flex flex-col overflow-hidden', CARD_RADIUS, visual.surface)}>
      <header className="flex-shrink-0 px-5 lg:px-6 pt-5 lg:pt-6 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {signalText && (
            <span className={cn('inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 h-[26px] text-[11px] font-mono font-semibold tracking-wide', visual.signalPill)} title={card.signalLabel}>
              <span className={cn('w-1.5 h-1.5 rounded-full', visual.signalDot)} />
              {signalText}
            </span>
          )}
          <span className={cn('inline-flex items-center rounded-full px-2.5 h-[26px] text-[11px] font-semibold', visual.statusPill)}>
            {leadStatusLabel(card.status)}
          </span>
          {card.claimStatusLabel && (
            <span className={cn('inline-flex items-center rounded-full px-2.5 h-[26px] text-[11px] font-semibold', visual.metadataPill)}>
              {card.claimStatusLabel}
            </span>
          )}
          {verified && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 h-[24px] ml-auto text-[10.5px] font-bold uppercase tracking-wide text-blue bg-blue/10 shadow-[inset_0_0_0_1px_rgba(60,130,246,0.40)]">
              <Check className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        <div className="mt-3.5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 flex items-start gap-3">
            <GlyphTile glyph={glyphForSignalType(card.signalType)} tone="muted" size="lg" className={visual.glyphTile} />
            <div className="min-w-0 flex-1">
              <h2 className={cn('font-outfit text-[22px] lg:text-[26px] font-bold leading-[1.15]', visual.title)}>
                {card.businessName}
              </h2>
              {(card.cityState || subline) && (
                <p className={cn('mt-1.5 text-[12.5px] lg:text-[13px] leading-snug', visual.muted)}>
                  {card.cityState}
                  {card.cityState && subline ? ' · ' : ''}
                  {subline}
                </p>
              )}
            </div>
          </div>
          <FitBadge score={card.score} className={visual.score} labelClassName={visual.muted} />
        </div>

        {card.reason && (
          <div className={cn('mt-3.5 rounded-2xl px-3.5 py-2.5 text-[13px] lg:text-[13.5px] leading-[1.5] font-medium', visual.inset)}>
            {card.reason}
          </div>
        )}
      </header>

      <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 lg:px-6 pb-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        <p className={cn('text-[10.5px] uppercase tracking-[0.12em] font-bold', visual.muted)}>
          Evidence
          {evidence.length > 0 && (
            <span className={cn('ml-1.5 normal-case tracking-normal font-medium', visual.muted)}>
              · {evidence.length} source{evidence.length === 1 ? '' : 's'}
            </span>
          )}
        </p>

        {evidence.length === 0 ? (
          <p className={cn('mt-2 text-[12.5px] italic', visual.muted)}>
            We&rsquo;re still gathering evidence for this lead.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {evidence.map(ev => (
              <li key={ev.id} className={cn('flex items-start gap-2.5 rounded-2xl px-3 py-2', visual.inset)}>
                <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-xl mt-0.5 flex-shrink-0 text-[12px] font-bold', KIND_ACCENT_BG[ev.kind])} aria-hidden>
                  {KIND_GLYPH[ev.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={cn('text-[10px] uppercase tracking-[0.12em] font-bold leading-none', visual.muted)}>
                      {EVIDENCE_KIND_LABEL[ev.kind]}
                    </p>
                    {ev.confidence >= 75 ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wide font-bold text-blue" title={`Confidence ${ev.confidence}%`}>
                        <Check className="h-2.5 w-2.5" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className={cn('mt-1 text-[13px] font-semibold leading-snug', visual.title)}>{ev.title}</p>
                  {(ev.sourceDomain || ev.recencyLabel) && (
                    <p className={cn('mt-0.5 flex items-center gap-1.5 text-[11px]', visual.muted)}>
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

      <footer className="flex-shrink-0 px-5 lg:px-6 pt-2 pb-5 lg:pb-6">
        <div className={cn('rounded-2xl px-3.5 py-3', visual.inset)}>
          {bestContact ? (
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-full text-[12.5px] font-bold flex items-center justify-center flex-shrink-0', visual.contactAvatar)}>
                {initialsFor(bestContact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[13.5px] font-semibold truncate', visual.title)}>{bestContact.name}</span>
                  {bestContact.isBest && <span className="inline-flex items-center rounded-full bg-ok px-1.5 h-[16px] text-[9.5px] font-bold tracking-wide text-white">BEST</span>}
                </div>
                <div className={cn('text-[11.5px] truncate', visual.muted)}>
                  {bestContact.title ?? 'Contact'}
                  {otherContactsCount > 0 && <><span className="mx-1 opacity-60">·</span><span>+{otherContactsCount} more</span></>}
                </div>
              </div>
              <ConfidenceDots confidence={bestContact.confidence} visual={visual} />
            </div>
          ) : (
            <div className={cn('flex items-center gap-2 text-[12.5px] py-1', visual.muted)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', visual.confidenceDotOff)} />
              Finding best contact
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {card.draftPreview ? (
            <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold', visual.muted)}>
              <FileText className="h-3 w-3" />
              Draft prepared, not sent
            </span>
          ) : <span aria-hidden />}
          <Link href={`/app/leads/${card.opportunityId}`} className={cn('inline-flex items-center gap-1 text-[11.5px] font-semibold hover:opacity-80', visual.muted)} onClick={e => e.stopPropagation()}>
            Open lead
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </article>
  )
}

function FitBadge({ score, className, labelClassName }: { score: number; className: string; labelClassName: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-full flex-shrink-0 w-[64px] h-[64px] lg:w-[72px] lg:h-[72px]', className)} aria-label={`Fit score ${score} out of 100`}>
      <div className="font-outfit text-[24px] lg:text-[28px] font-bold leading-none tabular-nums">{score}</div>
      <div className={cn('text-[8.5px] uppercase tracking-[0.18em] font-bold mt-0.5', labelClassName)}>Fit</div>
    </div>
  )
}

function ConfidenceDots({ confidence, visual }: { confidence: number; visual: ReturnType<typeof resolveLeadSurface> }) {
  const filled = Math.max(0, Math.min(4, Math.round((confidence / 100) * 4)))
  return (
    <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Contact confidence ${filled} of 4`}>
      {[0, 1, 2, 3].map(i => (
        <span key={i} className={cn('w-[7px] h-[7px] rounded-full', i < filled ? visual.confidenceDot : visual.confidenceDotOff)} />
      ))}
    </div>
  )
}
