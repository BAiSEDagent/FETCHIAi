/**
 * CP24D - My Leads filter rail size + engagement spacing smoke proof.
 *
 * Static and DB-free. Verifies the lifecycle rail keeps CP24C grammar while
 * compacting the active pill and adding active-only separation from the
 * overlapped inactive controls.
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

function blockAround(sourceText: string, marker: string, before = 900, after = 4200): string {
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
    'scripts/pm/cp24d-my-leads-filter-rail-size-spacing-smoke.ts',
  ].sort()
  const allowedChangedFiles = new Set(allowedChangedFileList)
  const cleanMergedMainMode = changed.length === 0
  const unexpectedChangedFiles = changed.filter((path) => !allowedChangedFiles.has(path))

  if (!cleanMergedMainMode) {
    assert.deepEqual(changed, allowedChangedFileList, 'CP24D changed files must match the approved file fence')
  }
  if (changedBySource.baseDiff.length > 0) {
    assert.deepEqual(
      changedBySource.baseDiff,
      allowedChangedFileList,
      'CP24D branch changed files must match the approved file fence',
    )
  }
  assert.deepEqual(unexpectedChangedFiles, [], 'CP24D changed files must stay inside the approved file fence')

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
    (path) => /^scripts\/pm\/(?:cp2[23]|cp24[abc])/i.test(path),
    'Old checkpoint smoke changed',
  )

  const packageJson = source('package.json')
  assert(!packageJson.includes('"predev"'), 'package.json should not contain a predev script')

  const myLeads = source('components/app/MyLeadsView.tsx')
  const filterRail = blockAround(myLeads, 'data-cp24c-filter-final-grammar')
  const activeButton = blockAround(myLeads, 'data-cp24d-compact-active-pill', 1400, 1200)

  assert(myLeads.includes('data-cp24d-compact-active-pill'), 'CP24D compact active pill marker missing')
  assert(myLeads.includes('data-cp24d-active-separation-gap'), 'CP24D active separation gap marker missing')
  assert(myLeads.includes('data-cp24d-inactive-overlap-preserved'), 'CP24D inactive overlap marker missing')
  assert(myLeads.includes('data-cp24d-lifecycle-color-preserved'), 'CP24D lifecycle color marker missing')

  assert(!activeButton.includes('w-[168px]'), 'Active pill still uses old CP24C w-[168px] width')
  assert(!activeButton.includes('sm:w-[190px]'), 'Active pill still uses old CP24C sm:w-[190px] width')
  assert(/w-\[(13[6-9]|14[0-8])px\]/.test(activeButton), 'Active pill needs compact 136-148px width target')
  assert(/h-\[(48|49|50|51|52)px\]/.test(activeButton), 'Active pill needs compact 48-52px height target')
  assert(activeButton.includes('gap-2'), 'Active pill should use compact icon/label/count gap')
  assert(activeButton.includes('px-4'), 'Active pill should use compact horizontal padding')
  assert(activeButton.includes('!ml-3') && activeButton.includes('!mr-8'), 'Active pill needs positive separation from overlapped neighbors')

  assert(filterRail.includes('-space-x-5'), 'Inactive lifecycle controls should retain explicit negative spacing')
  assert(filterRail.includes('data-cp24c-inactive-overlap-cluster'), 'CP24C inactive overlap marker missing')
  assert(filterRail.includes('data-cp24d-inactive-overlap-preserved'), 'CP24D inactive overlap marker missing')
  assert(filterRail.includes('w-[78px]'), 'Inactive controls should keep stable thumb-friendly width')
  assert(filterRail.includes('h-[58px]'), 'Inactive controls should keep stable thumb-friendly height')

  assert(myLeads.includes('data-cp24c-filter-final-grammar'), 'CP24C final grammar marker missing')
  assert(myLeads.includes('LIFECYCLE_FILTERS.map((filter)'), 'Filter rail should render filters in stable lifecycle order')
  assert(!myLeads.includes('const inactiveFilters'), 'Inactive filters should not be split into a reordered list')
  assert(!myLeads.includes('ActiveFilterIcon'), 'Active filter should not be duplicated outside the stable order')
  assert(filterRail.includes('filter.key === activeFilter'), 'Active filter should be determined in place')
  assert(filterRail.includes('aria-pressed={isActive}'), 'Active state should stay accessible')

  assert(myLeads.includes('data-cp24c-lifecycle-active-color'), 'CP24C lifecycle active color marker missing')
  assert(filterRail.includes('filter.activeClass'), 'Active filter should use lifecycle metadata colors')
  assert(myLeads.includes("activeClass: 'border-[#F7F3E8] bg-[#F7F3E8] text-[#0B0D0C]'"), 'All active neutral treatment missing')
  assert(myLeads.includes('activeClass: STATUS_META.saved.activeFilterClass'), 'Saved active color metadata missing')
  assert(myLeads.includes('activeClass: STATUS_META.contacted.activeFilterClass'), 'Contacted active color metadata missing')
  assert(myLeads.includes('activeClass: STATUS_META.won.activeFilterClass'), 'Won active color metadata missing')
  assert(myLeads.includes('activeClass: STATUS_META.dismissed.activeFilterClass'), 'Lost active color metadata missing')
  assert(!/coral/i.test(filterRail), 'Generic coral active treatment should not be added')

  assert(myLeads.includes("activeLabel: 'Lost'"), 'Closed filter should have a short visible active label')
  assert(myLeads.includes("label: 'Lost / Dismissed'"), 'Closed filter should retain full accessible label')
  assert(filterRail.includes('aria-label={`${filter.label}: ${count}`}'), 'Full filter label should remain accessible')
  assert(filterRail.includes('const activeLabel = filter.activeLabel ?? filter.label'), 'Active label fallback missing')
  assert(filterRail.includes('whitespace-nowrap'), 'Active visible label should avoid truncation')
  assert(filterRail.includes('tabular-nums'), 'Active filter should render count')

  assert(myLeads.includes('data-cp24c-hover-edge-safe'), 'CP24C hover edge safety marker missing')
  assert(filterRail.includes('overflow-visible'), 'Filter rail should preserve rounded edges without clipping')
  assert(filterRail.includes('isolate'), 'Filter rail should isolate z-index layering')
  assert(filterRail.includes('hover:z-20'), 'Hovered filter should rise above neighbors')
  assert(filterRail.includes('focus-visible:z-30'), 'Focused filter should rise above neighbors')
  assert(!filterRail.includes('overflow-hidden'), 'Lifecycle filter wrappers should not hide overflow')
  assert(!filterRail.includes('hover:-translate'), 'Hover should not use transforms that can crop rounded edges')
  assert(!filterRail.includes('scale-'), 'Filter rail should not use hover scale that can crop rounded edges')
  assert(!/title=/.test(filterRail), 'Lifecycle filter buttons should not have native title tooltips')

  assert(myLeads.includes('data-cp24c-smooth-filter-motion'), 'CP24C smooth filter motion marker missing')
  assert(myLeads.includes('transition-all'), 'Filter rail should use transition-all')
  assert(myLeads.includes('duration-300'), 'Filter rail should use duration-300')
  assert(myLeads.includes("transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'"), 'Filter rail easing missing')
  assert(myLeads.includes('motion-reduce:transition-none'), 'Filter rail reduced-motion support missing')

  assert(myLeads.includes('data-cp24b-export-utility'), 'CP24B export utility marker missing')
  assert(myLeads.includes('function exportCsv()'), 'CSV export function removed')
  assert(myLeads.includes('function exportJson()'), 'JSON export function removed')
  assert(myLeads.includes('exportSavedLeadsCsv'), 'CSV export helper removed')
  assert(myLeads.includes('exportSavedLeadsJson'), 'JSON export helper removed')
  assert(myLeads.includes('placeholder="Search leads"'), 'Search input removed')
  assert(myLeads.includes('data-cp23c-icon-status-strip'), 'CP23C icon status strip marker missing')
  assert(myLeads.includes('setActiveLeadId(row.id)'), 'Row tap action sheet behavior removed')
  assert(myLeads.includes('href={`/app/leads/${row.id}`}'), 'Open lead detail link removed')
  assert(myLeads.includes('row.phone'), 'Call field gating removed')
  assert(myLeads.includes('row.website'), 'Website field gating removed')
  assert(myLeads.includes('updateSavedLeadNote'), 'Note save behavior removed')
  assert(myLeads.includes('updateSavedLeadStatus'), 'Lifecycle status behavior removed')
  assert(myLeads.includes('undoToast'), 'Undo behavior removed')

  assert(!myLeads.includes('data-cp24a-primary-fetch-action'), 'My Leads primary Fetch CTA marker returned')
  assert(!/>\s*Fetch leads\s*</.test(myLeads), 'My Leads renders visible Fetch leads button text')
  assert(!myLeads.includes('Run a sweep'), 'My Leads contains visible Run a sweep copy')
  assert(!/>\s*Sweep\s*</.test(myLeads), 'My Leads renders visible customer-facing Sweep copy')

  const baseRoutes = routeFilesFromGit('origin/main')
  const currentRoutes = routeFilesFromWorktree()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp24d_my_leads_filter_rail_size_spacing',
    changedFilesAllowedOnly: true,
    cleanMergedMainMode,
    protectedFilesChanged: false,
    packageFilesChanged: false,
    providerFilesChanged: false,
    dbSchemaFilesChanged: false,
    runtimeExportCrmOutreachChanged: false,
    authBillingMiddlewareFilesChanged: false,
    activePillCompacted: true,
    activeSeparationGapAdded: true,
    inactiveOverlapPreserved: true,
    stableOrderPreserved: true,
    activeExpandsInPlace: true,
    lifecycleActiveColorsPreserved: true,
    lostLabelFitPreserved: true,
    hoverFocusEdgeSafePreserved: true,
    nativeTitleTooltipsAbsent: true,
    exportUtilityPreserved: true,
    iconStatusStripPreserved: true,
    packageJsonPredevPresent: false,
    routeCountUnchanged: currentRoutes.length,
    oldSmokesModified: false,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP24D My Leads filter rail size + engagement spacing smoke FAILED:')
  console.error(error)
  process.exit(1)
})
