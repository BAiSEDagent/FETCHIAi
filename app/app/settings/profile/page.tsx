import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const ctx = await requireWorkspaceContext()
  const profile = await db.query.serviceProfiles.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  return (
    <div className="flex flex-col">
      <div className="px-5 lg:px-7 py-5 lg:py-6 border-b border-brand-near-black/8 bg-white">
        <h1 className="font-outfit text-2xl lg:text-[24px] text-brand-near-black">
          Business Profile
        </h1>
        <p className="text-[13px] text-brand-near-black/55 mt-0.5">
          Tell Fetchi about your business — this shapes every signal scan and
          lead score.
        </p>
      </div>
      <ProfileForm
        initial={{
          businessName: ctx.workspace.businessName ?? '',
          vertical: ((profile?.vertical as any) ?? 'roofing'),
          serviceDescription: profile?.serviceDescription ?? '',
          locationCity: profile?.locationCity ?? '',
          locationState: profile?.locationState ?? '',
          locationRadiusMiles: profile?.locationRadiusMiles ?? 50,
          idealCustomerDescription: profile?.idealCustomerDescription ?? '',
        }}
      />
    </div>
  )
}
