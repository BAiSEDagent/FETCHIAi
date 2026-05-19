'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PricingTier } from '@/db'

interface Props {
  tiers: PricingTier[]
  currentTier?: string | null
  currentInterval?: 'monthly' | 'annual' | null
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function PlanPicker({ tiers, currentTier, currentInterval }: Props) {
  const [interval, setInterval] = React.useState<'monthly' | 'annual'>(
    currentInterval ?? 'monthly',
  )

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="inline-flex rounded-full bg-brand-cream-muted p-1 border border-brand-near-black/10">
          {(['monthly', 'annual'] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                'px-4 h-10 rounded-full text-[13px] font-semibold capitalize transition-colors',
                interval === i
                  ? 'bg-brand-near-black text-white'
                  : 'text-brand-near-black/70 hover:text-brand-near-black',
              )}
            >
              {i}
              {i === 'annual' && (
                <span className="ml-2 text-[10px] text-brand-green font-bold">SAVE 16%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {tiers.map((tier) => {
          const price =
            interval === 'monthly' ? tier.monthlyPriceCents : tier.annualPriceCents
          const periodLabel = interval === 'monthly' ? '/mo' : '/yr'
          const isCurrent =
            currentTier === tier.slug && currentInterval === interval
          return (
            <div
              key={tier.id}
              className={cn(
                'rounded-2xl bg-brand-cream p-5 shadow-fetchi-soft border-2 flex flex-col',
                tier.isPopular ? 'border-brand-green' : 'border-transparent',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-outfit text-[18px] font-bold text-brand-near-black">
                  {tier.name}
                </h3>
                {tier.isPopular && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-brand-green bg-brand-light px-2 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-outfit text-[28px] font-bold text-brand-near-black">
                  {formatPrice(price)}
                </span>
                <span className="text-[13px] text-brand-near-black/60">{periodLabel}</span>
              </div>
              {tier.description && (
                <p className="mt-2 text-[12.5px] text-brand-near-black/65 leading-relaxed">
                  {tier.description}
                </p>
              )}
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-brand-near-black/80 flex-1">
                {tier.featuresBullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-green">&#10003;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <form method="post" action="/api/stripe/checkout" className="mt-4">
                <input type="hidden" name="tier" value={tier.slug} />
                <input type="hidden" name="interval" value={interval} />
                <Button
                  type="submit"
                  className="w-full"
                  variant={tier.isPopular ? 'default' : 'outline'}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current plan' : `Choose ${tier.name}`}
                </Button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
