/**
 * CP22A.2 - Sweep buyer query tightening smoke proof.
 *
 * Covers ICP-first SerpApi Maps query variants, service-derived seller-side
 * exclusion, CP22A.1 phone-floor abundance behavior, dataset-driven market
 * planning, richer-row dedupe, export shape, call ceiling behavior, and
 * missing SERPAPI_KEY handling. If SERPAPI_KEY is present it also runs a
 * bounded live Maps proof. It does not call Firecrawl, LLMs, DB writes,
 * migrations, seeds, CRM, outreach, or scheduler paths.
 */

import assert from 'node:assert/strict'
import {
  CP22A_DEFAULT_MAX_SERPAPI_CALLS,
  SWEEP_CONSUMER_BUYER_GUIDANCE,
  applySuggestedSweepBuyerLane,
  buildSweepQueries,
  canonicalizeMapsQueryMarket,
  dedupeSweepLeads,
  exportSweepCsv,
  exportSweepJson,
  interpretSweepMarket,
  isConsumerFocusedBuyerInput,
  normalizeSerpApiMapsResults,
  planSerpApiMapsCalls,
  parseSweepBuyerLanes,
  runSerpApiMapsSweep,
  suggestedSweepBuyerLanes,
  type SerpApiMapsPayload,
  type SweepLead,
} from '@/lib/runtime/sweep'
import { US_SWEEP_CITIES, US_SWEEP_CITY_DATASET } from '@/lib/runtime/sweep/us-cities'

