/**
 * CP16 - Contact Route / Outreach Play contract proof.
 *
 * Deterministic eligibility gate only. It selects the safest outreach output
 * mode without provider calls, DB writes, env reads, system time, LLM calls,
 * network, route/UI imports, opportunity creation, scoring, email sending, CRM
 * sync, or export implementation.
 */

import type { FallbackState } from '../providers/contracts'
import type { EvidenceDocument } from '../providers/evidence-provider'

export type ContactRouteLeadKind =
  | 'signal_backed_opportunity'
  | 'evidence_backed_prospect'
  | 'exploratory_prospect'

export type ContactRouteReadiness =
  | 'verified_route'
  | 'plausible_route'
  | 'procurement_only'
  | 'needs_review'
  | 'blocked'

export type ContactRouteType =
  | 'direct_email'
  | 'direct_phone'
  | 'contact_form'
  | 'front_desk'
  | 'procurement_portal'
  | 'public_bid_contact'
  | 'property_manager_company'
  | 'general_business_contact'
  | 'social_profile'
  | 'unknown'

export type ContactRouteConfidence =
  | 'verified'
  | 'plausible'
  | 'needs_review'
  | 'blocked'

export type OutreachPlayLevel =
  | 'source_backed_personalized_draft'
  | 'evidence_limited_draft'
  | 'generic_outreach_template'
  | 'procurement_only'
  | 'manual_review_recommended'

export type AllowedOutreachMode = OutreachPlayLevel

export type OutreachRiskLevel = 'low' | 'medium' | 'high'

export type OutreachClaimKind =
  | 'opener'
  | 'fit_reason'
  | 'contact_context'
  | 'urgency'
  | 'damage'
  | 'active_need'
  | 'buying_intent'
  | 'budget'
  | 'decision_authority'
  | 'insurance_claim'
  | 'vendor_selection'
  | (string & {})

export type ContactRouteOutreachReasonCode =
  | 'missing_evidence'
  | 'missing_route'
  | 'invalid_evidence_index'
  | 'route_without_evidence'
  | 'named_contact_without_source'
  | 'email_without_source'
  | 'phone_without_source'
  | 'url_without_source'
  | 'unsupported_claim'
  | 'urgency_claim_without_signal'
  | 'high_risk_claim_without_verbatim_support'
  | 'procurement_required'
  | 'outreach_not_allowed_for_exploratory'
  | 'missing_recommended_action'
  | 'no_usable_route'
  | 'blocked_route'
  | 'side_effect_violation'

export interface ContactRouteCandidate {
  routeType: ContactRouteType
  label: string
  evidenceIndexes: number[]
  confidence: ContactRouteConfidence
  name?: string
  title?: string
  email?: string
  phone?: string
  url?: string
  organization?: string
  notes?: string
}

export interface OutreachClaim {
  kind: OutreachClaimKind
  text: string
  evidenceIndexes: number[]
  riskLevel: OutreachRiskLevel
  sourcePhrase?: string
}

export interface ContactRouteSignalMetadata {
  label?: string
  evidenceIndexes?: number[]
  fresh?: boolean
}

export interface ContactRouteOutreachInput {
  workspaceId: string
  leadKind: ContactRouteLeadKind
  evidence: EvidenceDocument[]
  routeCandidates: ContactRouteCandidate[]
  outreachClaims: OutreachClaim[]
  procurementRequired?: boolean
  signal?: ContactRouteSignalMetadata
  recommendedAction?: string
}

export interface ContactRouteOutreachViolation {
  reasonCode: ContactRouteOutreachReasonCode
  path: string
  message: string
}

export interface BlockedOutreachClaim {
  reasonCode: ContactRouteOutreachReasonCode
  path: string
  message: string
  claimKind?: OutreachClaimKind
  claimText?: string
}

export interface ContactRouteOutreachSideEffects {
  sentEmail: false
  wroteDb: false
  providerCalls: 0
  llmCalls: 0
  createdCrmRecord: false
  createdExport: false
  routesChanged: 0
}

interface ContactRouteOutreachBase extends ContactRouteOutreachSideEffects {
  workspaceId: string
  leadKind: ContactRouteLeadKind
  routeReadiness: ContactRouteReadiness
  outreachPlayLevel: OutreachPlayLevel
  allowedOutreachMode: AllowedOutreachMode
  outreachCtaAvailable: true
  selectedRoute: ContactRouteCandidate | null
  gateReasons: string[]
  recommendedAction: string
  blockedClaims: BlockedOutreachClaim[]
  personalizationAllowed: boolean
}

