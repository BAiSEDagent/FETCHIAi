/**
 * CP24B - My Leads header + filter rail polish smoke proof.
 *
 * Static and DB-free. Verifies the checkpoint file fence, My Leads header
 * action hierarchy, export behavior wiring, overlapping filter rail markers,
 * and route-count stability without touching runtime/provider/export behavior.
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

function blockAround(sourceText: string, marker: string, before = 700, after = 2200): string {
  const index = sourceText.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return sourceText.slice(Math.max(0, index - before), index + after)
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
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp24b-my-leads-header-filter-polish-smoke.ts',
  ])

  assert.deepEqual(changed, Array.from(allowedChangedFiles).sort(), 'CP24B changed files must match the approved file fence')

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
    (path) => /^scripts\/pm\/(?:cp2[23]|cp24a)/i.test(path),
    'Old checkpoint smoke changed',
  )

  const myLeads = source('components/app/MyLeadsView.tsx')

  assert(!myLeads.includes('data-cp24a-primary-fetch-action'), 'My Leads still has the CP24A primary Fetch action marker')
  assert(!/>\s*Fetch leads\s*</.test(myLeads), 'My Leads still renders visible Fetch leads button text')
  assert(!myLeads.includes('Run a sweep'), 'My Leads still contains Run a sweep')
  assert(!myLeads.includes('data-cp23b-action-rail'), 'Old page-level action rail is still rendered')

  const fetchLinkBlock = blockAround(myLeads, 'href="/app/sweep"', 500, 900)
  assert(fetchLinkBlock.includes('Open Fetch'), 'Empty state should use a small secondary Open Fetch link')
  assert(!fetchLinkBlock.includes('GREEN_ACTION_CLASS'), 'Empty state Fetch link still uses primary green action styling')

  assert(myLeads.includes('data-cp24b-export-utility'), 'CP24B export utility marker missing')
  assert(myLeads.includes('data-cp24a-export-utility'), 'CP24A export utility marker should remain for compatibility')
  assert(myLeads.includes('function exportCsv()'), 'CSV export function removed')
  assert(myLeads.includes('function exportJson()'), 'JSON export function removed')
  assert(myLeads.includes('exportSavedLeadsCsv'), 'CSV export helper removed')
  assert(myLeads.includes('exportSavedLeadsJson'), 'JSON export helper removed')

  const exportUtility = blockAround(myLeads, 'data-cp24b-export-utility', 500, 2600)
  assert(exportUtility.includes('Export'), 'Export utility control missing')
  assert(exportUtility.includes('exportCsv()'), 'CSV export behavior not wired from export utility')
  assert(exportUtility.includes('exportJson()'), 'JSON export behavior not wired from export utility')
  assert(exportUtility.includes('CSV'), 'CSV menu item missing')
  assert(exportUtility.includes('JSON'), 'JSON menu item missing')

  const exportIndex = myLeads.indexOf('data-cp24b-export-utility')
  const searchIndex = myLeads.indexOf('placeholder="Search leads"')
  const railIndex = myLeads.indexOf('data-cp24b-overlap-filter-rail')
  assert(exportIndex >= 0 && searchIndex >= 0 && railIndex >= 0, 'Header/search/filter markers missing')
  assert(exportIndex < searchIndex, 'Export utility should sit above search in the content header')
  assert(searchIndex < railIndex, 'Search should appear above lifecycle filters')

  assert(myLeads.includes('data-cp24b-overlap-filter-rail'), 'Overlap filter rail marker missing')
  assert(myLeads.includes('data-cp24b-smooth-filter-motion'), 'Smooth filter motion marker missing')

  const filterRail = blockAround(myLeads, 'data-cp24b-overlap-filter-rail', 1200, 3200)
  assert(filterRail.includes('-space-x-4'), 'Inactive lifecycle filters are not overlapping')
  assert(filterRail.includes('w-[76px]'), 'Inactive lifecycle filters lost stable rounded-square sizing')
  assert(filterRail.includes('w-[172px]'), 'Active lifecycle pill lost stable width')
  assert(myLeads.includes('duration-300'), 'Filter rail is missing duration-300 motion')
  assert(myLeads.includes("transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'"), 'Filter rail is missing the approved easing')
  assert(myLeads.includes('motion-reduce:transition-none'), 'Filter rail is missing reduced-motion support')
  for (const label of ['All', 'Saved', 'Contacted', 'Won', 'Lost / Dismissed']) {
    assert(myLeads.includes(label), `Lifecycle filter label missing: ${label}`)
  }

  assert(myLeads.includes('data-cp23c-icon-status-strip'), 'CP23C icon status strip marker missing')
  assert(myLeads.includes('data-cp24a-field-presence-icon'), 'CP24A field presence icon marker missing')
  assert(myLeads.includes('data-cp24a-quiet-status-age'), 'CP24A quiet status age marker missing')
  assert(myLeads.includes('displayMarket(row.market ?? row.address)'), 'Display normalization for market/location missing')
  assert(myLeads.includes('displayCategory(row.category)'), 'Display normalization for category missing')

  assert(myLeads.includes('setSearch'), 'Search state handling removed')
  assert(myLeads.includes('setActiveLeadId(row.id)'), 'Row tap action sheet behavior removed')
  assert(myLeads.includes('href={`/app/leads/${row.id}`}'), 'Open lead detail link removed')
  assert(myLeads.includes('updateSavedLeadNote'), 'Note save behavior removed')
  assert(myLeads.includes('updateSavedLeadStatus'), 'Lifecycle status behavior removed')
  assert(!myLeads.includes('email action'), 'Email action copy should not be added')
  assert(!myLeads.includes('outreach'), 'Outreach copy should not be added')
  assert(!myLeads.includes('monitoring'), 'Monitoring copy should not be added')
  assert(!myLeads.includes('watching'), 'Watching copy should not be added')
  assert(!myLeads.includes('scouting'), 'Scouting copy should not be added')

  const baseRoutes = routeFilesFromGit('origin/main')
  const currentRoutes = routeFilesFromWorktree()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp24b_my_leads_header_filter_polish',
    changedFilesAllowedOnly: true,
    protectedFilesChanged: false,
    packageFilesChanged: false,
    providerFilesChanged: false,
    dbSchemaFilesChanged: false,
    runtimeExportCrmOutreachChanged: false,
    authBillingMiddlewareFilesChanged: false,
    myLeadsPrimaryFetchButtonRemoved: true,
    exportUtilityMovedUp: true,
    csvExportPreserved: true,
    jsonExportPreserved: true,
    overlappingFilterRail: true,
    smoothFilterMotion: true,
    cp23cIconStatusStripPreserved: true,
    routeCountUnchanged: currentRoutes.length,
    oldSmokesModified: false,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP24B My Leads header + filter rail polish smoke FAILED:')
  console.error(error)
  process.exit(1)
})
