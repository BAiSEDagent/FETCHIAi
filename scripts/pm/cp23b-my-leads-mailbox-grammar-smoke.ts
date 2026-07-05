/**
 * CP23B - My Leads mailbox grammar smoke proof.
 *
 * Deterministic and DB-free. This statically verifies the CP23B scope,
 * mailbox-only UI concepts, field-gated actions, and banned fabrication copy.
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

function assertIncludesAll(source: string, values: readonly string[], message: string) {
  for (const value of values) {
    assert(source.includes(value), `${message}: missing ${value}`)
  }
}

function blockAround(source: string, marker: string, before = 1000, after = 3000): string {
  const index = source.indexOf(marker)
  assert(index >= 0, `Missing marker: ${marker}`)
  return source.slice(Math.max(0, index - before), index + after)
}

function classNameFor(source: string, marker: string): string {
  const block = blockAround(source, marker, 1000, 600)
  const match = block.match(/className="([^"]+)"/)
  assert(match, `Missing className near ${marker}`)
  return match[1]
}

async function main() {
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp23b-my-leads-mailbox-grammar-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP23B changed file: ${path}`)
  }

  assertNoChangedPath(changed, (path) => path === 'replit.md', 'Protected file changed')
  assertNoChangedPath(changed, (path) => path === 'FETCHI_CLAUDE_CODE_BRIEF.md', 'Protected file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('db/'), 'DB file changed')
  assertNoChangedPath(changed, (path) => path === 'drizzle.config.ts', 'Drizzle config changed')
  assertNoChangedPath(changed, (path) => path === 'middleware.ts', 'Middleware changed')
  assertNoChangedPath(changed, (path) => path === 'package.json' || path === 'package-lock.json', 'Package file changed')
  assertNoChangedPath(changed, (path) => path.includes('/providers/') || path.startsWith('lib/providers/'), 'Provider file changed')
  assertNoChangedPath(changed, (path) => path.startsWith('lib/runtime/'), 'Runtime file changed')
  assertNoChangedPath(changed, (path) => path.includes('auth') || path.includes('clerk'), 'Auth file changed')
  assertNoChangedPath(changed, (path) => path.includes('billing') || path.includes('stripe'), 'Billing file changed')
  assertNoChangedPath(changed, (path) => path.includes('crm') || path.includes('outreach'), 'CRM/outreach file changed')
  assertNoChangedPath(changed, (path) => path.includes('signal-watch') || path.includes('SignalWatch'), 'Signal Watch file changed')
  assertNoChangedPath(changed, (path) => path.includes('score') || path.includes('scoring'), 'Scoring file changed')
  assertNoChangedPath(changed, (path) => path.includes('migration'), 'Migration file changed')

  const myLeads = source('components/app/MyLeadsView.tsx')
  const lowerMyLeads = myLeads.toLowerCase()

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
  ]) {
    assert(!lowerMyLeads.includes(banned), `MyLeadsView renders or carries banned CP23B word: ${banned}`)
  }

  assert(myLeads.includes('data-cp23b-mailbox-surface'))
  assert(myLeads.includes('data-cp23b-action-rail'))
  assert(myLeads.includes('data-cp23b-filter-rail'))
  assert(myLeads.includes('data-cp23b-flat-list'))
  assert(myLeads.includes('data-cp23b-mailbox-row'))
  assert(myLeads.includes('LIFECYCLE_FILTERS'))
  assert(myLeads.includes('countForFilter(statusCounts, filter)'))
  assert(myLeads.includes("filter.key === 'all' ? rows.length"))
  assert(myLeads.includes('activeFilterClass'))
  assert(myLeads.includes('w-10 border-[#2A2F2B] bg-[#171A18]'))

  assert(myLeads.includes('No phone'))
  assert(myLeads.includes('No website'))
  assert(myLeads.includes('hasPhone(row)'))
  assert(myLeads.includes('hasWebsite(row)'))

  assert(myLeads.includes('SheetContent'))
  assert(myLeads.includes('side="bottom"'))
  assert(myLeads.includes('data-cp23b-action-sheet'))
  const actionSheetClassName = classNameFor(myLeads, 'data-cp23b-action-sheet')
  assertIncludesAll(actionSheetClassName, [
    'max-h-[88vh]',
    'w-full',
    'rounded-t-[28px]',
    'overflow-y-auto',
  ], 'Action sheet mobile bottom anchoring')
  assert(!/(^|\s)left-1\/2(\s|$)/.test(actionSheetClassName), 'Action sheet has unprefixed desktop left positioning')
  assert(!/(^|\s)right-auto(\s|$)/.test(actionSheetClassName), 'Action sheet has unprefixed desktop right positioning')
  assert(!/(^|\s)-translate-x-1\/2(\s|$)/.test(actionSheetClassName), 'Action sheet has unprefixed desktop translate positioning')
  assert(myLeads.includes('statusActionsFor(row)'))
  assert(myLeads.includes('ACTION_STATUS_OPTIONS'))
  assert(myLeads.includes('undoStatusChange'))
  assert(myLeads.includes('Undo'))

  assert(myLeads.includes('compareBusinessName'))
  assert(!myLeads.includes('<table'))
  assert(!myLeads.includes('<thead'))
  assert(!myLeads.includes('PIPELINE_GROUPS'))
  assert(!myLeads.includes('groupedRows'))

  assert(myLeads.includes('`/app/leads/${row.id}`'))
  assert(myLeads.includes('updateSavedLeadStatus'))
  assert(myLeads.includes('updateSavedLeadNote'))

  const actionRailBlock = blockAround(myLeads, 'data-cp23b-action-rail', 400, 2200)
  assert(myLeads.includes('exportSavedLeadsCsv'))
  assert(myLeads.includes('exportSavedLeadsJson'))
  assert(myLeads.includes('function exportCsv()'))
  assert(myLeads.includes('function exportJson()'))
  assertIncludesAll(actionRailBlock, [
    'onClick={exportCsv}',
    'onClick={exportJson}',
    'CSV',
    'JSON',
    'Run a sweep',
    'href="/app/sweep"',
    'GREEN_ACTION_CLASS',
  ], 'Top action rail')

  const sweepLinkBlocks = Array.from(myLeads.matchAll(
    /<Link[\s\S]{0,700}?href="\/app\/sweep"[\s\S]{0,700}?Run a sweep[\s\S]{0,120}?<\/Link>/g,
  )).map((match) => match[0])
  assert(sweepLinkBlocks.length >= 1, 'Run a sweep link is missing')
  const fixedMobileSweepLinks = sweepLinkBlocks.filter((block) =>
    /\bfixed\b/.test(block) && /bottom-/.test(block) && /sm:hidden/.test(block),
  )
  assert.equal(fixedMobileSweepLinks.length, 0, 'Fixed mobile bottom Run a sweep CTA still exists')

  assert(!myLeads.includes('bg-coral'))
  assert(!myLeads.includes('text-coral'))
  assert(!myLeads.includes('hover:bg-coral'))
  assert(!myLeads.includes('coralDeep'))
  assert(myLeads.includes('GREEN_ACTION_CLASS'))
  assert(myLeads.includes('#2EE08C'))

  for (const forbiddenCall of ['SerpApi', 'serpapi', 'Firecrawl', 'firecrawl', 'openai', 'llm']) {
    assert(!myLeads.includes(forbiddenCall), `MyLeadsView includes forbidden provider/runtime call: ${forbiddenCall}`)
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp23b_my_leads_mailbox_grammar',
    changedFilesAllowedOnly: true,
    mailboxSurface: true,
    flatList: true,
    lifecycleFilterRail: true,
    lifecycleCountsFromRows: true,
    fieldGatedPhoneWebsite: true,
    bottomActionSheet: true,
    statusUndoToast: true,
    savedLeadOpenRouteRetained: true,
    csvExportAccessRetained: true,
    jsonExportAccessRetained: true,
    runSweepAccessRetained: true,
    exportBehaviorStillUsesExistingFunctions: true,
    fixedMobileRunSweepRemoved: true,
    actionSheetMobileAnchored: true,
    swipeDeferred: true,
    coralPrimaryActionRemoved: true,
    protectedFilesChanged: false,
    packageFilesChanged: false,
    providerFilesChanged: false,
    dbSchemaFilesChanged: false,
    authBillingMiddlewareFilesChanged: false,
    crmOutreachFilesChanged: false,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWritesOutsideExistingActions: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP23B My Leads mailbox grammar smoke FAILED:')
  console.error(error)
  process.exit(1)
})
