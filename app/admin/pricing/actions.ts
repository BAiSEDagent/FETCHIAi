'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db, pricingTiers } from '@/db'
import { requireAdmin } from '@/lib/admin'

export type UpdatePricingInput = {
  id: string
  name: string
  monthlyPriceCents: number
  annualPriceCents: number
  opportunitiesLimit: number | null
  topupRateCentsMonthly: number
  topupRateCentsAnnual: number
  stripePriceIdMonthly: string | null
  stripePriceIdAnnual: string | null
  displayOrder: number
  isPopular: boolean
  isActive: boolean
}

export async function updatePricingTier(input: UpdatePricingInput) {
  await requireAdmin()
  await db
    .update(pricingTiers)
    .set({
      name: input.name,
      monthlyPriceCents: input.monthlyPriceCents,
      annualPriceCents: input.annualPriceCents,
      opportunitiesLimit: input.opportunitiesLimit,
      topupRateCentsMonthly: input.topupRateCentsMonthly,
      topupRateCentsAnnual: input.topupRateCentsAnnual,
      stripePriceIdMonthly: input.stripePriceIdMonthly,
      stripePriceIdAnnual: input.stripePriceIdAnnual,
      displayOrder: input.displayOrder,
      isPopular: input.isPopular,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(pricingTiers.id, input.id))
  revalidatePath('/admin/pricing')
}
