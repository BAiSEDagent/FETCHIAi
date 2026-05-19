import { requireWorkspaceContext } from '@/lib/workspace'
import { buildChatThread } from '@/lib/seed-chat'
import { db } from '@/db'
import { ChatClient } from './ChatClient'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const ctx = await requireWorkspaceContext()
  const sp = await db.query.serviceProfiles.findFirst({
    where: (t, { eq }) => eq(t.workspaceId, ctx.workspaceId),
  })
  const thread = await buildChatThread({
    workspaceId: ctx.workspaceId,
    greetingName: ctx.fullName ?? ctx.workspace.businessName ?? null,
    businessVertical: sp?.vertical ?? null,
  })
  return (
    <ChatClient
      initialMessages={thread.messages}
      isEmptyRun={thread.isEmptyRun}
      sourcesChecked={thread.sourcesChecked}
      greetingName={ctx.fullName ?? ctx.workspace.businessName ?? null}
    />
  )
}