export interface ContactRouteOutreachPass extends ContactRouteOutreachBase {
  ok: true
  routeReady: boolean
  outreachAllowed: boolean
  violations: ContactRouteOutreachViolation[]
}

export interface ContactRouteOutreachBlock extends ContactRouteOutreachBase {
  ok: false
  routeReady: boolean
  outreachAllowed: false
  reasonCode: ContactRouteOutreachReasonCode
  fallbackState: Extract<
    FallbackState,
    'needs_review' | 'missing_evidence' | 'weak_fit' | 'discarded'
  >
  violations: ContactRouteOutreachViolation[]
}

export type ContactRouteOutreachDecision =
  | ContactRouteOutreachPass
  | ContactRouteOutreachBlock

const SIDE_EFFECTS: ContactRouteOutreachSideEffects = {
  sentEmail: false,
  wroteDb: false,
  providerCalls: 0,
  llmCalls: 0,
  createdCrmRecord: false,
  createdExport: false,
  routesChanged: 0,
}

const PROCUREMENT_ROUTE_TYPES: readonly ContactRouteType[] = [
  'procurement_portal',
  'public_bid_contact',
]

const HIGH_RISK_CLAIM_KINDS: readonly OutreachClaimKind[] = [
  'urgency',
  'damage',
  'active_need',
  'buying_intent',
  'budget',
  'decision_authority',
  'insurance_claim',
  'vendor_selection',
]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function trimmedAction(value: string | undefined): string | null {
  return isNonEmptyString(value) ? value.trim() : null
}

function isValidEvidenceIndex(index: number, evidenceCount: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < evidenceCount
}

function hasValidIndexes(indexes: readonly number[], evidenceCount: number): boolean {
  return indexes.every((index) => isValidEvidenceIndex(index, evidenceCount))
}

function evidenceText(document: EvidenceDocument): string {
  const parts = [
    document.cleanedText,
    document.title,
    document.sourceUrl,
    document.sourceName,
  ].filter(isNonEmptyString)

  return parts.join(' ')
}

