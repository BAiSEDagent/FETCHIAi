import * as React from 'react'
import { Globe, MapPin, Phone, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type CoverageItem = {
  available: boolean
  icon: LucideIcon
  label: 'Phone' | 'Website' | 'Address'
}

export interface CoverageIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  addressAvailable: boolean
  phoneAvailable: boolean
  websiteAvailable: boolean
}

const CoverageIndicator = React.forwardRef<
  HTMLSpanElement,
  CoverageIndicatorProps
>(
  (
    {
      addressAvailable,
      className,
      phoneAvailable,
      websiteAvailable,
      ...props
    },
    ref,
  ) => {
    const items: CoverageItem[] = [
      { available: phoneAvailable, icon: Phone, label: 'Phone' },
      { available: websiteAvailable, icon: Globe, label: 'Website' },
      { available: addressAvailable, icon: MapPin, label: 'Address' },
    ]

    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-2',
          className,
        )}
        data-fetchi-coverage-indicator
        ref={ref}
        {...props}
      >
        {items.map(({ available, icon: Icon, label }) => (
          <span
            aria-label={`${label} ${available ? 'available' : 'unavailable'}`}
            className={cn(
              'relative h-[15px] w-[15px] shrink-0',
              available
                ? 'text-[var(--fetchi-text-secondary)]'
                : 'text-[#4A4E54]',
            )}
            data-fetchi-coverage-item={label.toLowerCase()}
            data-fetchi-coverage-state={available ? 'available' : 'unavailable'}
            key={label}
            role="img"
          >
            <Icon
              aria-hidden="true"
              className="block h-[15px] w-[15px]"
              strokeWidth={2}
            />
            {!available ? (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 block h-[15px] w-[15px]"
                data-fetchi-coverage-strike
                data-fetchi-coverage-strike-angle="-45"
                focusable="false"
                viewBox="0 0 15 15"
              >
                <line
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  x1="2"
                  y1="13"
                  x2="13"
                  y2="2"
                />
              </svg>
            ) : null}
          </span>
        ))}
      </span>
    )
  },
)

CoverageIndicator.displayName = 'CoverageIndicator'

export { CoverageIndicator }
