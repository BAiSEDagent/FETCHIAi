import { NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/workspace'
import { appOrigin } from '@/lib/billing/url'
import { parseTierSlug, parseBillingInterval } from '@/lib/stripe/config'
import { createSubscriptionCheckoutSession } from '@/lib/stripe/checkout'
import { errorMessage } from '@/lib/enums'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const ctx = await requireWorkspaceContext()
    const form = await req.formData()
    const tier = parseTierSlug(form.get('tier')?.toString() ?? null)
    const interval =
      parseBillingInterval(form.get('interval')?.toString() ?? null) ?? 'monthly'
    if (!tier) {
      return NextResponse.json({ error: 'invalid_tier' }, { status: 400 })
    }
    const promoCode = form.get('promo')?.toString() || null
    const origin = await appOrigin()
    const url = await createSubscriptionCheckoutSession({
      workspaceId: ctx.workspaceId,
      email: ctx.email,
      tier,
      interval,
      origin,
      promoCode,
    })
    return NextResponse.redirect(url, { status: 303 })
  } catch (err) {
    console.error('[stripe.checkout] failed', err)
    const msg = errorMessage(err, 'Could not start checkout. Please try again.')
    const origin = await appOrigin()
    return NextResponse.redirect(
      `${origin}/app/settings/billing?status=error&message=${encodeURIComponent(msg)}`,
      { status: 303 },
    )
  }
}
