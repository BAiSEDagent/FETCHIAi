/**
 * CP4 — Agent IO contracts (inert, compile-only).
 *
 * Typed input/output boundaries for the eight reasoning agents in the
 * signal-to-opportunity loop. These define the shape of what each agent consumes
 * and produces. They contain NO logic — no classification, scoring, enrichment,
 * or outreach generation is implemented here.
 *
 * Source of truth: docs/PROVIDER_CONTRACTS.md (Agent IO contracts),
 * docs/AGENT_WEB_DATA_ARCHITECTURE.md, docs/design/lead-card-taxonomy.md.
 *
 * Product laws encoded in these shapes:
 * - No score without reason  -> OpportunityScoringOutput.scoreReasons required.
 * - No explanation without action -> outreach drafts carry referenceable evidence.
 * - A snippet is not an opportunity -> candidates flow through hydration first.
 * - UI-visible labels come from approved playbooks/taxonomy only -> label fields
 *   are plain strings the classifier MUST source from the active playbook; this
 *   file does not define any new label vocabulary.
 */

import type { BudgetEnvelope, FallbackState, LocationInput } from '../providers/contracts'
import type { CandidateSignal, SearchTask } from '../providers/search-provider'
import type { EvidenceDocument } from '../providers/evidence-provider'

/** A candidate hydrated with evidence and (optionally) confirmed identity. */
export interface HydratedSignal {
  candidate: CandidateSignal
  evidence: EvidenceDocument[]
  identity?: { businessName: string; address?: string }
}

/** Decision outcome: a confident qualification or an approved fallback state. */
export type ClassifierDecision = 'qualified' | FallbackState

/** Workspace sensitivity floor governing surfacing eligibility. */
export type WorkspaceSensitivity = 'conservative' | 'balanced' | 'aggressive'

/** Card surface intent (see lead-card-taxonomy surface contract). */
export type OpportunitySurface =
  | 'urgent_action'
  | 'default'
  | 'pipeline'
  | 'fallback'

/** 1. Query Builder — playbook templates -> resolved search tasks. */
export interface QueryBuilderInput {
  workspaceId: string
  vertical: string
  location: LocationInput
  serviceRadius: string
  dateWindow: string
  budget: BudgetEnvelope
}
export interface QueryBuilderOutput {
  tasks: SearchTask[]
}

/** 2. Search Discovery — search tasks -> candidate signals. */
export interface SearchDiscoveryInput {
  tasks: SearchTask[]
}
export interface SearchDiscoveryOutput {
  candidates: CandidateSignal[]
  providerRunIds: string[]
  costEstimateUsd: number
}

/** 3. Evidence Hydration — candidates -> hydrated signals + honest fallbacks. */
export interface EvidenceHydrationInput {
  candidates: CandidateSignal[]
  budget: BudgetEnvelope
}
export interface EvidenceHydrationOutput {
  hydrated: HydratedSignal[]
  fallbacks: Array<{ candidate: CandidateSignal; state: FallbackState; reason: string }>
}

/** 4. Signal Classifier — hydrated signal -> approved labels + decision. */
export interface SignalClassifierInput {
  hydrated: HydratedSignal
  vertical: string
}
export interface SignalClassifierOutput {
  /** Approved signal label sourced from the active playbook — never invented. */
  signalLabel?: string
  /** Approved vertical-fit label sourced from the active playbook — never invented. */
  verticalFitLabel?: string
  decision: ClassifierDecision
  whyNow?: string
  whyRelevant?: string
  /** Fallback / disqualification reason when not `qualified`. */
  reason?: string
}

/** 5. Prospect Enrichment — confirm identity + enrichment fields. */
export interface ProspectEnrichmentInput {
  hydrated: HydratedSignal
}
export interface ProspectEnrichmentOutput {
  businessName?: string
  address?: string
  website?: string
  squareFootage?: number
  locationsCount?: number
}

/**
 * 6. Opportunity Scoring — qualified signal -> score + reasons.
 *
 * `scoreReasons` is REQUIRED (Product Law: no score without reason). When the
 * outcome is a fallback, `score` is null — a fallback must not require or show a
 * confident score.
 */
export interface OpportunityScoringInput {
  classified: SignalClassifierOutput
  enrichment: ProspectEnrichmentOutput
  evidence: EvidenceDocument[]
  workspaceSensitivity: WorkspaceSensitivity
}
export interface OpportunityScoringOutput {
  score: number | null
  scoreReasons: string[]
  surface: OpportunitySurface
}

/** 7. Contact Route — best contact path + confidence. */
export interface ContactRouteInput {
  enrichment: ProspectEnrichmentOutput
  evidence: EvidenceDocument[]
}
export interface ContactRouteOutput {
  role?: string
  channel?: string
  confidence: 'high' | 'medium' | 'low'
}

/** 8. Outreach Drafting — grounded, playbook-constrained draft. */
export interface OutreachDraftingInput {
  classified: SignalClassifierOutput
  enrichment: ProspectEnrichmentOutput
  contact: ContactRouteOutput
  evidence: EvidenceDocument[]
  playbookTemplateId: string
}
export interface OutreachDraftingOutput {
  subject: string
  body: string
  /** Cites the actual signal/evidence (no explanation without action). */
  evidenceReference: string
  /** Drafts are never auto-sent — the user controls send. */
  autoSend: false
}
