/**
 * CP6 — Candidate -> Evidence gate smoke proof.
 *
 * Shell-only deterministic proof. Builds fixtures in memory and runs the
 * evidence gate without provider calls, DB writes, routes, scoring,
 * classification, or outreach generation.
 */

import { evaluateEvidenceGate } from '@/lib/gates/evidence-gate'
import type { EvidenceDocument } from '@/lib/providers/evidence-provider'
import type { CandidateSignal } from '@/lib/providers/search-provider'

interface EvidenceGateSmokeProof {
  ok: boolean
  mode: 'evidence_gate_smoke'
  cases: {
    pass: boolean
    missingEvidence: boolean
    weakEvidence: boolean
    sourceMismatch: boolean
  }
  createdOpportunities: 0
  createdScores: 0
  createdOutreach: 0
  providerCalls: 0
  dbWrites: 0
  routesChanged: 0
}

const candidate: CandidateSignal = {
  providerRunId: 'search:fixture:1',
  workspaceId: 'workspace:fixture',
  vertical: 'commercial_cleaning',
  signalType: 'new_business_listing',
  engine: 'google_light',
  query: 'new office opening Austin office space lease signed last 30 days',
  hit: {
    title: 'Lumen Coworking files new Austin office listing',
    url: 'https://records.example.gov/business/lumen-coworking',
    sourceName: 'Example public records',
    snippet: 'New office listing for Lumen Coworking in Austin, TX.',
    rank: 1,
    rawEngineMetadata: { fixture: true },
  },
  discoveredAt: '2026-06-04T00:00:00.000Z',
}

const matchingEvidence: EvidenceDocument = {
  providerRunId: 'evidence:fixture:1',
  sourceUrl: 'https://records.example.gov/business/lumen-coworking',
  sourceName: 'Example public records',
  fetchedAt: '2026-06-04T00:01:00.000Z',
  publishedAt: '2026-06-03T00:00:00.000Z',
  title: 'Lumen Coworking business record',
  cleanedText:
    'Lumen Coworking registered a new commercial office location in Austin, Texas. The public record includes the source listing, business identity, and dated filing details.',
  rawProviderMetadata: { fixture: true },
}

const weakEvidence: EvidenceDocument = {
  ...matchingEvidence,
  providerRunId: 'evidence:fixture:2',
  cleanedText: 'Too short.',
}

const mismatchedEvidence: EvidenceDocument = {
  ...matchingEvidence,
  providerRunId: 'evidence:fixture:3',
  sourceUrl: 'https://records.example.net/business/another-company',
}

const passResult = evaluateEvidenceGate({
  candidate,
  evidence: [matchingEvidence],
  requiredSignalType: 'new_business_listing',
})

const missingEvidenceResult = evaluateEvidenceGate({
  candidate,
  evidence: [],
})

const weakEvidenceResult = evaluateEvidenceGate({
  candidate,
  evidence: [weakEvidence],
})

const sourceMismatchResult = evaluateEvidenceGate({
  candidate,
  evidence: [mismatchedEvidence],
})

const cases = {
  pass:
    passResult.ok === true &&
    passResult.readyForClassification === true &&
    passResult.createdOpportunity === false &&
    passResult.score === null &&
    passResult.outreachDrafted === false &&
    passResult.providerRunIds.length === 2 &&
    passResult.evidenceSourceUrls.length === 1,
  missingEvidence:
    missingEvidenceResult.ok === false &&
    missingEvidenceResult.fallbackState === 'missing_evidence' &&
    missingEvidenceResult.reasonCode === 'no_evidence_documents',
  weakEvidence:
    weakEvidenceResult.ok === false &&
    weakEvidenceResult.fallbackState === 'missing_evidence' &&
    weakEvidenceResult.reasonCode === 'weak_evidence_content',
  sourceMismatch:
    sourceMismatchResult.ok === false &&
    sourceMismatchResult.fallbackState === 'needs_review' &&
    sourceMismatchResult.reasonCode === 'source_mismatch',
}

const proof: EvidenceGateSmokeProof = {
  ok: Object.values(cases).every(Boolean),
  mode: 'evidence_gate_smoke',
  cases,
  createdOpportunities: 0,
  createdScores: 0,
  createdOutreach: 0,
  providerCalls: 0,
  dbWrites: 0,
  routesChanged: 0,
}

console.log(JSON.stringify(proof, null, 2))

if (!proof.ok) {
  process.exit(1)
}
