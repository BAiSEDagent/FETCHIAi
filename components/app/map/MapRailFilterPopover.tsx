'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Check, Globe, MapPin, Phone, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_MAP_FILTERS,
  LIFECYCLE_LABELS,
  LIFECYCLE_PIN_CLASSES,
  type MapFilters,
  type MapLifecycleStatus,
} from './map-helpers'

export const RAIL_LIFECYCLE_STATUSES = [
  'saved',
  'contacted',
  'won',
  'lost',
] satisfies readonly MapLifecycleStatus[]

type Props = {
  id: string
  open: boolean
  filters: MapFilters
  triggerRef: RefObject<HTMLButtonElement>
  onOpenChange: (open: boolean) => void
  onApply: (filters: MapFilters) => void
  onReset: () => void
}

export function MapRailFilterPopover({
  id,
  open,
  filters,
  triggerRef,
  onOpenChange,
  onApply,
  onReset,
}: Props) {
  const [draftFilters, setDraftFilters] = useState<MapFilters>(filters)
  const [present, setPresent] = useState(open)
  const popoverRef = useRef<HTMLDivElement>(null)

  const closeAndFocusTrigger = useCallback(() => {
    onOpenChange(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [onOpenChange, triggerRef])

  useEffect(() => {
    if (open) {
      setPresent(true)
      setDraftFilters(filters)
      const frame = window.requestAnimationFrame(() => {
        popoverRef.current
          ?.querySelector<HTMLElement>('[data-cp25c1-filter-autofocus]')
          ?.focus()
      })
      return () => window.cancelAnimationFrame(frame)
    }

    const timeout = window.setTimeout(() => setPresent(false), 200)
    return () => window.clearTimeout(timeout)
  }, [filters, open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      onOpenChange(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAndFocusTrigger()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeAndFocusTrigger, onOpenChange, open, triggerRef])

  const selectedLifecycleSet = useMemo(
    () => new Set(draftFilters.lifecycleStatuses),
    [draftFilters.lifecycleStatuses],
  )

  function toggleLifecycle(status: MapLifecycleStatus) {
    setDraftFilters((current) => {
      const nextSet = new Set(current.lifecycleStatuses)
      if (nextSet.has(status)) nextSet.delete(status)
      else nextSet.add(status)

      return {
        ...current,
        lifecycleStatuses: RAIL_LIFECYCLE_STATUSES.filter((value) => nextSet.has(value)),
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

  if (!present) return null

  return (
    <div
      ref={popoverRef}
      id={id}
      role="dialog"
      aria-label="Filter saved leads on the map"
      aria-hidden={!open}
      inert={!open}
      data-cp25c1-rail-filter-popover
      data-state={open ? 'open' : 'closed'}
      className={cn(
        'absolute right-0 top-[calc(100%+8px)] z-50 w-[352px] max-w-[calc(100vw-2rem)] origin-top-right overflow-y-auto rounded-xl border border-border bg-fetchiOverlay p-3.5 text-text shadow-[0_20px_48px_-24px_rgba(0,0,0,0.9)] transition-[opacity,transform] duration-200 motion-reduce:transform-none motion-reduce:transition-none',
        open
          ? 'visible translate-y-0 opacity-100'
          : 'invisible pointer-events-none -translate-y-1 opacity-0',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="font-fetchi text-[15px] font-semibold leading-none text-text">Filters</h2>
          <p className="mt-1 text-[11px] text-textMuted">Saved leads on this map</p>
        </div>
        <button
          type="button"
          onClick={closeAndFocusTrigger}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text2 transition-colors duration-200 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none"
          aria-label="Close filters"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <section aria-labelledby={`${id}-lifecycle`}>
        <h3
          id={`${id}-lifecycle`}
          className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted"
        >
          Lifecycle
        </h3>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {RAIL_LIFECYCLE_STATUSES.map((status, index) => (
            <FilterOption
              key={status}
              checked={selectedLifecycleSet.has(status)}
              label={LIFECYCLE_LABELS[status]}
              markerClassName={LIFECYCLE_PIN_CLASSES[status]}
              onClick={() => toggleLifecycle(status)}
              autofocus={index === 0}
            />
          ))}
        </div>
      </section>

      <section className="mt-4 border-t border-border pt-3" aria-labelledby={`${id}-availability`}>
        <h3
          id={`${id}-availability`}
          className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-textMuted"
        >
          Data availability
        </h3>
        <div className="mt-1.5 space-y-1">
          <FilterOption
            checked={draftFilters.requiresAddress}
            label="Has address"
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => toggleBoolean('requiresAddress')}
          />
          <FilterOption
            checked={draftFilters.requiresPhone}
            label="Has phone"
            icon={<Phone className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => toggleBoolean('requiresPhone')}
          />
          <FilterOption
            checked={draftFilters.requiresWebsite}
            label="Has website"
            icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => toggleBoolean('requiresWebsite')}
          />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => {
            onApply(draftFilters)
            closeAndFocusTrigger()
          }}
          className="min-h-[44px] rounded-lg bg-fetchiAccent px-4 text-[12.5px] font-semibold text-white transition-colors duration-200 hover:bg-[var(--fetchi-accent-hover)] active:bg-[var(--fetchi-accent-press)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={resetDraft}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-text2 transition-colors duration-200 hover:bg-fetchiOverlayHover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  )
}

function FilterOption({
  checked,
  label,
  onClick,
  icon,
  markerClassName,
  autofocus = false,
}: {
  checked: boolean
  label: string
  onClick: () => void
  icon?: ReactNode
  markerClassName?: string
  autofocus?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      data-cp25c1-filter-autofocus={autofocus ? '' : undefined}
      className={cn(
        'flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-left text-[12px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fetchiAccent/55 motion-reduce:transition-none',
        checked ? 'bg-[var(--fetchi-accent-subtle)] text-text' : 'text-text2 hover:bg-fetchiOverlayHover hover:text-text',
      )}
    >
      {markerClassName ? (
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', markerClassName)}
          aria-hidden="true"
        />
      ) : (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-bg text-text2" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          'grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition-colors duration-200 motion-reduce:transition-none',
          checked ? 'border-fetchiAccent bg-fetchiAccent text-white' : 'border-border text-transparent',
        )}
        aria-hidden="true"
      >
        <Check className="h-3 w-3" />
      </span>
    </button>
  )
}
