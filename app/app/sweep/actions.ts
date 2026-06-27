'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
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
import {
  annotateSweepLeadsWithSavedMemoryForWorkspace,
  savedLeadMemoryUnavailable,
  saveSweepLeadsForWorkspace,
  splitSweepLeadsBySavedMemory,
  updateSavedLeadNoteForWorkspace,
  updateSavedLeadStatusForWorkspace,
  type SaveSweepLeadsInput,
  type SaveSweepLeadsResult,
  type UpdateSavedLeadNoteInput,
  type UpdateSavedLeadStatusInput,
} from '@/lib/runtime/sweep/saved-leads'
import { requireWorkspaceContext } from '@/lib/workspace'

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
  const ctx = await requireWorkspaceContext()

  const sweepResult = await runSerpApiMapsSweep({
    service: input.service,
    icp: input.icp,
    market: input.market,
    apiKey: process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY,
  })

  try {
    const annotated = await annotateSweepLeadsWithSavedMemoryForWorkspace(sweepResult.leads, ctx.workspaceId)
    return {
      ...sweepResult,
      leads: annotated.leads,
      savedMemory: annotated.savedMemory,
    }
  } catch {
    const unavailable = savedLeadMemoryUnavailable(sweepResult.leads)
    return {
      ...sweepResult,
      leads: unavailable.leads,
      savedMemory: unavailable.savedMemory,
    }
  }
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

export async function saveSweepLeads(input: SaveSweepLeadsInput): Promise<SaveSweepLeadsResult> {
  const ctx = await requireWorkspaceContext()
  const split = splitSweepLeadsBySavedMemory(Array.isArray(input.leads) ? input.leads : [])
  if (split.leadsToSave.length === 0) {
    return {
      ok: true,
      attempted: Array.isArray(input.leads) ? input.leads.length : 0,
      savedNew: 0,
      alreadySaved: split.alreadySavedCount,
      skippedInvalid: 0,
      dismissedSkipped: 0,
      totalKnown: split.alreadySavedCount,
    }
  }

  const result = await saveSweepLeadsForWorkspace({
    ...input,
    leads: split.leadsToSave,
  }, {
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  })
  revalidatePath('/app/leads')
  return {
    ...result,
    attempted: Array.isArray(input.leads) ? input.leads.length : result.attempted,
    alreadySaved: result.alreadySaved + split.alreadySavedCount,
    totalKnown: result.totalKnown + split.alreadySavedCount,
  }
}

export async function updateSavedLeadStatus(
  input: UpdateSavedLeadStatusInput,
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const ctx = await requireWorkspaceContext()
  const result = await updateSavedLeadStatusForWorkspace(input, {
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  })
  revalidatePath('/app/leads')
  return result
}

export async function updateSavedLeadNote(
  input: UpdateSavedLeadNoteInput,
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const ctx = await requireWorkspaceContext()
  const result = await updateSavedLeadNoteForWorkspace(input, {
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  })
  revalidatePath('/app/leads')
  return result
}
