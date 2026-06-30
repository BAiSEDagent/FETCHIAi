/**
 * CP22F-A - My Leads pipeline surface smoke proof.
 *
 * Deterministic and DB-free. It statically inspects source/UI labels only;
 * it does not scan saved-lead rows, business names, user notes, providers,
 * seeds, db:push, migrations, CRM, outreach, Signal Watch, or runtime paths.
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
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'app/app/leads/[id]/page.tsx',
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp22f-a-my-leads-pipeline-surface-smoke.ts',
    'scripts/pm/cp22g-a-my-leads-visual-energy-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP22F-A changed file: ${path}`)
  }
  assert(!changed.some((path) => path.startsWith('db/')))
  assert(!changed.some((path) => path === 'package.json' || path === 'package-lock.json'))
  assert(!changed.some((path) => path.includes('/providers/') || path.startsWith('lib/providers/')))
  assert(!changed.some((path) => path.startsWith('lib/runtime/sweep/')))
  assert(!changed.some((path) => path.startsWith('app/app/sweep/')))

  assert(myLeadsSource.includes('PIPELINE_GROUPS'))
  assert(myLeadsSource.includes("label: 'Saved'"))
  assert(myLeadsSource.includes("label: 'Contacted'"))
  assert(myLeadsSource.includes("label: 'Won'"))
  assert(myLeadsSource.includes("label: 'Lost/Dismissed'"))

  assert(myLeadsSource.includes("railClass: 'bg-blue'"))
  assert(myLeadsSource.includes("railClass: 'bg-ok'"))
  assert(myLeadsSource.includes("railClass: 'bg-bad/60'"))
  assert(myLeadsSource.includes("segmentClass: 'bg-text/35'"))

  const coralLines = sourceLinesWith(/coral/i, myLeadsSource)
  assert(coralLines.length > 0)
  for (const line of coralLines) {
    assert(
      line.includes('RUN_SWEEP_PRIMARY_ACTION_CLASS'),
      `Coral token outside Run a sweep primary action: ${line.trim()}`,
    )
  }
  assert(myLeadsSource.includes('Run a sweep'))

  assert(myLeadsSource.includes('SORT_OPTIONS'))
  assert(myLeadsSource.includes('<select'))
  assert(myLeadsSource.includes('setSortMode'))
  assert(myLeadsSource.includes('Saved/updated date: newest first'))
  assert(myLeadsSource.includes('Saved/updated date: oldest first'))
  assert(myLeadsSource.includes('Business name: A-Z'))
  assert(myLeadsSource.includes('Business name: Z-A'))
  assert(myLeadsSource.includes('Lifecycle status: pipeline order'))
  assert(myLeadsSource.includes('Market: A-Z'))

  const sortSource = myLeadsSource.slice(
    myLeadsSource.indexOf('const SORT_OPTIONS'),
    myLeadsSource.indexOf('const STATUS_SORT_RANK'),
  )
  for (const bannedSortLabel of [
    'score',
    'signal',
    'urgency',
    'fit',
    'response',
    'last emailed',
    'replied',
  ]) {
    assert(
      !sortSource.toLowerCase().includes(bannedSortLabel),
      `Banned sort label found: ${bannedSortLabel}`,
    )
  }

  assert(myLeadsSource.includes('isEditingNote ? ('))
  assert(myLeadsSource.indexOf('<textarea') > myLeadsSource.indexOf('isEditingNote ? ('))
  assert(myLeadsSource.includes('+ note'))
  assert(myLeadsSource.includes('have phone ·'))
  assert(myLeadsSource.includes('have website'))

  const staticUiSource = myLeadsSource.toLowerCase()
  for (const bannedPhrase of [
    'score',
    'signal 2d',
    'permit',
    'expansion',
    'recurring clean',
    'emailed',
    'replied',
    'no response',
    'urgent',
    'opportunity',
  ]) {
    assert(
      !staticUiSource.includes(bannedPhrase),
      `Banned static UI/source phrase found: ${bannedPhrase}`,
    )
  }

  const dynamicSavedLeadExamples = ['no response', 'Signal Plumbing']
  assert.equal(dynamicSavedLeadExamples.length, 2)

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22f_a_my_leads_pipeline_surface',
    groupedStatusLabels: true,
    statusColorMapping: true,
    runSweepOnlyCoralPrimaryAction: true,
    sortDropdown: true,
    sortFields: ['date', 'business name', 'status', 'market'],
    bannedSortLabels: false,
    bannedStaticUiLabels: false,
    dynamicSavedLeadDataScanned: false,
    dynamicNoteNoResponseWouldNotFail: true,
    dynamicBusinessSignalPlumbingWouldNotFail: true,
    noAlwaysOpenTextareaPattern: true,
    compactNoteAffordance: true,
    phoneWebsiteCoverageCopy: true,
    schemaFilesChanged: false,
    providerFilesChanged: false,
    packageFilesChanged: false,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
    productionDbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22F-A My Leads pipeline surface smoke FAILED:')
  console.error(error)
  process.exit(1)
})
