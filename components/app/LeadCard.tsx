import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlyphTile, glyphForSignalType } from '@/components/app/GlyphTile'

export type LeadCardSignalType =
  | 'storm_damage'
  | 'weather_hail'
  | 'weather_wind'
  | 'building_permit'
  | 'new_business_listing'
  | 'job_posting'
  | 'event'
  | 'funding'
  | 'news'
  | 'review'
  | 'social'
  | 'expansion'
  | 'ownership_change'
  | 'other'
  | string
  | null
  | undefined

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
  evidenceChips?: Array<{ label: string; tone?: 'coral' | 'neutral' }>
  variant?: Variant
}

type OpportunityClass = 'intent_record' | 'discovery' | 'aging'
type CardSurface = 'parchment' | 'dark'

const DEMO_INTENT_RECORD_SIGNAL_TYPES = new Set(['building_permit'])

function isPipelineStatus(status: string | null | undefined): boolean {
  return status === 'saved' || status === 'contacted' || status === 'responded' || status === 'won'
}

function classifyOpportunity(status: string | null | undefined, signalType: LeadCardSignalType): OpportunityClass {
  if (status === 'expired') return 'aging'
  if (typeof signalType === 'string' && DEMO_INTENT_RECORD_SIGNAL_TYPES.has(signalType)) return 'intent_record'
  return 'discovery'
}

function scoreTier(score: number): string {
  if (score >= 85) return 'bg-text/[0.08] text-text border border-text/15'
  if (score >= 70) return 'bg-text/[0.06] text-text/70 border border-text/10'
  return 'bg-text/[0.05] text-text/55 border border-text/10'
}

