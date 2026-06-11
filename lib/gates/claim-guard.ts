/**
 * CP-CG1 - Claim Guard contract proof.
 *
 * Deterministic trust gate only. It validates a user-visible artifact before it
 * can be surfaced. It does not classify, score, create opportunities, draft
 * outreach, call providers, read env, write DB records, read system time, or
 * affect routes/UI. Time is injected through evaluatedAt.
 */

import type { FallbackState } from '../providers/contracts'
import type { EvidenceDocument } from '../providers/evidence-provider'

export type ClaimGuardLeadKind =
  | 'signal_backed_opportunity'
  | 'evidence_backed_prospect'
  | 'exploratory_prospect'

export type ClaimGuardEvidenceDocument = EvidenceDocument

export interface ClaimGuardArtifactClaim {
  kind: string
  text: string
  evidenceIndexes: number[]
}

export interface ClaimGuardScoreReason {
  code: string
  text: string
  evidenceIndexes: number[]
}

export interface ClaimGuardContactClaim {
  name?: string
  title?: string
  email?: string
  phone?: string
  routeType: string
  evidenceIndexes: number[]
}

export interface ClaimGuardArtifact {
  workspaceId: string
  leadKind: ClaimGuardLeadKind
  signalLabel?: string
  verticalFitLabel?: string
  claimsUrgency: boolean
  claims: ClaimGuardArtifactClaim[]
  score?: number
  scoreReasons?: ClaimGuardScoreReason[]
  contacts?: ClaimGuardContactClaim[]
  recommendedAction?: string
  evidence: ClaimGuardEvidenceDocument[]
}

export interface ClaimGuardConfig {
  approvedSignalLabels: readonly string[]
  approvedVerticalFitLabels: readonly string[]
  maxSignalAgeDays: number
  prospectBannedPhrases?: readonly string[]
  speculativePhrases?: readonly string[]
}

export interface ClaimGuardInput {
  artifact: ClaimGuardArtifact
  config: ClaimGuardConfig
  evaluatedAt: string
}

export type ClaimGuardReasonCode =
  | 'missing_evidence'
  | 'opportunity_without_dated_evidence'
  | 'invalid_evaluated_at'
  | 'urgency_claim_on_prospect'
  | 'stale_signal_for_urgency'
  | 'unapproved_signal_label'
  | 'unapproved_vertical_fit_label'
  | 'unsupported_claim'
  | 'banned_prospect_phrase'
  | 'speculative_claim_without_verbatim_evidence'
  | 'score_without_reason'
  | 'score_reason_without_evidence'
  | 'invalid_evidence_index'
  | 'invalid_score'
  | 'unsourced_contact_claim'
  | 'missing_recommended_action'

export interface ClaimGuardViolation {
  reasonCode: ClaimGuardReasonCode
  path: string
  message: string
}

interface ClaimGuardSideEffects {
  createdOpportunity: false
  createdScore: false
  outreachDrafted: false
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
}

interface ClaimGuardBase extends ClaimGuardSideEffects {
  workspaceId: string
  leadKind: ClaimGuardLeadKind
  gateReasons: string[]
}

export interface ClaimGuardPass extends ClaimGuardBase {
  ok: true
  surfaceable: true
  violations: []
}

export interface ClaimGuardBlock extends ClaimGuardBase {
  ok: false
  surfaceable: false
  reasonCode: ClaimGuardReasonCode
  fallbackState: Extract<FallbackState, 'missing_evidence' | 'needs_review'>
  violations: ClaimGuardViolation[]
}

export type ClaimGuardDecision = ClaimGuardPass | ClaimGuardBlock

export const DEFAULT_PROSPECT_BANNED_PHRASES = [
  'needs this week',
  'need this week',
  'needs it this week',
  'urgent',
  'act now',
  'right now',
  'immediately',
  'buying now',
  'ready to buy',
  'before competitors',
  'window is closing',
  'why now',
] as const

export const DEFAULT_SPECULATIVE_PHRASES = [
  'budget is allocated',
  'budget approved',
  'confirmed budget',
  'budget confirmed',
  'decision-maker knows',
  'decision maker knows',
  'has not been called',
  "haven't been called",
  'no vendor selected',
  'no claim filed',
  'actively looking',
  'ready to sign',
] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalize(value: string): string {
  return value.toLowerCase()
}