const abundancePayload: SerpApiMapsPayload = {
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
      title: 'Service Area Caterers',
      phone: '(303) 555-5555',
      website: 'service-area.example.com',
      type: 'Restaurant',
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

const cleaningBuyerPayload: SerpApiMapsPayload = {
  local_results: [
    {
      position: 1,
      title: 'Bluebird Cafe',
      phone: '(303) 555-0101',
      type: 'Restaurant',
    },
    {
      position: 2,
      title: 'Jani-King Commercial Cleaning & Janitorial Service',
      phone: '(303) 555-2222',
      type: 'Janitorial service',
    },
    {
      position: 3,
      title: 'Stratus Clean',
      phone: '(303) 555-3333',
      type: 'Commercial cleaning service',
    },
  ],
}

const roofingBuyerPayload: SerpApiMapsPayload = {
  local_results: [
    {
      position: 1,
      title: 'Mile High Property Management',
      phone: '(303) 555-1000',
      type: 'Property management company',
    },
    {
      position: 2,
      title: 'Peak Roofing Co',
      phone: '(303) 555-2000',
      type: 'Roofing contractor',
    },
    {
      position: 3,
      title: 'Rocky Mountain Roofer',
      phone: '(303) 555-3000',
      type: 'Contractor',
    },
  ],
}

const dumpsterBuyerPayload: SerpApiMapsPayload = {
  local_results: [
    {
      position: 1,
      title: 'Tenant Build Group',
      phone: '(214) 555-1000',
      type: 'General contractor',
    },
    {
      position: 2,
      title: 'Roll Off Express',
      phone: '(214) 555-2000',
      type: 'Dumpster rental service',
    },
    {
      position: 3,
      title: 'Waste Away',
      phone: '(214) 555-3000',
      type: 'Waste management service',
    },
    {
      position: 4,
      title: 'Junk King',
      phone: '(214) 555-4000',
      type: 'Junk removal service',
    },
  ],
}

const cleaningSuppliesOverlapPayload: SerpApiMapsPayload = {
  local_results: [
    {
      position: 1,
      title: 'Sparkle Cleaning Co',
      phone: '(512) 555-1000',
      type: 'Cleaning service',
    },
    {
      position: 2,
      title: 'Janitorial Depot',
      phone: '(512) 555-2000',
      type: 'Janitorial supply store',
    },
    {
      position: 3,
      title: 'Cleaning Products Supplier',
      phone: '(512) 555-3000',
      type: 'Cleaning products supplier',
    },
  ],
}

function phoneKey(lead: SweepLead): string {
  return lead.phone.replace(/\D/g, '')
}

function normalizeFixture(input: {
  payload: SerpApiMapsPayload
  service: string
  icp: string
  market?: string
  query?: string
}) {
  return normalizeSerpApiMapsResults({
    payload: input.payload,
    service: input.service,
    icp: input.icp,
    market: input.market ?? 'Denver, CO',
    query: input.query ?? `${input.icp} ${input.market ?? 'Denver, CO'}`,
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
  })
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

  const unknown = interpretSweepMarket('Phoenix metro')
  assert.equal(unknown.kind, 'city_metro')
  assert.deepEqual(unknown.markets, ['Phoenix metro'])

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
    'restaurants Denver CO',
    'restaurants near Denver CO',
    'restaurants in Denver CO',
    'restaurants businesses Denver CO',
  ])
  assert(queries.every((query) => /restaurants/i.test(query)))
  assert(queries.every((query) => !/commercial cleaning/i.test(query)))

  const consumerGuidanceShown = isConsumerFocusedBuyerInput('home owners in mesa del subdivision')
  assert.equal(consumerGuidanceShown, true)
  assert(SWEEP_CONSUMER_BUYER_GUIDANCE.includes('cannot directly find individual homeowners'))
  assert.deepEqual(parseSweepBuyerLanes('home owners in mesa del subdivision'), ['home owners in mesa del subdivision'])

  const consumerSuggestedLaneRewrite = applySuggestedSweepBuyerLane(
    'home owners in mesa del subdivision',
    'auto repair shops',
  )
  const consumerSuggestedLaneRewriteLanes = parseSweepBuyerLanes(consumerSuggestedLaneRewrite)
  assert.deepEqual(consumerSuggestedLaneRewriteLanes, ['auto repair shops'])
  assert(!consumerSuggestedLaneRewriteLanes.includes('home owners in mesa del subdivision'))

  const b2bSuggestedLaneAppend = applySuggestedSweepBuyerLane('gyms', 'auto repair shops')
  assert.deepEqual(parseSweepBuyerLanes(b2bSuggestedLaneAppend), ['gyms', 'auto repair shops'])

  const epoxySuggestedLanes = suggestedSweepBuyerLanes('epoxy flooring')
  assert.deepEqual(epoxySuggestedLanes, [
    'auto repair shops',
    'gyms',
    'warehouses',
    'self-storage facilities',
    'apartment complexes',
    'commercial property managers',
    'restaurants',
    'HOAs',
  ])

  const commaLaneInput = 'auto repair shops, gyms, warehouses, commercial property managers, self-storage facilities, restaurants, apartment complexes, HOAs'
  const plannedBuyerLanes = parseSweepBuyerLanes(commaLaneInput)
  assert.deepEqual(plannedBuyerLanes, [
    'auto repair shops',
    'gyms',
    'warehouses',
    'commercial property managers',
    'self-storage facilities',
    'restaurants',
    'apartment complexes',
    'HOAs',
  ])

  const newlineBuyerLanes = parseSweepBuyerLanes('auto repair shops\ngyms\nwarehouses')
  assert.deepEqual(newlineBuyerLanes, ['auto repair shops', 'gyms', 'warehouses'])

  const albuquerqueMarket = canonicalizeMapsQueryMarket('albuquerque, nm')
  assert.equal(albuquerqueMarket, 'albuquerque nm')

  const albuquerqueCalls = planSerpApiMapsCalls({
    service: 'epoxy flooring',
    icp: commaLaneInput,
    market: 'albuquerque, nm',
    maxPagesPerQuery: 1,
    maxCalls: 80,
  })
  const albuquerquePrimaryQueries = albuquerqueCalls
    .filter((call) => call.start === 0)
    .slice(0, plannedBuyerLanes.length)
    .map((call) => call.query)
  assert.deepEqual(albuquerquePrimaryQueries, [
    'auto repair shops albuquerque nm',
    'gyms albuquerque nm',
    'warehouses albuquerque nm',
    'commercial property managers albuquerque nm',
    'self-storage facilities albuquerque nm',
    'restaurants albuquerque nm',
    'apartment complexes albuquerque nm',
    'HOAs albuquerque nm',
  ])
  assert(!albuquerqueCalls.some((call) => /auto repair shops,\s*gyms/i.test(call.query)))
  assert(!albuquerqueCalls.some((call) => /businesses albuquerque nm$/i.test(call.query) && call.query.includes(',')))
  assert(albuquerqueCalls.every((call) => !/new york|jersey city/i.test(call.query)))
  assert(albuquerqueCalls.every((call) => !Object.prototype.hasOwnProperty.call(call, 'll')))
  assert.deepEqual(albuquerqueCalls.slice(0, plannedBuyerLanes.length).map((call) => call.buyerLane), plannedBuyerLanes)

  const planned = planSerpApiMapsCalls({
    service: 'dumpster rental',
    icp: 'tenant improvement contractors',
    market: 'nationwide',
  })
  assert.equal(planned.length, CP22A_DEFAULT_MAX_SERPAPI_CALLS)
  assert(planned.every((call) => call.engine === 'google_maps'))
  assert(planned.some((call) => call.market === 'New York, NY'))
  assert(planned.some((call) => call.market === 'Houston, TX'))
  assert(planned.every((call) => !/dumpster rental/i.test(call.query)))

  const normalized = normalizeFixture({
    payload: abundancePayload,
    service: 'commercial cleaning',
    icp: 'restaurants',
  })
  assert.equal(normalized.length, 8)
  assert(normalized.every((lead) => lead.businessName && lead.phone))
  assert(!normalized.some((lead) => /project number|facility name/i.test(lead.businessName)))
  assert(!normalized.some((lead) => lead.businessName === 'No Phone Deli'))

  const noSiteDiner = normalized.find((lead) => lead.businessName === 'No Site Diner')
  assert(noSiteDiner)
  assert.equal(noSiteDiner.website, null)
  assert.equal(noSiteDiner.address, '444 Missing Site Rd, Denver, CO')

  const serviceArea = normalized.find((lead) => lead.businessName === 'Service Area Caterers')
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

  const cleaningBuyers = normalizeFixture({
    payload: cleaningBuyerPayload,
    service: 'commercial cleaning',
    icp: 'restaurants',
  })
  assert.deepEqual(cleaningBuyers.map((lead) => lead.businessName), ['Bluebird Cafe'])

  const roofingBuyers = normalizeFixture({
    payload: roofingBuyerPayload,
    service: 'roofing',
    icp: 'commercial property managers',
  })
  assert.deepEqual(roofingBuyers.map((lead) => lead.businessName), ['Mile High Property Management'])

  const dumpsterBuyers = normalizeFixture({
    payload: dumpsterBuyerPayload,
    service: 'dumpster rental',
    icp: 'tenant improvement contractors',
    market: 'Dallas, TX',
  })
  assert.deepEqual(dumpsterBuyers.map((lead) => lead.businessName), ['Tenant Build Group'])

  const cleaningCompanyBuyers = normalizeFixture({
    payload: cleaningSuppliesOverlapPayload,
    service: 'cleaning supplies',
    icp: 'cleaning companies',
    market: 'Austin, TX',
  })
  assert.deepEqual(cleaningCompanyBuyers.map((lead) => lead.businessName), ['Sparkle Cleaning Co'])

  const csv = exportSweepCsv(deduped)
  const csvHeader = csv.split('\n')[0]
  assert.equal(csvHeader, 'business,website,phone,address,market,source,latitude,longitude,email,owner,hook')
  assert(csv.includes('Bluebird Cafe'))
  const phoneOnlyCsvRow = csv.split('\n').find((row) => row.startsWith('Phone Only Shop,'))
  assert(phoneOnlyCsvRow)
  assert(phoneOnlyCsvRow.startsWith('Phone Only Shop,,(303) 555-6666,,"Denver, CO",Google Maps,,,,'))

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
  assert(missingKey.calls.every((call) => !/commercial cleaning/i.test(call.query)))

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
    mode: 'cp22a2_sweep_buyer_query_tightening',
    datasetSource: US_SWEEP_CITY_DATASET.source,
    datasetRows: US_SWEEP_CITIES.length,
    datasetStateCoverage: datasetStates.size,
    cityMarket: city,
    texasMarket: texas,
    georgiaMarket: georgia,
    ohioMarket: ohio,
    wyomingMarket: wyoming,
    dcMarket: district,
    unknownMarket: unknown,
    nationwideMarkets: national.markets,
    queryVariants: queries,
    queryVariantsIcpFirst: true,
    serviceTermRemovedFromQueries: true,
    consumerLikeIcpGuidanceShown: consumerGuidanceShown,
    consumerLikeIcpHardBlocked: false,
    consumerSuggestedLaneRewrite,
    consumerSuggestedLaneRewriteLanes,
    consumerLaneRemovedAfterSuggestion: !consumerSuggestedLaneRewriteLanes.includes('home owners in mesa del subdivision'),
    b2bSuggestedLaneAppend,
    epoxySuggestedLanes,
    plannedBuyerLanes,
    newlineBuyerLanes,
    albuquerqueMarket,
    albuquerquePrimaryQueries,
    giantMixedQuerySent: false,
    albuquerqueNyJerseyCityLl: false,
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
    cleaningVendorRowsDropped: true,
    roofingSellerRowsDropped: true,
    dumpsterSellerRowsDropped: true,
    overlapFalsePositiveProtected: true,
    csvHeader,
    jsonRows: parsed.length,
    missingSerpApiKeyHandled: true,
    liveSerpApiMapsProof: liveProof ?? 'blocked_missing_serpapi_key',
    providerCalls: liveProof?.providerCalls ?? 0,
    serpApiCalls: liveProof?.providerCalls ?? 0,
    firecrawlCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
  }, null, 2))
}

main().catch((error) => {
  console.error('CP22A.2 sweep smoke FAILED:')
  console.error(error)
  process.exit(1)
})