function citedEvidenceText(
  indexes: readonly number[],
  evidence: readonly EvidenceDocument[],
): string {
  return indexes
    .map((index) => evidence[index])
    .filter((document): document is EvidenceDocument => document !== undefined)
    .map(evidenceText)
    .join(' ')
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizeLoose(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizePhone(value: string): string {
  return value.replace(/\D+/g, '')
}

function normalizeUrl(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, '')
}

function textSupportsValue(text: string, value: string): boolean {
  const normalizedText = normalizeText(text)
  const normalizedValue = normalizeText(value)

  return (
    normalizedText.includes(normalizedValue) ||
    normalizeLoose(normalizedText).includes(normalizeLoose(normalizedValue))
  )
}

function textSupportsPhone(text: string, phone: string): boolean {
  const normalizedPhone = normalizePhone(phone)
  return (
    normalizedPhone.length > 0 &&
    normalizePhone(text).includes(normalizedPhone)
  )
}

function textSupportsUrl(text: string, url: string): boolean {
  const normalizedText = normalizeUrl(text)
  const normalizedUrl = normalizeUrl(url)

  return (
    normalizedText.includes(normalizedUrl) ||
    normalizeLoose(normalizedText).includes(normalizeLoose(normalizedUrl))
  )
}

function claimIsHighRisk(claim: OutreachClaim): boolean {
  return (
    claim.riskLevel === 'high' ||
    HIGH_RISK_CLAIM_KINDS.includes(claim.kind)
  )
}

function claimHasVerbatimSupport(
  claim: OutreachClaim,
  evidence: readonly EvidenceDocument[],
): boolean {
  const text = citedEvidenceText(claim.evidenceIndexes, evidence)
  const supportPhrases = [claim.sourcePhrase, claim.text].filter(isNonEmptyString)

  return supportPhrases.some((phrase) => textSupportsValue(text, phrase))
}

function routeReadinessFromCandidate(
  route: ContactRouteCandidate | null,
  procurementRequired: boolean,
): ContactRouteReadiness {
  if (route === null) return 'needs_review'

  if (procurementRequired && PROCUREMENT_ROUTE_TYPES.includes(route.routeType)) {
    return 'procurement_only'
  }

  if (route.confidence === 'verified') return 'verified_route'
  if (route.confidence === 'plausible') return 'plausible_route'
  if (route.confidence === 'blocked') return 'blocked'

  return 'needs_review'
}

function fallbackFor(
  reasonCode: ContactRouteOutreachReasonCode,
): ContactRouteOutreachBlock['fallbackState'] {
  if (reasonCode === 'missing_evidence') return 'missing_evidence'
  if (reasonCode === 'blocked_route') return 'discarded'
  if (reasonCode === 'no_usable_route') return 'weak_fit'

  return 'needs_review'
}

function actionFor(mode: AllowedOutreachMode): string {
  switch (mode) {
    case 'source_backed_personalized_draft':
      return 'draft source-backed personalized outreach'
    case 'evidence_limited_draft':
      return 'draft evidence-limited outreach without risky claims'
    case 'generic_outreach_template':
      return 'hydrate contact evidence'
    case 'procurement_only':
      return 'use procurement portal'
    case 'manual_review_recommended':
      return 'send to review'
  }
}

function directOutreachAvailable(mode: AllowedOutreachMode): boolean {
  return mode !== 'procurement_only'
}

function violation(
  reasonCode: ContactRouteOutreachReasonCode,
  path: string,
  message: string,
): ContactRouteOutreachViolation {
  return { reasonCode, path, message }
}

function blockedClaim(
  reasonCode: ContactRouteOutreachReasonCode,
  path: string,
  message: string,
  claim?: OutreachClaim,
): BlockedOutreachClaim {
  return {
    reasonCode,
    path,
    message,
    claimKind: claim?.kind,
    claimText: claim?.text,
  }
}

function blockDecision(params: {
  input: ContactRouteOutreachInput
  reasonCode: ContactRouteOutreachReasonCode
  path: string
  message: string
  selectedRoute?: ContactRouteCandidate | null
  routeReadiness?: ContactRouteReadiness
  allowedOutreachMode?: AllowedOutreachMode
  routeReady?: boolean
}): ContactRouteOutreachBlock {
  const mode = params.allowedOutreachMode ?? 'manual_review_recommended'
  const action = trimmedAction(params.input.recommendedAction) ?? actionFor(mode)

  return {
    ok: false,
    workspaceId: params.input.workspaceId,
    leadKind: params.input.leadKind,
    routeReady: params.routeReady ?? false,
    outreachAllowed: false,
    routeReadiness: params.routeReadiness ?? 'blocked',
    outreachPlayLevel: mode,
    allowedOutreachMode: mode,
    outreachCtaAvailable: true,
    selectedRoute: params.selectedRoute ?? null,
    reasonCode: params.reasonCode,
    fallbackState: fallbackFor(params.reasonCode),
    violations: [violation(params.reasonCode, params.path, params.message)],
    gateReasons: [params.message],
    recommendedAction: action,
    blockedClaims: [],
    personalizationAllowed: false,
    ...SIDE_EFFECTS,
  }
}

function safeDecision(params: {
  input: ContactRouteOutreachInput
  selectedRoute: ContactRouteCandidate | null
  routeReadiness: ContactRouteReadiness
  allowedOutreachMode: AllowedOutreachMode
  routeReady: boolean
  personalizationAllowed: boolean
  violations: ContactRouteOutreachViolation[]
  blockedClaims: BlockedOutreachClaim[]
  gateReasons: string[]
  recommendedAction?: string
}): ContactRouteOutreachPass {
  const mode = params.allowedOutreachMode
  const action =
    trimmedAction(params.input.recommendedAction) ??
    trimmedAction(params.recommendedAction) ??
    actionFor(mode)

  return {
    ok: true,
    workspaceId: params.input.workspaceId,
    leadKind: params.input.leadKind,
    routeReady: params.routeReady,
    outreachAllowed: directOutreachAvailable(mode),
    routeReadiness: params.routeReadiness,
    outreachPlayLevel: mode,
    allowedOutreachMode: mode,
    outreachCtaAvailable: true,
    selectedRoute: params.selectedRoute,
    gateReasons: params.gateReasons,
    recommendedAction: action,
    blockedClaims: params.blockedClaims,
    personalizationAllowed: params.personalizationAllowed,
    violations: params.violations,
    ...SIDE_EFFECTS,
  }
}

function firstSupportedRoute(
  input: ContactRouteOutreachInput,
): ContactRouteCandidate | null {
  const candidates = input.routeCandidates.filter(
    (route) =>
      route.confidence !== 'blocked' &&
      route.routeType !== 'unknown' &&
      route.evidenceIndexes.length > 0,
  )

  if (input.procurementRequired === true) {
    return (
      candidates.find((route) => PROCUREMENT_ROUTE_TYPES.includes(route.routeType)) ??
      candidates[0] ??
      null
    )
  }

  return candidates[0] ?? null
}

function routeSupportViolations(
  selectedRoute: ContactRouteCandidate,
  input: ContactRouteOutreachInput,
): {
  violations: ContactRouteOutreachViolation[]
  blockedClaims: BlockedOutreachClaim[]
} {
  const selectedRouteText = citedEvidenceText(
    selectedRoute.evidenceIndexes,
    input.evidence,
  )
  const violations: ContactRouteOutreachViolation[] = []
  const blockedClaims: BlockedOutreachClaim[] = []

  const add = (
    reasonCode: ContactRouteOutreachReasonCode,
    path: string,
    message: string,
  ): void => {
    violations.push(violation(reasonCode, path, message))
    blockedClaims.push(blockedClaim(reasonCode, path, message))
  }

  if (
    (isNonEmptyString(selectedRoute.name) &&
      !textSupportsValue(selectedRouteText, selectedRoute.name)) ||
    (isNonEmptyString(selectedRoute.title) &&
      !textSupportsValue(selectedRouteText, selectedRoute.title))
  ) {
    add(
      'named_contact_without_source',
      'selectedRoute.name',
      'Named contact or title is not supported by cited route evidence.',
    )
  }

  if (
    isNonEmptyString(selectedRoute.email) &&
    !textSupportsValue(selectedRouteText, selectedRoute.email)
  ) {
    add(
      'email_without_source',
      'selectedRoute.email',
      'Email address is not supported by cited route evidence.',
    )
  }

  if (
    isNonEmptyString(selectedRoute.phone) &&
    !textSupportsPhone(selectedRouteText, selectedRoute.phone)
  ) {
    add(
      'phone_without_source',
      'selectedRoute.phone',
      'Phone number is not supported by cited route evidence.',
    )
  }

  if (
    isNonEmptyString(selectedRoute.url) &&
    !textSupportsUrl(selectedRouteText, selectedRoute.url)
  ) {
    add(
      'url_without_source',
      'selectedRoute.url',
      'URL, form, or portal route is not supported by cited evidence.',
    )
  }

  return { violations, blockedClaims }
}

function claimSafety(
  input: ContactRouteOutreachInput,
): {
  violations: ContactRouteOutreachViolation[]
  blockedClaims: BlockedOutreachClaim[]
} {
  const violations: ContactRouteOutreachViolation[] = []
  const blockedClaims: BlockedOutreachClaim[] = []

  input.outreachClaims.forEach((claim, claimIndex) => {
    const path = `outreachClaims[${claimIndex}]`

    if (claim.evidenceIndexes.length === 0) {
      const message = 'Every outreach claim must cite evidence indexes.'
      violations.push(violation('invalid_evidence_index', `${path}.evidenceIndexes`, message))
      blockedClaims.push(
        blockedClaim('invalid_evidence_index', `${path}.evidenceIndexes`, message, claim),
      )
      return
    }

    const highRisk = claimIsHighRisk(claim)

    if (input.leadKind === 'exploratory_prospect' && highRisk) {
      const message =
        'Exploratory prospects cannot use lead-specific urgency, damage, need, budget, buying-intent, or authority claims.'
      violations.push(violation('outreach_not_allowed_for_exploratory', path, message))
      blockedClaims.push(
        blockedClaim('outreach_not_allowed_for_exploratory', path, message, claim),
      )
      return
    }

    if (input.leadKind === 'evidence_backed_prospect' && highRisk) {
      const message =
        'Evidence-backed prospects cannot use urgency, damage, need, budget, buying-intent, insurance, vendor-selection, or authority claims.'
      violations.push(violation('urgency_claim_without_signal', path, message))
      blockedClaims.push(blockedClaim('urgency_claim_without_signal', path, message, claim))
      return
    }

    if (input.leadKind === 'signal_backed_opportunity' && highRisk) {
      if (input.signal === undefined || input.signal.fresh !== true) {
        const message = 'High-risk opportunity claims require fresh signal metadata.'
        violations.push(violation('urgency_claim_without_signal', path, message))
        blockedClaims.push(blockedClaim('urgency_claim_without_signal', path, message, claim))
        return
      }

      if (!claimHasVerbatimSupport(claim, input.evidence)) {
        const message =
          'High-risk outreach claims require verbatim support in cited evidence.'
        violations.push(
          violation('high_risk_claim_without_verbatim_support', `${path}.text`, message),
        )
        blockedClaims.push(
          blockedClaim(
            'high_risk_claim_without_verbatim_support',
            `${path}.text`,
            message,
            claim,
          ),
        )
      }
    }
  })

  return { violations, blockedClaims }
}

function missingEvidenceDecision(
  input: ContactRouteOutreachInput,
): ContactRouteOutreachPass {
  const message =
    'Missing evidence limits outreach to a generic template with no lead-specific personalization.'
  const blockedClaims = input.outreachClaims.map((claim, claimIndex) =>
    blockedClaim(
      'missing_evidence',
      `outreachClaims[${claimIndex}]`,
      'Lead-specific claim removed because no source-linked evidence is available.',
      claim,
    ),
  )

  return safeDecision({
    input,
    selectedRoute: null,
    routeReadiness: 'needs_review',
    allowedOutreachMode: 'generic_outreach_template',
    routeReady: false,
    personalizationAllowed: false,
    violations: [violation('missing_evidence', 'evidence', message)],
    blockedClaims,
    gateReasons: [message],
    recommendedAction: 'hydrate evidence',
  })
}

export function evaluateContactRouteOutreach(
  input: ContactRouteOutreachInput,
): ContactRouteOutreachDecision {
  if (input.evidence.length === 0) {
    return missingEvidenceDecision(input)
  }

  for (const [routeIndex, route] of input.routeCandidates.entries()) {
    if (!hasValidIndexes(route.evidenceIndexes, input.evidence.length)) {
      return blockDecision({
        input,
        reasonCode: 'invalid_evidence_index',
        path: `routeCandidates[${routeIndex}].evidenceIndexes`,
        message: 'Route candidate cites an evidence index that does not exist.',
        selectedRoute: route,
        routeReadiness: 'blocked',
        allowedOutreachMode: 'manual_review_recommended',
      })
    }
  }

  for (const [claimIndex, claim] of input.outreachClaims.entries()) {
    if (!hasValidIndexes(claim.evidenceIndexes, input.evidence.length)) {
      return blockDecision({
        input,
        reasonCode: 'invalid_evidence_index',
        path: `outreachClaims[${claimIndex}].evidenceIndexes`,
        message: 'Outreach claim cites an evidence index that does not exist.',
        routeReadiness: 'blocked',
        allowedOutreachMode: 'manual_review_recommended',
      })
    }
  }

  if (
    input.signal?.evidenceIndexes !== undefined &&
    !hasValidIndexes(input.signal.evidenceIndexes, input.evidence.length)
  ) {
    return blockDecision({
      input,
      reasonCode: 'invalid_evidence_index',
      path: 'signal.evidenceIndexes',
      message: 'Signal metadata cites an evidence index that does not exist.',
      routeReadiness: 'blocked',
      allowedOutreachMode: 'manual_review_recommended',
    })
  }

  const selectedRoute = firstSupportedRoute(input)
  const routeViolations: ContactRouteOutreachViolation[] = []
  const routeBlockedClaims: BlockedOutreachClaim[] = []

  if (input.routeCandidates.length === 0) {
    routeViolations.push(
      violation(
        'missing_route',
        'routeCandidates',
        'No contact route candidate is available; use a generic template and hydrate contact evidence.',
      ),
    )
  }

  input.routeCandidates.forEach((route, routeIndex) => {
    if (route.evidenceIndexes.length === 0) {
      routeViolations.push(
        violation(
          'route_without_evidence',
          `routeCandidates[${routeIndex}].evidenceIndexes`,
          'Contact route has no cited evidence and cannot support personalization.',
        ),
      )
    }
  })

  if (selectedRoute === null) {
    const message =
      'No usable non-unknown contact route is available; use a generic template and hydrate contact evidence.'
    const reasonCode: ContactRouteOutreachReasonCode =
      input.routeCandidates.length === 0 ? 'missing_route' : 'no_usable_route'

    return safeDecision({
      input,
      selectedRoute: null,
      routeReadiness: 'needs_review',
      allowedOutreachMode: 'generic_outreach_template',
      routeReady: false,
      personalizationAllowed: false,
      violations: [
        ...routeViolations,
        violation(reasonCode, 'routeCandidates', message),
      ],
      blockedClaims: input.outreachClaims.map((claim, claimIndex) =>
        blockedClaim(
          reasonCode,
          `outreachClaims[${claimIndex}]`,
          'Lead-specific personalization removed until a source-linked contact route is available.',
          claim,
        ),
      ),
      gateReasons: [message],
      recommendedAction: 'hydrate contact evidence',
    })
  }

  const selectedRouteSupport = routeSupportViolations(selectedRoute, input)
  routeViolations.push(...selectedRouteSupport.violations)
  routeBlockedClaims.push(...selectedRouteSupport.blockedClaims)

  if (
    input.procurementRequired === true &&
    !PROCUREMENT_ROUTE_TYPES.includes(selectedRoute.routeType)
  ) {
    const message = 'Procurement is required, so direct outreach cannot bypass it.'

    return safeDecision({
      input,
      selectedRoute,
      routeReadiness: 'procurement_only',
      allowedOutreachMode: 'procurement_only',
      routeReady: true,
      personalizationAllowed: false,
      violations: [
        ...routeViolations,
        violation('procurement_required', 'selectedRoute.routeType', message),
      ],
      blockedClaims: routeBlockedClaims,
      gateReasons: [message],
      recommendedAction: 'use procurement portal',
    })
  }

  const claimCheck = claimSafety(input)
  const violations = [...routeViolations, ...claimCheck.violations]
  const blockedClaims = [...routeBlockedClaims, ...claimCheck.blockedClaims]
  const routeReadiness = routeReadinessFromCandidate(
    selectedRoute,
    input.procurementRequired === true,
  )
  const routeReady =
    routeReadiness === 'verified_route' ||
    routeReadiness === 'plausible_route' ||
    routeReadiness === 'procurement_only'

  if (input.procurementRequired === true) {
    return safeDecision({
      input,
      selectedRoute,
      routeReadiness: 'procurement_only',
      allowedOutreachMode: 'procurement_only',
      routeReady: true,
      personalizationAllowed: false,
      violations,
      blockedClaims,
      gateReasons: ['Procurement route is supported; direct outreach is not allowed.'],
      recommendedAction: 'use procurement portal',
    })
  }

  if (input.leadKind === 'exploratory_prospect') {
    return safeDecision({
      input,
      selectedRoute,
      routeReadiness,
      allowedOutreachMode: 'generic_outreach_template',
      routeReady,
      personalizationAllowed: false,
      violations,
      blockedClaims,
      gateReasons: [
        'Exploratory prospects use generic outreach until evidence and route context are enriched.',
      ],
      recommendedAction: 'enrich evidence and contact route',
    })
  }

  if (input.leadKind === 'evidence_backed_prospect') {
    const needsReview = selectedRoute.confidence === 'needs_review'
    const mode: AllowedOutreachMode = needsReview
      ? 'manual_review_recommended'
      : 'evidence_limited_draft'

    return safeDecision({
      input,
      selectedRoute,
      routeReadiness,
      allowedOutreachMode: mode,
      routeReady,
      personalizationAllowed: false,
      violations,
      blockedClaims,
      gateReasons:
        blockedClaims.length > 0
          ? ['Prospect outreach is limited to evidence-safe language with risky claims removed.']
          : ['Prospect route and low-risk evidence support an evidence-limited draft.'],
      recommendedAction:
        blockedClaims.length > 0
          ? 'draft evidence-limited outreach without risky claims'
          : undefined,
    })
  }

  if (blockedClaims.length > 0 || selectedRoute.confidence === 'needs_review') {
    return safeDecision({
      input,
      selectedRoute,
      routeReadiness,
      allowedOutreachMode: 'manual_review_recommended',
      routeReady,
      personalizationAllowed: false,
      violations,
      blockedClaims,
      gateReasons: [
        'Opportunity outreach needs manual review because route support or claim support is incomplete.',
      ],
      recommendedAction: 'send to review',
    })
  }

  return safeDecision({
    input,
    selectedRoute,
    routeReadiness,
    allowedOutreachMode: 'source_backed_personalized_draft',
    routeReady,
    personalizationAllowed: true,
    violations,
    blockedClaims,
    gateReasons: ['Route, signal, evidence, claims, and safe outreach mode passed.'],
  })
}
