import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlyphTile, glyphForSignalType } from '@/components/app/GlyphTile'
import {
  leadStatusLabel,
  resolveLeadSurface,
  type LeadSurfaceContext,
  type LeadSurfaceSignalType,
} from '@/components/app/leadSurfaceResolver'

export type LeadCardSignalType = LeadSurfaceSignalType

type Variant = 'list' | 'chat' | 'chat-hero' | 'run' | 'map' | 'related'

type Props = {
  href: string
  businessName: string
  signalLabel: string
  signalType?: LeadCardSignalType
  signalToken?: string | null
  score: number
  whyNow?: string | null
  status?: string | null
  location?: string | null
  ageLabel?: string | null
  contactName?: string | null
  contactConfidence?: number | null
  evidenceChips?: Array<{ label: string; tone?: 'coral' | 'neutral' | 'evidence' }>
  variant?: Variant
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function isPipelineStatus(status: string | null | undefined): boolean {
  return status === 'saved' || status === 'contacted' || status === 'responded' || status === 'won'
}

function signalTypeForSurface(signalType: LeadCardSignalType, status: string | null | undefined, context: LeadSurfaceContext): LeadCardSignalType {
  if (context === 'chat') return null
  if (isPipelineStatus(status)) return null
  return signalType
}

export function LeadCard(props: Props) {
  const variant = props.variant ?? 'list'
  if (variant === 'chat-hero') return <ChatHeroCard {...props} />
  if (variant === 'chat') return <ChatCard {...props} />
  if (variant === 'run') return <RunCard {...props} />
  return <ListCard {...props} />
}

function RunCard(props: Props) {
  return <ListCard {...props} large surfaceContext="today" />
}

function ListCard({
  href,
  businessName,
  signalLabel,
  signalType,
  signalToken,
  score,
  whyNow,
  status,
  location,
  ageLabel,
  contactName,
  contactConfidence,
  large = false,
  surfaceContext = 'list',
}: Props & { large?: boolean; surfaceContext?: LeadSurfaceContext }) {
  const confidence = Math.max(0, Math.min(3, contactConfidence ?? 0))
  const tokenText = signalToken?.trim() || signalLabel
  const visual = resolveLeadSurface({ context: surfaceContext, signalType: signalTypeForSurface(signalType, status, surfaceContext), status, score })

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        large ? 'p-5 lg:p-6' : 'p-4 lg:p-5',
        visual.surface,
      )}
    >
      <div className="flex items-start gap-3.5">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} tone="muted" size="md" className={visual.glyphTile} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn('inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold', visual.statusPill)}>
                  {leadStatusLabel(status)}
                </span>
                {tokenText && (
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full h-[22px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums', visual.signalPill)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', visual.signalDot)} />
                    <span className="truncate max-w-[150px] sm:max-w-[180px]">{tokenText}</span>
                  </span>
                )}
                {ageLabel && <span className={cn('text-[11px]', visual.muted)}>· {ageLabel}</span>}
              </div>
              <h3 className={cn('font-outfit text-[17px] lg:text-[18px] font-semibold leading-tight mt-2 truncate', visual.title)}>
                {businessName}
              </h3>
              {location && <div className={cn('mt-0.5 text-[12.5px] truncate', visual.muted)}>{location}</div>}
            </div>
            <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', visual.score)}>
              {score}
            </span>
          </div>

          {whyNow && <p className={cn('fetchi-clamp-2 mt-3 text-[13px] leading-relaxed', visual.body)}>{whyNow}</p>}

          <div className="mt-3 flex items-center justify-between gap-3">
            {contactName ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0', visual.contactAvatar)}>
                  {initialsFor(contactName)}
                </div>
                <div className="min-w-0">
                  <div className={cn('text-[12.5px] font-semibold truncate', visual.title)}>{contactName}</div>
                  {confidence > 0 && (
                    <div className="flex items-center gap-1 mt-0.5" aria-label={`Contact confidence ${confidence} of 3`}>
                      {[0, 1, 2].map(i => (
                        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i < confidence ? visual.confidenceDot : visual.confidenceDotOff)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={cn('flex items-center gap-1.5 text-[12px]', visual.muted)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', visual.confidenceDotOff)} />
                Finding best contact
              </div>
            )}
            <ChevronRight className={cn('h-5 w-5 flex-shrink-0', visual.chevron)} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function ChatHeroCard({
  href,
  businessName,
  signalLabel,
  signalType,
  signalToken,
  score,
  whyNow,
  status,
  location,
  ageLabel,
  evidenceChips,
}: Props) {
  const visual = resolveLeadSurface({ context: 'chat', signalType: signalTypeForSurface(signalType, status, 'chat'), status, score })
  const tokenText = signalToken?.trim() || signalLabel

  return (
    <div className={cn('rounded-2xl p-4 lg:p-5', visual.surface)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={cn('inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold', visual.statusPill)}>
              {leadStatusLabel(status)}
            </span>
            {tokenText && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full h-[22px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums', visual.signalPill)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', visual.signalDot)} />
                <span className="truncate max-w-[190px]">{tokenText}</span>
              </span>
            )}
          </div>
          <div className={cn('font-outfit text-[17px] font-semibold leading-tight', visual.title)}>{businessName}</div>
          <div className={cn('text-[12.5px] mt-1', visual.muted)}>{location ?? signalLabel}</div>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', visual.score)}>
          {score}
        </span>
      </div>

      {(ageLabel || evidenceChips?.length) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ageLabel && <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold', visual.metadataPill)}>{ageLabel}</span>}
          {evidenceChips?.map(chip => (
            <span
              key={chip.label}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                chip.tone === 'evidence'
                  ? 'bg-blue/10 text-blue border border-blue/20'
                  : chip.tone === 'coral'
                    ? 'bg-coral/12 text-coral border border-coral/20'
                    : visual.metadataPill,
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {whyNow && <p className={cn('mt-3 text-[13.5px] leading-[1.6]', visual.body)}>{whyNow}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={href}
          className={cn(
            'flex-1 inline-flex items-center justify-center h-11 rounded-full text-[14px] font-semibold transition-colors',
            visual.surfaceKind === 'coral'
              ? 'bg-darkSlab text-white hover:bg-darkSlab/90'
              : 'bg-coral text-white hover:bg-coralDeep',
          )}
        >
          Open lead
        </Link>
        <button
          type="button"
          className={cn('inline-flex items-center justify-center h-11 px-5 rounded-full text-[14px] font-semibold transition-colors', visual.metadataPill)}
          aria-label="Pass on this lead"
        >
          Pass
        </button>
      </div>
    </div>
  )
}

function ChatCard({ href, businessName, signalLabel, signalType, signalToken, score, status, location, ageLabel }: Props) {
  const visual = resolveLeadSurface({ context: 'chat', signalType: signalTypeForSurface(signalType, status, 'chat'), status, score })
  const tokenText = signalToken?.trim() || signalLabel

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl transition-all hover:-translate-y-px hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg p-3.5',
        visual.surface,
      )}
    >
      <div className="flex items-start gap-3">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} size="sm" tone="muted" className={visual.glyphTile} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={cn('text-[13.5px] font-semibold truncate', visual.title)}>{businessName}</div>
              {tokenText && (
                <div className={cn('inline-flex items-center gap-1.5 mt-1 rounded-full h-[21px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums max-w-full', visual.signalPill)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', visual.signalDot)} />
                  <span className="truncate">{tokenText}{location ? ` · ${location}` : ''}</span>
                </div>
              )}
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', visual.score)}>{score}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn('inline-flex rounded-full px-2.5 h-[20px] items-center text-[11px] font-semibold', visual.statusPill)}>{leadStatusLabel(status)}</span>
            {ageLabel && <span className={cn('text-[11.5px]', visual.muted)}>{ageLabel}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
