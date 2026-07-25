'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
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
  DEFAULT_MAP_FILTERS,
  LIFECYCLE_LABELS,
  LIFECYCLE_PIN_CLASSES,
  formatMapMarketLabel,
  hasLeadPhone,
  leadDirectionsHref,
  leadInitials,
  leadWebsiteHref,
  type MapFilters,
  type MapLifecycleStatus,
  type MappableSavedLead,
} from './map-helpers'
import {
  MapRailFilterPopover,
  RAIL_LIFECYCLE_STATUSES,
} from './MapRailFilterPopover'

type Props = {
  leads: MappableSavedLead[]
  totalCount: number
  query: string
  onQueryChange: (value: string) => void
  filters: MapFilters
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  onApplyFilters: (filters: MapFilters) => void
  onResetFilters: () => void
  onLifecycleFilterChange: (status: MapLifecycleStatus | null) => void
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
  filters,
  filtersOpen,
  onFiltersOpenChange,
  onApplyFilters,
  onResetFilters,
  onLifecycleFilterChange,
  filtersActive,
  selectedLeadId,
  onSelectLead,
  onClearSelection,
}: Props) {
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const filterPopoverUid = useId().replace(/:/g, '')
  const filterPopoverId = `map-rail-filters-${filterPopoverUid}`
  const visibleCount = leads.length
  const marketLabel = useMemo(
    () => leads.map((lead) => formatMapMarketLabel(lead.market)).find(Boolean) ?? null,
    [leads],
  )
  const lifecycleFiltersAreDefault =
    filters.lifecycleStatuses.length === DEFAULT_MAP_FILTERS.lifecycleStatuses.length &&
    DEFAULT_MAP_FILTERS.lifecycleStatuses.every((status) =>
      filters.lifecycleStatuses.includes(status),
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
      data-cp25c1-premium-map-lead-rail
      className="relative z-20 hidden h-full w-[390px] shrink-0 flex-col overflow-hidden border-l border-r border-border bg-[var(--fetchi-bg-elevated)] text-text lg:flex 2xl:w-[410px]"
      aria-label="Saved leads on the map"
    >
      <header className="relative z-30 shrink-0 border-b border-border px-4 pb-3 pt-5 2xl:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-fetchi text-[25px] font-semibold leading-none tracking-[-0.02em] text-text">My Leads</h1>
            <p className="mt-1.5 truncate text-[11.5px] font-medium text-text2">
              {visibleCount} in view{marketLabel ? ` · ${marketLabel}` : ''}
            </p>
          </div>
          <span className="shrink-0 pt-1 text-[11px] font-semibold tabular-nums text-text2">
            {visibleCount}/{totalCount}
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-fetchiOverlay px-3 transition-colors duration-200 focus-within:border-fetchiAccent focus-within:shadow-[var(--fetchi-focus-ring)] motion-reduce:transition-none">
            <Search className="h-3.5 w-3.5 shrink-0 text-text2" aria-hidden="true" />
            <label className="sr-only" htmlFor="map-rail-search">
              Search leads
            </label>
            <input
              id="map-rail-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search leads"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text outline-none placeholder:text-textMuted"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                data-fetchi-map-rail-search-clear-target
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text2 transition-colors duration-200 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none"
                aria-label="Clear lead search"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              ref={filterTriggerRef}
              type="button"
              onClick={() => onFiltersOpenChange(!filtersOpen)}
              data-cp25c1-rail-filter-trigger
              data-fetchi-map-rail-filter-target
              className={cn(
                'relative grid h-11 w-11 place-items-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none',
                filtersOpen
                  ? 'border-fetchiAccent bg-[var(--fetchi-accent-subtle)] text-fetchiAccent'
                  : 'border-border bg-fetchiOverlay text-text2 hover:bg-fetchiOverlayHover hover:text-text',
              )}
              aria-label={filtersActive ? 'Open map filters, filters active' : 'Open map filters'}
              aria-expanded={filtersOpen}
              aria-controls={filterPopoverId}
              title="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {filtersActive && (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-fetchiAccent"
                  aria-hidden="true"
                />
              )}
            </button>
            <MapRailFilterPopover
              id={filterPopoverId}
              open={filtersOpen}
              filters={filters}
              triggerRef={filterTriggerRef}
              onOpenChange={onFiltersOpenChange}
              onApply={onApplyFilters}
              onReset={onResetFilters}
            />
          </div>
        </div>

        <nav
          data-cp25c1-lifecycle-filter-rail
          className="-mx-1 mt-3 flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filter map leads by lifecycle"
        >
          <LifecycleChip
            label="All"
            active={lifecycleFiltersAreDefault}
            onClick={() => onLifecycleFilterChange(null)}
          />
          {RAIL_LIFECYCLE_STATUSES.map((status) => (
            <LifecycleChip
              key={status}
              label={LIFECYCLE_LABELS[status]}
              active={!lifecycleFiltersAreDefault && filters.lifecycleStatuses.includes(status)}
              markerClassName={LIFECYCLE_PIN_CLASSES[status]}
              onClick={() => onLifecycleFilterChange(status)}
            />
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 2xl:px-2.5">
        {visibleCount === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <p className="font-fetchi text-[18px] font-semibold text-text">No leads in this view</p>
            <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-relaxed text-text2">
              Clear search or adjust filters to show saved leads on the map.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
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
                  data-cp25c1-quiet-map-result-row
                  data-cp25c1-soft-selected-row={selected ? 'true' : 'false'}
                  data-selected={selected ? 'true' : 'false'}
                  className={cn(
                    'relative overflow-hidden rounded-xl border-l-2 border-transparent transition-colors duration-200 motion-reduce:transition-none',
                    selected && 'fetchi-selected-row',
                    !selected && 'bg-transparent hover:bg-fetchiOverlay',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLead(lead.id)}
                    aria-pressed={selected}
                    className="group grid min-h-[52px] w-full grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 px-2.5 py-2.5 text-left outline-none transition-[background-color,transform] duration-200 active:scale-[0.995] focus-visible:bg-fetchiOverlayHover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fetchiAccent/55 motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <span
                      data-cp25c1-neutral-lead-marker
                      className={cn(
                        'relative grid h-8 w-8 place-items-center rounded-lg bg-fetchiOverlay text-[10.5px] font-black text-text2 transition-colors duration-200 group-hover:text-text motion-reduce:transition-none',
                        selected && 'bg-[var(--fetchi-accent-subtle)] text-fetchiAccent',
                      )}
                      aria-hidden="true"
                    >
                      {leadInitials(lead)}
                      <span
                        data-cp25c1-lifecycle-dot
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-bg',
                          LIFECYCLE_PIN_CLASSES[lead.lifecycleStatus],
                        )}
                      />
                    </span>

                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center justify-between gap-2.5">
                        <span
                          className={cn(
                            'truncate font-fetchi text-[14.5px] font-semibold leading-[1.2] transition-colors duration-200 motion-reduce:transition-none',
                            selected
                              ? 'text-text'
                              : 'text-text2 group-hover:text-text group-focus-visible:text-text',
                          )}
                        >
                          {lead.businessName}
                        </span>
                        <span className="shrink-0 text-[10.5px] font-semibold text-text2">
                          {LIFECYCLE_LABELS[lead.lifecycleStatus]}
                        </span>
                      </span>
                      <span className="mt-1 flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[11.5px] leading-snug text-text2">
                          {[lead.category?.trim(), leadMarket].filter(Boolean).join(' · ') || lead.source}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <EvidenceIcon show={hasLeadPhone(lead)} label="Phone available">
                            <Phone className="h-3 w-3" aria-hidden="true" />
                          </EvidenceIcon>
                          <EvidenceIcon show={Boolean(websiteHref)} label="Website available">
                            <Globe className="h-3 w-3" aria-hidden="true" />
                          </EvidenceIcon>
                          <EvidenceIcon show={Boolean(lead.address?.trim())} label="Address available">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                          </EvidenceIcon>
                        </span>
                      </span>
                    </span>
                  </button>

                  {selected && (
                    <div
                      data-cp25c1-selected-details
                      className="animate-in fade-in slide-in-from-top-1 border-t border-border pb-2.5 pl-[52px] pr-2.5 pt-2 duration-200 motion-reduce:animate-none"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-3 w-3 shrink-0 text-text2" aria-hidden="true" />
                        <p className="min-w-0 flex-1 truncate text-[10.5px] text-text2">
                          {lead.address?.trim() || 'Coordinates available'}
                        </p>
                        <button
                          type="button"
                          onClick={onClearSelection}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text2 transition-colors duration-200 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none"
                          aria-label="Clear selected lead"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <div
                        data-cp25c1-selected-action-strip
                        className="mt-1.5 flex flex-nowrap items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      >
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

function LifecycleChip({
  label,
  active,
  onClick,
  markerClassName,
}: {
  label: string
  active: boolean
  onClick: () => void
  markerClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-cp25c1-lifecycle-option
      className={cn(
        'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none',
        active
          ? 'bg-[var(--fetchi-accent-subtle)] text-fetchiAccent'
          : 'bg-transparent text-text2 hover:bg-fetchiOverlayHover hover:text-text',
      )}
    >
      {markerClassName ? (
        <span
          data-cp25c1-lifecycle-filter-dot
          className={cn('h-2 w-2 rounded-full', markerClassName)}
          aria-hidden="true"
        />
      ) : (
        <span
          data-cp25c1-lifecycle-filter-dot
          className="h-2 w-2 rounded-full bg-textMuted"
          aria-hidden="true"
        />
      )}
      {label}
    </button>
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
    <span className="text-evidence" title={label}>
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
  const className = cn(
    'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[10.5px] font-semibold transition-colors duration-200 hover:bg-fetchiOverlayHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none [&_svg]:h-3.5 [&_svg]:w-3.5',
    internal ? 'text-fetchiAccent hover:text-[var(--fetchi-accent-hover)]' : 'text-evidence hover:text-evidence/80',
  )

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
