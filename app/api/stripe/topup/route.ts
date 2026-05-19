import { NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/workspace'
import { appOrigin } from '@/lib/billing/url'
import { createTopupCheckoutSession } from '@/lib/stripe/checkout'
import { errorMessage } from '@/lib/enums'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const ctx = await requireWorkspaceContext()
    const form = await req.formData()
    const raw = form.get('quantity')?.toString() ?? '10'
    const quantity = Math.max(1, Math.min(1000, parseInt(raw, 10) || 10))
    const origin = await appOrigin()
    const url = await createTopupCheckoutSession({
      workspaceId: ctx.workspaceId,
      email: ctx.email,
      quantity,
      origin,
    })
    return NextResponse.redirect(url, { status: 303 })
  } catch (err) {
    console.error('[stripe.topup] failed', err)
    const msg = errorMessage(err, 'Could not start the top-up.')
    const origin = await appOrigin()
    return NextResponse.redirect(
      `${origin}/app/settings/billing?status=error&message=${encodeURIComponent(msg)}`,
      { status: 303 },
    )
  }
}
