import { requireWorkspaceContext } from '@/lib/workspace'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { EmptyState } from '@/components/app/EmptyState'
import { GlyphTile } from '@/components/app/GlyphTile'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  await requireWorkspaceContext()
  return (
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Today's Run"
        description="A daily route and swipe stack for the leads worth chasing right now."
      />
      <div className="px-4 lg:px-7 pb-10">
        <EmptyState
          icon={<GlyphTile glyph="sun" size="lg" />}
          title="Coming with live scouting"
          body="The route planner and swipe stack land alongside live scouting in Checkpoint 6. Until then, browse leads on the My Leads tab."
        />
      </div>
    </div>
  )
}
