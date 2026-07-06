/**
 * CP24A - Fetch IA + My Leads action hierarchy smoke proof.
 *
 * Static and DB-free. Verifies the checkpoint file fence, Fetch language on
 * customer-facing surfaces, My Leads action hierarchy, row polish markers, and
 * route-count stability without touching runtime/provider/export behavior.
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

function assertNoChangedPath(changed: readonly string[], predicate: (path: string) => boolean, message: string) {
  const matches = changed.filter(predicate)
  assert.equal(matches.length, 0, `${message}: ${matches.join(', ')}`)
}

function blockAround(sourceText: string, marker: string, before = 900, after = 2200): string {
  const index = sourceText.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return sourceText.slice(Math.max(0, index - before), index + after)
}

function assertInOrder(sourceText: string, values: readonly string[], message: string) {
  let cursor = -1
  for (const value of values) {
    const index = sourceText.indexOf(value, cursor + 1)
    assert(index > cursor, `${message}: ${value} is missing or out of order`)
    cursor = index
  }
}

function stripComments(sourceText: string): string {
  return sourceText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function routeFilesFromGit(ref: string): string[] {
  const output = shell(`git ls-tree -r --name-only ${ref}`)
  return output
    .split('\n')
    .filter((path) => path.startsWith('app/') && (path.endsWith('/page.tsx') || path.endsWith('/route.ts')))
    .sort()
}

function routeFilesFromWorktree(): string[] {
  const output = shell('git ls-files app')
  return output
    .split('\n')
    .filter((path) => path.endsWith('/page.tsx') || path.endsWith('/route.ts'))
    .sort()
}

async function main() {
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'app/app/chat/ChatClient.tsx',
    'app/app/sweep/SweepClient.tsx',
    'components/app/MobileBottomNav.tsx',
    'components/app/MyLeadsView.tsx',
    'components/app/Sidebar.tsx',
    'components/app/today/EvidenceCardBack.tsx',
    'scripts/pm/cp24a-fetch-ia-my-leads-hierarchy-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP24A changed file: ${path}`)
  }

  assertNoChangedPath(changed, (path) => path === 'replit.md', 'Protected file changed')
  assertNoChangedPath(changed, (path) => path === 'FETCHI_CLAUDE_CODE_BRIEF.md', 'Protected file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('db/'), 'DB file changed')
  assertNoChangedPath(changed, (path) => path === 'drizzle.config.ts', 'Drizzle config changed')
  assertNoChangedPath(changed, (path) => path === 'middleware.ts', 'Middleware changed')
  assertNoChangedPath(changed, (path) => path === 'package.json' || path === 'package-lock.json', 'Package file changed')
  assertNoChangedPath(changed, (path) => path.includes('/providers/') || path.startsWith('lib/providers/'), 'Provider file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('lib/runtime/'), 'Runtime/export file changed')
  assertNoChangedPath(changed, (path) => path.includes('auth') || path.includes('clerk'), 'Auth file changed')
  assertNoChangedPath(changed, (path) => path.includes('billing') || path.includes('stripe'), 'Billing file changed')
  assertNoChangedPath(changed, (path) => path.includes('crm') || path.includes('outreach'), 'CRM/outreach file changed')
  assertNoChangedPath(changed, (path) => path.includes('signal-watch') || path.includes('SignalWatch'), 'Signal Watch file changed')
  assertNoChangedPath(changed, (path) => path.includes('score') || path.includes('scoring'), 'Scoring file changed')
  assertNoChangedPath(changed, (path) => path.includes('migration'), 'Migration file changed')
  assertNoChangedPath(
    changed,
    (path) => /^scripts\/pm\/cp2(2|3)(a|b|c)?/i.test(path),
    'Old checkpoint smoke changed',
  )

  const mobile = source('components/app/MobileBottomNav.tsx')
  const sidebar = source('components/app/Sidebar.tsx')
  const myLeads = source('components/app/MyLeadsView.tsx')
  const sweep = source('app/app/sweep/SweepClient.tsx')
  const chat = source('app/app/chat/ChatClient.tsx')
  const evidenceCardBack = source('components/app/today/EvidenceCardBack.tsx')
  const mapPage = source('app/app/map/page.tsx')
  const todayPage = source('app/app/today/page.tsx')

  assertInOrder(mobile, [
    "label: 'Fetch'",
    "label: 'Leads'",
    "label: 'Chat'",
    "label: 'Map'",
    "label: 'Settings'",
  ], 'Mobile nav order')
  assert(mobile.includes("href: '/app/sweep', label: 'Fetch'"), 'Mobile Fetch nav must point to /app/sweep')
  assert(!mobile.includes("label: 'Today'"), 'Mobile nav still includes Today')
  assert(!mobile.includes("label: 'Sweep'"), 'Mobile nav still includes Sweep')

  const workspaceNav = blockAround(sidebar, 'const workspaceNav', 0, 700)
  assertInOrder(workspaceNav, [
    "label: 'Fetch'",
    "label: 'Leads'",
    "label: 'Chat'",
    "label: 'Map'",
  ], 'Sidebar workspace nav order')
  assert(workspaceNav.includes("href: '/app/sweep', label: 'Fetch'"), 'Sidebar Fetch nav must point to /app/sweep')
  assert(!workspaceNav.includes("label: 'Today'"), 'Sidebar workspace nav still includes Today')
  assert(!workspaceNav.includes("label: 'Sweep'"), 'Sidebar workspace nav still includes Sweep')

  assert(myLeads.includes('Fetch leads'), 'MyLeadsView missing Fetch leads copy')
  assert(!myLeads.includes('Run a sweep'), 'MyLeadsView still contains Run a sweep')
  assert(myLeads.includes('href="/app/sweep"'), 'MyLeadsView lost /app/sweep link')
  assert(myLeads.includes('function exportCsv()'), 'CSV export function removed')
  assert(myLeads.includes('function exportJson()'), 'JSON export function removed')
  assert(myLeads.includes('exportSavedLeadsCsv'), 'CSV export helper removed')
  assert(myLeads.includes('exportSavedLeadsJson'), 'JSON export helper removed')

  const actionRow = blockAround(myLeads, 'data-cp24a-my-leads-action-row', 300, 3400)
  assert(actionRow.includes('data-cp24a-export-utility'), 'Export utility marker missing near Fetch action')
  assert(actionRow.includes('exportCsv()'), 'CSV export behavior not wired from utility action')
  assert(actionRow.includes('exportJson()'), 'JSON export behavior not wired from utility action')
  assert(actionRow.includes('Export'), 'Export utility control missing')
  assert(!actionRow.includes('data-cp23c-compact-action-rail'), 'Old equal-weight CP23C action rail still wraps CP24A actions')
  assert(!actionRow.includes('grid-cols-[minmax(58px,0.72fr)_minmax(66px,0.78fr)_minmax(130px,1.45fr)]'), 'CSV/JSON still look like equal hero peers')

  const iconStrip = blockAround(myLeads, 'data-cp23c-icon-status-strip', 1800, 1500)
  assert(iconStrip.includes('data-cp24a-field-presence-icon'), 'Coverage icons missing CP24A state marker')
  assert(iconStrip.includes("data-state={available ? 'present' : 'missing'}"), 'Coverage icons missing present/missing data state')
  assert(iconStrip.includes('opacity-45'), 'Missing field icon state is not visibly dimmed')
  assert(iconStrip.includes('text-[#F7F3E8]'), 'Present field icon state is not higher contrast')
  assert(iconStrip.includes('data-cp24a-quiet-status-age'), 'Quiet status age marker missing')
  assert(!iconStrip.includes('rounded-full bg-[#20241F]'), 'Status age still uses heavy pill treatment')

  assert(myLeads.includes('function displayMarket(value: string | null | undefined): string'), 'Display market helper missing')
  assert(myLeads.includes('function displayCategory(value: string | null | undefined): string'), 'Display category helper missing')
  assert(myLeads.includes('displayMarket(row.market ?? row.address)'), 'My Leads detail line does not display-normalize market/location')
  assert(myLeads.includes('displayCategory(row.category)'), 'My Leads detail line does not display-normalize category')
  assert(!myLeads.includes('hover:underline'), 'Business-name underline hover remains')

  assert(sweep.includes('<h1 className="font-outfit text-[30px] leading-tight">Fetch</h1>'), 'Fetch screen title is not Fetch')
  assert(sweep.includes('Fetch leads'), 'Fetch screen missing Fetch leads action copy')
  assert(sweep.includes('Fetching leads'), 'Fetch progress copy missing')
  assert(sweep.includes('leads fetched'), 'Fetch results copy missing')
  for (const stale of ['Run sweep', 'Run a sweep', '>Sweep<', 'Sweeping the market', 'Sweep searches']) {
    assert(!sweep.includes(stale), `SweepClient still contains stale rendered copy: ${stale}`)
  }

  const approvedSurface = stripComments([mobile, sidebar, myLeads, sweep, mapPage, todayPage].join('\n'))
  for (const banned of [
    'Run a sweep',
    'Daily Run',
    "Today's run",
    "Today's Run",
    'checked overnight',
    'checked sources',
    'monitoring',
    'watching',
    "I'll keep scouting",
    'keep listening',
    'new signals today',
    'while you were away',
  ]) {
    assert(!approvedSurface.includes(banned), `Approved CP24A surface includes banned visible copy: ${banned}`)
  }

  const customerVisibleLeakSurface = stripComments([
    mobile,
    sidebar,
    myLeads,
    sweep,
    chat,
    evidenceCardBack,
    mapPage,
    todayPage,
  ].join('\n'))
  const customerVisibleLeakPatterns: Array<[RegExp, string]> = [
    [/\bScouting\b/, 'Scouting'],
    [/\bListening for signals\b/, 'Listening for signals'],
    [/\bkeep listening\b/i, 'keep listening'],
    [/\bkeep watching\b/i, 'keep watching'],
    [/\bwatching\b/i, 'watching'],
    [/\bmonitoring\b/i, 'monitoring'],
    [/\bchecked\s*(?:\{[^}]+\}|\$\{[^}]+\}|[0-9]+)?\s*sources\b/i, 'checked sources'],
    [/\bchecked overnight\b/i, 'checked overnight'],
    [/\bwhile you were away\b/i, 'while you were away'],
    [/\bnew signals today\b/i, 'new signals today'],
  ]
  for (const [pattern, label] of customerVisibleLeakPatterns) {
    assert(!pattern.test(customerVisibleLeakSurface), `Customer-visible background-work copy remains: ${label}`)
  }

  const baseRoutes = routeFilesFromGit('origin/main')
  const currentRoutes = routeFilesFromWorktree()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp24a_fetch_ia_my_leads_hierarchy',
    changedFilesAllowedOnly: true,
    protectedFilesChanged: false,
    packageFilesChanged: false,
    providerFilesChanged: false,
    dbSchemaFilesChanged: false,
    runtimeExportCrmOutreachChanged: false,
    authBillingMiddlewareFilesChanged: false,
    mobileNavOrder: ['Fetch', 'Leads', 'Chat', 'Map', 'Settings'],
    sidebarWorkspaceOrder: ['Fetch', 'Leads', 'Chat', 'Map'],
    fetchRoutePreserved: true,
    todayRoutePreservedOffNav: true,
    myLeadsPrimaryFetchAction: true,
    exportUtilityDemoted: true,
    csvExportPreserved: true,
    jsonExportPreserved: true,
    coverageIconsDistinctStates: true,
    quietStatusAgeTreatment: true,
    displayNormalization: true,
    sweepCustomerCopyUsesFetch: true,
    routeCountUnchanged: currentRoutes.length,
    oldSmokesModified: false,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP24A Fetch IA + My Leads action hierarchy smoke FAILED:')
  console.error(error)
  process.exit(1)
})
