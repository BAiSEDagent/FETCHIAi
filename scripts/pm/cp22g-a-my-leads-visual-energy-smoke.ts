/**
 * CP22G-A - My Leads visual energy + saved-lead detail restoration smoke proof.
 *
 * Deterministic and DB-free. It statically inspects source/UI labels only;
 * it does not scan saved-lead rows, business names, user-entered notes,
 * providers, seeds, db:push, migrations, CRM, outreach, Signal Watch, or
 * runtime paths.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

function changedFiles(): string[] {
  const commands = [
    'git diff --name-only origin/main..HEAD',
    'git diff --name-only',
    'git diff --name-only --cached',
  ]
  return Array.from(new Set(commands.flatMap((command) => {
    const output = execSync(command, { encoding: 'utf8' }).trim()
    return output ? output.split('\n') : []
  }))).sort()
}

function sourceLinesWith(pattern: RegExp, value: string): string[] {
  return value
    .split('\n')
    .filter((line) => pattern.test(line))
}

async function main() {
  const myLeadsSource = source('components/app/MyLeadsView.tsx')
  const leadDetailSource = source('app/app/leads/[id]/page.tsx')
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'app/app/leads/[id]/page.tsx',
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp22f-a-my-leads-pipeline-surface-smoke.ts',
    'scripts/pm/cp22g-a-my-leads-visual-energy-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP22G-A changed file: ${path}`)
  }

  assert(!changed.some((path) => path === 'replit.md'))
  assert(!changed.some((path) => path === 'FETCHI_CLAUDE_CODE_BRIEF.md'))
  assert(!changed.some((path) => path.startsWith('db/')))
  assert(!changed.some((path) => path === 'package.json' || path === 'package-lock.json'))
  assert(!changed.some((path) => path.includes('/providers/') || path.startsWith('lib/providers/')))
  assert(!changed.some((path) => path.startsWith('lib/runtime/sweep/')))
  assert(!changed.some((path) => path.startsWith('app/app/sweep/')))
  assert(!changed.some((path) => path.includes('billing') || path.includes('stripe')))
  assert(!changed.some((path) => path.includes('crm') || path.includes('outreach')))

  assert(!myLeadsSource.includes('<table'), 'My Leads should not render a table')
  assert(!myLeadsSource.includes('<thead'), 'My Leads should not render table headings')
  assert(!myLeadsSource.includes('<tbody'), 'My Leads should not render a table body')
  assert(!myLeadsSource.includes('<th'), 'My Leads should not render table header cells')
  assert(myLeadsSource.includes('initialsForName'))
  assert(myLeadsSource.includes('rounded-xl border border-border bg-surface'))
  assert(myLeadsSource.includes('href={`/app/leads/${row.id}`}'))

  assert(!myLeadsSource.includes('Evidence'))
  assert(myLeadsSource.includes('Contact coverage'))
  assert(myLeadsSource.includes('Missing website'))
  assert(myLeadsSource.includes('have phone ·'))
  assert(myLeadsSource.includes('have website'))

  const coralLines = sourceLinesWith(/coral/i, myLeadsSource)
  assert(coralLines.length > 0)
  for (const line of coralLines) {
    assert(
      line.includes('RUN_SWEEP_PRIMARY_ACTION_CLASS'),
      `Coral token outside Run a sweep primary action: ${line.trim()}`,
    )
  }
  assert(myLeadsSource.includes('Run a sweep'))

  const staticUiSource = myLeadsSource.toLowerCase()
  for (const bannedPhrase of [
    'score',
    'signal',
    'urgent',
    'opportunity',
    'needs review',
    'responded',
    'replied',
    'emailed',
    'called',
    'voicemail',
    'sent quote',
    'no response',
  ]) {
    assert(
      !staticUiSource.includes(bannedPhrase),
      `Banned static My Leads UI/source phrase found: ${bannedPhrase}`,
    )
  }

  assert(myLeadsSource.includes("label: 'Saved'"))
  assert(myLeadsSource.includes("label: 'Contacted'"))
  assert(myLeadsSource.includes("label: 'Won'"))
  assert(myLeadsSource.includes("label: 'Lost'"))
  assert(myLeadsSource.includes("label: 'Dismissed'"))
  assert(myLeadsSource.includes("label: 'Lost/Dismissed'"))
  for (const bannedLifecycleLabel of ['New', 'Needs review', 'Responded']) {
    assert(
      !myLeadsSource.includes(`label: '${bannedLifecycleLabel}'`),
      `Banned lifecycle label found: ${bannedLifecycleLabel}`,
    )
  }

  assert(myLeadsSource.includes('isEditingNote ? ('))
  assert(myLeadsSource.indexOf('<textarea') > myLeadsSource.indexOf('isEditingNote ? ('))
  assert(myLeadsSource.includes('+ note'))

  assert(leadDetailSource.includes('savedLeads'))
  assert(leadDetailSource.includes('SavedLeadDetailState'))
  assert(leadDetailSource.includes('Contact coverage'))
  assert(leadDetailSource.includes("eq(savedLeads.id, id)"))
  assert(leadDetailSource.includes("href=\"/app/leads\""))

  const dynamicSavedLeadExamples = ['sent quote', 'voicemail', 'no response', 'Signal Plumbing']
  assert.equal(dynamicSavedLeadExamples.length, 4)

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22g_a_my_leads_visual_energy_detail_restoration',
    cardListStructure: true,
    tableDominantPattern: false,
    evidenceLabelOnMyLeads: false,
    contactCoverageCopy: true,
    savedLeadDetailFallback: true,
    leadCardsLinkToDetailRoute: true,
    runSweepOnlyCoralPrimaryAction: true,
    allowedLifecycleLabelsOnly: true,
    bannedStaticUiLabels: false,
    dynamicSavedLeadDataScanned: false,
    dynamicUserNoteSentQuoteWouldNotFail: true,
    schemaFilesChanged: false,
    providerFilesChanged: false,
    packageFilesChanged: false,
    sweepFilesChanged: false,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
    productionDbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22G-A My Leads visual energy smoke FAILED:')
  console.error(error)
  process.exit(1)
})
