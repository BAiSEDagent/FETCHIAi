/**
 * CP26C.2A — hard usage ceilings and deterministic interpretation truncation.
 */

import type {
  InvestigationUsageCategory,
  InvestigationUsageSnapshot,
} from './contracts'

export const SAVED_LEAD_INVESTIGATION_CEILINGS = {
  structuredCalls: 2,
  serpApiCalls: 4,
  hydrationPages: 3,
  interpretationCalls: 1,
  automaticRetries: 0,
  serpApiCandidatesPerCall: 3,
  totalSerpApiCandidates: 12,
  hydratedTextCharsPerPage: 12000,
  hydratedTextCharsTotal: 30000,
  interpretationInputTokens: 12000,
  interpretationOutputTokens: 1200,
  totalProviderEquivalents: 10,
} as const

export function createInvestigationUsage(): InvestigationUsageSnapshot {
  return {
    structuredCalls: 0,
    serpApiCalls: 0,
    hydrationPages: 0,
    interpretationCalls: 0,
    totalProviderEquivalents: 0,
    providerRequestCounts: {},
    providerReportedCredits: {},
  }
}

export function recordInvestigationUsage(
  current: InvestigationUsageSnapshot,
  category: InvestigationUsageCategory,
  count = 1,
): InvestigationUsageSnapshot {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Investigation usage count must be a non-negative integer')
  }

  const categoryCeiling = SAVED_LEAD_INVESTIGATION_CEILINGS[category]
  const nextCategoryCount = current[category] + count
  const nextTotal = current.totalProviderEquivalents + count
  if (nextCategoryCount > categoryCeiling) {
    throw new Error(`Investigation ${category} ceiling exceeded`)
  }
  if (
    nextTotal >
    SAVED_LEAD_INVESTIGATION_CEILINGS.totalProviderEquivalents
  ) {
    throw new Error('Investigation total provider-equivalent ceiling exceeded')
  }

  return {
    ...current,
    [category]: nextCategoryCount,
    totalProviderEquivalents: nextTotal,
  }
}

export interface InterpretationSourceInput {
  id: string
  tier: 1 | 2 | 3
  exactDomain: boolean
  dated: boolean
  estimatedTokens: number
  text: string
}

export interface TruncatedInterpretationSources {
  retained: InterpretationSourceInput[]
  omitted: InterpretationSourceInput[]
  retainedTokens: number
  truncated: boolean
  reasonCode: 'interpretation_input_token_limit' | null
}

function interpretationPriority(source: InterpretationSourceInput): number {
  if (source.tier === 1) return 0
  if (source.exactDomain) return 1
  if (source.tier === 3 && source.dated) return 2
  return 3
}

/**
 * Safe upper bound for token budgeting without invoking a tokenizer. A token
 * cannot consume fewer than zero bytes, so UTF-8 byte length intentionally
 * overestimates ordinary text rather than trusting a caller's optimistic
 * estimate.
 */
export function conservativeTokenUpperBound(text: string): number {
  return new TextEncoder().encode(text).length
}

function effectiveSourceTokenBound(
  source: InterpretationSourceInput,
): number {
  return Math.max(
    source.estimatedTokens,
    conservativeTokenUpperBound(source.text),
  )
}

function partialSourceWithinTokenBound(
  source: InterpretationSourceInput,
  sourceTokenBound: number,
  tokenLimit: number,
): {
  retained: InterpretationSourceInput | null
  omitted: InterpretationSourceInput
  retainedTokens: number
} {
  const characters = Array.from(source.text)
  if (tokenLimit <= 0 || characters.length === 0) {
    return {
      retained: null,
      omitted: { ...source, estimatedTokens: sourceTokenBound },
      retainedTokens: 0,
    }
  }

  const prefixBound = (length: number): number => {
    const prefix = characters.slice(0, length).join('')
    const proportionalEstimate = Math.ceil(
      (sourceTokenBound * length) / characters.length,
    )
    return Math.max(
      proportionalEstimate,
      conservativeTokenUpperBound(prefix),
    )
  }

  let low = 0
  let high = characters.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (prefixBound(middle) <= tokenLimit) {
      low = middle
    } else {
      high = middle - 1
    }
  }

  if (low === 0) {
    return {
      retained: null,
      omitted: { ...source, estimatedTokens: sourceTokenBound },
      retainedTokens: 0,
    }
  }

  const retainedText = characters.slice(0, low).join('')
  const omittedText = characters.slice(low).join('')
  const retainedTokens = prefixBound(low)
  return {
    retained: {
      ...source,
      text: retainedText,
      estimatedTokens: retainedTokens,
    },
    omitted: {
      ...source,
      text: omittedText,
      estimatedTokens: Math.max(
        sourceTokenBound - retainedTokens,
        conservativeTokenUpperBound(omittedText),
      ),
    },
    retainedTokens,
  }
}

