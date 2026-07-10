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
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-[24px] border border-text/10 bg-bg/88 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[18px] bg-raised/90 px-3 text-text">
          <Search className="h-4 w-4 shrink-0 text-text/55" aria-hidden="true" />
          <label className="sr-only" htmlFor="map-search">
            Search saved leads on the map
          </label>
          <input
            id="map-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search map"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-text outline-none placeholder:text-text/42"
          />
          {query.trim() && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text/60 transition hover:bg-text/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
              aria-label="Clear map search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="hidden h-12 min-w-[84px] items-center justify-center rounded-[18px] bg-raised/80 px-3 text-center sm:flex">
          <span className="text-[12px] font-semibold text-text/70">
            {visibleCount}/{totalCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            'relative grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55',
            filtersActive
              ? 'border-text bg-text text-bg'
              : 'border-text/10 bg-raised/90 text-text hover:bg-text/10',
          )}
          aria-label="Open map filters"
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          {filtersActive && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}