function parseIsoMs(value: string | undefined): number | null {
  if (!isNonEmptyString(value)) return null

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function hasSourceLocator(document: ClaimGuardEvidenceDocument): boolean {
  return (
    isNonEmptyString(document.sourceUrl) ||
    isNonEmptyString(document.sourceName)
  )
}

function firstPhraseIn(
  text: string,
  phrases: readonly string[],
): string | null {
  const normalizedText = normalize(text)

  for (const phrase of phrases) {
    if (normalizedText.includes(normalize(phrase))) {
      return phrase
    }
  }

  return null
}

function isValidEvidenceIndex(index: number, evidenceCount: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < evidenceCount
}

function validEvidenceIndexes(
  indexes: readonly number[],
  evidenceCount: number,
): boolean {
  return indexes.every((index) => isValidEvidenceIndex(index, evidenceCount))
}

function citesSourceLinkedEvidence(
  indexes: readonly number[],
  evidence: readonly ClaimGuardEvidenceDocument[],
): boolean {
  return indexes.some((index) => {
    if (!isValidEvidenceIndex(index, evidence.length)) return false

    const document = evidence[index]
    return document !== undefined && hasSourceLocator(document)
  })
}

function citedEvidenceText(
  indexes: readonly number[],
  evidence: readonly ClaimGuardEvidenceDocument[],
): string {
  return indexes
    .map((index) => evidence[index])
    .filter((document): document is ClaimGuardEvidenceDocument => {
      return document !== undefined
    })
    .map((document) => `${document.title ?? ''}\n${document.cleanedText}`)
    .join('\n')
    .toLowerCase()
}

function newestDatedSourceEvidenceMs(
  evidence: readonly ClaimGuardEvidenceDocument[],
): number | null {
  let newest: number | null = null

  for (const document of evidence) {
    if (!hasSourceLocator(document)) continue

    const publishedAtMs = parseIsoMs(document.publishedAt)
    if (publishedAtMs === null) continue

    if (newest === null || publishedAtMs > newest) {
      newest = publishedAtMs
    }
  }

  return newest
}

function missingEvidenceOnly(violations: readonly ClaimGuardViolation[]): boolean {
  return violations.every((violation) => {
    return (
      violation.reasonCode === 'missing_evidence' ||
      violation.reasonCode === 'opportunity_without_dated_evidence'
    )
  })
}

function inertSideEffects(): ClaimGuardSideEffects {
  return {
    createdOpportunity: false,
    createdScore: false,
    outreachDrafted: false,
    providerCalls: 0,
    dbWrites: 0,
    routesChanged: 0,
  }
}

export function evaluateClaimGuard(input: ClaimGuardInput): ClaimGuardDecision {
  const { artifact, config } = input
  const violations: ClaimGuardViolation[] = []
  const isOpportunity = artifact.leadKind === 'signal_backed_opportunity'
  const prospectBannedPhrases =
    config.prospectBannedPhrases ?? DEFAULT_PROSPECT_BANNED_PHRASES
  const speculativePhrases =
    config.speculativePhrases ?? DEFAULT_SPECULATIVE_PHRASES

  const sourcedEvidenceCount = artifact.evidence.filter(hasSourceLocator).length
  const newestDatedEvidenceMs = newestDatedSourceEvidenceMs(artifact.evidence)

  if (sourcedEvidenceCount === 0) {
    violations.push({
      reasonCode: 'missing_evidence',
      path: 'evidence',
      message:
        'User-visible artifacts require at least one source-linked evidence document.',
    })
  }

  if (isOpportunity && newestDatedEvidenceMs === null) {
    violations.push({
      reasonCode: 'opportunity_without_dated_evidence',
      path: 'evidence',
      message:
        'signal_backed_opportunity requires at least one dated, source-linked evidence document.',
    })
  }

  if (
    isNonEmptyString(artifact.signalLabel) &&
    !config.approvedSignalLabels.includes(artifact.signalLabel)
  ) {
    violations.push({
      reasonCode: 'unapproved_signal_label',
      path: 'signalLabel',
      message: `Signal label "${artifact.signalLabel}" is not approved by the injected playbook config.`,
    })
  }

  if (
    isNonEmptyString(artifact.verticalFitLabel) &&
    !config.approvedVerticalFitLabels.includes(artifact.verticalFitLabel)
  ) {
    violations.push({
      reasonCode: 'unapproved_vertical_fit_label',
      path: 'verticalFitLabel',
      message: `Vertical-fit label "${artifact.verticalFitLabel}" is not approved by the injected playbook config.`,
    })
  }

  if (artifact.claimsUrgency && !isOpportunity) {
    violations.push({
      reasonCode: 'urgency_claim_on_prospect',
      path: 'claimsUrgency',
      message:
        'Urgency claims are allowed only for signal-backed opportunities.',
    })
  }

  if (artifact.claimsUrgency && isOpportunity && newestDatedEvidenceMs !== null) {
    const evaluatedAtMs = parseIsoMs(input.evaluatedAt)

    if (evaluatedAtMs === null) {
      violations.push({
        reasonCode: 'invalid_evaluated_at',
        path: 'evaluatedAt',
        message: 'evaluatedAt must be a parseable ISO timestamp.',
      })
    } else {
      const signalAgeDays = (evaluatedAtMs - newestDatedEvidenceMs) / 86_400_000

      if (signalAgeDays > config.maxSignalAgeDays) {
        violations.push({
          reasonCode: 'stale_signal_for_urgency',
          path: 'claimsUrgency',
          message: `Urgency requires signal evidence no older than ${config.maxSignalAgeDays} days.`,
        })
      }
    }
  }

  artifact.claims.forEach((claim, index) => {
    const path = `claims[${index}]`

    if (!validEvidenceIndexes(claim.evidenceIndexes, artifact.evidence.length)) {
      violations.push({
        reasonCode: 'invalid_evidence_index',
        path,
        message: `Claim "${claim.kind}" cites an evidence index outside the artifact evidence array.`,
      })
      return
    }

    if (!citesSourceLinkedEvidence(claim.evidenceIndexes, artifact.evidence)) {
      violations.push({
        reasonCode: 'unsupported_claim',
        path,
        message: `Claim "${claim.kind}" must cite source-linked evidence by index.`,
      })
    }

    if (!isOpportunity) {
      const bannedPhrase = firstPhraseIn(claim.text, prospectBannedPhrases)

      if (bannedPhrase !== null) {
        violations.push({
          reasonCode: 'banned_prospect_phrase',
          path,
          message: `Prospect claim "${claim.kind}" contains unsupported urgency phrase "${bannedPhrase}".`,
        })
      }
    }

    const speculativePhrase = firstPhraseIn(claim.text, speculativePhrases)

    if (speculativePhrase !== null) {
      const supportingText = citedEvidenceText(
        claim.evidenceIndexes,
        artifact.evidence,
      )

      if (!supportingText.includes(normalize(speculativePhrase))) {
        violations.push({
          reasonCode: 'speculative_claim_without_verbatim_evidence',
          path,
          message: `Claim "${claim.kind}" asserts "${speculativePhrase}" without verbatim support in cited evidence.`,
        })
      }
    }
  })

  const scoreReasons = artifact.scoreReasons ?? []

  if (artifact.score !== undefined) {
    if (
      !Number.isInteger(artifact.score) ||
      artifact.score < 0 ||
      artifact.score > 100
    ) {
      violations.push({
        reasonCode: 'invalid_score',
        path: 'score',
        message: 'Score must be an integer from 0 to 100.',
      })
    }

    if (scoreReasons.length === 0) {
      violations.push({
        reasonCode: 'score_without_reason',
        path: 'scoreReasons',
        message: 'A visible score requires at least one source-linked score reason.',
      })
    }
  }

  scoreReasons.forEach((reason, index) => {
    const path = `scoreReasons[${index}]`

    if (!validEvidenceIndexes(reason.evidenceIndexes, artifact.evidence.length)) {
      violations.push({
        reasonCode: 'invalid_evidence_index',
        path,
        message: `Score reason "${reason.code}" cites an invalid evidence index.`,
      })
      return
    }

    if (!citesSourceLinkedEvidence(reason.evidenceIndexes, artifact.evidence)) {
      violations.push({
        reasonCode: 'score_reason_without_evidence',
        path,
        message: `Score reason "${reason.code}" must cite source-linked evidence by index.`,
      })
    }
  })

  ;(artifact.contacts ?? []).forEach((contact, index) => {
    const path = `contacts[${index}]`
    const namedContactClaim =
      isNonEmptyString(contact.name) ||
      isNonEmptyString(contact.title) ||
      isNonEmptyString(contact.email)

    if (!validEvidenceIndexes(contact.evidenceIndexes, artifact.evidence.length)) {
      violations.push({
        reasonCode: 'invalid_evidence_index',
        path,
        message: 'Contact claim cites an invalid evidence index.',
      })
      return
    }

    if (
      namedContactClaim &&
      !citesSourceLinkedEvidence(contact.evidenceIndexes, artifact.evidence)
    ) {
      violations.push({
        reasonCode: 'unsourced_contact_claim',
        path,
        message:
          'Named contact claims require source-linked contact evidence by index.',
      })
    }
  })

  if (!isNonEmptyString(artifact.recommendedAction)) {
    violations.push({
      reasonCode: 'missing_recommended_action',
      path: 'recommendedAction',
      message:
        'User-visible explanations require a recommended action.',
    })
  }

  const base: ClaimGuardBase = {
    workspaceId: artifact.workspaceId,
    leadKind: artifact.leadKind,
    gateReasons:
      violations.length === 0
        ? [
            'Evidence is source-linked.',
            'Opportunity, label, claim, score, contact, urgency, and action guardrails passed.',
            'Claim Guard remains inert: no opportunity, score, outreach, provider call, DB write, route, or UI is created.',
          ]
        : violations.map((violation) => violation.message),
    ...inertSideEffects(),
  }

  if (violations.length === 0) {
    return {
      ...base,
      ok: true,
      surfaceable: true,
      violations: [],
    }
  }

  return {
    ...base,
    ok: false,
    surfaceable: false,
    reasonCode: violations[0].reasonCode,
    fallbackState: missingEvidenceOnly(violations)
      ? 'missing_evidence'
      : 'needs_review',
    violations,
  }
}