export function truncateInterpretationSources(
  sources: readonly InterpretationSourceInput[],
  maximumTokens: number,
): TruncatedInterpretationSources {
  if (!Number.isInteger(maximumTokens) || maximumTokens < 0) {
    throw new Error('Interpretation token ceiling must be non-negative')
  }
  if (
    maximumTokens >
    SAVED_LEAD_INVESTIGATION_CEILINGS.interpretationInputTokens
  ) {
    throw new Error('Interpretation token ceiling cannot exceed hard limit')
  }

  const ordered = sources
    .map((source, originalIndex) => {
      if (
        !Number.isInteger(source.estimatedTokens) ||
        source.estimatedTokens < 0
      ) {
        throw new Error(
          `Interpretation source ${source.id} estimatedTokens must be a non-negative integer`,
        )
      }
      return { source, originalIndex }
    })
    .sort(
      (left, right) =>
        interpretationPriority(left.source) -
          interpretationPriority(right.source) ||
        left.originalIndex - right.originalIndex,
    )

  const retained: InterpretationSourceInput[] = []
  const omitted: InterpretationSourceInput[] = []
  let retainedTokens = 0
  let priorityClosed = false

  for (const { source } of ordered) {
    const sourceTokenBound = effectiveSourceTokenBound(source)
    if (priorityClosed) {
      omitted.push({ ...source, estimatedTokens: sourceTokenBound })
      continue
    }

    const remainingTokens = maximumTokens - retainedTokens
    if (sourceTokenBound <= remainingTokens) {
      retained.push({ ...source, estimatedTokens: sourceTokenBound })
      retainedTokens += sourceTokenBound
      continue
    }

    const partial = partialSourceWithinTokenBound(
      source,
      sourceTokenBound,
      remainingTokens,
    )
    if (partial.retained) {
      retained.push(partial.retained)
      retainedTokens += partial.retainedTokens
    }
    omitted.push(partial.omitted)

    // Once a higher-priority source is truncated, lower-priority material
    // cannot leapfrog it into any small residual budget.
    priorityClosed = true
  }

  return {
    retained,
    omitted,
    retainedTokens,
    truncated: omitted.length > 0,
    reasonCode:
      omitted.length > 0 ? 'interpretation_input_token_limit' : null,
  }
}

export interface SerpApiCandidateBatch<TCandidate> {
  callId: string
  candidates: readonly TCandidate[]
}

export interface RetainedSerpApiCandidate<TCandidate> {
  callId: string
  candidate: TCandidate
}

export interface RetainedSerpApiCandidates<TCandidate> {
  retained: RetainedSerpApiCandidate<TCandidate>[]
  omitted: RetainedSerpApiCandidate<TCandidate>[]
  truncated: boolean
  reasonCodes: Array<
    'serpapi_candidates_per_call_limit' | 'serpapi_candidates_total_limit'
  >
}

/**
 * Retains candidates in call order and provider-result order. Per-call
 * truncation happens before the aggregate ceiling so the result is stable.
 */
export function retainSerpApiCandidates<TCandidate>(
  batches: readonly SerpApiCandidateBatch<TCandidate>[],
): RetainedSerpApiCandidates<TCandidate> {
  const retained: RetainedSerpApiCandidate<TCandidate>[] = []
  const omitted: RetainedSerpApiCandidate<TCandidate>[] = []
  const reasonCodes = new Set<
    'serpapi_candidates_per_call_limit' | 'serpapi_candidates_total_limit'
  >()

  for (const batch of batches) {
    for (const [candidateIndex, candidate] of batch.candidates.entries()) {
      const entry = { callId: batch.callId, candidate }
      if (
        candidateIndex >=
        SAVED_LEAD_INVESTIGATION_CEILINGS.serpApiCandidatesPerCall
      ) {
        omitted.push(entry)
        reasonCodes.add('serpapi_candidates_per_call_limit')
      } else if (
        retained.length >=
        SAVED_LEAD_INVESTIGATION_CEILINGS.totalSerpApiCandidates
      ) {
        omitted.push(entry)
        reasonCodes.add('serpapi_candidates_total_limit')
      } else {
        retained.push(entry)
      }
    }
  }

  return {
    retained,
    omitted,
    truncated: omitted.length > 0,
    reasonCodes: [...reasonCodes],
  }
}

