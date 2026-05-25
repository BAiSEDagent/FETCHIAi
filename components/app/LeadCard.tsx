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

function scoreTier(score: number): string {
  if (score >= 85) return 'bg-brand-light text-brand-dark border border-brand-green/30'
  if (score >= 70) return 'bg-amber-50 text-amber-900 border border-amber-200'
  return 'bg-brand-cream-muted text-brand-near-black/65 border border-brand-near-black/10'
}

function statusTone(status: string | null | undefined): string {
  switch (status) {
    case 'saved':
    case 'responded':
    case 'won':
      return 'bg-brand-light text-brand-dark'
    case 'lost':
    case 'skipped':
    case 'expired':
      return 'bg-brand-cream-muted text-brand-near-black/55'
    default:
      return 'bg-brand-cream-muted text-brand-near-black/65'
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

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl bg-brand-cream text-brand-near-black shadow-fetchi-soft transition-all',
        'hover:-translate-y-0.5 hover:shadow-fetchi-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        large ? 'p-5 lg:p-6' : 'p-4 lg:p-5',
      )}
    >
      <div className="flex items-start gap-3.5">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} tone="green" size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn('inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold', statusTone(status))}>
                  {statusLabel(status)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full h-[22px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums bg-brand-light text-brand-dark">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                  <span className="truncate max-w-[180px]">{tokenText}</span>
                </span>
                {ageLabel && <span className="text-[11px] text-brand-near-black/45">· {ageLabel}</span>}
              </div>
              <h3 className="font-outfit text-[17px] lg:text-[18px] font-semibold leading-tight mt-2 truncate">
                {businessName}
              </h3>
              {location && (
                <div className="mt-0.5 text-[12.5px] text-brand-near-black/55 truncate">
                  {location}
                </div>
              )}
            </div>
            <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', scoreTier(score))}>
              {score}
            </span>
          </div>

          {whyNow && (
            <p className="fetchi-clamp-2 mt-3 text-[13px] text-brand-near-black/70 leading-relaxed">
              {whyNow}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            {contactName ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-brand-cream-muted text-brand-near-black/75 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {initialsFor(contactName)}
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{contactName}</div>
                  {confidence > 0 && (
                    <div className="flex items-center gap-1 mt-0.5" aria-label={`Contact confidence ${confidence} of 3`}>
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className={cn('w-1.5 h-1.5 rounded-full', i < confidence ? 'bg-brand-green' : 'bg-brand-near-black/15')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[12px] text-brand-near-black/50">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-near-black/20" />
                Finding best contact
              </div>
            )}
            <ChevronRight className="h-5 w-5 text-brand-near-black/30 group-hover:text-brand-near-black/60 flex-shrink-0" />
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
  score,
  whyNow,
  location,
  ageLabel,
  evidenceChips,
}: Props) {
  return (
    <div className="rounded-2xl bg-brand-cream shadow-fetchi-soft p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-outfit text-[17px] font-semibold text-brand-near-black leading-tight">
            {businessName}
          </div>
          <div className="text-[12.5px] text-brand-near-black/55 mt-1">
            {location ?? signalLabel}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-outfit text-[34px] leading-none font-bold tabular-nums text-brand-green">
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[1px] text-brand-near-black/45 mt-1 font-bold">
            score
          </div>
        </div>
      </div>

      {(ageLabel || evidenceChips?.length || signalLabel) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold bg-brand-light text-brand-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            {signalLabel}
            {ageLabel ? ` · ${ageLabel}` : ''}
          </span>
          {evidenceChips?.map(chip => (
            <span
              key={chip.label}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                chip.tone === 'coral'
                  ? 'bg-brand-coral/10 text-brand-coral'
                  : 'bg-brand-cream-muted text-brand-near-black/70',
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {whyNow && (
        <p className="mt-3 text-[13.5px] text-brand-near-black/75 leading-[1.6]">
          {whyNow}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={href}
          className="flex-1 inline-flex items-center justify-center h-11 rounded-full bg-brand-near-black text-white text-[14px] font-semibold hover:bg-brand-green transition-colors"
        >
          Open lead
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-brand-cream-muted text-brand-near-black/75 text-[14px] font-semibold hover:text-brand-near-black transition-colors"
          aria-label="Pass on this lead"
        >
          Pass
        </button>
      </div>
    </div>
  )
}

function ChatCard({
  href,
  businessName,
  signalLabel,
  signalType,
  score,
  status,
  location,
  ageLabel,
}: Props) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl bg-brand-cream shadow-fetchi-soft transition-all hover:-translate-y-px hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment p-3.5"
    >
      <div className="flex items-start gap-3">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} size="sm" tone="green" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-brand-near-black truncate">
                {businessName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-brand-near-black/60">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />
                <span className="truncate">
                  {signalLabel}
                  {location ? ` · ${location}` : ''}
                </span>
              </div>
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums flex-shrink-0', scoreTier(score))}>
              {score}
            </span>
          </div>
          {(status || ageLabel) && (
            <div className="flex items-center gap-2 mt-2">
              {status && (
                <span className={cn('hidden sm:inline-flex rounded-full px-2.5 h-[20px] items-center text-[11px] font-semibold', statusTone(status))}>
                  {statusLabel(status)}
                </span>
              )}
              {ageLabel && (
                <span className="text-[11.5px] text-brand-near-black/45">{ageLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
