'use client'

import { useState, useTransition } from 'react'
import type { PricingTier } from '@/db'
import { updatePricingTier } from './actions'
import { errorMessage } from '@/lib/enums'

export function PricingRow({ tier }: { tier: PricingTier }) {
  const [name, setName] = useState(tier.name)
  const [monthly, setMonthly] = useState(String(tier.monthlyPriceCents))
  const [annual, setAnnual] = useState(String(tier.annualPriceCents))
  const [limit, setLimit] = useState(tier.opportunitiesLimit?.toString() ?? '')
  const [topMo, setTopMo] = useState(String(tier.topupRateCentsMonthly))
  const [topYr, setTopYr] = useState(String(tier.topupRateCentsAnnual))
  const [stripeMo, setStripeMo] = useState(tier.stripePriceIdMonthly ?? '')
  const [stripeYr, setStripeYr] = useState(tier.stripePriceIdAnnual ?? '')
  const [order, setOrder] = useState(String(tier.displayOrder))
  const [popular, setPopular] = useState(tier.isPopular)
  const [active, setActive] = useState(tier.isActive)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function onSave() {
    setErr(null)
    startTransition(async () => {
      try {
        await updatePricingTier({
          id: tier.id,
          name: name.trim() || tier.slug,
          monthlyPriceCents: Number(monthly) || 0,
          annualPriceCents: Number(annual) || 0,
          opportunitiesLimit: limit === '' ? null : Number(limit),
          topupRateCentsMonthly: Number(topMo) || 0,
          topupRateCentsAnnual: Number(topYr) || 0,
          stripePriceIdMonthly: stripeMo.trim() || null,
          stripePriceIdAnnual: stripeYr.trim() || null,
          displayOrder: Number(order) || 0,
          isPopular: popular,
          isActive: active,
        })
        setSavedAt(Date.now())
      } catch (e: unknown) {
        setErr(errorMessage(e, 'Save failed'))
      }
    })
  }

  return (
    <tr className="border-b border-brand-near-black/5 align-middle">
      <td className="px-3 py-2 font-mono text-[11px] text-brand-near-black/65">{tier.slug}</td>
      <td className="px-3 py-2"><Input value={name} onChange={setName} width="w-28" /></td>
      <td className="px-3 py-2"><Input value={monthly} onChange={setMonthly} width="w-20" type="number" /></td>
      <td className="px-3 py-2"><Input value={annual} onChange={setAnnual} width="w-24" type="number" /></td>
      <td className="px-3 py-2"><Input value={limit} onChange={setLimit} width="w-20" type="number" placeholder="∞" /></td>
      <td className="px-3 py-2"><Input value={topMo} onChange={setTopMo} width="w-16" type="number" /></td>
      <td className="px-3 py-2"><Input value={topYr} onChange={setTopYr} width="w-16" type="number" /></td>
      <td className="px-3 py-2"><Input value={stripeMo} onChange={setStripeMo} width="w-36" placeholder="price_…" /></td>
      <td className="px-3 py-2"><Input value={stripeYr} onChange={setStripeYr} width="w-36" placeholder="price_…" /></td>
      <td className="px-3 py-2"><Input value={order} onChange={setOrder} width="w-12" type="number" /></td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={popular} onChange={e => setPopular(e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="px-3 py-2">
        <button
          onClick={onSave}
          disabled={pending}
          className="text-[11px] font-medium px-3 py-2 min-h-[44px] min-w-[44px] rounded-md bg-brand-near-black text-white hover:bg-brand-green disabled:opacity-50"
        >
          {pending ? 'Saving…' : savedAt ? 'Saved' : 'Save'}
        </button>
        {err && <div className="text-[10px] text-coral mt-1">{err}</div>}
      </td>
    </tr>
  )
}

function Input({
  value, onChange, width, type = 'text', placeholder,
}: { value: string; onChange: (v: string) => void; width: string; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${width} px-2 py-1.5 min-h-[36px] border border-brand-near-black/15 rounded text-[12px] font-mono bg-white focus:border-brand-green outline-none`}
    />
  )
}
