# Fetchi Agent Web-Data Architecture

> **Status:** Architecture source of truth (CP3). Docs-only — defines how the system
> should work before any provider code or schema exists.
> **Scope:** No app code, provider code, DB/schema, or agent implementation is approved
> by this document. Implementation is scoped to later checkpoints (CP4+).
> **Reads with:** `docs/product/vertical-playbook-registry.md` ·
> `docs/product/playbooks/commercial-cleaning.md` · `docs/design/lead-card-taxonomy.md` ·
> `docs/PRODUCT_CONTEXT.md`

---

## Purpose

Fetchi is a **signal-to-opportunity engine**, not a generic prospecting scraper.

The difference matters and drives every architectural decision below:

- A generic scraper collects contacts and lists. It optimizes for volume.
- Fetchi detects **public buying signals** ("a new restaurant filed a food-service
  permit", "a buildout permit was pulled with a confirmed move-in date") and turns each
  signal into one **evidence-backed opportunity** interpreted through a vertical
  playbook. It optimizes for *defensible, dated, actionable reasons to reach out now*.

Every opportunity Fetchi surfaces must answer three questions with cited public
evidence: **what happened**, **why it matters to this user's service**, and **why now**.
If those cannot be answered from evidence, the candidate does not become an opportunity —
it becomes a fallback state or is discarded.

This document defines the data flow, the provider responsibilities, the product laws,
the signal state model, the evidence gate, and the fallback flow that make this possible.

---

## Core loop

```
Signal  →  Prospect + Enrichment  →  Opportunity  →  Contact Route  →  Outreach Play
```

1. **Signal** — A candidate buying signal is discovered from public sources via playbook
   query templates (e.g. a permit filing, a new business listing, a review burst).
   At this stage it is only a *candidate* — a search snippet is not yet an opportunity.

2. **Prospect + Enrichment** — The candidate is hydrated: the underlying source is
   scraped/verified, the business identity and location are confirmed, dates are
   extracted, and enrichment fields (website, square footage, contact route hints) are
   gathered. This is where a snippet becomes evidence.

3. **Opportunity** — A classifier maps the hydrated signal to an approved vertical-fit
   label from the active playbook, scores its service fit, and writes the reasons. Only
   candidates that clear the **evidence gate** become `qualified_opportunity`. Others
   drop to a fallback state or are discarded.

4. **Contact Route** — The system identifies the best contact path (role, named contact,
   verified public channel) with a confidence level. A weak route does not block the
   opportunity but is reflected in the recommended action.

5. **Outreach Play** — An LLM drafts an outreach message constrained by the playbook's
   approved outreach templates and tone, referencing the actual evidence. Drafts are
   never sent automatically — the user controls send (Product Law: explanation → action).

The same raw signal can produce different opportunities for different workspaces/verticals
(see Cross-vertical reuse in `docs/PLAYBOOK_SEARCH_EXAMPLES.md`).

---

## Lead supply lanes

Fetchi supports two surfaced lead-supply lanes plus one shared enrichment lane. The lanes
are intentionally separate so a prospect without a fresh buying signal never inherits
opportunity language, urgency, or "why now" claims.

### Lane A: Signal-backed Opportunities

```
Signal Discovery  ->  Evidence Hydration  ->  Evidence Gate  ->  Classification/Scoring  ->  Opportunity
```

- Starts from a public buying signal discovered through bounded, playbook-defined queries.
- Requires source-linked evidence and a dated artifact before classification.
- Can become `qualified_opportunity` only after the evidence gate passes.
- Can claim urgency only when the evidence supports "why now."

### Lane B: Evidence-backed Prospect Leads

```
Prospect Mining  ->  Evidence Packet  ->  Prospect Fit Gate  ->  Prospect Pool
```

- Starts from high-fit account discovery through public or legitimate sources such as
  directories, maps listings, company websites, databases, or property portfolios.
- Requires evidence of identity, fit, source, and access path.
- Does not create opportunities and does not answer "why now" unless a separate fresh
  buying signal is found.
- Feeds a Prospect Pool for pipeline research, analyst review, or future signal watching.

### Lane C: Enrichment

```
Enrichment  ->  Contact Route + Buyer Context
```

- Can enrich either Lane A or Lane B.
- Adds website, location, contact-route hints, buyer context, account size, and source
  confidence.
- Does not change lead kind by itself. Enrichment cannot turn a no-signal prospect into an
  opportunity.

Docs-only lead-kind concepts:

```ts
type LeadKind =
  | "signal_backed_opportunity"
  | "evidence_backed_prospect"
  | "exploratory_prospect";

type SourceEvidenceType =
  | "permit"
  | "maps_listing"
  | "directory"
  | "company_website"
  | "news"
  | "job_posting"
  | "review"
  | "database"
  | "property_portfolio";
```

**Today's Opportunities** are Lane A items that pass the evidence gate and later clear
classification/scoring. They can carry opportunity urgency only when evidence supports the
freshness window and the recommended action.

**Prospect Pool** is Lane B inventory. It is evidence-backed account supply, not a ranked
opportunity feed. Prospect-fit/readiness scoring may come later and should measure account
fit, source confidence, and contactability. It is separate from opportunity urgency
scoring, which requires a fresh signal and why-now evidence.

Firecrawl Workflows may be used as references for repeatable prospect-mining workflow
designs. They are not runtime authority in this checkpoint, do not introduce a dependency,
and do not replace the provider contracts below.

---

## Provider responsibility split

Each provider has one clear job. Responsibilities do not overlap.

| Layer | Provider | Responsibility |
|---|---|---|
| **Discovery** | **SerpApi** | Recurring public **signal discovery**. Runs playbook query templates against search engines (`google_light`, `google_news_light`, `google_maps`, `google_jobs`) to find candidate signals. Returns snippets/hits — candidates only, never opportunities. |
| **Evidence** | **Firecrawl** | **Evidence hydration**: scraping the source behind a candidate, domain mapping, structured extraction, enrichment, and — as an exceptional path only — browser interaction. Turns a candidate snippet into a dated, cited evidence document. |
| **Reasoning** | **LLM agents** | **Classify, score, explain, rank, draft.** Map hydrated signals to approved playbook labels, compute service-fit score, write why-now / why-relevant / score reasons, rank opportunities, and draft outreach. Agents never invent UI labels. |
| **Lineage** | **Fetchi DB / audit layer** | Stores **lineage and evidence**: provider run ids, raw provider metadata, normalized evidence records, classifier decisions, score reasons, contact routes, and outreach drafts — all replayable and auditable. |

Key boundaries:
- SerpApi never produces an opportunity. It produces candidates.
- Firecrawl never decides fit or score. It produces evidence.
- LLM agents never call providers directly outside the SearchProvider/EvidenceProvider
  abstractions, and never freestyle a UI label.
- The DB/audit layer is the system of record for *why* every decision was made.

---

## Non-negotiable product laws

These laws hold across all verticals and all checkpoints. Implementation that violates
any of them is wrong, regardless of how it performs.

1. **No opportunity without signal.** A surfaced opportunity requires a fresh public
   buying signal plus source-linked evidence. No-signal prospects can be useful leads,
   but they are not opportunities.
2. **No lead without evidence.** Every surfaced lead must cite public or legitimate
   evidence. Every surfaced opportunity must cite a dated public artifact. No evidence →
   not surfaced.
3. **No score without reason.** A score is never shown without machine-readable score
   reasons that a human could audit.
4. **No explanation without action.** Every surfaced opportunity carries a recommended
   action; outreach drafts are explanations the user can act on, never auto-sent.
5. **A search snippet is not an opportunity.** A SerpApi hit is a candidate. It must be
   hydrated and pass the evidence gate before it can be surfaced as an opportunity.
6. **AI must not freestyle UI labels.** Classifiers may interpret and explain, but every
   UI-visible label must come from an approved playbook/taxonomy.
7. **Labels come from approved playbooks.** Signal labels, vertical-fit labels, and
   freshness labels are drawn only from the active vertical playbook and
   `docs/design/lead-card-taxonomy.md`.
8. **Fallback states are valid product states, not failures.** `needs_review`,
   `weak_fit`, `missing_evidence`, and `exploratory` are honest, intentional states — a
   fallback card must look deliberate, never broken.

---

## Signal state model

Five states describe a candidate's lifecycle. State transitions are driven by evidence,
not by optimism.

### candidate_signal
- **Minimum required inputs:** a provider run id, a query template/source it came from, a
  raw search hit (title, URL or source name, snippet), a target signal type.
- **Can:** be queued for hydration; be counted in discovery metrics.
- **Cannot:** be scored, be labeled with a confident vertical-fit label, be surfaced as a
  ranked opportunity, be used to draft outreach.
- **Shown to user?** No. Internal/audit only.
- **Required evidence:** none yet — this is pre-evidence.

### hydrated_signal
- **Minimum required inputs:** everything from `candidate_signal` plus a Firecrawl
  evidence document (scraped/verified source), confirmed business identity, location, and
  at least one dated public artifact.
- **Can:** be passed to the classifier; carry enrichment fields; be deduplicated.
- **Cannot:** be surfaced as a confident opportunity until the classifier runs and the
  evidence gate passes.
- **Shown to user?** Not directly. May surface as a fallback card after classification if
  evidence is incomplete.
- **Required evidence:** source URL/name + dated artifact + prospect identity + location.

### qualified_opportunity
- **Minimum required inputs:** a `hydrated_signal` that **passes the full evidence gate**
  (below), plus an approved signal label, an approved vertical-fit label, a service-fit
  score with reasons, why-now, why-relevant, and a recommended action.
- **Can:** be surfaced as a ranked opportunity; drive an outreach draft; be saved to a
  pipeline; be counted/billed as a surfaced opportunity.
- **Cannot:** show a label not in the approved set; show a score without reasons; exist
  without cited evidence.
- **Shown to user?** Yes — this is the primary surfaced product.
- **Required evidence:** the full evidence gate.

### fallback_state
- **Minimum required inputs:** a candidate/hydrated signal that is real but does not meet
  the bar for a confident opportunity, plus the specific fallback reason.
- **Can:** be surfaced honestly as `needs_review`, `weak_fit`, `missing_evidence`, or
  `exploratory`; be re-evaluated later if evidence improves.
- **Cannot:** show a confident score; invent a label; be silently upgraded in place
  (must be re-evaluated, not retroactively flipped).
- **Shown to user?** Yes — as an intentional, honest fallback card (except where playbook
  rules route it to admin-only).
- **Required evidence:** varies by state (see Fallback flow).

### discarded_candidate
- **Minimum required inputs:** a candidate/hydrated signal plus the disqualification
  reason that fired.
- **Can:** be retained in the audit layer for lineage and learning.
- **Cannot:** be surfaced as a ranked opportunity.
- **Shown to user?** No — admin/audit only.
- **Required evidence:** the recorded disqualification reason.

---

## Evidence gate

Before a `hydrated_signal` can become a `qualified_opportunity`, **all** of the following
must be present and recorded. Missing any one → the candidate drops to a fallback state
(`missing_evidence` or `needs_review`) or is discarded. This is the operational form of
Product Laws #1 and #2.

| # | Required field | Definition |
|---|---|---|
| 1 | **Provider run id** | The SerpApi (discovery) and Firecrawl (hydration) run identifiers that produced this candidate and its evidence — for replay. |
| 2 | **Source URL or source name** | A citable public URL or named record (e.g. "Travis County permit #2026-04-1234"). |
| 3 | **Dated public artifact** | A public artifact with a verifiable date within the signal's freshness window. |
| 4 | **Prospect identity** | A confirmed commercial business/entity name tied to the signal — not residential, not inferred. |
| 5 | **Location** | Street address or city/county within the workspace service radius. |
| 6 | **Evidence summary** | A short, grounded summary of what the evidence shows — no fabrication. |
| 7 | **Approved signal label** | A signal label from the active playbook's approved set. |
| 8 | **Approved vertical-fit label** | A vertical-fit/service label from the active playbook's approved set. |
| 9 | **Why now** | A dated, specific reason the opportunity is timely (move-in date, opening date, review recency, re-bid window). |
| 10 | **Why relevant** | The causal link between the signal and this user's service. |
| 11 | **Score reasons** | Machine-readable reasons backing the service-fit score. |
| 12 | **Recommended action** | A concrete next step for the user (e.g. "Outreach today — include permit and move-in date"). |

A `qualified_opportunity` that loses any gate field on re-evaluation must be re-routed to a
fallback state — never left showing a confident score it can no longer support.

---

## Fallback flow

The five approved states from `docs/design/lead-card-taxonomy.md`. Fallbacks are valid
product states, not errors (Product Law #7). They must look intentional and never show a
confident score or an invented label.

| State | When it is used |
|---|---|
| **needs_review** | The signal maps to a plausible fit but evidence is thin or single-source (e.g. one cleanliness review, an implied lease, a permit implied but not pulled). Fetchi wants a second source before ranking. |
| **weak_fit** | The signal is confirmed and evidence meets the playbook floor, but the service-fit score is below the workspace's sensitivity setting. The opportunity is real but below the user's chosen threshold. |
| **missing_evidence** | The label and signal type are valid, but a required public artifact (per the evidence gate) was not found or confirmed — e.g. a buildout permit found but no move-in date to establish the action window. |
| **exploratory** | The signal is real and tied to a commercial prospect, but the cleaning/service need is plausible rather than confirmed (event/venue expansion, ambiguous hiring, new-business context without a direct trigger). Used for analyst mode, `Other`-vertical learning, or Aggressive-sensitivity review — never for hard disqualifications. |
| **discarded** | A hard disqualification fired: residential, out of service area, wrong trade, stale beyond freshness window, duplicate, no evidence, or already a customer. Not surfaced; admin/audit only. |

A fallback card can be re-evaluated upward if evidence later improves — by re-running the
gate, not by silently relabeling the existing card.

---

## Recommended MVP path

The smallest real proof that the architecture works end-to-end. This is deliberately
narrow — one vertical, one city — so the loop can be validated before scale.

- **One vertical:** Commercial Cleaning (the CP2 playbook).
- **One city:** a single metro with good public-record coverage.
- **3–5 playbook query templates:** drawn from the commercial-cleaning playbook (e.g. new
  business/new office, building permit/TI, restaurant opening, negative review, property
  management change).
- **SerpApi candidate discovery:** run those templates, collect `candidate_signal`s.
- **Firecrawl hydration:** hydrate candidates into `hydrated_signal`s with dated evidence.
- **At least one qualified decision:** one candidate that passes the full evidence gate
  and becomes a `qualified_opportunity` with an approved label, score + reasons, why-now,
  and recommended action.
- **At least one fallback decision:** one candidate that honestly lands in
  `needs_review`, `missing_evidence`, or `exploratory`.
- **One contact-route attempt:** identify a contact path with a confidence level for the
  qualified opportunity.
- **One grounded outreach draft:** a playbook-constrained draft for the qualified
  opportunity that references the actual evidence — not auto-sent.

Passing this path proves the loop is real without committing to scale, schema, or broad
crawling.

---

## Explicit non-goals

What CP3's architecture deliberately does **not** endorse:

- **No Firecrawl `/agent` as the default MVP path.** Open-ended agentic crawling is not
  the discovery mechanism. Discovery is playbook-templated SerpApi queries; Firecrawl is
  targeted hydration of known sources.
- **No broad crawl-heavy discovery.** Fetchi does not crawl the open web looking for
  prospects. It runs bounded, playbook-defined queries.
- **No open-ended browser automation.** Browser interaction (Firecrawl `interact`) is an
  exceptional path for specific, justified cases — not a routine step.
- **No cloned niche apps.** One horizontal engine interprets many verticals via
  playbooks. Verticals are not forked codebases.
- **No snippets as leads.** A search snippet is a candidate, never a surfaced opportunity.
- **No provider implementation in this checkpoint.** CP3 is architecture only. Provider
  code, schema, and agent implementation are scoped to later checkpoints (CP4+).
