import { createHash } from 'node:crypto'
import type { EvidenceDocument } from '@/lib/providers/evidence-provider'
import type { CandidateSignal } from '@/lib/providers/search-provider'
import type { SignalType } from '@/lib/providers/contracts'
import type { Cp21aLineage, Cp21aRunRequest, Cp21aStage } from './types'

export type Cp21aFixtureCandidateIntent =
  | 'opportunity'
  | 'prospect'
  | 'stale_signal'
  | 'bad_candidate'

export interface Cp21aFixtureCandidate {
  id: string
  intent: Cp21aFixtureCandidateIntent
  candidate: CandidateSignal
  businessName: string
  sourceName: string | null
  evidence: EvidenceDocument | null
  evidenceSummary: string
  sourceExcerpt: string
  signalLabel: string
  verticalFitLabel: string
  freshnessLabel: string | null
  whyNowReasons: string[]
  recommendedAction: {
    label: string
    detail: string
  }
  fitReasons: string[]
  contactRouteHints: string[]
  accountFitSignals: string[]
  throwAtStage?: Cp21aStage
}

function fingerprintFor(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function candidateSignal({
  providerRunId,
  workspaceId,
  signalType,
  query,
  title,
  url,
  snippet,
  discoveredAt,
}: {
  providerRunId: string
  workspaceId: string
  signalType: SignalType
  query: string
  title: string
  url: string
  snippet: string
  discoveredAt: string
}): CandidateSignal {
  return {
    providerRunId,
    workspaceId,
    vertical: 'commercial_cleaning',
    signalType,
    engine: 'google_light',
    query,
    hit: {
      title,
      url,
      snippet,
      rank: 1,
      rawEngineMetadata: {
        fixture: true,
        provider: 'cp21a_fixture_discovery',
      },
    },
    discoveredAt,
  }
}

function evidenceDocument({
  providerRunId,
  sourceUrl,
  title,
  publishedAt,
  fetchedAt,
  cleanedText,
}: {
  providerRunId: string
  sourceUrl: string
  title: string
  publishedAt: string
  fetchedAt: string
  cleanedText: string
}): EvidenceDocument {
  return {
    providerRunId,
    sourceUrl,
    fetchedAt,
    publishedAt,
    title,
    cleanedText,
    rawProviderMetadata: {
      fixture: true,
      provider: 'cp21a_fixture_evidence',
    },
  }
}

export function cp21aFixtureCandidates(
  request: Cp21aRunRequest,
): Cp21aFixtureCandidate[] {
  const workspaceId = request.workspaceId
  const fetchedAt = request.requestedAt

  return [
    {
      id: 'cp21a-opportunity-buildout',
      intent: 'opportunity',
      businessName: 'Bluebonnet Dental Studio',
      sourceName: null,
      candidate: candidateSignal({
        providerRunId: 'fixture-search-cp21a-001',
        workspaceId,
        signalType: 'tenant_improvement',
        query: 'Austin commercial cleaning tenant improvement buildout permit',
        title: 'Bluebonnet Dental Studio files Austin buildout permit',
        url: 'https://fixtures.fetchi.ai/cp21a/bluebonnet-dental-buildout',
        snippet:
          'Tenant improvement permit shows a dental clinic buildout with final-clean scope.',
        discoveredAt: fetchedAt,
      }),
      evidence: evidenceDocument({
        providerRunId: 'fixture-evidence-cp21a-001',
        sourceUrl: 'https://fixtures.fetchi.ai/cp21a/bluebonnet-dental-buildout',
        title: 'Bluebonnet Dental Studio files Austin buildout permit',
        publishedAt: '2026-06-18T00:00:00.000Z',
        fetchedAt,
        cleanedText:
          'Bluebonnet Dental Studio filed a tenant improvement buildout permit for a new dental clinic in Austin. The public record describes construction cleanup, operatories, lobby finish-out, and a target opening date after final inspection.',
      }),
      evidenceSummary:
        'Public permit evidence shows a fresh dental clinic buildout that supports a final-clean opportunity.',
      sourceExcerpt:
        'Tenant improvement buildout permit for a new dental clinic with final inspection and opening preparation.',
      signalLabel: 'BUILDOUT',
      verticalFitLabel: 'Post-Construction Clean',
      freshnessLabel: '2d ago',
      whyNowReasons: ['Buildout permit is dated 2026-06-18.'],
      recommendedAction: {
        label: 'Review source and contact route',
        detail: 'Use the permit evidence and ask about post-construction cleaning timing.',
      },
      fitReasons: [
        'Dental clinic buildout evidence supports post-construction cleaning fit.',
      ],
      contactRouteHints: ['Use the website contact form or ask for the practice manager.'],
      accountFitSignals: ['medical clinic', 'finish-out cleaning'],
    },
    {
      id: 'cp21a-prospect-medical-office',
      intent: 'prospect',
      businessName: 'Lamar Family Orthodontics',
      sourceName: null,
      candidate: candidateSignal({
        providerRunId: 'fixture-search-cp21a-002',
        workspaceId,
        signalType: 'medical_office_opening',
        query: 'Austin orthodontics commercial cleaning prospect',
        title: 'Lamar Family Orthodontics - orthodontist in Austin',
        url: 'https://fixtures.fetchi.ai/cp21a/lamar-family-orthodontics',
        snippet:
          'Medical office profile with multiple treatment rooms and public location evidence.',
        discoveredAt: fetchedAt,
      }),
      evidence: evidenceDocument({
        providerRunId: 'fixture-evidence-cp21a-002',
        sourceUrl: 'https://fixtures.fetchi.ai/cp21a/lamar-family-orthodontics',
        title: 'Lamar Family Orthodontics - orthodontist in Austin',
        publishedAt: '2026-05-30T00:00:00.000Z',
        fetchedAt,
        cleanedText:
          'Lamar Family Orthodontics is an Austin orthodontic office with multiple treatment rooms, patient areas, and a public appointment/contact page. The source supports identity, location, and medical-office fit but does not show a fresh buying signal.',
      }),
      evidenceSummary:
        'Public website evidence confirms an Austin orthodontic office that fits the medical-office prospect lane.',
      sourceExcerpt:
        'Orthodontic office profile with treatment rooms, patient areas, and public contact path.',
      signalLabel: 'MEDICAL',
      verticalFitLabel: 'Medical Office',
      freshnessLabel: null,
      whyNowReasons: [],
      recommendedAction: {
        label: 'Add to Prospect Pool',
        detail: 'Keep as an evidence-backed medical-office prospect without urgency claims.',
      },
      fitReasons: [
        'Medical-office evidence supports recurring janitorial fit.',
        'Public source confirms identity and location.',
      ],
      contactRouteHints: ['Use the public appointment/contact page for a generic route.'],
      accountFitSignals: ['medical office', 'recurring service fit'],
    },
    {
      id: 'cp21a-stale-restaurant-signal',
      intent: 'stale_signal',
      businessName: 'Trellis Table',
      sourceName: null,
      candidate: candidateSignal({
        providerRunId: 'fixture-search-cp21a-003',
        workspaceId,
        signalType: 'restaurant_opening',
        query: 'Austin restaurant opening commercial cleaning stale signal',
        title: 'Trellis Table announces Austin restaurant opening',
        url: 'https://fixtures.fetchi.ai/cp21a/trellis-table-opening',
        snippet:
          'Restaurant opening evidence is real but outside the action freshness window.',
        discoveredAt: fetchedAt,
      }),
      evidence: evidenceDocument({
        providerRunId: 'fixture-evidence-cp21a-003',
        sourceUrl: 'https://fixtures.fetchi.ai/cp21a/trellis-table-opening',
        title: 'Trellis Table announces Austin restaurant opening',
        publishedAt: '2026-04-01T00:00:00.000Z',
        fetchedAt,
        cleanedText:
          'Trellis Table announced an Austin restaurant opening with dining room service, kitchen setup, and public contact details. The source is legitimate fit evidence, but the opening announcement is stale for an urgent action window.',
      }),
      evidenceSummary:
        'Restaurant opening evidence is sourced but stale, so it must be demoted instead of discarded.',
      sourceExcerpt:
        'Restaurant opening announcement with dining room service and kitchen setup details.',
      signalLabel: 'RESTAURANT',
      verticalFitLabel: 'Restaurant',
      freshnessLabel: '11w ago',
      whyNowReasons: ['Restaurant opening announcement is dated 2026-04-01.'],
      recommendedAction: {
        label: 'Review before outreach',
        detail: 'Keep as a needs-review prospect until a fresh signal appears.',
      },
      fitReasons: ['Restaurant evidence supports cleaning fit after review.'],
      contactRouteHints: ['Use the restaurant website contact route after review.'],
      accountFitSignals: ['restaurant', 'commercial kitchen'],
    },
    {
      id: 'cp21a-bad-candidate',
      intent: 'bad_candidate',
      businessName: 'Broken Fixture Candidate',
      sourceName: 'Fixture bad candidate',
      candidate: candidateSignal({
        providerRunId: 'fixture-search-cp21a-004',
        workspaceId,
        signalType: 'new_business_listing',
        query: 'Austin bad candidate fixture',
        title: 'Broken Fixture Candidate listing',
        url: 'https://fixtures.fetchi.ai/cp21a/bad-candidate',
        snippet:
          'This candidate intentionally fails hydration to prove candidate isolation.',
        discoveredAt: fetchedAt,
      }),
      evidence: null,
      evidenceSummary:
        'Intentionally broken fixture candidate used to prove per-candidate error isolation.',
      sourceExcerpt: 'Intentionally broken fixture.',
      signalLabel: 'NEW BIZ',
      verticalFitLabel: 'New Office',
      freshnessLabel: null,
      whyNowReasons: [],
      recommendedAction: {
        label: 'Review before outreach',
        detail: 'Candidate failed a fixture stage and must stay out of opportunity lanes.',
      },
      fitReasons: [],
      contactRouteHints: [],
      accountFitSignals: [],
      throwAtStage: 'hydrate',
    },
  ]
}

export function cp21aLineageFor(
  fixture: Cp21aFixtureCandidate,
): Cp21aLineage {
  const sourceUrl = fixture.candidate.hit.url ?? null
  const sourceName = fixture.sourceName
  const evidenceRunId = fixture.evidence?.providerRunId ?? null
  const fingerprint = fingerprintFor([
    fixture.id,
    sourceUrl ?? sourceName ?? 'unknown-source',
    fixture.evidence?.cleanedText ?? fixture.candidate.hit.snippet,
  ].join('|'))

  return {
    candidateId: fixture.id,
    sourceUrl,
    sourceName,
    searchProviderRunId: fixture.candidate.providerRunId,
    evidenceProviderRunId: evidenceRunId,
    fingerprint,
  }
}
