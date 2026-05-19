import { NextResponse, type NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { clerkClient } from '@clerk/nextjs/server'
import { ensureWorkspaceForUser } from '@/lib/workspace'
import { isDisposableEmail } from '@/lib/disposable-email'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'CLERK_WEBHOOK_SECRET not configured on server' },
      { status: 503 },
    )
  }

  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('[clerk webhook] signature verification failed', err)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        const data = evt.data
        const userId = data.id
        const emails = data.email_addresses ?? []
        const primary =
          emails.find(e => e.id === data.primary_email_address_id) ?? emails[0]
        const email = primary?.email_address ?? null

        if (email && isDisposableEmail(email)) {
          console.warn('[clerk webhook] blocking disposable email signup', email)
          try {
            const client = await clerkClient()
            await client.users.deleteUser(userId)
          } catch (e) {
            console.error('[clerk webhook] failed to delete disposable-email user', e)
          }
          return NextResponse.json({ blocked: true })
        }

        const externals: ReadonlyArray<{ provider?: string }> =
          (data.external_accounts as ReadonlyArray<{ provider?: string }> | undefined) ?? []
        const signupMethod: 'google' | 'email' = externals.some(
          a => a.provider === 'oauth_google',
        )
          ? 'google'
          : 'email'

        await ensureWorkspaceForUser(userId, email, signupMethod)
        return NextResponse.json({ ok: true })
      }
      case 'user.deleted': {
        // Soft handling — schema has FK chains; we leave rows in place for
        // billing/audit and let admin tooling reconcile later (CP3+).
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ ignored: evt.type })
    }
  } catch (err) {
    console.error('[clerk webhook] handler error', err)
    return NextResponse.json({ error: 'handler failure' }, { status: 500 })
  }
}
