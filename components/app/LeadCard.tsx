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

// Variant union reserved for future surfaces (chat / chat-hero / run / map /
// related). CP2.5B keeps `list` as the canonical anatomy.
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
  return 'bg-brand-cream-muted text-brand-near-black/60 border border-brand-near-black/10'
}

// CP2.5B status pill palette — calm, sentence-case, no uppercase tracking.
// Coral is intentionally NOT used here; it stays reserved for actual urgency
// signals elsewhere in the app.
function statusTone(status: string | null | undefined): string {
  switch (status) {
    case 'new':
      return 'bg-brand-light text-brand-dark'
    case 'saved':
      return 'bg-brand-green/15 text-brand-dark'
    case 'contacted':
      return 'bg-brand-cream-muted text-brand-near-black/70'
    case 'responded':
      return 'bg-amber-100/70 text-amber-900'
    case 'won':
      return 'bg-brand-green text-white'
    case 'lost':
      return 'bg-brand-near-black/[0.06] text-brand-near-black/55'
    case 'skipped':
      return 'bg-brand-near-black/[0.06] text-brand-near-black/55'
    case 'expired':
      return 'bg-brand-near-black/[0.05] text-brand-near-black/45'
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

  // Default + future variants (run / map / related) currently render via the
  // canonical list layout — CP2.5B locks the `list` visuals.
  return <ListCard {...props} />
}

// ─────────────────────────────────────────────
// LIST VARIANT — CP2.5B My Leads anatomy
// ─────────────────────────────────────────────
function ListCard({
  href,
  businessName,
  signalLabel,
  signalToken,
  score,
  whyNow,
  status,
  location,
  ageLabel,
  contactName,
  contactConfidence,
}: Props) {
  const confidence = Math.max(0, Math.min(3, contactConfidence ?? 0))
  // Prefer the compact uppercase token; fall back to the human label when no
  // structured metadata exists yet.
  const tokenText = signalToken ?? signalLabel

  return (
    <Link
      href={href}
      className={cn(
        'group relative block rounded-2xl bg-ml-card transition-all',
        'shadow-[0_1px_2px_rgba(45,43,42,0.04)]',
        'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(45,43,42,0.18)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        'p-3.5 lg:p-5',
      )}
    >
      {/* Top row: status pill + compact signal token + freshness · score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 h-[22px] text-[11px] font-semibold',
              statusTone(status),
            )}
          >
            {statusLabel(status)}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full h-[22px] px-2 text-[10.5px] font-bold tracking-[0.04em] tabular-nums',
              'bg-brand-near-black/[0.05] text-brand-near-black/70',
            )}
          >
            <span className="truncate max-w-[180px]">{tokenText}</span>
          </span>
          {ageLabel && !signalToken && (
            <span className="text-[11px] text-brand-near-black/45">· {ageLabel}</span>
          )}
        </div>

        <div className="flex-shrink-0 text-right leading-none">
          <div className="font-outfit text-[24px] lg:text-[28px] font-extrabold text-brand-dark tabular-nums">
            {score}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] font-bold text-brand-near-black/40">
            score
          </div>
        </div>
      </div>

      {/* Business name + location */}
      <div className="mt-2.5 min-w-0">
        <h3 className="font-outfit text-[16.5px] lg:text-[18px] font-bold text-brand-near-black leading-tight truncate">
          {businessName}
        </h3>
        {location && (
          <div className="mt-0.5 text-[12px] text-brand-near-black/55 truncate">
            {location}
          </div>
        )}
      </div>

      {/* Why-now reason */}
      {whyNow && (
        <p className="fetchi-clamp-2 mt-2.5 text-[12.5px] lg:text-[13px] text-brand-near-black/75 leading-[1.5]">
          {whyNow}
        </p>
      )}

      {/* Contact row + chevron */}
      <div className="mt-3 lg:mt-4 flex items-center justify-between gap-3">
        {contactName ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-light text-brand-dark text-[11px] font-bold flex items-center justify-center flex-shrink-0">
              {initialsFor(contactName)}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-brand-near-black truncate">
                {contactName}
              </div>
              {confidence > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex gap-0.5" aria-label={`Contact confidence ${confidence} of 3`}>
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          i < confidence ? 'bg-brand-green' : 'bg-brand-near-black/15',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10.5px] text-brand-near-black/45 uppercase tracking-wide font-semibold">
                    confidence
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11.5px] text-brand-near-black/50">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-near-black/20" />
            Finding best contact
          </div>
        )}

        <span
          aria-hidden
          className="hidden lg:inline-flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 rounded-full bg-brand-near-black/90 text-white px-3 py-1 text-[11.5px] font-semibold"
        >
          Open <ChevronRight className="h-3 w-3" />
        </span>
        <ChevronRight
          aria-hidden
          className="h-5 w-5 text-brand-near-black/30 group-hover:text-brand-near-black/60 transition-colors lg:group-hover:hidden flex-shrink-0"
        />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────
// CHAT-HERO VARIANT — preserved from CP2.3
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// CHAT VARIANT — preserved from CP2.3, with calm status pill
// ─────────────────────────────────────────────
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
      className={cn(
        'group block rounded-2xl bg-brand-cream shadow-fetchi-soft transition-all hover:-translate-y-px hover:shadow-fetchi-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-parchment',
        'p-3.5',
      )}
    >
      <div className="flex items-start gap-3">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} size="sm" />
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
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums flex-shrink-0',
                scoreTier(score),
              )}
            >
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
