/**
 * CP22A - Sweep Stroke 1 smoke proof.
 *
 * Covers deterministic market planning, SerpApi Maps normalization, quiet
 * garbage filtering, dedupe, export shape, call ceiling behavior, and missing
 * SERPAPI_KEY handling. If SERPAPI_KEY is present it also runs a bounded live
 * Maps proof. It does not call Firecrawl, LLMs, DB writes, migrations, seeds,
 * CRM, outreach, or scheduler paths.
 */

import assert from 'node:assert/strict'
import {
  CP22A_DEFAULT_MAX_SERPAPI_CALLS,
  buildSweepQueries,
  dedupeSweepLeads,
  exportSweepCsv,
  exportSweepJson,
  interpretSweepMarket,
  normalizeSerpApiMapsResults,
  planSerpApiMapsCalls,
  runSerpApiMapsSweep,
  type SerpApiMapsPayload,
} from '@/lib/runtime/sweep'

const sampleMapsPayload: SerpApiMapsPayload = {
  local_results: [
    {
      position: 1,
      title: 'Bluebird Cafe',
      phone: '(303) 555-0101',
      website: 'https://bluebird.example.com/',
      address: '1200 Larimer St, Denver, CO 80202',
      type: 'Restaurant',
    },
    {
      position: 2,
      title: 'Bluebird Cafe',
      phone: '303-555-0101',
      website: 'https://www.bluebird.example.com/menu',
      address: '1200 Larimer Street, Denver, CO 80202',
      type: 'Restaurant',
    },
    {
      position: 3,
      title: 'Project Number:TABS2026000001 Facility Name:Bad Field Salad',
      phone: '(303) 555-9999',
      website: 'https://bad.example.com',
      address: '300 Data Mixup Ave, Denver, CO',
      type: 'Restaurant',
    },
    {
      position: 4,
      title: 'No Site Diner',
      phone: '(303) 555-3333',
      address: '444 Missing Site Rd, Denver, CO',
      type: 'Restaurant',
    },
    {
      position: 5,
      title: 'Invalid Site Grill',
      phone: '(303) 555-4444',
      website: 'not a url',
      address: '555 Broken Url Rd, Denver, CO',
      type: 'Restaurant',
    },
    {
      position: 6,
      title: 'Clean Plate Bistro',
      phone: '(720) 555-0202',
      website: 'https://cleanplate.example.com',
      address: '600 Market St, Denver, CO',
      type: 'Restaurant',
    },
  ],
}

async function main() {
  const city = interpretSweepMarket('Denver, CO')
  assert.equal(city.kind, 'city_metro')
  assert.deepEqual(city.markets, ['Denver, CO'])

  const texas = interpretSweepMarket('Texas')
  assert.equal(texas.kind, 'state')
  assert.deepEqual(texas.markets, ['Houston', 'Dallas-Fort Worth', 'Austin', 'San Antonio'])

  const national = interpretSweepMarket('nationwide')
  assert.equal(national.kind, 'nationwide')
  assert.equal(national.markets.length, 10)
  assert(national.markets.includes('Denver'))

  const queries = buildSweepQueries({
    service: 'commercial cleaning',
    icp: 'restaurants',
    market: 'Denver, CO',
  })
  assert.deepEqual(queries, [
    'restaurants Denver, CO',
    'restaurants near Denver, CO',
    'commercial cleaning for restaurants Denver, CO',
    'restaurants businesses Denver, CO',
  ])

  const planned = planSerpApiMapsCalls({
    service: 'dumpster rental',
    icp: 'tenant improvement contractors',
    market: 'nationwide',
  })
  assert(planned.length <= CP22A_DEFAULT_MAX_SERPAPI_CALLS)
  assert(planned.length > 10)
  assert(planned.every((call) => call.engine === 'google_maps'))

  const normalized = normalizeSerpApiMapsResults({
    payload: sampleMapsPayload,
    market: 'Denver, CO',
    query: 'restaurants Denver, CO',
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
  })
  assert.equal(normalized.length, 3)
  assert(normalized.every((lead) => lead.businessName && lead.phone && lead.website && lead.address))
  assert(!normalized.some((lead) => /project number|facility name/i.test(lead.businessName)))

  const deduped = dedupeSweepLeads(normalized)
  assert.equal(deduped.length, 2)
  assert.deepEqual(deduped.map((lead) => lead.businessName), ['Bluebird Cafe', 'Clean Plate Bistro'])

  const csv = exportSweepCsv(deduped)
  assert(csv.startsWith('business,website,phone,address,market,source,email,owner,hook'))
  assert(csv.includes('Bluebird Cafe'))

  const json = exportSweepJson(deduped)
  const parsed = JSON.parse(json) as unknown[]
  assert.equal(parsed.length, 2)

  const missingKey = await runSerpApiMapsSweep({
    service: 'commercial cleaning',
    icp: 'restaurants',
    market: 'Denver, CO',
    apiKey: '',
    maxCalls: 2,
  })
  assert.equal(missingKey.ok, false)
  assert.equal(missingKey.error?.code, 'missing_serpapi_key')
  assert.equal(missingKey.stats.queriesRun, 0)

  let liveProof: null | {
    ok: boolean
    rawScanned: number
    exportCount: number
    providerCalls: number
    firstLeadHasPhoneWebsiteAddress: boolean
  } = null

  const liveApiKey = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY
  if (liveApiKey) {
    const live = await runSerpApiMapsSweep({
      service: 'commercial cleaning',
      icp: 'restaurants',
      market: 'Denver, CO',
      apiKey: liveApiKey,
      maxCalls: 4,
      maxPagesPerQuery: 1,
      concurrency: 2,
    })
    assert.equal(live.ok, true)
    assert(live.stats.rawScanned > 0)
    assert(live.stats.queriesRun > 0)
    assert(live.stats.queriesRun <= 4)
    assert(live.stats.exportCount === live.leads.length)
    assert(live.leads.every((lead) => lead.businessName && lead.phone && lead.website && lead.address))
    liveProof = {
      ok: live.ok,
      rawScanned: live.stats.rawScanned,
      exportCount: live.stats.exportCount,
      providerCalls: live.stats.queriesRun,
      firstLeadHasPhoneWebsiteAddress: Boolean(
        live.leads[0]?.phone && live.leads[0]?.website && live.leads[0]?.address,
      ),
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22a_sweep_serpapi_maps',
    cityMarket: city,
    texasMarket: texas,
    nationwideMarkets: national.markets.length,
    plannedNationwideCalls: planned.length,
    normalizedRows: normalized.length,
    dedupedRows: deduped.length,
    csvHeader: csv.split('\n')[0],
    jsonRows: parsed.length,
    missingSerpApiKeyHandled: true,
    liveSerpApiMapsProof: liveProof ?? 'blocked_missing_serpapi_key',
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22A sweep smoke FAILED:')
  console.error(error)
  process.exit(1)
})
