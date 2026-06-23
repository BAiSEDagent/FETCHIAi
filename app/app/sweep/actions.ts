'use server'

import { auth } from '@clerk/nextjs/server'
import { runSerpApiMapsSweep, type SweepRunResult } from '@/lib/runtime/sweep'

type RunSweepInput = {
  service: string
  icp: string
  market: string
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
