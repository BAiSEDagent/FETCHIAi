import { db, pricingTiers } from '@/db'
import { asc } from 'drizzle-orm'
import { PricingRow } from './PricingRow'

export const dynamic = 'force-dynamic'

export default async function AdminPricingPage() {
  const tiers = await db.select().from(pricingTiers).orderBy(asc(pricingTiers.displayOrder))

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="mb-5">
        <h1 className="font-outfit text-[22px] font-semibold">Pricing & plans</h1>
        <p className="text-[12px] text-brand-near-black/55 mt-1">
          Editable source of truth for tier prices, opportunity limits, top-up rates, and Stripe price IDs.
          Code reads these values at runtime — never hardcoded.
        </p>
      </div>

      <div className="bg-white border border-brand-near-black/10 rounded-[10px] overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[11px] text-brand-near-black/55 border-b border-brand-near-black/10 bg-[#faf9f6]">
              <th className="py-2 px-3 font-normal">Slug</th>
              <th className="py-2 px-3 font-normal">Name</th>
              <th className="py-2 px-3 font-normal">Monthly ¢</th>
              <th className="py-2 px-3 font-normal">Annual ¢</th>
              <th className="py-2 px-3 font-normal">Opp limit</th>
              <th className="py-2 px-3 font-normal">Top-up ¢ mo</th>
              <th className="py-2 px-3 font-normal">Top-up ¢ yr</th>
              <th className="py-2 px-3 font-normal">Stripe monthly</th>
              <th className="py-2 px-3 font-normal">Stripe annual</th>
              <th className="py-2 px-3 font-normal">Order</th>
              <th className="py-2 px-3 font-normal">Popular</th>
              <th className="py-2 px-3 font-normal">Active</th>
              <th className="py-2 px-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(t => (
              <PricingRow key={t.id} tier={t} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-brand-near-black/45 mt-3">
        Note: trial-day length is in <code className="font-mono">system_settings.trial_days</code>.
        Opp limit blank = unlimited (Scale).
      </p>
    </div>
  )
}