function statusTone(status: string | null | undefined, surface: CardSurface = 'dark'): string {
  if (!status || status === 'new') {
    return 'bg-text/[0.08] text-text border border-text/15'
  }

  switch (status) {
    case 'responded':
    case 'won':
      return 'bg-ok/12 text-ok border border-ok/25'
    case 'saved':
    case 'contacted':
      return surface === 'parchment'
        ? 'bg-[#2D2B2A]/10 text-[#2D2B2A] border border-[#2D2B2A]/10'
        : 'bg-text/[0.06] text-text/65 border border-text/10'
    case 'lost':
    case 'skipped':
    case 'expired':
      return surface === 'parchment'
        ? 'bg-[#2D2B2A]/8 text-[#2D2B2A]/60 border border-[#2D2B2A]/10'
        : 'bg-text/[0.06] text-text/55 border border-text/10'
    default:
      return surface === 'parchment'
        ? 'bg-[#2D2B2A]/8 text-[#2D2B2A]/65 border border-[#2D2B2A]/10'
        : 'bg-text/[0.08] text-text/65 border border-text/10'
  }
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return 'New'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function LeadCard(props: Props) {
  const variant = props.variant ?? 'list'
  if (variant === 'chat-hero') return <ChatHeroCard {...props} />
  if (variant === 'chat') return <ChatCard {...props} />
  if (variant === 'run') return <RunCard {...props} />
  return <ListCard {...props} />
}

function RunCard(props: Props) {
  return <ListCard {...props} large />
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
}: Props & { large?: boolean }) {
  const confidence = Math.max(0, Math.min(3, contactConfidence ?? 0))
  const tokenText = signalToken?.trim() || signalLabel
  const opportunityClass = classifyOpportunity(status, signalType)
  const pipeline = isPipelineStatus(status)
  const intentRecord = !pipeline && opportunityClass === 'intent_record'
  const inverted = intentRecord
  const cardSurface: CardSurface = intentRecord ? 'parchment' : 'dark'

  const surface = cn(
    'group block rounded-2xl shadow-fetchi-soft transition-all hover:-translate-y-0.5 hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    large ? 'p-5 lg:p-6' : 'p-4 lg:p-5',
    pipeline && 'bg-raised text-text border-l-[3px] border-l-ok',
    intentRecord && 'bg-parch text-[#2D2B2A] ring-1 ring-inset ring-[#2D2B2A]/10',
    !pipeline && opportunityClass === 'aging' && 'bg-raised text-text border-l-[3px] border-l-warn',
    !pipeline && opportunityClass === 'discovery' && 'bg-raised text-text',
  )
  const title = inverted ? 'text-[#2D2B2A]' : 'text-text'
  const muted = inverted ? 'text-[#2D2B2A]/65' : 'text-text/55'
  const body = inverted ? 'text-[#2D2B2A]/85' : 'text-text/75'
  const token = intentRecord
    ? 'bg-[#B8B0A2]/40 text-[#2D2B2A] border border-[#2D2B2A]/10'
    : 'bg-text/[0.06] text-text/70 border border-text/10'
  const tokenDot = intentRecord ? 'bg-[#2D2B2A]/65' : 'bg-text/35'
  const glyphTile = intentRecord
    ? 'bg-[#B8B0A2]/45 text-[#2D2B2A] ring-1 ring-[#2D2B2A]/10'
    : 'bg-text/[0.06] text-text/65 ring-1 ring-text/10'
  const scorePill = intentRecord
    ? 'bg-[#B8B0A2]/45 text-[#2D2B2A] border border-[#2D2B2A]/10'
    : 'bg-bg/80 text-text border border-text/10'

  return (
    <Link href={href} className={surface}>
      <div className="flex items-start gap-3.5">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} tone="muted" size="md" className={glyphTile} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn('inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold', statusTone(status, cardSurface))}>
                  {statusLabel(status)}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full h-[22px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums', token)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', tokenDot)} />
                  <span className="truncate max-w-[150px] sm:max-w-[180px]">{tokenText}</span>
                </span>
                {ageLabel && <span className={cn('text-[11px]', muted)}>· {ageLabel}</span>}
              </div>
              <h3 className={cn('font-outfit text-[17px] lg:text-[18px] font-semibold leading-tight mt-2 truncate', title)}>
                {businessName}
              </h3>
              {location && <div className={cn('mt-0.5 text-[12.5px] truncate', muted)}>{location}</div>}
            </div>
            <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', scorePill)}>
              {score}
            </span>
          </div>

          {whyNow && <p className={cn('fetchi-clamp-2 mt-3 text-[13px] leading-relaxed', body)}>{whyNow}</p>}

          <div className="mt-3 flex items-center justify-between gap-3">
            {contactName ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0', inverted ? 'bg-[#2D2B2A]/10 text-[#2D2B2A]' : 'bg-text/[0.08] text-text/75')}>
                  {initialsFor(contactName)}
                </div>
                <div className="min-w-0">
                  <div className={cn('text-[12.5px] font-semibold truncate', title)}>{contactName}</div>
                  {confidence > 0 && (
                    <div className="flex items-center gap-1 mt-0.5" aria-label={`Contact confidence ${confidence} of 3`}>
                      {[0, 1, 2].map(i => (
                        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i < confidence ? (inverted ? 'bg-[#2D2B2A]' : 'bg-text/45') : (inverted ? 'bg-[#2D2B2A]/20' : 'bg-text/15'))} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={cn('flex items-center gap-1.5 text-[12px]', muted)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', inverted ? 'bg-[#2D2B2A]/20' : 'bg-text/20')} />
                Finding best contact
              </div>
            )}
            <ChevronRight className={cn('h-5 w-5 flex-shrink-0', inverted ? 'text-[#2D2B2A]/55' : 'text-text/30 group-hover:text-text/60')} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function ChatHeroCard({ href, businessName, signalLabel, score, whyNow, location, ageLabel, evidenceChips }: Props) {
  return (
    <div className="rounded-2xl bg-raised shadow-fetchi-soft p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-outfit text-[17px] font-semibold text-text leading-tight">{businessName}</div>
          <div className="text-[12.5px] text-text/55 mt-1">{location ?? signalLabel}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-outfit text-[34px] leading-none font-bold tabular-nums text-text">
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[1px] text-text/45 mt-1 font-bold">score</div>
        </div>
      </div>

      {(ageLabel || evidenceChips?.length || signalLabel) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold bg-text/[0.06] text-text2">
            <span className="w-1.5 h-1.5 rounded-full bg-text/40" />
            {signalLabel}
          </span>
          {evidenceChips?.map(chip => (
            <span key={chip.label} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold bg-text/[0.06] text-text/70 border border-text/10">
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {whyNow && <p className="mt-3 text-[13.5px] text-text/75 leading-[1.6]">{whyNow}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Link href={href} className="flex-1 inline-flex items-center justify-center h-11 rounded-full bg-coral text-white text-[14px] font-semibold hover:bg-coralDeep transition-colors">
          Open lead
        </Link>
        <button type="button" className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-surface text-text/75 text-[14px] font-semibold border border-text/8 hover:text-text hover:bg-raised transition-colors" aria-label="Pass on this lead">
          Pass
        </button>
      </div>
    </div>
  )
}

function ChatCard({ href, businessName, signalLabel, signalType, score, status, location, ageLabel }: Props) {
  return (
    <Link href={href} className="group block rounded-2xl bg-raised shadow-fetchi-soft transition-all hover:-translate-y-px hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg p-3.5">
      <div className="flex items-start gap-3">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} size="sm" tone="muted" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-text truncate">{businessName}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-text/60">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-text/30" />
                <span className="truncate">{signalLabel}{location ? ` · ${location}` : ''}</span>
              </div>
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', scoreTier(score))}>{score}</span>
          </div>
          {(status || ageLabel) && (
            <div className="flex items-center gap-2 mt-2">
              {status && <span className={cn('hidden sm:inline-flex rounded-full px-2.5 h-[20px] items-center text-[11px] font-semibold', statusTone(status))}>{statusLabel(status)}</span>}
              {ageLabel && <span className="text-[11.5px] text-text/45">{ageLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
