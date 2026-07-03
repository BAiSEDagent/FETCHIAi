/**
 * CP22G-A - Saved lead detail restoration smoke proof.
 *
 * Deterministic and DB-free. It statically inspects source/UI labels only;
 * it does not scan saved-lead rows, user notes, providers, seeds, db:push,
 * migrations, CRM, outreach, Signal Watch, scoring, or runtime paths.
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

function between(value: string, start: string, end: string): string {
  const startIndex = value.indexOf(start)
  assert(startIndex >= 0, `Missing start marker: ${start}`)
  const endIndex = value.indexOf(end, startIndex)
  assert(endIndex > startIndex, `Missing end marker after ${start}: ${end}`)
  return value.slice(startIndex, endIndex)
}

async function main() {
  const myLeadsSource = source('components/app/MyLeadsView.tsx')
  const leadDetailSource = source('app/app/leads/[id]/page.tsx')
  const changed = changedFiles()
  const allowedChangedFiles = new Set([
    'app/app/leads/[id]/page.tsx',
    'components/app/MyLeadsView.tsx',
    'scripts/pm/cp22f-a-my-leads-pipeline-surface-smoke.ts',
    'scripts/pm/cp22g-a-saved-lead-detail-restoration-smoke.ts',
  ])

  for (const path of changed) {
    assert(allowedChangedFiles.has(path), `Unexpected CP22G-A changed file: ${path}`)
  }

  assert(!changed.some((path) => path === 'replit.md'))
  assert(!changed.some((path) => path === 'FETCHI_CLAUDE_CODE_BRIEF.md'))
  assert(!changed.some((path) => path.startsWith('db/')))
  assert(!changed.some((path) => path === 'package.json' || path === 'package-lock.json'))
  assert(!changed.some((path) => path === 'middleware.ts'))
  assert(!changed.some((path) => path.includes('/providers/') || path.startsWith('lib/providers/')))
  assert(!changed.some((path) => path.startsWith('lib/runtime/sweep/')))
  assert(!changed.some((path) => path.startsWith('app/app/sweep/')))
  assert(!changed.some((path) => path.includes('billing') || path.includes('stripe')))
  assert(!changed.some((path) => path.includes('crm') || path.includes('outreach')))
  assert(!changed.some((path) => path.includes('signal-watch') || path.includes('SignalWatch')))
  assert(!changed.some((path) => path.includes('score') || path.includes('scoring')))

  assert(myLeadsSource.includes('PIPELINE_GROUPS'))
  assert(myLeadsSource.includes('<table'))
  assert(myLeadsSource.includes('exportSavedLeadsCsv'))
  assert(myLeadsSource.includes('exportSavedLeadsJson'))
  assert(myLeadsSource.includes('changeStatus(row'))
  assert(myLeadsSource.includes('startEditingNote(row)'))
  assert(myLeadsSource.includes('href={`/app/leads/${row.id}`}'))
  assert(!myLeadsSource.includes('initialsForName'))
  assert(!myLeadsSource.includes('Status overview'))
  assert(!myLeadsSource.includes('Saved lead card'))

  assert(leadDetailSource.includes('db.query.opportunities.findFirst'))
  assert(leadDetailSource.includes('from(savedLeads)'))
  assert(leadDetailSource.includes('eq(savedLeads.workspaceId, ctx.workspaceId)'))
  assert(leadDetailSource.includes('eq(savedLeads.id, id)'))
  assert(leadDetailSource.includes('if (savedLead) return <SavedLeadDetailState savedLead={savedLead} />'))
  assert(leadDetailSource.indexOf('db.query.opportunities.findFirst') < leadDetailSource.indexOf('from(savedLeads)'))

  const savedLeadFallback = between(
    leadDetailSource,
    'function SavedLeadDetailState',
    'function LeadNotFoundState',
  )

  for (const required of [
    'Saved lead detail',
    'Contact coverage',
    'Saved lead fields',
    'User note',
    'savedLead.businessName',
    'savedLead.lifecycleStatus',
    'savedLead.category',
    'savedLead.phone',
    'savedLead.website',
    'savedLead.address',
    'savedLead.market',
    'savedLead.source',
    'savedLead.savedAt',
    'savedLead.updatedAt',
    'savedLead.note',
  ]) {
    assert(savedLeadFallback.includes(required), `Saved-lead fallback missing: ${required}`)
  }

  const fallbackUi = savedLeadFallback.toLowerCase()
  for (const bannedPhrase of [
    'score',
    'signal',
    'freshness',
    'urgent',
    'urgency',
    'responded',
    'opportunity',
    'outreach',
    'evidence',
    'why now',
    'best contact',
    'confidence',
    'auto email',
    'call history',
    'voicemail',
  ]) {
    assert(
      !fallbackUi.includes(bannedPhrase),
      `Banned saved-lead fallback phrase found: ${bannedPhrase}`,
    )
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22g_a_saved_lead_detail_restoration',
    visualRedesignRemoved: true,
    myLeadsPipelineSurfacePreserved: true,
    savedLeadRowsLinkToDetail: true,
    opportunityDetailPreservedFirst: true,
    savedLeadFallbackUsesSavedLeadFieldsOnly: true,
    noNewRoute: true,
    bannedFallbackUiLabels: false,
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
  console.error('CP22G-A saved lead detail restoration smoke FAILED:')
  console.error(error)
  process.exit(1)
})
