import { requireWorkspaceContext } from '@/lib/workspace'
import { db } from '@/db'
import { parseVertical } from '@/lib/enums'
import { ProfileForm } from './ProfileForm'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const ctx = await requireWorkspaceContext()
  const profile = await db.query.serviceProfiles.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })

  return (
    <div data-fetchi-profile-v5 className="max-w-3xl">
      <MobileScreenHeader
        title="Business Profile"
        description="The basics Fetchi uses to know who you are and what you're hunting for."
      />
      <div className="px-4 lg:px-7 pb-10">
        <ProfileForm
          initial={{
            businessName: ctx.workspace.businessName ?? '',
            vertical: parseVertical(profile?.vertical) ?? 'roofing',
            serviceDescription: profile?.serviceDescription ?? '',
            locationCity: profile?.locationCity ?? '',
            locationState: profile?.locationState ?? '',
            locationRadiusMiles: profile?.locationRadiusMiles ?? 50,
            idealCustomerDescription: profile?.idealCustomerDescription ?? '',
            website: profile?.website ?? '',
          }}
        />
      </div>
    </div>
  )
}
