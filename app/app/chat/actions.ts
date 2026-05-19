'use server'

import { requireWorkspaceContext } from '@/lib/workspace'
import { PLACEHOLDER_REPLY } from '@/lib/seed-chat'

export async function sendChatMessage(_message: string) {
  // Live conversation lands in Checkpoint 6. Today we acknowledge the message
  // server-side (scoped to the workspace) and return a static placeholder so
  // the UX is wired end-to-end without an LLM dependency.
  await requireWorkspaceContext()
  return {
    reply: PLACEHOLDER_REPLY,
    at: new Date().toISOString(),
  }
}
