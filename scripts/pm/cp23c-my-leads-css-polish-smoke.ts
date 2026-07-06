/**
 * CP23C - My Leads mailbox CSS polish smoke proof.
 *
 * Static and DB-free. Verifies the polish-only file scope, compact action rail,
 * larger mailbox filter rail, and icon-first row metadata without changing
 * export, sweep, note, status, provider, or auth behavior.
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

function blockAround(sourceText: string, marker: string, before = 600, after = 2600): string {
  const index = sourceText.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return sourceText.slice(Math.max(0, index - before), index + after)
}

function assertIncludesAll(sourceText: string, values: readonly string[], message: string) {
  for (const value of values) {
    assert(sourceText.includes(value), `${message}: missing ${value}`)
  }
}

async function main() {
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp23c-my-leads-css-polish-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP23C changed file: ${path}`)
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
    (path) => /^scripts\/pm\/cp2(2|3)(a|b|c)?/i.test(path) && path !== 'scripts/pm/cp23c-my-leads-css-polish-smoke.ts',
    'Old checkpoint smoke changed',
  )

  const myLeads = source('components/app/MyLeadsView.tsx')
  const lowerMyLeads = myLeads.toLowerCase()

  const actionRail = blockAround(myLeads, 'data-cp23c-compact-action-rail', 800, 2300)
  assert(myLeads.includes('data-cp23b-action-rail'), 'CP23B action rail marker removed')
  assert(actionRail.includes('data-cp23c-compact-action-rail'), 'CP23C compact action rail marker missing')
  assertIncludesAll(actionRail, [
    'grid-cols-[minmax(58px,0.72fr)_minmax(66px,0.78fr)_minmax(130px,1.45fr)]',
    'onClick={exportCsv}',
    'onClick={exportJson}',
    'CSV',
    'JSON',
    'Run a sweep',
    'href="/app/sweep"',
    'GREEN_ACTION_CLASS',
  ], 'Compact action rail')
  assert(!actionRail.includes('col-span-2'), 'Run a sweep is still stacked full-width on mobile')
  assert(!actionRail.includes('sm:col-span-1'), 'Run a sweep still carries stacked mobile grid override')

  assert(myLeads.includes('exportSavedLeadsCsv'), 'CSV export helper removed')
  assert(myLeads.includes('exportSavedLeadsJson'), 'JSON export helper removed')
  assert(myLeads.includes('function exportCsv()'), 'exportCsv function removed')
  assert(myLeads.includes('function exportJson()'), 'exportJson function removed')

  const filterRail = blockAround(myLeads, 'data-cp23c-mailbox-filter-rail', 800, 2600)
  assert(myLeads.includes('data-cp23b-filter-rail'), 'CP23B filter rail marker removed')
  assert(filterRail.includes('data-cp23c-mailbox-filter-rail'), 'CP23C mailbox filter marker missing')
  assertIncludesAll(filterRail, [
    'h-[58px]',
    'rounded-[24px]',
    '!w-[76px]',
    'min-w-[140px]',
    'filter.label',
    'tabular-nums',
    'count',
  ], 'Mailbox filter rail')
  assert(myLeads.includes("filter.key === 'all' ? rows.length"), 'All filter count no longer comes from rows')
  assert(myLeads.includes('countForFilter(statusCounts, filter)'), 'Lifecycle counts no longer come from status counts')

  const statusStrip = blockAround(myLeads, 'data-cp23c-icon-status-strip', 1800, 1200)
  assert(statusStrip.includes('data-cp23c-icon-status-strip'), 'Icon status strip marker missing')
  assertIncludesAll(statusStrip, [
    'FieldPresenceIcon',
    'icon={Phone}',
    'icon={Globe2}',
    'icon={MapPin}',
    'hasPhone(row)',
    'hasWebsite(row)',
    'hasLocation(row)',
    'statusAgeLabel(row, nowMs)',
  ], 'Row icon status strip')
  assert(myLeads.includes('function hasLocation(row: SavedLeadPipelineRow)'), 'Location presence helper missing')
  assert(myLeads.includes('function statusAgeLabel(row: SavedLeadPipelineRow, nowMs: number)'), 'Lifecycle age helper missing')
  assert(myLeads.includes('function formatCompactAge(valueMs: number, nowMs: number)'), 'Compact age helper missing')

  for (const oldPattern of [
    'Phone · Website',
    'No phone · Website',
    'Phone · No website',
  ]) {
    assert(!myLeads.includes(oldPattern), `Old text-heavy row metadata remains: ${oldPattern}`)
  }

  assert(myLeads.includes('No phone'), 'Action sheet missing No phone field-gated state')
  assert(myLeads.includes('No website'), 'Action sheet missing No website field-gated state')
  assert(!myLeads.includes('mailto:'), 'Email action was added')
  assert(!myLeads.includes('Email'), 'Email UI was added')

  for (const banned of [
    'score',
    'signal',
    'urgency',
    'hot lead',
    'why now',
    'evidence',
    'outreach',
    'replied',
    'emailed',
    'archive',
    'flag',
    'swipe',
  ]) {
    assert(!lowerMyLeads.includes(banned), `MyLeadsView includes banned CP23C word or concept: ${banned}`)
  }

  assert(!myLeads.includes('bg-coral'))
  assert(!myLeads.includes('text-coral'))
  assert(!myLeads.includes('hover:bg-coral'))
  assert(!myLeads.includes('coralDeep'))
  assert(myLeads.includes('GREEN_ACTION_CLASS'))
  assert(myLeads.includes('#2EE08C'))

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp23c_my_leads_css_polish',
    changedFilesAllowedOnly: true,
    compactActionRail: true,
    csvExportPreserved: true,
    jsonExportPreserved: true,
    runSweepPreserved: true,
    runSweepOneRowMobile: true,
    mailboxFilterRail: true,
    activeFilterLabelAndCount: true,
    iconStatusStrip: true,
    phoneWebsiteLocationPresence: true,
    actionSheetFieldGatingPreserved: true,
    noEmailAction: true,
    noCoralPrimaryAction: true,
    swipeDeferred: true,
    oldSmokesModified: false,
    protectedFilesChanged: false,
    packageFilesChanged: false,
    providerFilesChanged: false,
    dbSchemaFilesChanged: false,
    runtimeExportCrmOutreachChanged: false,
    authBillingMiddlewareFilesChanged: false,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP23C My Leads CSS polish smoke FAILED:')
  console.error(error)
  process.exit(1)
})
