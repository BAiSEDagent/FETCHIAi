# Fetchi Provider Contracts

> **Status:** Contract source of truth (CP3). Docs-only — defines the conceptual
> interfaces between Fetchi and its providers **before** any code is written.
> **Scope:** This document does not implement providers, does not approve schema changes,
> and does not import any of the interfaces below as code. The TypeScript-style blocks are
> **documentation examples only**. Implementation is scoped to CP4+.
> **Reads with:** `docs/AGENT_WEB_DATA_ARCHITECTURE.md` ·
> `docs/PLAYBOOK_SEARCH_EXAMPLES.md`

---

## Purpose

This is the contract source of truth that defines the shape of the discovery and evidence
layers before code exists. Its goal is to make the provider boundaries explicit and
auditable so that CP4 can implement against a stable contract rather than inventing one
during implementation.

Two principles govern everything here:

1. **Providers are pluggable behind abstractions.** Fetchi is provider-agnostic by
   architecture and SerpApi/Firecrawl-native at launch. Routes, components, and agents
   never call a provider SDK directly — they call `SearchProvider` / `EvidenceProvider`.
2. **Everything is replayable.** Every provider interaction carries a run id and enough
   metadata to reconstruct *what was asked, what came back, and what was decided*.

> The interfaces below are conceptual. They illustrate the intended contract. They are
> **not** the actual exported types and must not be copied into `lib/` as-is during CP3.

---

## SearchProvider responsibility

`SearchProvider` is the **SerpApi-backed discovery** layer. Its single job is to run
playbook query templates against search engines and return candidate signals. It never
decides fit, score, or whether something is an opportunity.

```ts
// docs-only conceptual contract — not imported code

type ProviderName = "serpapi" | "firecrawl" | string;

// SerpApi engines approved for the launch adapter (light variants by product rule)
type QueryEngine =
  | "google_light"
  | "google_news_light"
  | "google_maps"
  | "google_jobs";

type SignalType =
  | "new_business_listing"
  | "building_permit"
  | "tenant_improvement"
  | "hiring"
  | "negative_review"
  | "restaurant_opening"
  | "property_management_change"
  | "school_or_daycare_opening"
  | "medical_office_opening"
  | "event_or_venue_expansion";

type FallbackState =
  | "needs_review"
  | "weak_fit"
  | "missing_evidence"
  | "exploratory"
  | "discarded";

interface AgentError {
  code: string;            // stable machine code, e.g. "provider_timeout"
  message: string;         // friendly, user-safe message — never a raw stack trace
  retryable: boolean;
  providerRunId?: string;
}

interface BudgetEnvelope {
  workspaceId: string;
  maxProviderCalls: number;     // hard cap for this run
  maxSpendEstimateUsd: number;  // soft/hard spend cap
  dailySpendCapUsd?: number;
  triggeredBy: "manual_chat" | "scheduled_scout" | "admin_replay";
}

interface SearchTask {
  workspaceId: string;
  vertical: string;             // e.g. "commercial_cleaning"
  signalType: SignalType;
  engine: QueryEngine;
  // query string with playbook placeholders already resolved
  query: string;
  location: { city: string; state: string; county?: string };
  dateWindow: string;           // resolved {date_window}
  budget: BudgetEnvelope;
}

interface SearchHit {
  title: string;
  url?: string;                 // source URL if available
  sourceName?: string;          // named record when no URL (e.g. county permit id)
  snippet: string;
  rank: number;
  rawEngineMetadata: unknown;   // preserved verbatim for audit
}

interface CandidateSignal {
  providerRunId: string;
  workspaceId: string;
  vertical: string;
  signalType: SignalType;
  engine: QueryEngine;
  query: string;
  hit: SearchHit;
  discoveredAt: string;         // ISO timestamp
  // a candidate is pre-evidence: no score, no confident label yet
}

interface SearchProvider {
  name: ProviderName;
  discover(task: SearchTask): Promise<{
    providerRunId: string;
    candidates: CandidateSignal[];
    costEstimateUsd: number;
    error?: AgentError;
  }>;
}
```

