import { MyLeadsView } from '@/components/app/MyLeadsView'
import { listSavedLeadsForWorkspace } from '@/lib/runtime/sweep/saved-leads'
import { requireWorkspaceContext } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const ctx = await requireWorkspaceContext()
  const leads = await listSavedLeadsForWorkspace(ctx.workspaceId)

  return <MyLeadsView leads={leads} />
}
