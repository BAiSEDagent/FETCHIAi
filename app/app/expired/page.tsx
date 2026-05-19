import { redirect } from 'next/navigation'
import { db } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { getActiveTiers } from '@/lib/stripe/config'
import { PlanPicker } from '@/components/billing/PlanPicker'

export const dynamic = 'force-dynamic'

export default async function ExpiredPage() {
  const ctx = await requireWorkspaceContext()
  const sub = await db.query.workspaceSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  if (sub && sub.status !== 'trialing' && sub.status !== 'expired' && sub.status !== 'canceled') {
    redirect('/app/chat')
  }
  if (sub?.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > new Date()) {
    redirect('/app/chat')
  }
  const tiers = await getActiveTiers()

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-parchment px-4 py-10">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-6">
          <div className="inline-block text-[11px] font-bold uppercase tracking-[1.5px] text-brand-coral bg-brand-coral/10 px-3 py-1 rounded-full mb-3">
            Trial ended
          </div>
          <h1 className="font-outfit text-[28px] lg:text-[34px] font-bold text-brand-near-black leading-tight">
            Pick a plan to keep finding leads
          </h1>
          <p className="mt-2 text-[14px] text-brand-near-black/65">
            Your trial credits ran out. Choose a tier &mdash; nothing else changes.
          </p>
        </div>
        <PlanPicker
          tiers={tiers}
          currentTier={sub?.tier}
          currentInterval={(sub?.billingInterval as 'monthly' | 'annual' | null) ?? 'monthly'}
        />
      </div>
    </div>
  )
}
