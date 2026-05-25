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

// v2.3 scoreTier — coral is reserved; high score gets evidence-blue tint,
// neutral score gets mustard caution, low score gets a calm dark chip.
function scoreTier(score: number): string {
  if (score >= 85) return 'bg-blue/12 text-blue border border-blue/30'
  if (score >= 70) return 'bg-mustard/15 text-mustard border border-mustard/30'
  return 'bg-text/[0.06] text-text/60 border border-text/10'
}

// Status pill palette — calm, sentence-case. Won uses the success token,
// neutral statuses use subtle inverted chips. Coral never used here.
function statusTone(status: string | null | undefined): string {
  switch (status) {
    case 'new':
      return 'bg-text/[0.08] text-text/75'
    case 'saved':
      return 'bg-ok/15 text-ok'
    case 'contacted':
      return 'bg-text/[0.08] text-text/75'
    case 'responded':
      return 'bg-mustard/15 text-mustard'
    case 'won':
      return 'bg-ok text-white'
    case 'lost':
      return 'bg-text/[0.06] text-text/55'
    case 'skipped':
      return 'bg-text/[0.06] text-text/55'
    case 'expired':
      return 'bg-text/[0.05] text-text/45'
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

// v2.1 / v2.3 — hot leads get a coral signal ribbon (one of the five coral
// places). Everything else is neutral on the dark operator surface.
function isHotScore(score: number): boolean {
  return score >= 85
}

export function LeadCard(props: Props) {
  const variant = props.variant ?? 'list'

  if (variant === 'chat-hero') return <ChatHeroCard {...props} />
  if (variant === 'chat') return <ChatCard {...props} />
  if (variant === 'run') return <RunCard {...props} />

  return <ListCard {...props} />
}

// ─────────────────────────────────────────────
// RUN VARIANT — legacy CP2.7 Today's Run focused card.
// Kept for backward compatibility; Today's Run uses today/* components now.
// ─────────────────────────────────────────────
function RunCard({
  href,
  businessName,
  signalLabel,
  signalToken,
  score,
  whyNow,
  status,
  location,
  contactName,
  contactConfidence,
  evidenceChips,
}: Props) {
  const confidence = Math.max(0, Math.min(3, contactConfidence ?? 0))
  const tokenText = signalToken ?? signalLabel
  const evidenceCount = evidenceChips?.length ?? 0
  const hot = isHotScore(score)

  return (
    <Link
      href={href}
      tabIndex={-1}
      aria-hidden
      className={cn(
        'block rounded-3xl bg-raised p-6 lg:p-8',
        'shadow-[0_1px_2px_rgba(0,0,0,0.25)]',
        'focus-visible:outline-none',
      )}
    >
      <div className="flex items-center flex-wrap gap-1.5">
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
            'bg-text/[0.06] text-text/70',
          )}
        >
          <span className="truncate max-w-[200px]">{tokenText}</span>
        </span>
      </div>

      <div
        className={cn(
          'font-outfit text-[64px] lg:text-[76px] leading-none font-bold tabular-nums mt-5',
          hot ? 'text-coral' : 'text-text',
        )}
      >
        {score}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.08em] font-bold text-text/40">
        score
      </div>

      <h2 className="font-outfit text-[22px] lg:text-[26px] font-bold text-text leading-tight mt-5">
        {businessName}
      </h2>
      {location && (
        <div className="mt-1 text-[13px] text-text/55">
          {location}
        </div>
      )}

      {whyNow && (
        <p className="mt-4 text-[14px] text-text/75 leading-[1.6]">
          {whyNow}
        </p>
      )}

      <div className="mt-5 pt-4 border-t border-text/8 flex items-center justify-between gap-3">
        {contactName ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-text/[0.08] text-text/75 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
              {initialsFor(contactName)}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text truncate">
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
                          i < confidence ? 'bg-ok' : 'bg-text/15',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-text/45 uppercase tracking-wide font-semibold">
                    confidence
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[12px] text-text/50">
            <span className="w-1.5 h-1.5 rounded-full bg-text/20" />
            Finding best contact
          </div>
        )}

        {evidenceCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-blue/10 text-blue px-2.5 h-[22px] text-[11px] font-semibold flex-shrink-0">
            {evidenceCount} source{evidenceCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────
// LIST VARIANT — My Leads anatomy, v2.3 dark operator surface.
// Hot leads (score >= 85) get a coral signal-token ribbon; all others get
// the neutral elevated chip. Score digit goes coral for hot, neutral text
// for the rest. This is the entire coral discipline for the lead card.
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
  const tokenText = signalToken ?? signalLabel
  const hot = isHotScore(score)

  return (
    <Link
      href={href}
      className={cn(
        'group relative block rounded-2xl bg-raised transition-all',
        'shadow-[0_1px_2px_rgba(0,0,0,0.30)]',
        'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'p-3.5 lg:p-5',
        hot && 'shadow-[inset_0_0_0_1px_rgba(244,91,59,0.30),0_1px_2px_rgba(0,0,0,0.30)]',
      )}
    >
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
              hot
                ? 'bg-coral/15 text-coral'
                : 'bg-text/[0.06] text-text/70',
            )}
          >
            <span className="truncate max-w-[180px]">{tokenText}</span>
          </span>
          {ageLabel && !signalToken && (
            <span className="text-[11px] text-text/45">· {ageLabel}</span>
          )}
        </div>

        <div className="flex-shrink-0 text-right leading-none">
          <div
            className={cn(
              'font-outfit text-[24px] lg:text-[28px] font-extrabold tabular-nums',
              hot ? 'text-coral' : 'text-text',
            )}
          >
            {score}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] font-bold text-text/40">
            score
          </div>
        </div>
      </div>

      <div className="mt-2.5 min-w-0">
        <h3 className="font-outfit text-[16.5px] lg:text-[18px] font-bold text-text leading-tight truncate">
          {businessName}
        </h3>
        {location && (
          <div className="mt-0.5 text-[12px] text-text/55 truncate">
            {location}
          </div>
        )}
      </div>

      {whyNow && (
        <p className="fetchi-clamp-2 mt-2.5 text-[12.5px] lg:text-[13px] text-text/75 leading-[1.5]">
          {whyNow}
        </p>
      )}

      <div className="mt-3 lg:mt-4 flex items-center justify-between gap-3">
        {contactName ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-text/[0.08] text-text/75 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
              {initialsFor(contactName)}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text truncate">
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
                          i < confidence ? 'bg-ok' : 'bg-text/15',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10.5px] text-text/45 uppercase tracking-wide font-semibold">
                    confidence
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11.5px] text-text/50">
            <span className="w-1.5 h-1.5 rounded-full bg-text/20" />
            Finding best contact
          </div>
        )}

        <span
          aria-hidden
          className="hidden lg:inline-flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 rounded-full bg-text text-bg px-3 py-1 text-[11.5px] font-semibold"
        >
          Open <ChevronRight className="h-3 w-3" />
        </span>
        <ChevronRight
          aria-hidden
          className="h-5 w-5 text-text/30 group-hover:text-text/60 transition-colors lg:group-hover:hidden flex-shrink-0"
        />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────
