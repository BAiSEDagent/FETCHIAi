'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  query: string
  onQueryChange: (value: string) => void
  onOpenFilters: () => void
  visibleCount: number
  totalCount: number
  filtersActive: boolean
}

export function MapTopBar({
  query,
  onQueryChange,
  onOpenFilters,
  visibleCount,
  totalCount,
  filtersActive,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 lg:px-6 lg:pt-6">
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-xl border border-border bg-[var(--fetchi-bg-elevated)] p-2 shadow-[0_18px_44px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div
          data-cp25a-ready-map-label
          className="flex h-12 shrink-0 items-center rounded-lg bg-fetchiOverlay px-3 font-fetchi text-[16px] font-semibold text-text"
        >
          Map
        </div>
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-fetchiOverlay px-3 text-text transition-colors focus-within:border-fetchiAccent focus-within:shadow-[var(--fetchi-focus-ring)]">
          <Search className="h-4 w-4 shrink-0 text-text2" aria-hidden="true" />
          <label className="sr-only" htmlFor="map-search">
            Search saved leads on the map
          </label>
          <input
            id="map-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search map"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-text outline-none placeholder:text-textMuted"
          />
          {query.trim() && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              data-fetchi-map-mobile-search-clear-target
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55"
              aria-label="Clear map search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="hidden h-12 min-w-[84px] items-center justify-center rounded-lg bg-fetchiOverlay px-3 text-center sm:flex">
          <span className="text-[12px] font-semibold text-text2">
            {visibleCount}/{totalCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            'relative grid h-12 w-12 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55',
            filtersActive
              ? 'border-fetchiAccent bg-fetchiAccent text-white hover:bg-[var(--fetchi-accent-hover)]'
              : 'border-border bg-fetchiOverlay text-text2 hover:bg-fetchiOverlayHover hover:text-text',
          )}
          aria-label="Open map filters"
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          {filtersActive && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}
