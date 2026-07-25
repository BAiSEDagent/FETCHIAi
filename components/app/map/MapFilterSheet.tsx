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
        data-fetchi-brand-system="v5"
        data-cp25a-filter-sheet
        data-fetchi-reduced-motion-sheet
        className="fetchi-app theme-dark max-h-[82dvh] overflow-y-auto rounded-t-2xl border-x border-t border-border bg-[var(--fetchi-bg-elevated)] px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 text-text shadow-[0_-18px_52px_-26px_rgba(0,0,0,0.85)] lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[680px] lg:w-[420px] lg:rounded-2xl lg:border"
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-textMuted" aria-hidden="true" />
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="font-fetchi text-[24px] font-semibold leading-none tracking-[-0.02em] text-text">
            Filters
          </SheetTitle>
          <SheetDescription className="sr-only">
            Filter saved leads visible on the map.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          <section aria-labelledby="map-lifecycle-filter">
            <h3 id="map-lifecycle-filter" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
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
            <h3 id="map-data-filter" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
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
            className="min-h-[44px] rounded-lg bg-fetchiAccent px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-fetchiOverlay px-5 text-[14px] font-semibold text-text2 transition-colors hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55"
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
      className={cn(
        'flex min-h-[52px] items-center gap-4 rounded-xl border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55',
        checked
          ? 'border-[var(--fetchi-accent-border)] bg-[var(--fetchi-accent-subtle)]'
          : 'border-border bg-fetchiOverlay hover:bg-fetchiOverlayHover',
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[12px] font-black',
          iconClassName || 'bg-bg text-text2',
        )}
        aria-hidden="true"
      >
        {icon || <Square className="h-3.5 w-3.5 fill-current" />}
      </span>
      <span className="min-w-0 flex-1 text-[17px] font-semibold text-text">{label}</span>
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border transition',
          checked ? 'border-fetchiAccent bg-fetchiAccent text-white' : 'border-border bg-bg text-transparent',
        )}
        aria-hidden="true"
      >
        <Check className="h-4 w-4" />
      </span>
    </button>
  )
}
