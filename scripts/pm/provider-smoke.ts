/**
 * CP5A — No-op provider smoke runner (Replit Shell proof).
 *
 * Runs the inert no-op provider smoke proof and prints its JSON result. Exits 0
 * only when the proof reports ok === true; exits 1 with a clear error otherwise.
 *
 * Run directly:
 *   ./node_modules/.bin/tsx scripts/pm/provider-smoke.ts
 *
 * No npm script is added; package.json is not modified.
 */

import { runNoopProviderSmoke } from '@/lib/providers/noop-smoke'

async function main(): Promise<void> {
  const result = await runNoopProviderSmoke()
  console.log(JSON.stringify(result, null, 2))

  if (result.ok !== true) {
    console.error('CP5A no-op provider smoke FAILED: result.ok was not true.')
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('CP5A no-op provider smoke FAILED with an unexpected error:')
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
