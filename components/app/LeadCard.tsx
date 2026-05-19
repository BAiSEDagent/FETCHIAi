import Link from 'next/link'
import { cn } from '@/lib/utils'

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

type Variant = 'list' | 'chat' | 'chat-hero'

type Props = {
  href: string
  businessName: string
  signalLabel: string
  signalType?: LeadCardSignalType
  score: number
  whyNow?: string | null
  status?: string | null
  location?: string | null
  ageLabel?: string | null
  evidenceChips?: Array<{ label: string; tone?: 'coral' | 'neutral' }>
  variant?: Variant
}

function signalIcon(type: LeadCardSignalType): string {
  switch (type) {
    case 'storm_damage':
    case 'weather_hail':
    case 'weather_wind':
      return '⛈️'
    case 'building_permit':
      return '🏗️'
    case 'new_business_listing':
      return '📍'
    case 'job_posting':
      return '💼'
    case 'event':
      return '🎪'
    case 'funding':
      return '💰'
    default:
      return '✦'
  }
}

function scoreTier(score: number): string {
  if (score >= 85) return 'bg-brand-light text-brand-dark border border-brand-green/30'
  if (score >= 70) return 'bg-amber-50 text-amber-900 border border-amber-200'
  return 'bg-brand-cream-muted text-brand-near-black/60 border border-brand-near-black/10'
}

function statusTone(status: string | null | undefined): string {
  switch (status) {
    case 'won':
      return 'bg-brand-light text-brand-dark border border-brand-green/30'
    case 'contacted':
      return 'bg-brand-cream-muted text-brand-near-black/70 border border-brand-near-black/10'
    case 'responded':
      return 'bg-amber-50 text-amber-900 border border-amber-200'
    case 'lost':
    case 'skipped':
    case 'expired':
      return 'bg-brand-near-black/5 text-brand-near-black/55 border border-brand-near-black/10'
    case 'saved':
      return 'bg-brand-light text-brand-dark border border-brand-green/30'
    default:
      return 'bg-brand-cream-muted text-brand-near-black/65 border border-brand-near-black/10'
  }
}

export function LeadCard({
  href,
  businessName,
  signalLabel,
  signalType,
  score,
  whyNow,
  status,
  location,
  ageLabel,
  evidenceChips,
  variant = 'list',
}: Props) {
  if (variant === 'chat-hero') {
    return (
      <div className="rounded-2xl bg-brand-cream shadow-fetchi-soft p-4 lg:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[15.5px] font-bold text-brand-near-black leading-tight">
              {businessName}
            </div>
            <div className="text-[12.5px] text-brand-near-black/55 mt-1">
              {location ?? signalLabel}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-outfit text-[28px] leading-none font-bold text-brand-green tabular-nums">
              {score}
            </div>
            <div className="text-[10px] uppercase tracking-[1px] text-brand-near-black/45 mt-1 font-bold">
              score
            </div>
          </div>
        </div>

        {(ageLabel || evidenceChips?.length || signalLabel) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-coral/12 text-brand-coral px-2.5 py-1 text-[11.5px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
              {signalLabel}
              {ageLabel ? ` · ${ageLabel}` : ''}
            </span>
            {evidenceChips?.map(chip => (
              <span
                key={chip.label}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                  chip.tone === 'coral'
                    ? 'bg-brand-coral/12 text-brand-coral'
                    : 'bg-brand-cream-muted text-brand-near-black/65 border border-brand-near-black/10',
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
            className="flex-1 inline-flex items-center justify-center h-11 rounded-full bg-brand-green text-white text-[14px] font-semibold hover:bg-brand-dark transition-colors"
          >
            Open lead
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-brand-cream-muted text-brand-near-black/75 text-[14px] font-semibold border border-brand-near-black/8 hover:text-brand-near-black hover:bg-white transition-colors"
            aria-label="Pass on this lead"
          >
            Pass
          </button>
        </div>
      </div>
    )
  }

  const isChat = variant === 'chat'

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl bg-brand-cream shadow-fetchi-soft transition-all hover:-translate-y-px hover:shadow-fetchi-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        isChat ? 'p-3.5' : 'p-4 lg:p-5',
      )}
    >
      <div className="flex items-start gap-3 lg:gap-4">
        <div
          className={cn(
            'rounded-xl bg-brand-light flex items-center justify-center flex-shrink-0 text-base',
            isChat ? 'w-9 h-9' : 'w-11 h-11',
          )}
          aria-hidden
        >
          {signalIcon(signalType)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className={cn(
                  'font-semibold text-brand-near-black truncate',
                  isChat ? 'text-[13.5px]' : 'text-[15px]',
                )}
              >
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
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums flex-shrink-0',
                scoreTier(score),
              )}
            >
              {score}
            </span>
          </div>

          {!isChat && whyNow && (
            <p className="fetchi-clamp-2 mt-2 text-[13px] text-brand-near-black/70 leading-relaxed">
              {whyNow}
            </p>
          )}

          {!isChat && (status || ageLabel) && (
            <div className="flex items-center gap-2 mt-3">
              {status && (
                <span
                  className={cn(
                    'hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                    statusTone(status),
                  )}
                >
                  {status}
                </span>
              )}
              {ageLabel && (
                <span className="text-[11.5px] text-brand-near-black/45">
                  {ageLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
