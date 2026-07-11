'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Globe, MapPin, Phone, RotateCcw, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DEFAULT_MAP_FILTERS,
  LIFECYCLE_LABELS,
  LIFECYCLE_PIN_CLASSES,
  MAP_LIFECYCLE_STATUSES,
  type MapFilters,
  type MapLifecycleStatus,
} from './map-helpers'

type Props = {
  open: boolean
  filters: MapFilters
  onOpenChange: (open: boolean) => void
  onApply: (filters: MapFilters) => void
  onReset: () => void
}

export function MapFilterSheet({ open, filters, onOpenChange, onApply, onReset }: Props) {
  const [draftFilters, setDraftFilters] = useState<MapFilters>(filters)

  useEffect(() => {
    if (open) {
      setDraftFilters(filters)
    }
  }, [filters, open])

  const selectedLifecycleSet = useMemo(
    () => new Set(draftFilters.lifecycleStatuses),
    [draftFilters.lifecycleStatuses],
  )

  function toggleLifecycle(status: MapLifecycleStatus) {
    setDraftFilters((current) => {
      const nextSet = new Set(current.lifecycleStatuses)
      if (nextSet.has(status)) {
        nextSet.delete(status)
      } else {
        nextSet.add(status)
      }

      return {
        ...current,
        lifecycleStatuses: MAP_LIFECYCLE_STATUSES.filter((value) => nextSet.has(value)),
      }
    })
  }

  function toggleBoolean(key: 'requiresAddress' | 'requiresPhone' | 'requiresWebsite') {
    setDraftFilters((current) => ({ ...current, [key]: !current[key] }))
  }

  function resetDraft() {
    setDraftFilters(DEFAULT_MAP_FILTERS)
    onReset()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-fetchi-theme-root
        data-cp25a-filter-sheet
        className="theme-dark max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-0 bg-bg px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-5 text-text shadow-2xl shadow-black/45 lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[680px] lg:w-[420px] lg:rounded-[28px]"
      >
        <div className="mx-auto mb-6 h-1.5 w-14 rounded-full bg-text/28" aria-hidden="true" />
        <SheetHeader className="mb-7 text-left">
          <SheetTitle className="font-outfit text-[34px] font-semibold leading-none text-text">
            Filters
          </SheetTitle>
          <SheetDescription className="sr-only">
            Filter saved leads visible on the map.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          <section aria-labelledby="map-lifecycle-filter">
            <h3 id="map-lifecycle-filter" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-text/45">
              Lifecycle
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {MAP_LIFECYCLE_STATUSES.map((status) => (
                <FilterToggle
                  key={status}
                  checked={selectedLifecycleSet.has(status)}
                  iconClassName={LIFECYCLE_PIN_CLASSES[status]}
                  label={LIFECYCLE_LABELS[status]}
                  onClick={() => toggleLifecycle(status)}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="map-data-filter">
            <h3 id="map-data-filter" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-text/45">
              Data availability
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <FilterToggle
                checked={draftFilters.requiresAddress}
                label="Has address"
                icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
                onClick={() => toggleBoolean('requiresAddress')}
              />
              <FilterToggle
                checked={draftFilters.requiresPhone}
                label="Has phone"
                icon={<Phone className="h-5 w-5" aria-hidden="true" />}
                onClick={() => toggleBoolean('requiresPhone')}
              />
              <FilterToggle
                checked={draftFilters.requiresWebsite}
                label="Has website"
                icon={<Globe className="h-5 w-5" aria-hidden="true" />}
                onClick={() => toggleBoolean('requiresWebsite')}
              />
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              onApply(draftFilters)
              onOpenChange(false)
            }}
            className="min-h-[56px] rounded-full bg-text px-5 text-[16px] font-semibold text-bg transition hover:bg-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-raised px-5 text-[15px] font-semibold text-text transition hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FilterToggle({
  checked,
  label,
  onClick,
  icon,
  iconClassName,
}: {
  checked: boolean
  label: string
  onClick: () => void
  icon?: ReactNode
  iconClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[58px] items-center gap-4 rounded-[18px] bg-raised/80 px-4 text-left transition hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
      aria-pressed={checked}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-black',
          iconClassName || 'bg-bg text-text',
        )}
        aria-hidden="true"
      >
        {icon || <Square className="h-3.5 w-3.5 fill-current" />}
      </span>
      <span className="min-w-0 flex-1 text-[17px] font-semibold text-text">{label}</span>
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border transition',
          checked ? 'border-text bg-text text-bg' : 'border-text/18 bg-bg text-transparent',
        )}
        aria-hidden="true"
      >
        <Check className="h-4 w-4" />
      </span>
    </button>
  )
}
