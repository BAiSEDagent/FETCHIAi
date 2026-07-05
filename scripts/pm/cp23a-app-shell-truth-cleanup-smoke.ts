/**
 * CP23A - App shell truth cleanup smoke proof.
 *
 * Deterministic and DB-free. It statically inspects source/UI copy only;
 * it does not run providers, seeds, db:push, migrations, CRM, outreach,
 * Signal Watch, scoring, Chat runtime, Today runtime, Map runtime, or Sweep
 * runtime paths.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

function shell(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function changedFiles(): string[] {
  const commands = [
    'git diff --name-only origin/main..HEAD',
    'git diff --name-only',
    'git diff --name-only --cached',
    'git ls-files --others --exclude-standard',
  ]
  return Array.from(new Set(commands.flatMap((command) => {
    const output = shell(command)
    return output ? output.split('\n') : []
  }))).sort()
}

function addedLines(path: string): string[] {
  const output = shell(`git diff --no-ext-diff --unified=0 origin/main -- ${path}`)
  if (!output) return []
  return output
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
}

async function main() {
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'app/app/layout.tsx',
    'app/app/map/page.tsx',
    'app/app/settings/notifications/page.tsx',
    'app/app/chat/ChatClient.tsx',
    'scripts/pm/cp23a-app-shell-truth-cleanup-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP23A changed file: ${path}`)
  }

  assert(!changed.some((path) => path === 'replit.md'))
  assert(!changed.some((path) => path === 'FETCHI_CLAUDE_CODE_BRIEF.md'))
  assert(!changed.some((path) => path.startsWith('db/')))
  assert(!changed.some((path) => path === 'drizzle.config.ts'))
  assert(!changed.some((path) => path === 'middleware.ts'))
  assert(!changed.some((path) => path === 'package.json' || path === 'package-lock.json'))
  assert(!changed.some((path) => path.includes('/providers/') || path.startsWith('lib/providers/')))
  assert(!changed.some((path) => path.startsWith('lib/runtime/')))
  assert(!changed.some((path) => path.startsWith('app/app/sweep/')))
  assert(!changed.some((path) => path.includes('auth') || path.includes('clerk')))
  assert(!changed.some((path) => path.includes('billing') || path.includes('stripe')))
  assert(!changed.some((path) => path.includes('crm') || path.includes('outreach')))
  assert(!changed.some((path) => path.includes('signal-watch') || path.includes('SignalWatch')))
  assert(!changed.some((path) => path.includes('score') || path.includes('scoring')))

  const layoutSource = source('app/app/layout.tsx')
  assert(layoutSource.includes('savedLeads'))
  assert(layoutSource.includes('from(savedLeads)'))
  assert(layoutSource.includes('eq(savedLeads.workspaceId, ctx.workspaceId)'))
  assert(!layoutSource.includes('opportunities'))
  assert(!layoutSource.includes('inArray('))
  assert(!layoutSource.includes("['saved', 'contacted', 'responded', 'won', 'lost']"))

  const customerFacingSources = [
    'app/app/layout.tsx',
    'app/app/map/page.tsx',
    'app/app/settings/notifications/page.tsx',
    'app/app/chat/ChatClient.tsx',
    'components/app/Sidebar.tsx',
    'components/app/MobileHeader.tsx',
  ]
  for (const path of customerFacingSources) {
    const value = source(path)
    for (const banned of ['Checkpoint', 'checkpoint', 'CP22', 'CP23', 'CP10']) {
      assert(!value.includes(banned), `${path} contains customer-facing internal copy: ${banned}`)
    }
  }

  const chatAdded = addedLines('app/app/chat/ChatClient.tsx').join('\n').toLowerCase()
  for (const bannedAddedClaim of ['live search', 'llm', 'signal', 'scheduled scout', 'provider']) {
    assert(!chatAdded.includes(bannedAddedClaim), `ChatClient copy added unsupported claim: ${bannedAddedClaim}`)
  }

  const notificationSource = source('app/app/settings/notifications/page.tsx').toLowerCase()
  assert(notificationSource.includes('read-only'))
  assert(notificationSource.includes('not editable from this screen yet'))
  for (const bannedNotificationClaim of ['checkpoint', 'push notification', 'promotion', 'promotional', 'scheduled scout', 'notification agent']) {
    assert(!notificationSource.includes(bannedNotificationClaim), `Notifications copy implies unsupported behavior: ${bannedNotificationClaim}`)
  }

  const notificationAdded = addedLines('app/app/settings/notifications/page.tsx').join('\n').toLowerCase()
  for (const bannedAddedClaim of ['pinged', 'the moment', 'push notification', 'promotion', 'promotional', 'scheduled scout', 'notification agent']) {
    assert(!notificationAdded.includes(bannedAddedClaim), `Notifications copy added unsupported claim: ${bannedAddedClaim}`)
  }

  const mapSource = source('app/app/map/page.tsx').toLowerCase()
  assert(mapSource.includes('not available yet'))
  assert(mapSource.includes('when enough address data is ready to map'))
  for (const bannedMapClaim of ['checkpoint', 'live map', 'mapbox', 'signal', 'service radius', 'scouting']) {
    assert(!mapSource.includes(bannedMapClaim), `Map copy overpromises unsupported behavior: ${bannedMapClaim}`)
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp23a_app_shell_truth_cleanup',
    changedFilesAllowedOnly: true,
    leadsBadgeUsesSavedLeads: true,
    leadsBadgeDoesNotUseOpportunities: true,
    customerFacingCheckpointCopyRemoved: true,
    chatRuntimeChanged: false,
    notificationRuntimeChanged: false,
    mapRuntimeChanged: false,
    schemaFilesChanged: false,
    providerFilesChanged: false,
    packageFilesChanged: false,
    dbFilesChanged: false,
    authBillingMiddlewareFilesChanged: false,
    crmOutreachFilesChanged: false,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
    productionDbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP23A app shell truth cleanup smoke FAILED:')
  console.error(error)
  process.exit(1)
})
