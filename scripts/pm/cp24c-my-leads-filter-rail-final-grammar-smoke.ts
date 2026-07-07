/**
 * CP24C - My Leads filter rail final grammar smoke proof.
 *
 * Static and DB-free. Verifies the lifecycle filter rail renders in stable
 * order, expands the active filter in place, preserves lifecycle color
 * treatment, avoids native tooltips, and keeps CP24A/CP24B behavior intact.
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

function changedFilesFor(command: string): string[] {
  const output = shell(command)
  return output ? output.split('\n') : []
}

function uniqueSorted(paths: readonly string[]): string[] {
  return Array.from(new Set(paths)).sort()
}

function changedFilesBySource(): {
  baseDiff: string[]
  worktreeDiff: string[]
  stagedDiff: string[]
  untracked: string[]
  all: string[]
} {
  const baseDiff = changedFilesFor('git diff --name-only origin/main..HEAD')
  const worktreeDiff = changedFilesFor('git diff --name-only')
  const stagedDiff = changedFilesFor('git diff --name-only --cached')
  const untracked = changedFilesFor('git ls-files --others --exclude-standard')

  return {
    baseDiff: uniqueSorted(baseDiff),
    worktreeDiff: uniqueSorted(worktreeDiff),
    stagedDiff: uniqueSorted(stagedDiff),
    untracked: uniqueSorted(untracked),
    all: uniqueSorted([
      ...baseDiff,
      ...worktreeDiff,
      ...stagedDiff,
      ...untracked,
    ]),
  }
}

function assertNoChangedPath(changed: readonly string[], predicate: (path: string) => boolean, message: string) {
  const matches = changed.filter(predicate)
  assert.equal(matches.length, 0, `${message}: ${matches.join(', ')}`)
}

function blockAround(sourceText: string, marker: string, before = 900, after = 3600): string {
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
  const changedBySource = changedFilesBySource()
  const changed = changedBySource.all
  const allowedChangedFileList = [
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp24c-my-leads-filter-rail-final-grammar-smoke.ts',
  ].sort()
  const allowedChangedFiles = new Set(allowedChangedFileList)
  const cleanMergedMainMode = changed.length === 0
  const unexpectedChangedFiles = changed.filter((path) => !allowedChangedFiles.has(path))

  if (changedBySource.baseDiff.length > 0) {
    assert.deepEqual(
      changedBySource.baseDiff,
      allowedChangedFileList,
      'CP24C branch changed files must match the approved file fence',
    )
  }
  assert.deepEqual(unexpectedChangedFiles, [], 'CP24C changed files must stay inside the approved file fence')

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
    (path) => /^scripts\/pm\/(?:cp2[23]|cp24[ab])/i.test(path),
    'Old checkpoint smoke changed',
  )

  const myLeads = source('components/app/MyLeadsView.tsx')
  const filterRail = blockAround(myLeads, 'data-cp24c-filter-final-grammar', 900, 4200)

  assert(myLeads.includes('data-cp24c-filter-final-grammar'), 'CP24C final grammar marker missing')
  assert(myLeads.includes('data-cp24c-lifecycle-active-color'), 'CP24C lifecycle active color marker missing')
  assert(myLeads.includes('data-cp24c-active-filter-fit'), 'CP24C active filter fit marker missing')
  assert(myLeads.includes('data-cp24c-inactive-overlap-cluster'), 'CP24C inactive overlap cluster marker missing')
  assert(myLeads.includes('data-cp24c-smooth-filter-motion'), 'CP24C smooth filter motion marker missing')
  assert(myLeads.includes('data-cp24c-hover-edge-safe'), 'CP24C hover edge safety marker missing')

  assert(myLeads.includes('LIFECYCLE_FILTERS.map((filter)'), 'Filter rail should render filters in stable lifecycle order')
  assert(!myLeads.includes('const inactiveFilters'), 'Inactive filters should not be split into a reordered list')
  assert(!myLeads.includes('ActiveFilterIcon'), 'Active filter should not be duplicated outside the stable order')
  assert(filterRail.includes('filter.key === activeFilter'), 'Active filter should be determined in place')
  assert(filterRail.includes('aria-pressed={isActive}'), 'Active state should stay accessible')

  assert(filterRail.includes('filter.activeClass'), 'Active filter should use lifecycle filter metadata colors')
  assert(myLeads.includes('activeClass: STATUS_META.saved.activeFilterClass'), 'Saved active color metadata missing')
  assert(myLeads.includes('activeClass: STATUS_META.contacted.activeFilterClass'), 'Contacted active color metadata missing')
  assert(myLeads.includes('activeClass: STATUS_META.won.activeFilterClass'), 'Won active color metadata missing')
  assert(myLeads.includes('activeClass: STATUS_META.dismissed.activeFilterClass'), 'Lost active color metadata missing')
  assert(!filterRail.includes('bg-[#F7F3E8]') || filterRail.includes('filter.activeClass'), 'Active filters should not all be hard-coded cream')

  assert(myLeads.includes("activeLabel: 'Lost'"), 'Closed filter should have a short visible active label')
  assert(myLeads.includes("label: 'Lost / Dismissed'"), 'Closed filter should retain full accessible label')
  assert(filterRail.includes('const activeLabel = filter.activeLabel ?? filter.label'), 'Active label fallback missing')
  assert(filterRail.includes('whitespace-nowrap'), 'Active visible label should avoid truncation')
  assert(filterRail.includes('tabular-nums'), 'Active filter should render count')

  assert(filterRail.includes('-space-x-5'), 'Inactive controls should overlap strongly')
  assert(filterRail.includes('w-[78px]'), 'Inactive controls should keep thumb-friendly squircle width')
  assert(filterRail.includes('w-[168px]'), 'Active control should keep enough mobile width')
  assert(filterRail.includes('isolate'), 'Filter cluster should isolate z-index layering')
  assert(filterRail.includes('overflow-visible'), 'Filter cluster should preserve rounded edges without clipping')
  assert(!filterRail.includes('overflow-hidden'), 'Lifecycle filter wrappers should not hide overflow')
  assert(filterRail.includes('hover:z-20'), 'Hovered filter should rise above neighbors')
  assert(filterRail.includes('focus-visible:z-30'), 'Focused filter should rise above neighbors')
  assert(!filterRail.includes('hover:-translate'), 'Hover should not use transform that can crop rounded edges')
  assert(!filterRail.includes('scale-'), 'Filter rail should not use hover scale that can crop rounded edges')

  assert(myLeads.includes('transition-all'), 'Filter rail should use transition-all')
  assert(myLeads.includes('duration-300'), 'Filter rail should use duration-300')
  assert(myLeads.includes("transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'"), 'Filter rail easing missing')
  assert(myLeads.includes('motion-reduce:transition-none'), 'Filter rail reduced-motion support missing')

  assert(!/title=/.test(filterRail), 'Lifecycle filter buttons should not have native title tooltips')
  assert(filterRail.includes('aria-label={`${filter.label}: ${count}`}'), 'Lifecycle filter aria labels missing')
  assert(filterRail.includes('sr-only'), 'Inactive icon-only filters should preserve screen-reader text')
  assert(filterRail.includes('isActive ? (') && filterRail.includes(') : ('), 'Inactive filters should stay icon-only')

  assert(myLeads.includes('data-cp24b-export-utility'), 'CP24B export utility marker missing')
  assert(myLeads.includes('function exportCsv()'), 'CSV export function removed')
  assert(myLeads.includes('function exportJson()'), 'JSON export function removed')
  assert(myLeads.includes('exportSavedLeadsCsv'), 'CSV export helper removed')
  assert(myLeads.includes('exportSavedLeadsJson'), 'JSON export helper removed')
  assert(myLeads.includes('data-cp23c-icon-status-strip'), 'CP23C icon status strip marker missing')
  assert(myLeads.includes('displayMarket(row.market ?? row.address)'), 'Display normalization for market/location missing')
  assert(myLeads.includes('displayCategory(row.category)'), 'Display normalization for category missing')
  assert(myLeads.includes('setActiveLeadId(row.id)'), 'Row tap action sheet behavior removed')
  assert(myLeads.includes('href={`/app/leads/${row.id}`}'), 'Open lead detail link removed')
  assert(myLeads.includes('updateSavedLeadNote'), 'Note save behavior removed')
  assert(myLeads.includes('updateSavedLeadStatus'), 'Lifecycle status behavior removed')

  assert(!myLeads.includes('data-cp24a-primary-fetch-action'), 'My Leads primary Fetch CTA marker returned')
  assert(!/>\s*Fetch leads\s*</.test(myLeads), 'My Leads renders visible Fetch leads button text')
  assert(!myLeads.includes('Run a sweep'), 'My Leads contains Run a sweep')
  assert(!/>\s*Sweep\s*</.test(myLeads), 'My Leads renders visible Sweep copy')

  const baseRoutes = routeFilesFromGit('origin/main')
  const currentRoutes = routeFilesFromWorktree()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp24c_my_leads_filter_rail_final_grammar',
    changedFilesAllowedOnly: true,
    cleanMergedMainMode,
    protectedFilesChanged: false,
    packageFilesChanged: false,
    providerFilesChanged: false,
    dbSchemaFilesChanged: false,
    runtimeExportCrmOutreachChanged: false,
    authBillingMiddlewareFilesChanged: false,
    stableFilterOrder: true,
    activeFilterExpandsInPlace: true,
    lifecycleActiveColorsPreserved: true,
    lostLabelFitFixed: true,
    inactiveFiltersOverlapLikeReference: true,
    filterMotionSmoothed: true,
    nativeTitleTooltipsRemoved: true,
    hoverEdgeSafe: true,
    exportUtilityPreserved: true,
    iconStatusStripPreserved: true,
    routeCountUnchanged: currentRoutes.length,
    oldSmokesModified: false,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP24C My Leads filter rail final grammar smoke FAILED:')
  console.error(error)
  process.exit(1)
})
