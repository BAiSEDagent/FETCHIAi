/**
 * CP22A.1 - Sweep abundance patch smoke proof.
 *
 * Covers dataset-driven market planning, SerpApi Maps normalization with phone
 * as the contact floor, quiet garbage filtering, richer-row dedupe, export
 * shape, call ceiling behavior, and missing SERPAPI_KEY handling. If
 * SERPAPI_KEY is present it also runs a bounded live Maps proof. It does not
 * call Firecrawl, LLMs, DB writes, migrations, seeds, CRM, outreach, or
 * scheduler paths.
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
  type SweepLead,
} from '@/lib/runtime/sweep'
import { US_SWEEP_CITIES, US_SWEEP_CITY_DATASET } from '@/lib/runtime/sweep/us-cities'

const sampleMapsPayload: SerpApiMapsPayload = {
  local_results: [
    {
      position: 1,
      title: 'Bluebird Cafe',
      phone: '(303) 555-0101',
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
      title: 'Service Area Cleaners',
      phone: '(303) 555-5555',
      website: 'service-area.example.com',
      type: 'Cleaning service',
    },
    {
      position: 6,
      title: 'Phone Only Shop',
      phone: '(303) 555-6666',
      type: 'Retail',
    },
    {
      position: 7,
      title: 'No Phone Deli',
      website: 'https://nophone.example.com',
      address: '777 Quiet Drop Rd, Denver, CO',
      type: 'Restaurant',
    },
    {
      position: 8,
      title: 'Invalid Site Grill',
      phone: '(303) 555-4444',
      website: 'not a url',
      address: '555 Broken Url Rd, Denver, CO',
      type: 'Restaurant',
    },
    {
      position: 9,
      title: 'Clean Plate Bistro',
      phone: '(720) 555-0202',
      website: 'https://cleanplate.example.com',
      address: '600 Market St, Denver, CO',
      type: 'Restaurant',
    },
    {
      position: 10,
      title: 'Bluebird Cafe',
      phone: '(303) 555-0102',
      website: 'https://bluebird.example.com/events',
      address: '1200 Larimer Street, Denver, CO 80202',
      type: 'Restaurant',
    },
  ],
}

function phoneKey(lead: SweepLead): string {
  return lead.phone.replace(/\D/g, '')
}

async function main() {
  const datasetStates = new Set(US_SWEEP_CITIES.map((city) => city.stateId))
  assert.equal(US_SWEEP_CITY_DATASET.rowCount, US_SWEEP_CITIES.length)
  assert(US_SWEEP_CITIES.length >= 500 && US_SWEEP_CITIES.length <= 1000)
  assert.equal(datasetStates.size, 51)
  assert(datasetStates.has('WY'))
  assert(datasetStates.has('DC'))

  const city = interpretSweepMarket('Denver, CO')
  assert.equal(city.kind, 'city_metro')
  assert.deepEqual(city.markets, ['Denver, CO'])

  const texas = interpretSweepMarket('Texas')
  assert.equal(texas.kind, 'state')
  assert.deepEqual(texas.markets, [
    'Houston, TX',
    'San Antonio, TX',
    'Dallas, TX',
    'Fort Worth, TX',
    'Austin, TX',
  ])

  const georgia = interpretSweepMarket('Georgia')
  assert.equal(georgia.kind, 'state')
  assert.equal(georgia.markets.length, 5)
  assert(georgia.markets.includes('Atlanta, GA'))

  const ohio = interpretSweepMarket('OH')
  assert.equal(ohio.kind, 'state')
  assert(ohio.markets.includes('Columbus, OH'))

  const wyoming = interpretSweepMarket('Wyoming')
  assert.equal(wyoming.kind, 'state')
  assert(wyoming.markets.includes('Cheyenne, WY'))

  const district = interpretSweepMarket('DC')
  assert.equal(district.kind, 'state')
  assert.deepEqual(district.markets, ['Washington, DC'])

  const national = interpretSweepMarket('nationwide')
  assert.equal(national.kind, 'nationwide')
  assert.equal(national.markets.length, 10)
  assert.deepEqual(national.markets.slice(0, 3), ['New York, NY', 'Los Angeles, CA', 'Chicago, IL'])

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
  assert.equal(planned.length, CP22A_DEFAULT_MAX_SERPAPI_CALLS)
  assert(planned.every((call) => call.engine === 'google_maps'))
  assert(planned.some((call) => call.market === 'New York, NY'))
  assert(planned.some((call) => call.market === 'Houston, TX'))

  const normalized = normalizeSerpApiMapsResults({
    payload: sampleMapsPayload,
    market: 'Denver, CO',
    query: 'restaurants Denver, CO',
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
  })
  assert.equal(normalized.length, 8)
  assert(normalized.every((lead) => lead.businessName && lead.phone))
  assert(!normalized.some((lead) => /project number|facility name/i.test(lead.businessName)))
  assert(!normalized.some((lead) => lead.businessName === 'No Phone Deli'))

  const noSiteDiner = normalized.find((lead) => lead.businessName === 'No Site Diner')
  assert(noSiteDiner)
  assert.equal(noSiteDiner.website, null)
  assert.equal(noSiteDiner.address, '444 Missing Site Rd, Denver, CO')

  const serviceArea = normalized.find((lead) => lead.businessName === 'Service Area Cleaners')
  assert(serviceArea)
  assert.equal(serviceArea.website, 'https://service-area.example.com/')
  assert.equal(serviceArea.address, null)

  const phoneOnly = normalized.find((lead) => lead.businessName === 'Phone Only Shop')
  assert(phoneOnly)
  assert.equal(phoneOnly.website, null)
  assert.equal(phoneOnly.address, null)

  const invalidSite = normalized.find((lead) => lead.businessName === 'Invalid Site Grill')
  assert(invalidSite)
  assert.equal(invalidSite.website, null)
  assert.equal(invalidSite.address, '555 Broken Url Rd, Denver, CO')

  const deduped = dedupeSweepLeads(normalized)
  assert.equal(deduped.length, 7)
  const bluebirds = deduped.filter((lead) => lead.businessName === 'Bluebird Cafe')
  assert.equal(bluebirds.length, 2)
  const primaryBluebird = bluebirds.find((lead) => phoneKey(lead) === '3035550101')
  assert(primaryBluebird)
  assert(primaryBluebird.website?.includes('bluebird.example.com'))
  assert.equal(primaryBluebird.address, '1200 Larimer Street, Denver, CO 80202')

  const csv = exportSweepCsv(deduped)
  assert(csv.startsWith('business,website,phone,address,market,source,email,owner,hook'))
  assert(csv.includes('Bluebird Cafe'))
  assert(csv.includes('Phone Only Shop,,(303) 555-6666,,"Denver, CO",Google Maps,,'))

  const json = exportSweepJson(deduped)
  const parsed = JSON.parse(json) as Array<{ business: string; website: string | null; address: string | null }>
  assert.equal(parsed.length, 7)
  assert(parsed.some((lead) => lead.business === 'Phone Only Shop' && lead.website === null && lead.address === null))

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
    firstLeadHasPhone: boolean
    rowsWithWebsite: number
    rowsWithAddress: number
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
    assert(live.leads.every((lead) => lead.businessName && lead.phone))
    liveProof = {
      ok: live.ok,
      rawScanned: live.stats.rawScanned,
      exportCount: live.stats.exportCount,
      providerCalls: live.stats.queriesRun,
      firstLeadHasPhone: Boolean(live.leads[0]?.phone),
      rowsWithWebsite: live.leads.filter((lead) => lead.website).length,
      rowsWithAddress: live.leads.filter((lead) => lead.address).length,
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp22a1_sweep_abundance_patch',
    datasetSource: US_SWEEP_CITY_DATASET.source,
    datasetRows: US_SWEEP_CITIES.length,
    datasetStateCoverage: datasetStates.size,
    cityMarket: city,
    texasMarket: texas,
    georgiaMarket: georgia,
    ohioMarket: ohio,
    wyomingMarket: wyoming,
    dcMarket: district,
    nationwideMarkets: national.markets,
    plannedNationwideCalls: planned.length,
    callCeiling: CP22A_DEFAULT_MAX_SERPAPI_CALLS,
    normalizedRows: normalized.length,
    normalizedRowsWithPhone: normalized.filter((lead) => lead.phone).length,
    noWebsiteRowsSurvive: normalized.filter((lead) => !lead.website).length,
    noAddressRowsSurvive: normalized.filter((lead) => !lead.address).length,
    phoneOnlyRowsSurvive: normalized.filter((lead) => !lead.website && !lead.address).length,
    noPhoneRowsDropped: true,
    literalGarbageRowsDropped: true,
    dedupedRows: deduped.length,
    richerDuplicateKept: Boolean(primaryBluebird?.website && primaryBluebird.address),
    differentPhoneRoutesRemainSeparate: bluebirds.length === 2,
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
  console.error('CP22A.1 sweep smoke FAILED:')
  console.error(error)
  process.exit(1)
})
