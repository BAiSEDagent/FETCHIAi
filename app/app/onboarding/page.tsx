import { redirect } from 'next/navigation'
import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { OnboardingClient } from './OnboardingClient'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const ctx = await requireWorkspaceContext()
  if (ctx.workspace.onboardingStep >= 4) redirect('/app/chat')

  const profile = await db.query.serviceProfiles.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  const schedule = await db.query.scoutSchedules.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  return (
    <OnboardingClient
      initial={{
        vertical: (profile?.vertical as any) ?? null,
        businessName: ctx.workspace.businessName ?? null,
        locationCity: profile?.locationCity ?? null,
        locationState: profile?.locationState ?? null,
        locationRadiusMiles: profile?.locationRadiusMiles ?? 50,
        idealCustomerDescription: profile?.idealCustomerDescription ?? null,
        scoutMode: (schedule?.mode as any) ?? 'once_daily',
        step: ctx.workspace.onboardingStep,
      }}
    />
  )
}
