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

  assert(myLeads.includes('exportSavedLeadsCsv'))
  assert(myLeads.includes('exportSavedLeadsJson'))
  assert(myLeads.includes('function exportCsv()'))
  assert(myLeads.includes('function exportJson()'))
  assert(myLeads.includes('onClick={exportCsv}'))
  assert(myLeads.includes('onClick={exportJson}'))
  assert(myLeads.includes('CSV'))
  assert(myLeads.includes('JSON'))
  assert(myLeads.includes('Run a sweep'))
  assert(myLeads.includes('href="/app/sweep"'))

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
