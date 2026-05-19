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
        description="See every signal on a map, scoped to your service radius."
      />
      <div className="px-4 lg:px-7 pb-10">
        <EmptyState
          icon={<GlyphTile glyph="map" size="lg" />}
          title="Map turns on in Checkpoint 10"
          body="The live Mapbox view lights up alongside manual chat searches. Market-coverage gating is already plumbed in the schema."
        />
      </div>
    </div>
  )
}
