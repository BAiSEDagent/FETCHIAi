/**
 * scripts/dev/reset-onboarding.ts
 *
 * DEV-ONLY. Resets your real workspace's onboarding_step back to 0 so
 * /app/onboarding loads again and you can replay the flow for visual QA.
 *
 * Does NOT delete your workspace, does NOT touch seed_workspace_01, does
 * NOT modify the schema or any other table.
 *
 * Target workspace resolution (in order):
 *   1) First id in FETCHI_ADMIN_USER_IDS env var (comma-separated)
 *   2) The single non-seed_workspace_01 row in workspace_settings
 *
 * Run:  npx tsx scripts/dev/reset-onboarding.ts
 */

import { eq, ne } from 'drizzle-orm'
import { db, workspaceSettings } from '../../db'

const SEED_WORKSPACE = 'seed_workspace_01'

async function resolveTargetWorkspaceId(): Promise<string> {
  const envIds = (process.env.FETCHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (envIds.length > 0) {
    const row = await db.query.workspaceSettings.findFirst({
      where: (t, { eq: e }) => e(t.workspaceId, envIds[0]),
    })
    if (row) return row.workspaceId
    console.warn(
      `FETCHI_ADMIN_USER_IDS[0]=${envIds[0]} not found — falling back to single-workspace heuristic.`,
    )
  }

  const candidates = await db
    .select()
    .from(workspaceSettings)
    .where(ne(workspaceSettings.workspaceId, SEED_WORKSPACE))

  if (candidates.length === 0) {
    throw new Error(
      'No non-seed workspace found. Sign in to the app once so your workspace is provisioned, then re-run.',
    )
  }
  if (candidates.length > 1) {
    throw new Error(
      `Found ${candidates.length} non-seed workspaces — cannot auto-pick. Set FETCHI_ADMIN_USER_IDS to the target Clerk user id.`,
    )
  }
  return candidates[0].workspaceId
}

async function main() {
  console.log('Fetchi — dev onboarding reset\n')
  const targetWorkspaceId = await resolveTargetWorkspaceId()

  if (targetWorkspaceId === SEED_WORKSPACE) {
    throw new Error('Refusing to reset seed_workspace_01.')
  }

  const before = await db.query.workspaceSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, targetWorkspaceId),
  })
  console.log(`Target workspace : ${targetWorkspaceId}`)
  console.log(`Before           : onboarding_step=${before?.onboardingStep ?? '?'}`)

  await db
    .update(workspaceSettings)
    .set({ onboardingStep: 0, updatedAt: new Date() })
    .where(eq(workspaceSettings.workspaceId, targetWorkspaceId))

  const after = await db.query.workspaceSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, targetWorkspaceId),
  })
  console.log(`After            : onboarding_step=${after?.onboardingStep ?? '?'}`)
  console.log('\nDone. /app/onboarding will load on next request.')
  process.exit(0)
}

main().catch(err => {
  console.error('reset-onboarding failed:', err)
  process.exit(1)
})
