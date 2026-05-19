import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import {
  syncSubscriptionFromStripe,
  markSubscriptionCanceled,
  markPaymentFailed,
  applyTopupCredit,
  setCustomerOnWorkspace,
  markPaymentMethodOnFile,
  recordPromoRedemption,
} from '@/lib/stripe/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function workspaceIdFromMetadata(
  meta: Stripe.Metadata | null | undefined,
): string | null {
  if (!meta) return null
  const v = meta.workspaceId ?? meta.workspace_id
  return typeof v === 'string' && v.length > 0 ? v : null
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 })
  }
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  const raw = await req.text()
  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    console.error('[stripe.webhook] signature verification failed', err)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const workspaceId =
          (typeof s.client_reference_id === 'string' && s.client_reference_id) ||
          workspaceIdFromMetadata(s.metadata)
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
        if (workspaceId && customerId) {
          await setCustomerOnWorkspace(workspaceId, customerId)
        }
        if (s.mode === 'subscription' && s.subscription) {
          const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          if (workspaceId && !sub.metadata?.workspaceId) {
            await stripe.subscriptions.update(subId, {
              metadata: { ...(sub.metadata ?? {}), workspaceId },
            })
            sub.metadata = { ...(sub.metadata ?? {}), workspaceId }
          }
          await syncSubscriptionFromStripe(sub)
        }
        const promoUsed = s.metadata?.promoCode ?? null
        if (workspaceId && promoUsed) await recordPromoRedemption(workspaceId, promoUsed)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        await syncSubscriptionFromStripe(sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await markSubscriptionCanceled(sub)
        break
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice
        const rawSub = (inv as unknown as {
          subscription?: string | Stripe.Subscription | null
        }).subscription
        const subId =
          typeof rawSub === 'string'
            ? rawSub
            : rawSub && typeof rawSub === 'object'
            ? rawSub.id
            : null
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          await syncSubscriptionFromStripe(sub)
        }
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const workspaceId = workspaceIdFromMetadata(inv.subscription_details?.metadata ?? null)
          ?? workspaceIdFromMetadata(inv.metadata)
        if (workspaceId) await markPaymentFailed(workspaceId)
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const workspaceId = workspaceIdFromMetadata(pi.metadata)
        const kind = pi.metadata?.kind
        if (workspaceId && kind === 'topup') {
          const qty = parseInt(pi.metadata?.quantity ?? '0', 10)
          if (qty > 0) await applyTopupCredit(workspaceId, qty, pi.id)
        }
        break
      }

      case 'payment_method.attached': {
        const pm = event.data.object as Stripe.PaymentMethod
        const customerId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId)
          if (!customer.deleted) {
            const workspaceId = workspaceIdFromMetadata(customer.metadata)
            if (workspaceId) await markPaymentMethodOnFile(workspaceId)
          }
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe.webhook] handler error', event.type, err)
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