Contract rules:
- Every `discover` call logs provider, engine, query, location, workspaceId, trigger,
  cost estimate, result count, and error state.
- A `SearchHit`/`CandidateSignal` is never a `qualified_opportunity` (Product Law #4).
- The launch adapter uses light engines (`google_light`, not `google`).

---

## EvidenceProvider responsibility

`EvidenceProvider` is the **Firecrawl-backed hydration/enrichment** layer. Its job is to
turn a candidate's source into a dated, cited evidence document — and to support domain
mapping, batch scraping, structured extraction, and (exceptionally) browser interaction.
It never decides fit or score.

```ts
// docs-only conceptual contract — not imported code

interface EvidenceDocument {
  providerRunId: string;
  sourceUrl?: string;
  sourceName?: string;
  fetchedAt: string;            // ISO timestamp
  publishedAt?: string;         // dated public artifact date, if extractable
  title?: string;
  cleanedText: string;          // normalized readable content
  structured?: Record<string, unknown>; // extracted fields (addresses, dates, names)
  rawProviderMetadata: unknown; // preserved verbatim for audit/replay
}

interface EvidenceProvider {
  name: ProviderName;

  // Hydrate a single source behind a candidate.
  scrapeUrl(input: {
    url: string;
    workspaceId: string;
    budget: BudgetEnvelope;
  }): Promise<{ providerRunId: string; doc?: EvidenceDocument; error?: AgentError }>;

  // Discover relevant pages within a known domain (e.g. a company site).
  mapDomain(input: {
    domain: string;
    workspaceId: string;
    budget: BudgetEnvelope;
  }): Promise<{ providerRunId: string; urls: string[]; error?: AgentError }>;

  // Hydrate several sources in one bounded run.
  batchScrape(input: {
    urls: string[];
    workspaceId: string;
    budget: BudgetEnvelope;
  }): Promise<{ providerRunId: string; docs: EvidenceDocument[]; error?: AgentError }>;

  // Structured field extraction against a schema/prompt.
  extract(input: {
    url: string;
    schemaHint: Record<string, unknown>;
    workspaceId: string;
    budget: BudgetEnvelope;
  }): Promise<{ providerRunId: string; data?: Record<string, unknown>; error?: AgentError }>;

  // Optional EXCEPTION path: browser interaction for sources that require it.
  // Not part of the default MVP loop. Must be justified and budgeted explicitly.
  interact?(input: {
    url: string;
    steps: unknown;             // interaction script
    workspaceId: string;
    budget: BudgetEnvelope;
  }): Promise<{ providerRunId: string; doc?: EvidenceDocument; error?: AgentError }>;
}
```

Contract rules:
- `interact` is an exceptional path, never the default discovery or hydration mechanism
  (see Explicit non-goals in the architecture doc).
- An `EvidenceDocument` must carry `providerRunId` and either `sourceUrl` or `sourceName`,
  and should capture `publishedAt` when a dated artifact is present — this feeds the
  evidence gate.

---

## Agent IO contracts

Each agent has a typed input and output. These are conceptual contracts that show what
each agent consumes and produces; they are not implemented in CP3.

```ts
// docs-only conceptual contracts — not imported code

// 1. Query Builder — playbook templates → resolved search tasks
interface QueryBuilderInput {
  workspaceId: string;
  vertical: string;
  location: { city: string; state: string; county?: string };
  serviceRadius: string;
  dateWindow: string;
  budget: BudgetEnvelope;
}
interface QueryBuilderOutput {
  tasks: SearchTask[];          // all queries come from playbook templates
}

// 2. Search Discovery — search tasks → candidate signals
interface SearchDiscoveryInput { tasks: SearchTask[]; }
interface SearchDiscoveryOutput {
  candidates: CandidateSignal[];
  providerRunIds: string[];
  costEstimateUsd: number;
}

// 3. Evidence Hydration — candidates → hydrated signals with evidence
interface EvidenceHydrationInput { candidates: CandidateSignal[]; budget: BudgetEnvelope; }
interface EvidenceHydrationOutput {
  hydrated: Array<{
    candidate: CandidateSignal;
    evidence: EvidenceDocument[];
    identity?: { businessName: string; address?: string };
  }>;
  fallbacks: Array<{ candidate: CandidateSignal; state: FallbackState; reason: string }>;
}

// 4. Signal Classifier — hydrated signal → approved labels + decision
interface SignalClassifierInput {
  hydrated: EvidenceHydrationOutput["hydrated"][number];
  vertical: string;
}
interface SignalClassifierOutput {
  signalLabel?: string;         // from approved playbook set
  verticalFitLabel?: string;    // from approved playbook set
  decision: "qualified" | FallbackState;
  whyNow?: string;
  whyRelevant?: string;
  reason?: string;              // fallback/disqualification reason when not qualified
}

// 5. Prospect Enrichment — confirm identity + enrichment fields
interface ProspectEnrichmentInput {
  hydrated: EvidenceHydrationOutput["hydrated"][number];
}
interface ProspectEnrichmentOutput {
  businessName?: string;
  address?: string;
  website?: string;
  squareFootage?: number;
  locationsCount?: number;
  // missing fields are left blank — never fabricated
}

// 6. Opportunity Scoring — qualified signal → score + reasons
interface OpportunityScoringInput {
  classified: SignalClassifierOutput;
  enrichment: ProspectEnrichmentOutput;
  evidence: EvidenceDocument[];
  workspaceSensitivity: "conservative" | "balanced" | "aggressive";
}
interface OpportunityScoringOutput {
  score: number;                // 0–100 service-fit; null/— when fallback
  scoreReasons: string[];       // Product Law #2 — no score without reason
  surface: "urgent_action" | "default" | "pipeline" | "fallback";
}

// 7. Contact Route — best contact path + confidence
interface ContactRouteInput {
  enrichment: ProspectEnrichmentOutput;
  evidence: EvidenceDocument[];
}
interface ContactRouteOutput {
  role?: string;                // e.g. "Facilities Manager"
  channel?: string;            // verified public email/phone/form
  confidence: "high" | "medium" | "low";
}

// 8. Outreach Drafting — grounded, playbook-constrained draft
interface OutreachDraftingInput {
  classified: SignalClassifierOutput;
  enrichment: ProspectEnrichmentOutput;
  contact: ContactRouteOutput;
  evidence: EvidenceDocument[];
  playbookTemplateId: string;   // approved outreach template from the playbook
}
interface OutreachDraftingOutput {
  subject: string;
  body: string;
  evidenceReference: string;    // cites the actual signal/evidence
  autoSend: false;              // never auto-sent — user controls send
}
```

---

## Audit and lineage expectations

The DB/audit layer is the system of record for *why* every decision was made. The
following must be replayable and auditable end-to-end:

- **Provider runs** — every SerpApi and Firecrawl call: inputs, engine/endpoint, cost
  estimate, result count, error state, and a stable `providerRunId`.
- **Raw provider metadata** — preserved verbatim (`rawEngineMetadata`,
  `rawProviderMetadata`) so a run can be reconstructed exactly.
- **Normalized evidence** — the `EvidenceDocument`s derived from raw metadata, linked back
  to their provider runs.
- **Classifier decisions** — the chosen labels, the qualified/fallback/discarded outcome,
  and the reason, linked to the evidence that justified it.
- **Score reasons** — the machine-readable reasons behind every score (Product Law #2).
- **Outreach drafts** — the generated draft, the playbook template used, and the evidence
  it referenced.

Given a surfaced opportunity (or a fallback/discarded decision), an auditor must be able
to trace it back through classifier decision → evidence → provider runs → original query
template, and replay it.

---

## Implementation boundaries

- This document **does not approve schema changes.** No tables, columns, or migrations are
  authorized by CP3.
- This document **does not implement providers.** No `lib/search/` or `lib/evidence/`
  code is written in CP3.
- The interfaces here are **conceptual contracts**, not exported types. They must not be
  imported or copied into the app as-is.
- Code must come later in a scoped checkpoint: provider contract skeletons in **CP4**, a
  SerpApi + Firecrawl smoke proof in **CP5**, and any evidence-spine/schema proposal only
  after explicit DB approval (**CP6**).
