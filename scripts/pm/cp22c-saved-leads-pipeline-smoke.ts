/**
 * CP22C - DB-backed saved Sweep leads pipeline foundation smoke proof.
 *
 * Default mode is deterministic and DB-free. It does not call SerpApi,
 * Firecrawl, LLMs, seeds, db:push, CRM, outreach, scheduler, or provider
 * paths. Optional DB proof runs only when CP22C_NEON_DATABASE_URL is present
 * and CP22C_ALLOW_DB_PUSH=1.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import {
  buildSweepLeadDedupeKey,
  type SweepLead,
} from '@/lib/runtime/sweep'
import {
  exportSavedLeadsCsv,
  exportSavedLeadsJson,
  type SavedLeadPipelineExportRow,
} from '@/lib/runtime/sweep/export'
import {
  isSavedLeadLifecycleStatus,
  mergeSavedLeadSnapshotsPreservingExisting,
  prepareSavedLeadValuesForSave,
  saveSweepLeadsForWorkspace,
  type SavedLeadMergeSnapshot,
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

async function optionalDbProof() {
  const safeUrl = process.env.CP22C_NEON_DATABASE_URL
  const allowed = process.env.CP22C_ALLOW_DB_PUSH === '1'
  if (!safeUrl || !allowed) {
    return {
      status: 'skipped_missing_cp22c_neon_database_url_or_allow_flag',
    }
  }

  process.env.DATABASE_URL = safeUrl
  const { db, savedLeads, workspaceSettings } = await import('@/db')
  const workspaceId = `cp22c-smoke-${Date.now()}`
  const userId = `${workspaceId}-user`

  try {
    await db.insert(workspaceSettings).values({
      workspaceId,
      ownerUserId: userId,
      businessName: 'CP22C Smoke Workspace',
      isApproved: true,
      onboardingStep: 4,
    }).onConflictDoNothing({ target: workspaceSettings.workspaceId })

    const first = await saveSweepLeadsForWorkspace({
      sourceSweepRef: 'cp22c-smoke',
      leads: [
        lead({
          id: 'db-alpha',
          businessName: 'DB Alpha Bistro LLC',
          phone: '(303) 555-8001',
          email: 'owner@db-alpha.invalid',
          owner: 'Alex Owner',
        }),
        lead({
          id: 'db-beta',
          businessName: 'DB Beta Cafe',
          phone: '(303) 555-8002',
        }),
      ],
    }, { workspaceId, userId })
    assert.equal(first.ok, true)
    assert.equal(first.savedNew, 2)

    const duplicate = await saveSweepLeadsForWorkspace({
      sourceSweepRef: 'cp22c-smoke-duplicate',
      leads: [
        lead({
          id: 'db-alpha-dupe',
          businessName: 'DB Alpha Bistro',
          phone: '303-555-8001',
          email: null,
          owner: null,
          hook: null,
        }),
      ],
    }, { workspaceId, userId })
    assert.equal(duplicate.ok, true)
    assert.equal(duplicate.alreadySaved, 1)

    const alphaKey = buildSweepLeadDedupeKey({
      businessName: 'DB Alpha Bistro',
      phone: '303-555-8001',
    })
    assert(alphaKey)
    const alphaRows = await db
      .select()
      .from(savedLeads)
      .where(eq(savedLeads.dedupeKey, alphaKey))
    const scopedAlphaRows = alphaRows.filter((row) => row.workspaceId === workspaceId)
    assert.equal(scopedAlphaRows.length, 1)
    assert.equal(scopedAlphaRows[0]?.email, 'owner@db-alpha.invalid')
    assert.equal(scopedAlphaRows[0]?.owner, 'Alex Owner')

    return {
      status: 'passed',
      targetVariable: 'CP22C_NEON_DATABASE_URL',
      insertedRows: first.savedNew,
      duplicateRowsForAlpha: scopedAlphaRows.length,
      nullPreservingEmailKept: scopedAlphaRows[0]?.email === 'owner@db-alpha.invalid',
    }
  } finally {
    await db.delete(savedLeads).where(eq(savedLeads.workspaceId, workspaceId))
    await db.delete(workspaceSettings).where(eq(workspaceSettings.workspaceId, workspaceId))
  }
}

async function main() {
  const alphaA = buildSweepLeadDedupeKey({
    businessName: 'Alpha Bistro LLC',
    phone: '(303) 555-0101',
  })
  const alphaB = buildSweepLeadDedupeKey({
    businessName: 'Alpha Bistro',
    phone: '303.555.0101',
  })
  const invalid = buildSweepLeadDedupeKey({
    businessName: 'No Phone Cafe',
    phone: '',
  })
  assert(alphaA)
  assert.equal(alphaA, alphaB)
  assert.equal(invalid, null)

  const prepared = prepareSavedLeadValuesForSave({
    sourceSweepRef: 'service | restaurants | Denver, CO',
    leads: [
      lead({
        id: 'alpha',
        businessName: 'Alpha Bistro LLC',
        phone: '(303) 555-0101',
        email: 'hello@alpha.invalid',
        owner: 'Maria Lopez',
        hook: 'Private dining listed on the website.',
      }),
      lead({
        id: 'alpha-duplicate',
        businessName: 'Alpha Bistro',
        phone: '303-555-0101',
        email: null,
        owner: null,
        hook: null,
        website: 'https://alpha.invalid/',
      }),
      lead({
        id: 'invalid',
        businessName: 'Invalid Lead',
        phone: '',
      }),
    ],
  }, {
    workspaceId: 'workspace-smoke',
    userId: 'user-smoke',
  })
  assert.equal(prepared.attempted, 3)
  assert.equal(prepared.values.length, 1)
  assert.equal(prepared.duplicateInputCount, 1)
  assert.equal(prepared.skippedInvalid, 1)
  assert.equal(prepared.values[0]?.email, 'hello@alpha.invalid')
  assert.equal(prepared.values[0]?.owner, 'Maria Lopez')
  assert.equal(prepared.values[0]?.website, 'https://alpha.invalid/')

  const existing: SavedLeadMergeSnapshot = {
    lifecycleStatus: 'saved',
    dismissedAt: null,
    email: 'hello@alpha.invalid',
    owner: 'Maria Lopez',
    hook: 'Existing hook',
    website: 'https://alpha.invalid/',
    address: '100 Main St',
    latitude: 39.7392,
    longitude: -104.9903,
    category: 'Restaurant',
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
    market: 'Denver, CO',
  }
  const incomingNulls: SavedLeadMergeSnapshot = {
    lifecycleStatus: 'saved',
    dismissedAt: null,
    email: null,
    owner: null,
    hook: null,
    website: null,
    address: null,
    latitude: null,
    longitude: null,
    category: null,
    sourceUrl: null,
    market: null,
  }
  const merged = mergeSavedLeadSnapshotsPreservingExisting(existing, incomingNulls)
  assert.equal(merged.email, 'hello@alpha.invalid')
  assert.equal(merged.owner, 'Maria Lopez')
  assert.equal(merged.hook, 'Existing hook')
  assert.equal(merged.website, 'https://alpha.invalid/')
  assert.equal(merged.latitude, 39.7392)

  const dismissed = mergeSavedLeadSnapshotsPreservingExisting({
    ...existing,
    lifecycleStatus: 'dismissed',
    dismissedAt: '2026-06-24T00:00:00.000Z',
  }, {
    ...existing,
    lifecycleStatus: 'saved',
    dismissedAt: null,
    email: null,
  })
  assert.equal(dismissed.lifecycleStatus, 'dismissed')
  assert.equal(dismissed.dismissedAt, '2026-06-24T00:00:00.000Z')

  assert.equal(isSavedLeadLifecycleStatus('saved'), true)
  assert.equal(isSavedLeadLifecycleStatus('contacted'), true)
  assert.equal(isSavedLeadLifecycleStatus('won'), true)
  assert.equal(isSavedLeadLifecycleStatus('lost'), true)
  assert.equal(isSavedLeadLifecycleStatus('dismissed'), true)
  assert.equal(isSavedLeadLifecycleStatus('responded'), false)
  assert.equal(isSavedLeadLifecycleStatus('new'), false)

  const schemaSource = readFileSync('db/schema.ts', 'utf8')
  assert(schemaSource.includes("pgEnum('saved_lead_lifecycle_status'"))
  assert(schemaSource.includes("pgTable('saved_leads'"))
  assert(schemaSource.includes("references(() => workspaceSettings.workspaceId)"))
  assert(schemaSource.includes("uniqueIndex('saved_leads_workspace_dedupe_unique')"))
  assert(schemaSource.includes("doublePrecision('latitude')"))

  const savedLeadsSource = readFileSync('lib/runtime/sweep/saved-leads.ts', 'utf8')
  const saveFunctionSource = savedLeadsSource.slice(
    savedLeadsSource.indexOf('export async function saveSweepLeadsForWorkspace'),
    savedLeadsSource.indexOf('function identityFilter'),
  )
  assert(saveFunctionSource.includes('.onConflictDoUpdate({'))
  assert(saveFunctionSource.includes('target: [savedLeads.workspaceId, savedLeads.dedupeKey]'))
  assert(saveFunctionSource.includes('coalesce(${savedLeads.email}, excluded.email)'))
  assert(saveFunctionSource.includes('coalesce(${savedLeads.owner}, excluded.owner)'))
  assert(saveFunctionSource.includes('coalesce(${savedLeads.hook}, excluded.hook)'))
  assert(!saveFunctionSource.includes('findFirst'))
  assert(!saveFunctionSource.includes('.select('))
  assert(!/runSerpApi|Firecrawl|OpenAI|Anthropic|provider/i.test(savedLeadsSource))

  const exportRows: SavedLeadPipelineExportRow[] = [{
    businessName: 'Alpha Bistro',
    website: 'https://alpha.invalid/',
    phone: '(303) 555-0101',
    address: '100 Main St',
    market: 'Denver, CO',
    source: 'Google Maps',
    latitude: 39.7392,
    longitude: -104.9903,
    email: 'hello@alpha.invalid',
    owner: 'Maria Lopez',
    hook: 'Private dining listed on the website.',
    lifecycleStatus: 'contacted',
    note: 'Follow up Monday.',
  }]
  const csv = exportSavedLeadsCsv(exportRows)
  const csvHeader = csv.split('\n')[0]
  assert.equal(
    csvHeader,
    'business,website,phone,address,market,source,latitude,longitude,email,owner,hook,status,note',
  )
  assert(csv.includes('contacted'))
  assert(csv.includes('Follow up Monday.'))

  const json = exportSavedLeadsJson(exportRows)
  const parsed = JSON.parse(json) as Array<{ business: string; status: string; note: string }>
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0]?.business, 'Alpha Bistro')
  assert.equal(parsed[0]?.status, 'contacted')
  assert.equal(parsed[0]?.note, 'Follow up Monday.')

  const dbProof = await optionalDbProof()

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22c_saved_leads_pipeline_foundation',
    dedupeKeyStable: alphaA === alphaB,
    skippedInvalid: prepared.skippedInvalid,
    duplicateSaveUsesSameKey: prepared.duplicateInputCount === 1,
    atomicUpsertPath: true,
    readBeforeWriteDuplicateCheck: false,
    nullPreservingMerge: true,
    lifecycleEnumInSchema: true,
    dismissedPreservedAsKnown: true,
    saveResultPreservesAttemptedCount: prepared.attempted === 3,
    savedLeadExportCsvHeader: csvHeader,
    providerCalls: 0,
    llmCalls: 0,
    dbProof,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22C saved leads pipeline smoke FAILED:')
  console.error(error)
  process.exit(1)
})