// CHAT-HERO VARIANT — preserved structure, retuned to v2.3 dark tokens.
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
  const hot = isHotScore(score)
  return (
    <div className="rounded-2xl bg-raised shadow-fetchi-soft p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15.5px] font-bold text-text leading-tight">
            {businessName}
          </div>
          <div className="text-[12.5px] text-text/55 mt-1">
            {location ?? signalLabel}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className={cn(
              'font-outfit text-[28px] leading-none font-bold tabular-nums',
              hot ? 'text-coral' : 'text-text',
            )}
          >
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[1px] text-text/45 mt-1 font-bold">
            score
          </div>
        </div>
      </div>

      {(ageLabel || evidenceChips?.length || signalLabel) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
              hot ? 'bg-coral/12 text-coral' : 'bg-text/[0.06] text-text/70',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                hot ? 'bg-coral' : 'bg-text/40',
              )}
            />
            {signalLabel}
            {ageLabel ? ` · ${ageLabel}` : ''}
          </span>
          {evidenceChips?.map(chip => (
            <span
              key={chip.label}
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                chip.tone === 'coral'
                  ? 'bg-coral/12 text-coral'
                  : 'bg-blue/10 text-blue border border-blue/20',
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {whyNow && (
        <p className="mt-3 text-[13.5px] text-text/75 leading-[1.6]">
          {whyNow}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={href}
          className="flex-1 inline-flex items-center justify-center h-11 rounded-full bg-coral text-white text-[14px] font-semibold hover:bg-coralDeep transition-colors"
        >
          Open lead
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-surface text-text/75 text-[14px] font-semibold border border-text/8 hover:text-text hover:bg-raised transition-colors"
          aria-label="Pass on this lead"
        >
          Pass
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CHAT VARIANT — calm status pill, dark surface
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
        'group block rounded-2xl bg-raised shadow-fetchi-soft transition-all hover:-translate-y-px hover:shadow-fetchi-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'p-3.5',
      )}
    >
      <div className="flex items-start gap-3">
        <GlyphTile glyph={glyphForSignalType(signalType ?? null)} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-text truncate">
                {businessName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-text/60">
                <span className="w-1.5 h-1.5 rounded-full bg-ok flex-shrink-0" />
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
                <span className="text-[11.5px] text-text/45">{ageLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
