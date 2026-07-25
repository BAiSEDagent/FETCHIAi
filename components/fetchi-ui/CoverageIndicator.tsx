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
              'relative shrink-0',
              available
                ? 'text-[var(--fetchi-text-secondary)]'
                : 'text-[#4A4E54]',
            )}
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
              <span
                aria-hidden="true"
                className="absolute left-[-2px] top-1/2 h-[1.5px] w-5 origin-center -rotate-45 rounded-[1px] bg-[#4A4E54]"
                data-fetchi-coverage-strike
              />
            ) : null}
          </span>
        ))}
      </span>
    )
  },
)

CoverageIndicator.displayName = 'CoverageIndicator'

export { CoverageIndicator }
