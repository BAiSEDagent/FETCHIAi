import { NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/workspace'
import { appOrigin } from '@/lib/billing/url'
import { createBillingPortalSession } from '@/lib/stripe/checkout'
import { errorMessage } from '@/lib/enums'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const ctx = await requireWorkspaceContext()
    const origin = await appOrigin()
    const url = await createBillingPortalSession(ctx.workspaceId, origin)
    return NextResponse.redirect(url, { status: 303 })
  } catch (err) {
    console.error('[stripe.portal] failed', err)
    const msg = errorMessage(err, 'Could not open the billing portal.')
    const origin = await appOrigin()
    return NextResponse.redirect(
      `${origin}/app/settings/billing?status=error&message=${encodeURIComponent(msg)}`,
      { status: 303 },
    )
  }
}
