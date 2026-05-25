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

type CardTone = 'storm' | 'permit' | 'won' | 'saved' | 'expiring' | 'default'

function isHotScore(score: number): boolean {
  return score >= 85
}

function deriveCardTone(status: string | null | undefined, signalType: LeadCardSignalType, score: number): CardTone {
  if (status === 'won' || status === 'responded') return 'won'
  if (status === 'saved') return 'saved'
  if (status === 'expired') return 'expiring'
  if (isHotScore(score) && (signalType === 'storm_damage' || signalType === 'weather_hail' || signalType === 'weather_wind')) return 'storm'
  if (signalType === 'building_permit') return 'permit'
  return 'default'
}

function scoreTier(score: number): string {
  if (score >= 85) return 'bg-blue/12 text-blue border border-blue/30'
  if (score >= 70) return 'bg-mustard/15 text-mustard border border-mustard/30'
  return 'bg-text/[0.06] text-text/60 border border-text/10'
}

function statusTone(status: string | null | undefined): string {
  switch (status) {
    case 'saved':
    case 'responded':
      return 'bg-ok/15 text-ok'
    case 'won':
      return 'bg-ok text-white'
    case 'lost':
    case 'skipped':
    case 'expired':
      return 'bg-text/[0.06] text-text/55'
    default:
      return 'bg-text/[0.08] text-text/65'
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
  const tokenText = signalToken ?? signalLabel
  const hot = isHotScore(score)
  const tone = deriveCardTone(status, signalType, score)
  const inverted = tone === 'storm' || tone === 'permit'
  const storm = tone === 'storm'
  const permit = tone === 'permit'

  const surface = cn(
    'group block rounded-2xl shadow-fetchi-soft transition-all hover:-translate-y-0.5 hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    large ? 'p-5 lg:p-6' : 'p-4 lg:p-5',
    storm && 'bg-coral text-white',
    permit && 'bg-parch text-[#2D2B2A]',
    tone === 'won' && 'bg-raised text-text ring-1 ring-inset ring-ok/40',
    tone === 'saved' && 'bg-raised text-text border-l-[3px] border-l-ok',
    tone === 'expiring' && 'bg-raised text-text border-l-[3px] border-l-warn',
    tone === 'default' && 'bg-raised text-text',
    tone === 'default' && hot && 'ring-1 ring-inset ring-coral/30',
  )
  const title = inverted ? (storm ? 'text-white' : 'text-[#2D2B2A]') : 'text-text'
  const muted = inverted ? (storm ? 'text-white/75' : 'text-[#2D2B2A]/65') : 'text-text/55'
  const body = inverted ? (storm ? 'text-white/90' : 'text-[#2D2B2A]/85') : 'text-text/75'
  const token = storm
    ? 'bg-white/20 text-white'
    : permit
      ? 'bg-[#2D2B2A]/10 text-[#2D2B2A]'
      : hot
        ? 'bg-coral/15 text-coral'
        : 'bg-text/[0.06] text-text/70'
  const glyphTone = storm ? 'coral' : permit ? 'dark' : hot ? 'coral' : 'muted'

  return (
    <Link href={href} className={surface}>
      <div className="flex items-start gap-3.5">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} tone={glyphTone} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn('inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold', inverted ? (storm ? 'bg-white/20 text-white' : 'bg-[#2D2B2A]/12 text-[#2D2B2A]') : statusTone(status))}>
                  {statusLabel(status)}
                </span>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full h-[22px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums', token)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', storm ? 'bg-white' : permit ? 'bg-[#2D2B2A]' : hot ? 'bg-coral' : 'bg-text/35')} />
                  <span className="truncate max-w-[180px]">{tokenText}</span>
                </span>
                {ageLabel && <span className={cn('text-[11px]', muted)}>· {ageLabel}</span>}
              </div>
              <h3 className={cn('font-outfit text-[17px] lg:text-[18px] font-semibold leading-tight mt-2 truncate', title)}>
                {businessName}
              </h3>
              {location && <div className={cn('mt-0.5 text-[12.5px] truncate', muted)}>{location}</div>}
            </div>
            <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', inverted ? (storm ? 'bg-white/20 text-white' : 'bg-[#2D2B2A]/10 text-[#2D2B2A]') : scoreTier(score))}>
              {score}
            </span>
          </div>

          {whyNow && <p className={cn('fetchi-clamp-2 mt-3 text-[13px] leading-relaxed', body)}>{whyNow}</p>}

          <div className="mt-3 flex items-center justify-between gap-3">
            {contactName ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0', inverted ? (storm ? 'bg-white/20 text-white' : 'bg-[#2D2B2A]/10 text-[#2D2B2A]') : 'bg-text/[0.08] text-text/75')}>
                  {initialsFor(contactName)}
                </div>
                <div className="min-w-0">
                  <div className={cn('text-[12.5px] font-semibold truncate', title)}>{contactName}</div>
                  {confidence > 0 && (
                    <div className="flex items-center gap-1 mt-0.5" aria-label={`Contact confidence ${confidence} of 3`}>
                      {[0, 1, 2].map(i => (
                        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i < confidence ? (inverted ? (storm ? 'bg-white' : 'bg-[#2D2B2A]') : 'bg-blue') : (inverted ? (storm ? 'bg-white/30' : 'bg-[#2D2B2A]/20') : 'bg-text/15'))} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={cn('flex items-center gap-1.5 text-[12px]', muted)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', inverted ? (storm ? 'bg-white/30' : 'bg-[#2D2B2A]/20') : 'bg-text/20')} />
                Finding best contact
              </div>
            )}
            <ChevronRight className={cn('h-5 w-5 flex-shrink-0', inverted ? (storm ? 'text-white/70' : 'text-[#2D2B2A]/55') : 'text-text/30 group-hover:text-text/60')} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function ChatHeroCard({ href, businessName, signalLabel, score, whyNow, location, ageLabel, evidenceChips }: Props) {
  const hot = isHotScore(score)
  return (
    <div className="rounded-2xl bg-raised shadow-fetchi-soft p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-outfit text-[17px] font-semibold text-text leading-tight">{businessName}</div>
          <div className="text-[12.5px] text-text/55 mt-1">{location ?? signalLabel}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={cn('font-outfit text-[34px] leading-none font-bold tabular-nums', hot ? 'text-coral' : 'text-text')}>
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[1px] text-text/45 mt-1 font-bold">score</div>
        </div>
      </div>

      {(ageLabel || evidenceChips?.length || signalLabel) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold', hot ? 'bg-coral/12 text-coral' : 'bg-text/[0.06] text-text/70')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', hot ? 'bg-coral' : 'bg-text/40')} />
            {signalLabel}{ageLabel ? ` · ${ageLabel}` : ''}
          </span>
          {evidenceChips?.map(chip => (
            <span key={chip.label} className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold', chip.tone === 'coral' ? 'bg-coral/12 text-coral' : 'bg-blue/10 text-blue border border-blue/20')}>
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
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} size="sm" tone={isHotScore(score) ? 'coral' : 'muted'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-text truncate">{businessName}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-text/60">
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isHotScore(score) ? 'bg-coral' : 'bg-text/30')} />
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
