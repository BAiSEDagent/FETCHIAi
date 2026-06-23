/**
 * CP22B - Firecrawl Stroke 2 website enrichment smoke proof.
 *
 * Uses mocked Firecrawl scrape responses by default. It does not call SerpApi,
 * Firecrawl, LLMs, DB writes, migrations, seeds, CRM, outreach, or scheduler
 * paths unless CP22B_LIVE_FIRECRAWL_PROOF=1 is explicitly set for the optional
 * one-website live proof.
 */

import assert from 'node:assert/strict'
import {
  CP22B_HARD_MAX_FIRECRAWL_CONCURRENCY,
  CP22B_HARD_MAX_FIRECRAWL_SCRAPES,
  enrichSweepLeadsWithFirecrawl,
  exportSweepCsv,
  exportSweepJson,
  normalizeSerpApiMapsResults,
  type SerpApiMapsPayload,
  type SweepLead,
} from '@/lib/runtime/sweep'

type MockFirecrawlRequest = {
  url?: string
  onlyMainContent?: unknown
}

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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function main() {
  const requestedUrls: string[] = []
  const firecrawlRequestBodies: MockFirecrawlRequest[] = []
  const mockFetch: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as MockFirecrawlRequest
    firecrawlRequestBodies.push(body)
    requestedUrls.push(body.url ?? '')

    if (body.url === 'https://fail.example.com/') {
      return jsonResponse({ success: false, error: 'blocked' }, 502)
    }

    if (body.url === 'https://alpha.example.com/') {
      return jsonResponse({
        success: true,
        data: {
          markdown: [
            '# Alpha Bistro',
            'Owner: Maria Lopez',
            'Email us at hello@alphabistro.com for catering and private dining.',
          ].join('\n'),
          metadata: {
            title: 'Alpha Bistro',
            description: 'Family-owned bistro serving lunch, dinner, and private events.',
          },
        },
      })
    }

    if (body.url === 'https://beta.example.com/') {
      return jsonResponse({
        success: true,
        data: {
          markdown: '# Beta Cafe\nFresh sandwiches and coffee downtown.',
          metadata: {},
        },
      })
    }

    if (body.url === 'https://bad-email.example.com/') {
      return jsonResponse({
        success: true,
        data: {
          markdown: 'Reach us at noreply@example.com or support@test.com.',
          metadata: { title: 'Bad Email Bistro' },
        },
      })
    }

    if (body.url === 'https://weak-owner.example.com/') {
      return jsonResponse({
        success: true,
        data: {
          markdown: 'Manager: Our Team\nContact our front desk for reservations.',
          metadata: { description: 'Neighborhood cafe with breakfast and lunch service.' },
        },
      })
    }

    return jsonResponse({
      success: true,
      data: {
        markdown: '# Extra Lead\nEmail: extra@example.org',
        metadata: { title: 'Extra Lead' },
      },
    })
  }

  const inputLeads = [
    lead({
      id: 'alpha',
      businessName: 'Alpha Bistro',
      website: 'https://alpha.example.com/',
      phone: '(303) 555-0101',
      address: '100 Main St, Denver, CO',
      latitude: 39.7392,
      longitude: -104.9903,
    }),
    lead({
      id: 'beta',
      businessName: 'Beta Cafe',
      website: 'https://beta.example.com/',
      phone: '(303) 555-0102',
    }),
    lead({
      id: 'phone-only',
      businessName: 'Phone Only Shop',
      phone: '(303) 555-0103',
    }),
    lead({
      id: 'failure',
      businessName: 'Failure Grill',
      website: 'https://fail.example.com/',
      phone: '(303) 555-0104',
    }),
    lead({
      id: 'bad-email',
      businessName: 'Bad Email Bistro',
      website: 'https://bad-email.example.com/',
      phone: '(303) 555-0105',
    }),
    lead({
      id: 'weak-owner',
      businessName: 'Weak Owner Cafe',
      website: 'https://weak-owner.example.com/',
      phone: '(303) 555-0106',
    }),
  ]

  const enriched = await enrichSweepLeadsWithFirecrawl({
    leads: inputLeads,
    apiKey: 'test-firecrawl-key',
    maxScrapes: 10,
    concurrency: 20,
    timeoutMs: 1000,
    fetchImpl: mockFetch,
  })

  assert.equal(enriched.ok, true)
  assert.equal(enriched.leads.length, inputLeads.length)
  assert.deepEqual(enriched.leads.map((item) => item.id), inputLeads.map((item) => item.id))
  assert.equal(enriched.stats.eligibleWebsiteRows, 5)
  assert.equal(enriched.stats.skippedNoWebsiteRows, 1)
  assert.equal(enriched.stats.attemptedScrapes, 5)
  assert.equal(enriched.stats.successfulScrapes, 4)
  assert.equal(enriched.stats.failedScrapes, 1)
  assert.equal(enriched.stats.emailsFound, 1)
  assert.equal(enriched.stats.ownersFound, 1)
  assert(enriched.stats.hooksFound >= 1)
  assert(!requestedUrls.includes(''))
  assert(!requestedUrls.some((url) => url === inputLeads[2].website))
  assert(firecrawlRequestBodies.every((body) => body.onlyMainContent !== true))

  const alpha = enriched.leads.find((item) => item.id === 'alpha')
  assert(alpha)
  assert.equal(alpha.email, 'hello@alphabistro.com')
  assert.equal(alpha.owner, 'Maria Lopez')
  assert(alpha.hook && alpha.hook.length <= 140)
  assert.equal(alpha.businessName, 'Alpha Bistro')
  assert.equal(alpha.phone, '(303) 555-0101')
  assert.equal(alpha.latitude, 39.7392)
  assert.equal(alpha.longitude, -104.9903)

  const beta = enriched.leads.find((item) => item.id === 'beta')
  assert(beta)
  assert.equal(beta.email, null)
  assert.equal(beta.owner, null)

  const phoneOnly = enriched.leads.find((item) => item.id === 'phone-only')
  assert(phoneOnly)
  assert.equal(phoneOnly.website, null)
  assert.equal(phoneOnly.email, null)

  const failed = enriched.leads.find((item) => item.id === 'failure')
  assert(failed)
  assert.equal(failed.email, null)
  assert.equal(failed.owner, null)
  assert.equal(failed.hook, null)

  const badEmail = enriched.leads.find((item) => item.id === 'bad-email')
  assert(badEmail)
  assert.equal(badEmail.email, null)

  const weakOwner = enriched.leads.find((item) => item.id === 'weak-owner')
  assert(weakOwner)
  assert.equal(weakOwner.owner, null)

  const budgetCalls: string[] = []
  const budgeted = await enrichSweepLeadsWithFirecrawl({
    leads: inputLeads,
    apiKey: 'test-firecrawl-key',
    maxScrapes: 2,
    concurrency: CP22B_HARD_MAX_FIRECRAWL_CONCURRENCY + 10,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { url?: string }
      budgetCalls.push(body.url ?? '')
      return jsonResponse({ success: true, data: { markdown: 'Email: budget@example.org', metadata: {} } })
    },
  })
  assert.equal(budgeted.stats.scrapeBudget, 2)
  assert.equal(budgeted.stats.attemptedScrapes, 2)
  assert.equal(budgetCalls.length, 2)

  const capped = await enrichSweepLeadsWithFirecrawl({
    leads: Array.from({ length: CP22B_HARD_MAX_FIRECRAWL_SCRAPES + 5 }, (_, index) => lead({
      id: `cap-${index}`,
      businessName: `Cap Lead ${index}`,
      phone: `(303) 555-${String(index).padStart(4, '0')}`,
      website: `https://cap-${index}.example.com/`,
    })),
    apiKey: 'test-firecrawl-key',
    maxScrapes: CP22B_HARD_MAX_FIRECRAWL_SCRAPES + 500,
    fetchImpl: async () => jsonResponse({ success: true, data: { markdown: '', metadata: {} } }),
  })
  assert.equal(capped.stats.scrapeBudget, CP22B_HARD_MAX_FIRECRAWL_SCRAPES)
  assert.equal(capped.stats.attemptedScrapes, CP22B_HARD_MAX_FIRECRAWL_SCRAPES)

  const missingKey = await enrichSweepLeadsWithFirecrawl({
    leads: inputLeads,
    apiKey: '',
    fetchImpl: mockFetch,
  })
  assert.equal(missingKey.ok, false)
  assert.equal(missingKey.error?.code, 'missing_firecrawl_key')
  assert.equal(missingKey.stats.attemptedScrapes, 0)
  assert.equal(missingKey.leads.length, inputLeads.length)

  const coordinatePayload: SerpApiMapsPayload = {
    local_results: [
      {
        title: 'Coordinate Bistro',
        phone: '(214) 555-0101',
        website: 'https://coordinate.example.com',
        address: '100 Commerce St, Dallas, TX',
        type: 'Restaurant',
        gps_coordinates: {
          latitude: 32.7767,
          longitude: '-96.7970',
        },
      },
      {
        title: 'Invalid Coordinate Cafe',
        phone: '(214) 555-0102',
        website: 'https://invalid-coordinate.example.com',
        address: '200 Commerce St, Dallas, TX',
        type: 'Restaurant',
        gps_coordinates: {
          latitude: '32 degrees',
          longitude: Number.POSITIVE_INFINITY,
        },
      },
    ],
  }

  const coordinateLeads = normalizeSerpApiMapsResults({
    payload: coordinatePayload,
    service: 'commercial cleaning',
    icp: 'restaurants',
    market: 'Dallas, TX',
    query: 'restaurants Dallas, TX',
    sourceUrl: 'https://serpapi.com/search?engine=google_maps',
  })
  assert.equal(coordinateLeads.length, 2)
  assert.equal(coordinateLeads[0].latitude, 32.7767)
  assert.equal(coordinateLeads[0].longitude, -96.797)
  assert.equal(coordinateLeads[1].latitude, null)
  assert.equal(coordinateLeads[1].longitude, null)

  const csv = exportSweepCsv(coordinateLeads)
  const csvHeader = csv.split('\n')[0]
  assert(csvHeader.includes('latitude'))
  assert(csvHeader.includes('longitude'))
  assert.equal(csvHeader, 'business,website,phone,address,market,source,latitude,longitude,email,owner,hook')
  assert(csv.includes('32.7767'))
  assert(csv.includes('-96.797'))

  const json = exportSweepJson(coordinateLeads)
  const parsedJson = JSON.parse(json) as Array<{ latitude: number | null; longitude: number | null }>
  assert.equal(parsedJson[0].latitude, 32.7767)
  assert.equal(parsedJson[0].longitude, -96.797)
  assert.equal(parsedJson[1].latitude, null)
  assert.equal(parsedJson[1].longitude, null)

  let liveFirecrawlProof: 'skipped_missing_flag_or_key' | {
    ok: boolean
    attemptedScrapes: number
    successfulScrapes: number
    failedScrapes: number
  } = 'skipped_missing_flag_or_key'

  const liveApiKey = process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY
  if (liveApiKey && process.env.CP22B_LIVE_FIRECRAWL_PROOF === '1') {
    const live = await enrichSweepLeadsWithFirecrawl({
      leads: [lead({
        id: 'live-firecrawl',
        businessName: 'Firecrawl',
        website: 'https://www.firecrawl.dev/',
        phone: '(000) 000-0000',
      })],
      apiKey: liveApiKey,
      maxScrapes: 1,
    })
    assert.equal(live.stats.attemptedScrapes, 1)
    liveFirecrawlProof = {
      ok: live.ok,
      attemptedScrapes: live.stats.attemptedScrapes,
      successfulScrapes: live.stats.successfulScrapes,
      failedScrapes: live.stats.failedScrapes,
    }
  }

  const summary = {
    mode: 'cp22b_firecrawl_stroke_2_website_enrichment',
    ok: true,
    inputLeadCount: inputLeads.length,
    outputLeadCount: enriched.leads.length,
    eligibleWebsiteRows: enriched.stats.eligibleWebsiteRows,
    attemptedScrapes: enriched.stats.attemptedScrapes,
    emailsFound: enriched.stats.emailsFound,
    ownersFound: enriched.stats.ownersFound,
    hooksFound: enriched.stats.hooksFound,
    skippedNoWebsiteRows: enriched.stats.skippedNoWebsiteRows,
    failedScrapes: enriched.stats.failedScrapes,
    budgetRespected: budgeted.stats.attemptedScrapes === 2 && capped.stats.attemptedScrapes === CP22B_HARD_MAX_FIRECRAWL_SCRAPES,
    leadsNeverDropped: enriched.leads.length === inputLeads.length,
    phoneOnlyRowsPreserved: Boolean(phoneOnly && phoneOnly.website === null),
    badEmailsRejected: badEmail?.email === null,
    ownerNotGuessed: weakOwner?.owner === null,
    orderPreserved: enriched.leads.every((item, index) => item.id === inputLeads[index].id),
    coordinatesCaptured: coordinateLeads[0].latitude === 32.7767 && coordinateLeads[0].longitude === -96.797,
    invalidCoordinatesRemainNull: coordinateLeads[1].latitude === null && coordinateLeads[1].longitude === null,
    exportIncludesCoordinates: csvHeader.includes('latitude') && csvHeader.includes('longitude'),
    exportOrderFixed: csvHeader === 'business,website,phone,address,market,source,latitude,longitude,email,owner,hook',
    onlyMainContentNotForcedTrue: firecrawlRequestBodies.every((body) => body.onlyMainContent !== true),
    firecrawlCallsMocked: true,
    liveFirecrawlProof,
    serpApiCalls: 0,
    llmCalls: 0,
    dbWrites: 0,
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error('CP22B Firecrawl enrichment smoke FAILED:')
  console.error(error)
  process.exit(1)
})
