/**
 * CP22D-A - Sweep saved-lead memory smoke proof.
 *
 * Deterministic and DB-free. It does not call SerpApi, Firecrawl, LLMs,
 * seeds, db:push, migrations, CRM, outreach, or provider paths.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildSweepLeadDedupeKey,
  type SweepLead,
} from '@/lib/runtime/sweep'
import {
  annotateSweepLeadsWithSavedMemory,
  prepareSavedLeadValuesForSave,
  savedLeadMemoryUnavailable,
  splitSweepLeadsBySavedMemory,
} from '@/lib/runtime/sweep/saved-leads'

function lead(input: Partial<SweepLead> & Pick<SweepLead, 'id' | 'businessName' | 'phone'>): SweepLead {
  return {
    website: null,
    address: null,
    market: 'Denver, CO',
    source: 'Google Maps',
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
    category: 'Restaurant',
    latitude: null,
    longitude: null,
    email: null,
    owner: null,
    hook: null,
    ...input,
  }
}

async function main() {
  const savedDedupeKey = buildSweepLeadDedupeKey({
    businessName: 'Alpha Bistro LLC',
    phone: '(303) 555-0101',
  })
  assert(savedDedupeKey)
  assert.equal(
    savedDedupeKey,
    buildSweepLeadDedupeKey({
      businessName: 'Alpha Bistro',
      phone: '303.555.0101',
    }),
  )

  const sweepLeads = [
    lead({
      id: 'alpha-result',
      businessName: 'Alpha Bistro',
      phone: '303-555-0101',
    }),
    lead({
      id: 'beta-result',
      businessName: 'Beta Cafe',
      phone: '(303) 555-0202',
    }),
  ]

  const annotated = annotateSweepLeadsWithSavedMemory(sweepLeads, [{
    dedupeKey: savedDedupeKey,
    lifecycleStatus: 'contacted',
  }])

  const savedLead = annotated.leads.find((item) => item.id === 'alpha-result')
  const newLead = annotated.leads.find((item) => item.id === 'beta-result')
  assert(savedLead)
  assert(newLead)
  assert.equal(savedLead.alreadySaved, true)
  assert.equal(savedLead.savedLeadStatus, 'contacted')
  assert.equal(newLead.alreadySaved, false)
  assert.equal(newLead.savedLeadStatus, null)
  assert.equal(annotated.savedMemory.available, true)
  assert.equal(annotated.savedMemory.totalFound, 2)
  assert.equal(annotated.savedMemory.alreadySavedCount, 1)
  assert.equal(annotated.savedMemory.newLeadCount, 1)

  const saveAllSplit = splitSweepLeadsBySavedMemory(annotated.leads)
  assert.equal(saveAllSplit.alreadySavedCount, 1)
  assert.equal(saveAllSplit.alreadySavedLeads[0]?.id, 'alpha-result')
  assert.equal(saveAllSplit.leadsToSave.length, 1)
  assert.equal(saveAllSplit.leadsToSave[0]?.id, 'beta-result')

  const saveSelectedSplit = splitSweepLeadsBySavedMemory([
    annotated.leads[0]!,
    annotated.leads[1]!,
  ])
  assert.equal(saveSelectedSplit.alreadySavedCount, 1)
  assert.deepEqual(saveSelectedSplit.leadsToSave.map((item) => item.id), ['beta-result'])

  const preparedSaveAll = prepareSavedLeadValuesForSave({
    sourceSweepRef: 'cp22d-a-smoke',
    leads: saveAllSplit.leadsToSave,
  }, {
    workspaceId: 'workspace-smoke',
    userId: 'user-smoke',
  })
  assert.equal(preparedSaveAll.attempted, 1)
  assert.equal(preparedSaveAll.values.length, 1)
  assert.equal(preparedSaveAll.values[0]?.businessName, 'Beta Cafe')

  const duplicateInputProof = prepareSavedLeadValuesForSave({
    sourceSweepRef: 'cp22d-a-smoke',
    leads: [
      lead({
        id: 'beta-a',
        businessName: 'Beta Cafe LLC',
        phone: '(303) 555-0202',
        email: 'owner@beta.invalid',
      }),
      lead({
        id: 'beta-b',
        businessName: 'Beta Cafe',
        phone: '303.555.0202',
        website: 'https://beta.invalid/',
      }),
    ],
  }, {
    workspaceId: 'workspace-smoke',
    userId: 'user-smoke',
  })
  assert.equal(duplicateInputProof.duplicateInputCount, 1)
  assert.equal(duplicateInputProof.values.length, 1)
  assert.equal(duplicateInputProof.values[0]?.email, 'owner@beta.invalid')
  assert.equal(duplicateInputProof.values[0]?.website, 'https://beta.invalid/')

  const unavailable = savedLeadMemoryUnavailable(sweepLeads)
  assert.equal(unavailable.savedMemory.available, false)
  assert.equal(unavailable.savedMemory.alreadySavedCount, 0)
  assert.equal(unavailable.savedMemory.newLeadCount, 2)
  assert.equal(unavailable.leads.every((item) => item.alreadySaved === false), true)

  const savedLeadsSource = readFileSync('lib/runtime/sweep/saved-leads.ts', 'utf8')
  const memoryLookupSource = savedLeadsSource.slice(
    savedLeadsSource.indexOf('export async function annotateSweepLeadsWithSavedMemoryForWorkspace'),
    savedLeadsSource.indexOf('export async function saveSweepLeadsForWorkspace'),
  )
  assert(memoryLookupSource.includes('eq(savedLeads.workspaceId, workspaceId)'))
  assert(memoryLookupSource.includes('inArray(savedLeads.dedupeKey, dedupeKeys)'))
  assert(memoryLookupSource.includes('.select({'))
  assert(!memoryLookupSource.includes('.insert('))
  assert(!memoryLookupSource.includes('.update('))
  assert(!memoryLookupSource.includes('.delete('))

  const sweepActionsSource = readFileSync('app/app/sweep/actions.ts', 'utf8')
  const runSweepSource = sweepActionsSource.slice(
    sweepActionsSource.indexOf('export async function runSweep'),
    sweepActionsSource.indexOf('export async function enrichSweep'),
  )
  assert(runSweepSource.includes('const ctx = await requireWorkspaceContext()'))
  assert(runSweepSource.includes('annotateSweepLeadsWithSavedMemoryForWorkspace(sweepResult.leads, ctx.workspaceId)'))
  assert(!runSweepSource.includes('annotateSweepLeadsWithSavedMemoryForWorkspace(sweepResult.leads, userId)'))

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22d_a_sweep_saved_lead_memory',
    matchingLeadMarkedAlreadySaved: savedLead.alreadySaved === true,
    savedLifecycleStatusCarried: savedLead.savedLeadStatus === 'contacted',
    nonMatchingLeadIsNew: newLead.alreadySaved === false,
    saveAllFiltersAlreadySaved: saveAllSplit.leadsToSave.length === 1
      && saveAllSplit.alreadySavedCount === 1,
    saveSelectedFiltersAlreadySaved: saveSelectedSplit.leadsToSave.length === 1
      && saveSelectedSplit.alreadySavedCount === 1,
    skippedAlreadySavedCount: saveSelectedSplit.alreadySavedCount,
    existingSavedLeadUpsertIdempotencyPreserved: duplicateInputProof.duplicateInputCount === 1,
    workspaceScopedLookup: true,
    runSweepPassesWorkspaceIdToMemoryLookup: true,
    lookupUsesExistingDedupeKey: true,
    savedMemoryUnavailableDoesNotCrash: unavailable.savedMemory.available === false,
    providerCalls: 0,
    serpApiCalls: 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
    productionDbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22D-A saved lead memory smoke FAILED:')
  console.error(error)
  process.exit(1)
})
