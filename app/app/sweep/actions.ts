'use server'

import { auth } from '@clerk/nextjs/server'
import {
  CP22B_DEFAULT_MAX_FIRECRAWL_SCRAPES,
  CP22B_HARD_MAX_FIRECRAWL_SCRAPES,
  enrichSweepLeadsWithFirecrawl,
  runSerpApiMapsSweep,
  type SweepEnrichmentResult,
  type SweepEnrichmentStats,
  type SweepLead,
  type SweepRunResult,
} from '@/lib/runtime/sweep'

type RunSweepInput = {
  service: string
  icp: string
  market: string
}

type EnrichSweepInput = {
  leads: SweepLead[]
  maxScrapes?: number
}

function clampScrapeBudget(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return CP22B_DEFAULT_MAX_FIRECRAWL_SCRAPES
  }
  return Math.min(CP22B_HARD_MAX_FIRECRAWL_SCRAPES, Math.max(0, Math.floor(value)))
}

function safeEnrichmentStats(leads: readonly SweepLead[], maxScrapes?: number): SweepEnrichmentStats {
  const eligibleWebsiteRows = leads.filter((lead) => Boolean(lead.website?.trim())).length
  return {
    eligibleWebsiteRows,
    skippedNoWebsiteRows: leads.length - eligibleWebsiteRows,
    scrapeBudget: clampScrapeBudget(maxScrapes),
    attemptedScrapes: 0,
    successfulScrapes: 0,
    failedScrapes: 0,
    emailsFound: 0,
    ownersFound: 0,
    hooksFound: 0,
  }
}

export async function runSweep(input: RunSweepInput): Promise<SweepRunResult> {
  const { userId } = await auth()
  if (!userId) {
    return {
      ok: false,
      leads: [],
      calls: [],
      stats: {
        sourcesHit: [],
        queriesRun: 0,
        rawScanned: 0,
        dedupedLeadCount: 0,
        exportCount: 0,
      },
      error: {
        code: 'invalid_input',
        message: 'Sign in to run a live sweep.',
      },
    }
  }

  return runSerpApiMapsSweep({
    service: input.service,
    icp: input.icp,
    market: input.market,
    apiKey: process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY,
  })
}

export async function enrichSweep(input: EnrichSweepInput): Promise<SweepEnrichmentResult> {
  const leads = Array.isArray(input.leads) ? input.leads : []
  const { userId } = await auth()
  if (!userId) {
    return {
      ok: false,
      leads,
      stats: safeEnrichmentStats(leads, input.maxScrapes),
      error: {
        code: 'invalid_input',
        message: 'Sign in to enrich websites.',
      },
    }
  }

  return enrichSweepLeadsWithFirecrawl({
    leads,
    maxScrapes: input.maxScrapes,
    apiKey: process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY,
  })
}
