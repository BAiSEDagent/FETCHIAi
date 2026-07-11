import { requireWorkspaceContext } from '@/lib/workspace'
import { SavedLeadMapShell } from '@/components/app/map/MapShell'
import { listSavedLeadsForWorkspace } from '@/lib/runtime/sweep/saved-leads'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const ctx = await requireWorkspaceContext()
  const leads = await listSavedLeadsForWorkspace(ctx.workspaceId)
  const mapEnabled = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim())

  return (
    <SavedLeadMapShell
      leads={leads}
      mapEnabled={mapEnabled}
      workspaceName={ctx.workspace.businessName ?? 'This workspace'}
    />
  )
}
