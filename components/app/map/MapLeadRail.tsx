'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  Globe,
  MapPin,
  Navigation,
  Phone,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_PIN_CLASSES,
  formatLeadDate,
  formatMapMarketLabel,
  hasLeadPhone,
  leadDirectionsHref,
  leadInitials,
  leadWebsiteHref,
  type MappableSavedLead,
} from './map-helpers'

type Props = {
  leads: MappableSavedLead[]
  totalCount: number
  query: string
  onQueryChange: (value: string) => void
  onOpenFilters: () => void
  filtersActive: boolean
  selectedLeadId: string | null
  onSelectLead: (leadId: string) => void
  onClearSelection: () => void
}

export function MapLeadRail({
  leads,
  totalCount,
  query,
  onQueryChange,
  onOpenFilters,
  filtersActive,
  selectedLeadId,
  onSelectLead,
  onClearSelection,
}: Props) {
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const visibleCount = leads.length
  const marketLabel = useMemo(
    () => leads.map((lead) => formatMapMarketLabel(lead.market)).find(Boolean) ?? null,
    [leads],
  )

  useEffect(() => {
    if (!selectedLeadId) return
    const row = rowRefs.current.get(selectedLeadId)
    if (!row) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    row.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }, [selectedLeadId])

  return (
    <aside
      data-cp25c-map-lead-rail
      className="relative z-20 hidden h-full w-[390px] shrink-0 flex-col overflow-hidden border-r border-text/10 bg-bg/96 text-text shadow-[20px_0_48px_-36px_rgba(0,0,0,0.85)] backdrop-blur-xl lg:flex 2xl:w-[420px]"
      aria-label="Saved leads on the map"
    >
      <header className="shrink-0 border-b border-text/8 px-5 pb-4 pt-6 2xl:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-outfit text-[28px] font-semibold leading-none text-text">My Leads</h1>
            <p className="mt-2 truncate text-[12.5px] font-medium text-text/48">
              {visibleCount} in view{marketLabel ? ` · ${marketLabel}` : ''}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-text/10 bg-raised/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-text/58">
            {totalCount} total
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[16px] border border-text/8 bg-raised/72 px-3 transition-colors duration-200 focus-within:border-text/22 focus-within:bg-raised motion-reduce:transition-none">
            <Search className="h-4 w-4 shrink-0 text-text/45" aria-hidden="true" />
            <label className="sr-only" htmlFor="map-rail-search">
              Search leads
            </label>
            <input
              id="map-rail-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search leads"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-text outline-none placeholder:text-text/38"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-text/48 transition-colors duration-200 hover:bg-text/8 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/45 motion-reduce:transition-none"
                aria-label="Clear lead search"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenFilters}
            className={cn(
              'relative inline-flex h-11 shrink-0 items-center gap-2 rounded-[16px] border px-3 text-[12.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/50 motion-reduce:transition-none',
              filtersActive
                ? 'border-text/75 bg-text text-bg shadow-sm'
                : 'border-text/10 bg-raised/72 text-text/72 hover:border-text/20 hover:bg-raised hover:text-text',
            )}
            aria-label="Open map filters"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {filtersActive && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 2xl:px-4">
        {visibleCount === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <p className="font-outfit text-[20px] font-semibold text-text">No leads in this view</p>
            <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-text/48">
              Clear search or adjust filters to show saved leads on the map.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {leads.map((lead) => {
              const selected = lead.id === selectedLeadId
              const websiteHref = leadWebsiteHref(lead)
              const directionsHref = leadDirectionsHref(lead)
              const phoneHref = hasLeadPhone(lead) ? `tel:${lead.phone.trim()}` : null
              const leadMarket = formatMapMarketLabel(lead.market)

              return (
                <article
                  key={lead.id}
                  ref={(node) => {
                    if (node) rowRefs.current.set(lead.id, node)
                    else rowRefs.current.delete(lead.id)
                  }}
                  data-cp25c-map-lead-row
                  data-selected={selected ? 'true' : 'false'}
                  className={cn(
                    'overflow-hidden rounded-[20px] border transition-all duration-200 motion-reduce:transition-none',
                    selected
                      ? 'border-ok/55 bg-ok/[0.07] shadow-[0_12px_30px_-22px_rgba(69,192,138,0.8)]'
                      : 'border-transparent bg-transparent hover:border-text/8 hover:bg-raised/45',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLead(lead.id)}
                    aria-pressed={selected}
                    className="group grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 px-3 py-3 text-left outline-none transition-all duration-200 active:scale-[0.995] focus-visible:bg-text/[0.055] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text/45 motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <span
                      className={cn(
                        'grid h-10 w-10 place-items-center rounded-full text-[12px] font-black shadow-sm transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none',
                        LIFECYCLE_PIN_CLASSES[lead.lifecycleStatus],
                      )}
                      aria-hidden="true"
                    >
                      {leadInitials(lead)}
                    </span>

                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate font-outfit text-[15.5px] font-semibold leading-tight text-text">
                          {lead.businessName}
                        </span>
                        <span className="shrink-0 text-[10.5px] font-semibold text-text/38">
                          {formatLeadDate(lead.updatedAtIso)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[12.5px] leading-snug text-text/50">
                        {[lead.category?.trim(), leadMarket].filter(Boolean).join(' · ') || lead.source}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <EvidenceIcon show={hasLeadPhone(lead)} label="Phone available">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        </EvidenceIcon>
                        <EvidenceIcon show={Boolean(websiteHref)} label="Website available">
                          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                        </EvidenceIcon>
                        <EvidenceIcon show={Boolean(lead.address?.trim())} label="Address available">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        </EvidenceIcon>
                        <span
                          className={cn(
                            'ml-0.5 text-[11.5px] font-semibold',
                            selected ? 'text-ok' : 'text-text/55',
                          )}
                        >
                          {LIFECYCLE_LABELS[lead.lifecycleStatus]}
                        </span>
                      </span>
                    </span>
                  </button>

                  {selected && (
                    <div className="border-t border-text/8 px-3 pb-3 pt-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[11.5px] text-text/42">
                          {lead.address?.trim() || 'Coordinates available'}
                        </p>
                        <button
                          type="button"
                          onClick={onClearSelection}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-text/45 transition-colors duration-200 hover:bg-text/8 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/45 motion-reduce:transition-none"
                          aria-label="Clear selected lead"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {phoneHref && (
                          <RailAction href={phoneHref} label="Call" icon={<Phone aria-hidden="true" />} />
                        )}
                        {websiteHref && (
                          <RailAction
                            href={websiteHref}
                            label="Website"
                            icon={<Globe aria-hidden="true" />}
                            external
                          />
                        )}
                        {directionsHref && (
                          <RailAction
                            href={directionsHref}
                            label="Directions"
                            icon={<Navigation aria-hidden="true" />}
                            external
                          />
                        )}
                        <RailAction
                          href={`/app/leads/${lead.id}`}
                          label="Profile"
                          icon={<ExternalLink aria-hidden="true" />}
                          internal
                        />
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function EvidenceIcon({
  show,
  label,
  children,
}: {
  show: boolean
  label: string
  children: ReactNode
}) {
  if (!show) return null
  return (
    <span className="text-text/38" title={label}>
      {children}
      <span className="sr-only">{label}</span>
    </span>
  )
}

function RailAction({
  href,
  label,
  icon,
  external = false,
  internal = false,
}: {
  href: string
  label: string
  icon: ReactNode
  external?: boolean
  internal?: boolean
}) {
  const className =
    'inline-flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-1 rounded-[12px] bg-raised/75 px-1.5 py-2 text-[9.5px] font-semibold text-text/65 transition-all duration-200 hover:bg-text/10 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/45 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:h-4 [&_svg]:w-4'

  if (internal) {
    return (
      <Link href={href} className={className} aria-label={`Open ${label.toLowerCase()}`}>
        {icon}
        {label}
      </Link>
    )
  }

  return (
    <a
      href={href}
      className={className}
      aria-label={label}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      {icon}
      {label}
    </a>
  )
}
