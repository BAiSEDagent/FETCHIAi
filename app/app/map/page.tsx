import { requireWorkspaceContext } from '@/lib/workspace'
import { MobileScreenHeader } from '@/components/app/MobileScreenHeader'
import { EmptyState } from '@/components/app/EmptyState'
import { GlyphTile } from '@/components/app/GlyphTile'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  await requireWorkspaceContext()
  return (
    <div className="max-w-3xl">
      <MobileScreenHeader
        title="Map view"
        description="Review saved lead locations as location coverage becomes available."
      />
      <div className="px-4 lg:px-7 pb-10">
        <EmptyState
          icon={<GlyphTile glyph="map" size="lg" />}
          title="Saved lead map is not available yet"
          body="Saved lead locations will appear here when enough address data is ready to map."
        />
      </div>
    </div>
  )
}
