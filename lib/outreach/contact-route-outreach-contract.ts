/**
 * CP16 - Contact Route / Outreach Play contract proof.
 *
 * Deterministic eligibility gate only. It validates contact-route and
 * outreach-play readiness without provider calls, DB writes, env reads, system
 * time, LLM calls, network, route/UI imports, opportunity creation, scoring,
 * email sending, CRM sync, or export implementation.
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
  | 'draft_allowed'
  | 'manual_review_only'
  | 'procurement_only'
  | 'enrich_contact_route'
  | 'no_outreach'

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
  selectedRoute: ContactRouteCandidate | null
  gateReasons: string[]
  recommendedAction: string
}

export interface ContactRouteOutreachPass extends ContactRouteOutreachBase {
  ok: true
  routeReady: true
  outreachAllowed: boolean
  violations: []
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
  const supportPhrases = [claim.text, claim.sourcePhrase].filter(isNonEmptyString)

  return supportPhrases.some((phrase) => textSupportsValue(text, phrase))
}

function routeReadinessFromCandidate(
  route: ContactRouteCandidate,
  procurementRequired: boolean,
): ContactRouteReadiness {
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

function actionFor(reasonCode: ContactRouteOutreachReasonCode): string {
  switch (reasonCode) {
    case 'missing_evidence':
      return 'hydrate contact evidence'
    case 'procurement_required':
      return 'use procurement portal'
    case 'outreach_not_allowed_for_exploratory':
      return 'send to review'
    case 'missing_route':
    case 'route_without_evidence':
    case 'named_contact_without_source':
    case 'email_without_source':
    case 'phone_without_source':
    case 'url_without_source':
      return 'verify contact route'
    case 'missing_recommended_action':
      return 'send to review'
    case 'no_usable_route':
      return 'hydrate contact evidence'
    case 'blocked_route':
      return 'discard'
    default:
      return 'send to review'
  }
}

function blockDecision(params: {
  input: ContactRouteOutreachInput
  reasonCode: ContactRouteOutreachReasonCode
  path: string
  message: string
  selectedRoute?: ContactRouteCandidate | null
  routeReadiness?: ContactRouteReadiness
  outreachPlayLevel?: OutreachPlayLevel
  routeReady?: boolean
}): ContactRouteOutreachBlock {
  const action = trimmedAction(params.input.recommendedAction) ?? actionFor(params.reasonCode)

  return {
    ok: false,
    workspaceId: params.input.workspaceId,
    leadKind: params.input.leadKind,
    routeReady: params.routeReady ?? false,
    outreachAllowed: false,
    routeReadiness: params.routeReadiness ?? 'blocked',
    outreachPlayLevel: params.outreachPlayLevel ?? 'no_outreach',
    selectedRoute: params.selectedRoute ?? null,
    reasonCode: params.reasonCode,
    fallbackState: fallbackFor(params.reasonCode),
    violations: [
      {
        reasonCode: params.reasonCode,
        path: params.path,
        message: params.message,
      },
    ],
    gateReasons: [params.message],
    recommendedAction: action,
    ...SIDE_EFFECTS,
  }
}

function passDecision(params: {
  input: ContactRouteOutreachInput
  selectedRoute: ContactRouteCandidate
  routeReadiness: ContactRouteReadiness
  outreachPlayLevel: OutreachPlayLevel
  outreachAllowed: boolean
  gateReasons: string[]
}): ContactRouteOutreachPass {
  return {
    ok: true,
    workspaceId: params.input.workspaceId,
    leadKind: params.input.leadKind,
    routeReady: true,
    outreachAllowed: params.outreachAllowed,
    routeReadiness: params.routeReadiness,
    outreachPlayLevel: params.outreachPlayLevel,
    selectedRoute: params.selectedRoute,
    gateReasons: params.gateReasons,
    recommendedAction:
      trimmedAction(params.input.recommendedAction) ?? 'draft outreach only when allowed',
    violations: [],
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
      null
    )
  }

  return candidates[0] ?? null
}

export function evaluateContactRouteOutreach(
  input: ContactRouteOutreachInput,
): ContactRouteOutreachDecision {
  if (input.evidence.length === 0) {
    return blockDecision({
      input,
      reasonCode: 'missing_evidence',
      path: 'evidence',
      message: 'Contact route and outreach decisions require source-linked evidence.',
      routeReadiness: 'blocked',
      outreachPlayLevel: 'no_outreach',
    })
  }

  if (input.routeCandidates.length === 0) {
    return blockDecision({
      input,
      reasonCode: 'missing_route',
      path: 'routeCandidates',
      message: 'At least one contact route candidate is required.',
      routeReadiness: 'blocked',
      outreachPlayLevel: 'enrich_contact_route',
    })
  }

  for (const [routeIndex, route] of input.routeCandidates.entries()) {
    if (route.evidenceIndexes.length === 0) {
      return blockDecision({
        input,
        reasonCode: 'route_without_evidence',
        path: `routeCandidates[${routeIndex}].evidenceIndexes`,
        message: 'Every contact route must cite evidence indexes.',
        selectedRoute: route,
        routeReadiness: 'needs_review',
        outreachPlayLevel: 'enrich_contact_route',
      })
    }

    if (!hasValidIndexes(route.evidenceIndexes, input.evidence.length)) {
      return blockDecision({
        input,
        reasonCode: 'invalid_evidence_index',
        path: `routeCandidates[${routeIndex}].evidenceIndexes`,
        message: 'Route candidate cites an evidence index that does not exist.',
        selectedRoute: route,
        routeReadiness: 'blocked',
        outreachPlayLevel: 'no_outreach',
      })
    }
  }

  for (const [claimIndex, claim] of input.outreachClaims.entries()) {
    if (
      claim.evidenceIndexes.length === 0 ||
      !hasValidIndexes(claim.evidenceIndexes, input.evidence.length)
    ) {
      return blockDecision({
        input,
        reasonCode: 'invalid_evidence_index',
        path: `outreachClaims[${claimIndex}].evidenceIndexes`,
        message: 'Every outreach claim must cite valid evidence indexes.',
        routeReadiness: 'blocked',
        outreachPlayLevel: 'no_outreach',
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
      outreachPlayLevel: 'no_outreach',
    })
  }

  const selectedRoute = firstSupportedRoute(input)

  if (selectedRoute === null) {
    if (input.procurementRequired === true) {
      const directRoute = input.routeCandidates.find(
        (route) =>
          route.routeType !== 'unknown' &&
          !PROCUREMENT_ROUTE_TYPES.includes(route.routeType),
      )

      return blockDecision({
        input,
        reasonCode: 'procurement_required',
        path: 'routeCandidates',
        message: 'Procurement is required, so direct outreach cannot bypass it.',
        selectedRoute: directRoute ?? null,
        routeReadiness: 'procurement_only',
        outreachPlayLevel: 'procurement_only',
        routeReady: directRoute !== undefined,
      })
    }

    const hasBlockedRoute = input.routeCandidates.some(
      (route) => route.confidence === 'blocked',
    )
    const reasonCode: ContactRouteOutreachReasonCode = hasBlockedRoute
      ? 'blocked_route'
      : 'no_usable_route'

    return blockDecision({
      input,
      reasonCode,
      path: 'routeCandidates',
      message: hasBlockedRoute
        ? 'The available contact route is blocked.'
        : 'No usable non-unknown contact route is available.',
      routeReadiness: hasBlockedRoute ? 'blocked' : 'needs_review',
      outreachPlayLevel: hasBlockedRoute ? 'no_outreach' : 'enrich_contact_route',
    })
  }

  const selectedRouteText = citedEvidenceText(
    selectedRoute.evidenceIndexes,
    input.evidence,
  )

  if (
    (isNonEmptyString(selectedRoute.name) &&
      !textSupportsValue(selectedRouteText, selectedRoute.name)) ||
    (isNonEmptyString(selectedRoute.title) &&
      !textSupportsValue(selectedRouteText, selectedRoute.title))
  ) {
    return blockDecision({
      input,
      reasonCode: 'named_contact_without_source',
      path: 'selectedRoute.name',
      message: 'Named contact or title is not supported by cited route evidence.',
      selectedRoute,
      routeReadiness: 'needs_review',
      outreachPlayLevel: 'enrich_contact_route',
    })
  }

  if (
    isNonEmptyString(selectedRoute.email) &&
    !textSupportsValue(selectedRouteText, selectedRoute.email)
  ) {
    return blockDecision({
      input,
      reasonCode: 'email_without_source',
      path: 'selectedRoute.email',
      message: 'Email address is not supported by cited route evidence.',
      selectedRoute,
      routeReadiness: 'needs_review',
      outreachPlayLevel: 'enrich_contact_route',
    })
  }

  if (
    isNonEmptyString(selectedRoute.phone) &&
    !textSupportsPhone(selectedRouteText, selectedRoute.phone)
  ) {
    return blockDecision({
      input,
      reasonCode: 'phone_without_source',
      path: 'selectedRoute.phone',
      message: 'Phone number is not supported by cited route evidence.',
      selectedRoute,
      routeReadiness: 'needs_review',
      outreachPlayLevel: 'enrich_contact_route',
    })
  }

  if (
    isNonEmptyString(selectedRoute.url) &&
    !textSupportsUrl(selectedRouteText, selectedRoute.url)
  ) {
    return blockDecision({
      input,
      reasonCode: 'url_without_source',
      path: 'selectedRoute.url',
      message: 'URL, form, or portal route is not supported by cited evidence.',
      selectedRoute,
      routeReadiness: 'needs_review',
      outreachPlayLevel: 'enrich_contact_route',
    })
  }

  if (
    input.procurementRequired === true &&
    !PROCUREMENT_ROUTE_TYPES.includes(selectedRoute.routeType)
  ) {
    return blockDecision({
      input,
      reasonCode: 'procurement_required',
      path: 'selectedRoute.routeType',
      message: 'Procurement is required, so direct outreach cannot bypass it.',
      selectedRoute,
      routeReadiness: 'procurement_only',
      outreachPlayLevel: 'procurement_only',
      routeReady: true,
    })
  }

  const recommendedAction = trimmedAction(input.recommendedAction)

  if (recommendedAction === null) {
    return blockDecision({
      input,
      reasonCode: 'missing_recommended_action',
      path: 'recommendedAction',
      message: 'Every contact route and outreach decision requires a recommended action.',
      selectedRoute,
      routeReadiness: routeReadinessFromCandidate(
        selectedRoute,
        input.procurementRequired === true,
      ),
      outreachPlayLevel: 'manual_review_only',
      routeReady: true,
    })
  }

  for (const [claimIndex, claim] of input.outreachClaims.entries()) {
    if (claimIsHighRisk(claim)) {
      if (input.leadKind === 'evidence_backed_prospect') {
        return blockDecision({
          input,
          reasonCode: 'urgency_claim_without_signal',
          path: `outreachClaims[${claimIndex}]`,
          message:
            'Evidence-backed prospects cannot use urgency, need, damage, budget, buying-intent, or authority claims.',
          selectedRoute,
          routeReadiness: routeReadinessFromCandidate(
            selectedRoute,
            input.procurementRequired === true,
          ),
          outreachPlayLevel: 'manual_review_only',
          routeReady: true,
        })
      }

      if (
        input.leadKind === 'signal_backed_opportunity' &&
        input.signal === undefined
      ) {
        return blockDecision({
          input,
          reasonCode: 'urgency_claim_without_signal',
          path: `outreachClaims[${claimIndex}]`,
          message: 'High-risk opportunity claims require signal metadata.',
          selectedRoute,
          routeReadiness: routeReadinessFromCandidate(
            selectedRoute,
            input.procurementRequired === true,
          ),
          outreachPlayLevel: 'manual_review_only',
          routeReady: true,
        })
      }

      if (!claimHasVerbatimSupport(claim, input.evidence)) {
        return blockDecision({
          input,
          reasonCode: 'high_risk_claim_without_verbatim_support',
          path: `outreachClaims[${claimIndex}].text`,
          message:
            'High-risk outreach claims require verbatim support in cited evidence.',
          selectedRoute,
          routeReadiness: routeReadinessFromCandidate(
            selectedRoute,
            input.procurementRequired === true,
          ),
          outreachPlayLevel: 'manual_review_only',
          routeReady: true,
        })
      }
    }
  }

  if (input.procurementRequired === true) {
    return passDecision({
      input,
      selectedRoute,
      routeReadiness: 'procurement_only',
      outreachPlayLevel: 'procurement_only',
      outreachAllowed: false,
      gateReasons: ['Procurement route is supported; direct outreach is not allowed.'],
    })
  }

  if (input.leadKind === 'exploratory_prospect') {
    return blockDecision({
      input,
      reasonCode: 'outreach_not_allowed_for_exploratory',
      path: 'leadKind',
      message: 'Exploratory prospects must go to evidence/contact review before drafting.',
      selectedRoute,
      routeReadiness: routeReadinessFromCandidate(selectedRoute, false),
      outreachPlayLevel:
        selectedRoute.confidence === 'needs_review'
          ? 'enrich_contact_route'
          : 'manual_review_only',
      routeReady: selectedRoute.confidence !== 'needs_review',
    })
  }

  if (selectedRoute.confidence === 'needs_review') {
    return blockDecision({
      input,
      reasonCode: 'no_usable_route',
      path: 'selectedRoute.confidence',
      message: 'Selected contact route needs review before outreach.',
      selectedRoute,
      routeReadiness: 'needs_review',
      outreachPlayLevel: 'enrich_contact_route',
      routeReady: false,
    })
  }

  return passDecision({
    input,
    selectedRoute,
    routeReadiness: routeReadinessFromCandidate(selectedRoute, false),
    outreachPlayLevel: 'draft_allowed',
    outreachAllowed: true,
    gateReasons: ['Contact route, lane, evidence, claims, and action passed.'],
  })
}
