import { db, pricingTiers, type PricingTier } from '@/db'
import { eq } from 'drizzle-orm'

export type TierSlug = 'starter' | 'growth' | 'pro' | 'scale'
export type BillingInterval = 'monthly' | 'annual'

export const TIER_SLUGS: readonly TierSlug[] = ['starter', 'growth', 'pro', 'scale']

export function parseTierSlug(input: string | null | undefined): TierSlug | null {
  if (!input) return null
  return (TIER_SLUGS as readonly string[]).includes(input) ? (input as TierSlug) : null
}

export function parseBillingInterval(
  input: string | null | undefined,
): BillingInterval | null {
  if (input === 'monthly' || input === 'annual') return input
  return null
}

const ENV_PRICE_KEYS: Record<TierSlug, { monthly: string; annual: string }> = {
  starter: { monthly: 'STRIPE_STARTER_PRICE_ID', annual: 'STRIPE_STARTER_ANNUAL_PRICE_ID' },
  growth:  { monthly: 'STRIPE_GROWTH_PRICE_ID',  annual: 'STRIPE_GROWTH_ANNUAL_PRICE_ID'  },
  pro:     { monthly: 'STRIPE_PRO_PRICE_ID',     annual: 'STRIPE_PRO_ANNUAL_PRICE_ID'     },
  scale:   { monthly: 'STRIPE_SCALE_PRICE_ID',   annual: 'STRIPE_SCALE_ANNUAL_PRICE_ID'   },
}

export async function getActiveTiers(): Promise<PricingTier[]> {
  const rows = await db.query.pricingTiers.findMany({
    where: (t, { eq: e }) => e(t.isActive, true),
    orderBy: (t, { asc }) => [asc(t.displayOrder)],
  })
  return rows
}

export async function getTierBySlug(slug: TierSlug): Promise<PricingTier | null> {
  const row = await db.query.pricingTiers.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
  })
  return row ?? null
}

export async function resolvePriceId(
  slug: TierSlug,
  interval: BillingInterval,
): Promise<string | null> {
  const tier = await getTierBySlug(slug)
  const dbPriceId =
    interval === 'monthly' ? tier?.stripePriceIdMonthly : tier?.stripePriceIdAnnual
  if (dbPriceId) return dbPriceId
  const envKey = ENV_PRICE_KEYS[slug][interval]
  return process.env[envKey] ?? null
}

export async function tierForPriceId(priceId: string): Promise<{
  slug: TierSlug
  interval: BillingInterval
  tier: PricingTier
} | null> {
  const tiers = await getActiveTiers()
  for (const t of tiers) {
    if (t.stripePriceIdMonthly === priceId)
      return { slug: t.slug as TierSlug, interval: 'monthly', tier: t }
    if (t.stripePriceIdAnnual === priceId)
      return { slug: t.slug as TierSlug, interval: 'annual', tier: t }
  }
  for (const slug of TIER_SLUGS) {
    if (process.env[ENV_PRICE_KEYS[slug].monthly] === priceId) {
      const tier = tiers.find(t => t.slug === slug)
      if (tier) return { slug, interval: 'monthly', tier }
    }
    if (process.env[ENV_PRICE_KEYS[slug].annual] === priceId) {
      const tier = tiers.find(t => t.slug === slug)
      if (tier) return { slug, interval: 'annual', tier }
    }
  }
  return null
}

export function topupRateForTier(tier: PricingTier, interval: BillingInterval): number {
  return interval === 'annual' ? tier.topupRateCentsAnnual : tier.topupRateCentsMonthly
}

export { pricingTiers, eq }
