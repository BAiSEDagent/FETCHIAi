import { requireWorkspaceContext } from '@/lib/workspace'
import { SEEDED_CHAT_MESSAGES } from '@/lib/seed-chat'
import { ChatClient } from './ChatClient'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const ctx = await requireWorkspaceContext()
  return (
    <ChatClient
      initialMessages={SEEDED_CHAT_MESSAGES}
      greetingName={ctx.fullName ?? ctx.workspace.businessName ?? null}
    />
  )
}
