/**
 * CP6 — Candidate -> Evidence gate contract.
 *
 * Deterministic structural gate only. It accepts a pre-evidence candidate plus
 * hydrated evidence documents and decides whether the pair is ready for later
 * classification. It does not classify, score, draft, call providers, read env,
 * import DB code, or create opportunities.
 */

import type { FallbackState, ProviderRunId, SignalType } from '../providers/contracts'
import type { EvidenceDocument } from '../providers/evidence-provider'
import type { CandidateSignal } from '../providers/search-provider'

const DEFAULT_MIN_CLEANED_TEXT_LENGTH = 40

export type EvidenceGateReasonCode =
  | 'no_evidence_documents'
  | 'missing_provider_run_id'
  | 'missing_source_locator'
  | 'weak_evidence_content'
  | 'source_mismatch'
  | 'signal_type_mismatch'

export interface EvidenceGateInput {
  candidate: CandidateSignal
  evidence: EvidenceDocument[]
  requiredSignalType?: SignalType
  minCleanedTextLength?: number
}

interface EvidenceGateBase {
  candidate: CandidateSignal
  evidence: EvidenceDocument[]
  gateReasons: string[]
  readyForClassification: boolean
  createdOpportunity: false
  score: null
  outreachDrafted: false
}

export interface EvidenceGatePass extends EvidenceGateBase {
  ok: true
  providerRunIds: ProviderRunId[]
  evidenceSourceUrls: string[]
  readyForClassification: true
}

export interface EvidenceGateFail extends EvidenceGateBase {
  ok: false
  fallbackState: Extract<FallbackState, 'missing_evidence' | 'needs_review'>
  reasonCode: EvidenceGateReasonCode
  readyForClassification: false
}

export type EvidenceGateResult = EvidenceGatePass | EvidenceGateFail

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function normalizeHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '')
}

function sourceMatchesCandidate(candidateUrl: string, sourceUrl: string): boolean {
  const candidate = normalizeUrl(candidateUrl)
  const source = normalizeUrl(sourceUrl)

  if (!candidate || !source) return false
  if (candidate.href === source.href) return true

  const candidateHost = normalizeHost(candidate)
  const sourceHost = normalizeHost(source)

  return (
    candidateHost === sourceHost ||
    candidateHost.endsWith(`.${sourceHost}`) ||
    sourceHost.endsWith(`.${candidateHost}`)
  )
}

function evidenceSourceUrl(doc: EvidenceDocument): string | undefined {
  return isNonEmptyString(doc.sourceUrl) ? doc.sourceUrl.trim() : undefined
}

function evidenceSourceName(doc: EvidenceDocument): string | undefined {
  return isNonEmptyString(doc.sourceName) ? doc.sourceName.trim() : undefined
}

function fail(
  input: EvidenceGateInput,
  fallbackState: EvidenceGateFail['fallbackState'],
  reasonCode: EvidenceGateReasonCode,
  gateReasons: string[],
): EvidenceGateFail {
  return {
    ok: false,
    candidate: input.candidate,
    evidence: input.evidence,
    fallbackState,
    reasonCode,
    gateReasons,
    readyForClassification: false,
    createdOpportunity: false,
    score: null,
    outreachDrafted: false,
  }
}

export function evaluateEvidenceGate(input: EvidenceGateInput): EvidenceGateResult {
  const minCleanedTextLength =
    input.minCleanedTextLength ?? DEFAULT_MIN_CLEANED_TEXT_LENGTH
  const { candidate, evidence, requiredSignalType } = input

  if (requiredSignalType && candidate.signalType !== requiredSignalType) {
    return fail(input, 'needs_review', 'signal_type_mismatch', [
      `Candidate signal type "${candidate.signalType}" does not match required signal type "${requiredSignalType}".`,
    ])
  }

  if (!isNonEmptyString(candidate.providerRunId)) {
    return fail(input, 'missing_evidence', 'missing_provider_run_id', [
      'Candidate is missing provider run lineage.',
    ])
  }

  if (evidence.length === 0) {
    return fail(input, 'missing_evidence', 'no_evidence_documents', [
      'Candidate has no hydrated evidence documents.',
    ])
  }

  const providerRunIds = new Set<ProviderRunId>([candidate.providerRunId])
  const evidenceSourceUrls: string[] = []
  const candidateUrl = isNonEmptyString(candidate.hit.url)
    ? candidate.hit.url.trim()
    : undefined

  for (const doc of evidence) {
    if (!isNonEmptyString(doc.providerRunId)) {
      return fail(input, 'missing_evidence', 'missing_provider_run_id', [
        'Evidence document is missing provider run lineage.',
      ])
    }

    providerRunIds.add(doc.providerRunId)

    const sourceUrl = evidenceSourceUrl(doc)
    const sourceName = evidenceSourceName(doc)

    if (!sourceUrl && !sourceName) {
      return fail(input, 'missing_evidence', 'missing_source_locator', [
        'Evidence document is missing source URL or source name.',
      ])
    }

    if (!isNonEmptyString(doc.cleanedText) || doc.cleanedText.trim().length < minCleanedTextLength) {
      return fail(input, 'missing_evidence', 'weak_evidence_content', [
        `Evidence content is shorter than the ${minCleanedTextLength}-character minimum.`,
      ])
    }

    if (sourceUrl) {
      evidenceSourceUrls.push(sourceUrl)

      if (candidateUrl && !sourceMatchesCandidate(candidateUrl, sourceUrl)) {
        return fail(input, 'needs_review', 'source_mismatch', [
          'Evidence source URL does not match the candidate source URL or domain.',
        ])
      }
    }
  }

  return {
    ok: true,
    candidate,
    evidence,
    providerRunIds: Array.from(providerRunIds),
    evidenceSourceUrls,
    gateReasons: [
      'Candidate provider run lineage is present.',
      'Evidence provider run lineage is present.',
      'Evidence is source-linked and has usable content.',
      candidateUrl
        ? 'Evidence source matches the candidate source URL or domain.'
        : 'Candidate has no source URL; evidence source locator is present.',
    ],
    readyForClassification: true,
    createdOpportunity: false,
    score: null,
    outreachDrafted: false,
  }
}