export interface HydratedPageInput {
  id: string
  normalizedText: string
}

export interface RetainedHydratedPage extends HydratedPageInput {
  originalCharacters: number
  retainedCharacters: number
}

export interface TruncatedHydratedPages {
  retained: RetainedHydratedPage[]
  omitted: HydratedPageInput[]
  retainedCharacters: number
  truncated: boolean
  reasonCodes: Array<
    | 'hydration_page_limit'
    | 'hydration_page_character_limit'
    | 'hydration_total_character_limit'
  >
}

/**
 * Applies the page-count, per-page character, then total-character ceilings in
 * stable input order. Text is normalized by the caller before this boundary.
 */
export function truncateHydratedPages(
  pages: readonly HydratedPageInput[],
): TruncatedHydratedPages {
  const retained: RetainedHydratedPage[] = []
  const omitted: HydratedPageInput[] = []
  const reasonCodes = new Set<
    | 'hydration_page_limit'
    | 'hydration_page_character_limit'
    | 'hydration_total_character_limit'
  >()
  let retainedCharacters = 0

  for (const [pageIndex, page] of pages.entries()) {
    if (pageIndex >= SAVED_LEAD_INVESTIGATION_CEILINGS.hydrationPages) {
      omitted.push(page)
      reasonCodes.add('hydration_page_limit')
      continue
    }

    const perPageLimit =
      SAVED_LEAD_INVESTIGATION_CEILINGS.hydratedTextCharsPerPage
    const remainingTotal =
      SAVED_LEAD_INVESTIGATION_CEILINGS.hydratedTextCharsTotal -
      retainedCharacters
    const retainedLength = Math.min(
      page.normalizedText.length,
      perPageLimit,
      Math.max(remainingTotal, 0),
    )

    if (page.normalizedText.length > perPageLimit) {
      reasonCodes.add('hydration_page_character_limit')
    }
    if (page.normalizedText.length > remainingTotal) {
      reasonCodes.add('hydration_total_character_limit')
    }
    if (retainedLength === 0 && page.normalizedText.length > 0) {
      omitted.push(page)
      continue
    }

    retained.push({
      ...page,
      normalizedText: page.normalizedText.slice(0, retainedLength),
      originalCharacters: page.normalizedText.length,
      retainedCharacters: retainedLength,
    })
    retainedCharacters += retainedLength
  }

  return {
    retained,
    omitted,
    retainedCharacters,
    truncated: reasonCodes.size > 0,
    reasonCodes: [...reasonCodes],
  }
}

export type InterpretationTokenLimitReason =
  | 'invalid_token_count'
  | 'interpretation_input_token_limit'
  | 'interpretation_output_token_limit'

export interface InterpretationTokenValidation {
  allowed: boolean
  reasonCodes: InterpretationTokenLimitReason[]
}

export function validateInterpretationTokenUsage(
  inputTokens: number,
  outputTokens: number,
): InterpretationTokenValidation {
  const reasonCodes: InterpretationTokenLimitReason[] = []
  if (
    !Number.isInteger(inputTokens) ||
    inputTokens < 0 ||
    !Number.isInteger(outputTokens) ||
    outputTokens < 0
  ) {
    reasonCodes.push('invalid_token_count')
  } else {
    if (
      inputTokens >
      SAVED_LEAD_INVESTIGATION_CEILINGS.interpretationInputTokens
    ) {
      reasonCodes.push('interpretation_input_token_limit')
    }
    if (
      outputTokens >
      SAVED_LEAD_INVESTIGATION_CEILINGS.interpretationOutputTokens
    ) {
      reasonCodes.push('interpretation_output_token_limit')
    }
  }
  return { allowed: reasonCodes.length === 0, reasonCodes }
}
