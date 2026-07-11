'use client'

import { useEffect, useMemo, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, MapPin, RotateCcw } from 'lucide-react'
import type { SavedLeadPipelineRow } from '@/lib/runtime/sweep/saved-leads'
import { cn } from '@/lib/utils'
import { MapCanvas } from './MapCanvas'
import { MapFilterSheet } from './MapFilterSheet'
import { MapTopBar } from './MapTopBar'
import { SelectedLeadSheet } from './SelectedLeadSheet'
import {
  DEFAULT_MAP_FILTERS,
  filterSavedLeadsForMap,
  getMappableSavedLeads,
  type MapFilters,
} from './map-helpers'

type Props = {
  leads: SavedLeadPipelineRow[]
  mapEnabled: boolean
  workspaceName: string
}

export function SavedLeadMapShell({ leads, mapEnabled, workspaceName }: Props) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)

  const mappableLeads = useMemo(() => getMappableSavedLeads(leads), [leads])
  const filteredLeads = useMemo(
    () => filterSavedLeadsForMap(mappableLeads, filters, query),
    [filters, mappableLeads, query],
  )
  const selectedLead = useMemo(
    () => mappableLeads.find((lead) => lead.id === selectedLeadId) ?? null,
    [mappableLeads, selectedLeadId],
  )
  const fitKey = useMemo(
    () => `${query.trim().toLowerCase()}|${filters.lifecycleStatuses.join(',')}|${filters.requiresAddress ? 'a' : ''}${filters.requiresPhone ? 'p' : ''}${filters.requiresWebsite ? 'w' : ''}|${filteredLeads.map((lead) => lead.id).join(',')}`,
    [filters, filteredLeads, query],
  )

  const filtersActive =
    filters.requiresAddress ||
    filters.requiresPhone ||
    filters.requiresWebsite ||
    filters.lifecycleStatuses.length !== DEFAULT_MAP_FILTERS.lifecycleStatuses.length

  useEffect(() => {
    if (selectedLeadId && !filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(null)
    }
  }, [filteredLeads, selectedLeadId])

  const mapUnavailable = !mapEnabled || mapFailed

  if (mapUnavailable) {
    return (
      <MapFrame data-cp25a-map-unavailable-state>
        <StaticMapBackdrop muted />
        <MapTopTitle />
        <CenteredState
          icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />}
          title="Map is unavailable in this environment."
          body="Your saved leads are still available in Leads."
          primaryHref="/app/leads"
          primaryLabel="Open lead list"
        />
      </MapFrame>
    )
  }

  if (leads.length === 0) {
    return (
      <MapFrame data-cp25a-map-no-saved-state>
        <StaticMapBackdrop />
        <MapTopTitle />
        <CenteredState
          icon={<MapPin className="h-7 w-7" aria-hidden="true" />}
          title="No saved leads yet"
          body={`${workspaceName} does not have saved leads to place on the map.`}
          primaryHref="/app/sweep"
          primaryLabel="Fetch leads"
        />
      </MapFrame>
    )
  }

  if (mappableLeads.length === 0) {
    return (
      <MapFrame data-cp25a-map-no-geo-state>
        <StaticMapBackdrop />
        <MapTopTitle />
        <CenteredState
          icon={<MapPin className="h-7 w-7" aria-hidden="true" />}
          title="None of your saved leads can be placed on the map yet."
          body="These leads do not currently have map coordinates."
          primaryHref="/app/leads"
          primaryLabel="Open lead list"
        />
      </MapFrame>
    )
  }

  return (
    <MapFrame data-cp25a-ready-map-shell>
      <MapCanvas
        leads={filteredLeads}
        selectedLeadId={selectedLeadId}
        onSelectLead={setSelectedLeadId}
        onReady={() => setMapReady(true)}
        onError={() => setMapFailed(true)}
        fitKey={fitKey}
      />
      <MapTopBar
        query={query}
        onQueryChange={setQuery}
        onOpenFilters={() => setFiltersOpen(true)}
        visibleCount={filteredLeads.length}
        totalCount={mappableLeads.length}
        filtersActive={filtersActive}
      />

      {!mapReady && (
        <div
          data-cp25a-map-loading-state
          className="absolute inset-0 z-10 grid place-items-center bg-bg/70 text-center backdrop-blur-sm"
        >
          <div className="rounded-[24px] border border-text/10 bg-bg/92 px-6 py-5 shadow-2xl shadow-black/35">
            <p className="font-outfit text-[22px] font-semibold text-text">Loading map</p>
            <p className="mt-1 text-[14px] text-text/55">Placing saved leads.</p>
          </div>
        </div>
      )}

      {mapReady && filteredLeads.length === 0 && (
        <div
          data-cp25a-map-no-results-state
          className="pointer-events-none absolute inset-x-4 bottom-6 z-20 lg:left-6 lg:right-auto lg:w-[360px]"
        >
          <div className="pointer-events-auto rounded-[24px] border border-text/10 bg-bg/92 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <p className="font-outfit text-[24px] font-semibold leading-tight text-text">No results</p>
            <p className="mt-2 text-[14px] leading-relaxed text-text/58">
              Adjust filters or search to show saved leads on the map.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setFilters(DEFAULT_MAP_FILTERS)
              }}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-text px-4 text-[14px] font-semibold text-bg transition hover:bg-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      )}

      <MapFilterSheet
        open={filtersOpen}
        filters={filters}
        onOpenChange={setFiltersOpen}
        onApply={setFilters}
        onReset={() => setFilters(DEFAULT_MAP_FILTERS)}
      />
      <SelectedLeadSheet
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadId(null)
        }}
      />
    </MapFrame>
  )
}

function MapFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...props}
      className={cn(
        'relative h-[calc(100dvh-9rem)] min-h-[560px] overflow-hidden bg-bg text-text lg:h-screen lg:min-h-[720px]',
        className,
      )}
    >
      {children}
    </section>
  )
}

function MapTopTitle() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-4 lg:px-6 lg:pt-6">
      <div className="mx-auto max-w-5xl rounded-[24px] border border-text/10 bg-bg/88 px-5 py-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <p className="font-outfit text-[22px] font-semibold leading-none text-text">Map</p>
      </div>
    </div>
  )
}

function CenteredState({
  icon,
  title,
  body,
  primaryHref,
  primaryLabel,
}: {
  icon: ReactNode
  title: string
  body: string
  primaryHref: string
  primaryLabel: string
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-5 py-24">
      <div className="w-full max-w-[420px] rounded-[28px] border border-text/10 bg-bg/92 p-6 text-center shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-raised text-text">
          {icon}
        </div>
        <h1 className="font-outfit text-[30px] font-semibold leading-[1.02] text-text">{title}</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-[15px] leading-relaxed text-text/58">{body}</p>
        <Link
          href={primaryHref}
          className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-text px-5 text-[15px] font-semibold text-bg transition hover:bg-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function StaticMapBackdrop({ muted = false }: { muted?: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-raised',
        muted && 'opacity-55 grayscale',
      )}
      aria-hidden="true"
    />
  )
}
