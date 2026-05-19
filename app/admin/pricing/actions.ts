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

function assertNonNegativeInt(value: number, field: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative whole number`)
  }
}

export async function updatePricingTier(input: UpdatePricingInput) {
  await requireAdmin()

  // Server-side bounds — never trust the client. Prevents bad config writes
  // (negative prices, NaN, fractional cents) from corrupting billing logic.
  if (!input.name.trim()) throw new Error('Name is required')
  assertNonNegativeInt(input.monthlyPriceCents, 'Monthly price')
  assertNonNegativeInt(input.annualPriceCents, 'Annual price')
  assertNonNegativeInt(input.topupRateCentsMonthly, 'Monthly top-up rate')
  assertNonNegativeInt(input.topupRateCentsAnnual, 'Annual top-up rate')
  assertNonNegativeInt(input.displayOrder, 'Display order')
  if (input.opportunitiesLimit !== null) {
    assertNonNegativeInt(input.opportunitiesLimit, 'Opportunities limit')
  }

  await db
    .update(pricingTiers)
    .set({
      name: input.name.trim(),
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
