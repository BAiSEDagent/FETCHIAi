# Fetchi Product Idea Ledger

Status: Living product-candidate ledger. Capture does not equal approval, roadmap priority, implementation authority, or runtime proof.

## Purpose

This file keeps high-value product ideas reviewable without forcing every idea into the roadmap. It summarizes current product bets and links back to the deeper historical record in `docs/FETCHI_PRODUCT_NOTES_CHANGELOG.md`.

Authority remains:

1. Current GitHub `main`, open PRs, and final-proof status
2. `docs/PM_OPERATING_SYSTEM.md`
3. `docs/PRODUCT_CONTEXT.md`
4. `docs/DECISIONS.md`
5. `docs/ROADMAP.md`
6. Scoped product, playbook, provider, and design specifications

## Operating Rules

- No important product idea should live only in chat.
- Capturing an idea does not approve it.
- Promoting an idea requires Adam's decision and the correct canonical destination.
- Before anything moves into `Build now`, answer: **What comes off if this goes in?**
- One checkpoint at a time. Never overlap product implementation with idea consolidation.
- Design, planning, and contract proof are not runtime proof.
- Historical checkpoint references in the changelog do not set current scope.
- Guardrails constrain claims, labels, scores, notifications, and actions; they do not remove legitimate sourcing, enrichment, monitoring, or user-directed execution power.

## Status Vocabulary

- `captured` — worth retaining; not yet evaluated
- `candidate` — viable product idea awaiting review
- `promoted` — accepted into a canonical product/decision/roadmap document
- `parked` — intentionally not now
- `rejected` — intentionally not pursuing
- `superseded` — replaced by a stronger idea

## Classification Vocabulary

- `Build now`
- `Build now only if something else moves out`
- `Next`
- `Later`
- `Parked`
- `Reject`

---

# Current Product Architecture Call

## One engine, four customer surfaces

- **Fetch** — the one-button default run using saved Business Profile, playbook, territory, exclusions, and standard source plan.
- **Chat** — the custom agent command center. It may source, search, enrich, watch, explain, and draft through bounded jobs.
- **Leads** — workspace-private memory and pipeline: known, saved, dismissed, contacted, won, lost, enriched, and watched.
- **Map** — territory intelligence: where Fetchi searched, what it knows, what changed, and where to search next.
- **Settings** — business context, rules, sources, learning, cadence, connections, and destinations.

Fetch and Chat serve different user jobs but must reuse one execution spine. No cloned runtime agents per template, source, or vertical.

## Unified job engine

Initial typed jobs:

- `source_prospects`
- `search_fresh_signals`
- `enrich_saved_leads`
- `watch_saved_leads`
- `search_specific_source`
- `find_similar_leads`
- `explain_lead`
- `draft_outreach`
- `search_map_area`

Every job should compile into an inspectable run plan containing:

- goal
- target and territory
- source plan
- filters and exclusions
- dedupe scope
- evidence requirements
- result cap and cost budget
- cadence, when recurring
- destination
- progress and failure state
- next actions

The LLM may interpret the request and draft inside approved contracts. Code owns orchestration, provider boundaries, budgets, evidence gates, labels, and Claim Guard.

## Twin reference call

Borrow Twin's setup grammar:

- what this agent does
- apps and delivery destinations
- ICP and target geography
- sources and keywords
- workflow steps
- cadence
- dedupe memory
- result cap
- retry and failure handling

Do not copy Twin's public marketplace of cloned lead-agent templates. Fetchi should feel like one operator that adapts to the workspace and active playbooks.

---

# Active Product Bets

## BET-01 — The Living Market

**Status:** candidate  
**Classification:** Next  
**Area:** Fetch, Map, watch, territory intelligence, retention

### Customer problem

Lead tools repeatedly return versions of the same list. The customer cannot see what territory has been searched, what changed, what remains uncovered, or which businesses Fetchi already knows.

### Proposed capability

Fetchi builds a persistent, workspace-private model of the customer's market: businesses discovered, territories searched, first/last seen dates, source history, saved/dismissed/contacted/won/lost state, watch state, and coverage gaps. Every future Fetch or Chat job uses that memory to avoid waste and recommend where to search next.

### Customer promise

> Fetchi maps your market, remembers every business it has already shown you, watches the businesses that matter, and tells you where to sell next.

### Candidate ideas

- `IDEA-001` Market Memory
- `IDEA-002` Fetch History
- `IDEA-003` New Since Last Fetch
- `IDEA-004` Territory Coverage Map
- `IDEA-005` Map-Selected Fetch
- `IDEA-006` Uncovered Territory Recommendations
- `IDEA-007` Permanent Dismissed-Lead Suppression
- `IDEA-008` Signal Watch Over Known Prospects
- `IDEA-043` Saved Businesses Become Watchable Accounts
- `IDEA-044` Signal and Evidence History Per Account
- `IDEA-045` Source Coverage by Account and Territory
- `IDEA-046` First Seen, Last Checked, and Last Changed State

### Dependencies

- Durable Fetch and job lineage
- Workspace-scoped business identity and dedupe
- Territory geometry or bounded market cells
- First-seen/last-seen/last-checked history
- Source and failure history
- Honest new/known/coverage calculations

### Risks

- Decorative map without operational value
- False coverage claims from incomplete searches
- Treating prospect discovery as signal-backed urgency
- Expensive re-search cadence
- Calling a source change a buying signal before the evidence gate passes

### What comes off if this goes in

Generic Map polish, decorative heat maps, and unrelated dashboard expansion stay out until coverage truth, account history, and run lineage exist.

### Related changelog IDs

`POS-3`, `RUN-1`, `CRM-2`, `CRM-4`, `CRM-8`, `RANK-LATER`, `GEO-2`, `WATCH-1`, `WATCH-2`, `MEMORY-1`

### Decision needed

Which thin first slice proves the Living Market: Fetch history/new-since-last-Fetch, watchable saved accounts, or operational map coverage?

---

## BET-02 — Workspace Brain

**Status:** candidate  
**Classification:** Next  
**Area:** Context, memory, learning, Settings

### Customer problem

Fetch, Chat, Leads, Map, Auto-Fetch, and Watches can become inconsistent if each interprets the customer's business independently. A single onboarding description or long chat transcript is not a trustworthy learning system.

### Proposed capability

One workspace-scoped brain combines explicit instructions, active vertical playbook, structured preferences, lead memory, outcome memory, source preferences, market memory, and approved conversation-derived rules. A deterministic Context Compiler supplies each job and internal role with only the relevant context.

### Architecture principle

Fetchi exposes one customer-facing operator. Specialized internal roles remain hidden and consume the same workspace brain. Fetchi should borrow Twin's persistence and setup model, not become a generic agent builder.

### Candidate ideas

- `IDEA-009` Explicit Workspace Instructions
- `IDEA-010` Structured Workspace Memory
- `IDEA-011` Positive and Negative Lead Examples
- `IDEA-012` Won/Lost/Dismissal Reason Capture
- `IDEA-013` Context Compiler
- `IDEA-014` Outcome Learning
- `IDEA-015` What Fetchi Has Learned
- `IDEA-016` Approve, Reject, Lock, Forget, and Reset Memory
- `IDEA-017` Internal Role and Job Context Slices
- `IDEA-018` Workspace Brain Version History and Rollback
- `IDEA-057` Relevant Lead and Market Memory Injected Into Every Job
- `IDEA-058` Workspace Source Preferences and Reliability Learning
- `IDEA-059` Chat-to-Durable-Rule Confirmation

### Memory precedence

1. Platform laws and deterministic guards
2. Active vertical playbook and approved taxonomy
3. Explicit user instructions and locked exclusions
4. Verified workspace facts
5. Outcome-backed learned preferences
6. Behavioral inferences
7. Conversation suggestions awaiting confirmation

### Dependencies

- Lead event ledger
- Reason capture
- Structured preference contract
- Learning snapshot/version contract
- Workspace-scoped Context Compiler
- Settings transparency controls
- Explicit confirmation flow for durable Chat rules

### Risks

- Silent incorrect learning
- One ambiguous click changing future results
- Prompt injection through freeform memory
- Confusing chat history with durable business truth
- Unbounded context and model costs
- One surface using stale memory while another uses current memory

### What comes off if this goes in

Isolated Settings polish and surface-specific personalization pause until all product surfaces and jobs can consume the same context contract. This does not block bounded Chat execution; it blocks separate, inconsistent memory systems.

### Related changelog IDs

`RUN-6`, `MOAT-1` through `MOAT-6`, `ARCH-1`, `CRM-7`, `DATA-10`, `MEMORY-1`, `MEMORY-2`

### Decision needed

Which inferred memory changes may apply automatically, and which require explicit user confirmation?

---

## BET-03 — Fetchi as Operator

**Status:** candidate  
**Classification:** Next  
**Area:** Chat, typed jobs, Suggested Actions, Auto-Fetch, recurring Watches

### Customer problem

A generic AI chat box does not create a repeatable sales workflow. Users need Fetchi to execute real lead-generation jobs, search fresh sources, enrich known businesses, show what changed, and move leads toward action.

### Proposed capability

Chat becomes Fetchi's custom agent command center. It can launch bounded jobs to source net-new prospects, search fresh buying signals, inspect named sources such as TDLR/local news/permits/reviews/hiring, enrich known leads, create recurring Watches, find similar accounts, explain evidence, build call lists, route results to Map or Leads, and draft constrained outreach.

Fetch remains the fast one-button default run. Chat is the custom command layer over the same deterministic provider, evidence, dedupe, memory, budget, and Claim Guard spine.

### Candidate ideas

- `IDEA-019` Tool-Using Chat
- `IDEA-020` Morning Brief in Chat
- `IDEA-021` Playbook-Driven Suggested Actions
- `IDEA-022` Auto-Fetch Run Plans
- `IDEA-023` Territory Rotation
- `IDEA-024` Daily Next Best Market Move
- `IDEA-025` Similar-to-Won-Customer Search
- `IDEA-026` Build a Call List
- `IDEA-027` Add Leads From Chat
- `IDEA-028` Honest Quiet-Morning Response
- `IDEA-047` Custom Typed Agent Jobs
- `IDEA-048` Source-Specific Scouts
- `IDEA-049` Saved Lead Watcher
- `IDEA-050` Create Recurring Watches From Chat
- `IDEA-051` Run Plan Preview Before Execution
- `IDEA-052` Per-Job Source Selection
- `IDEA-053` Per-Job Result Limits and Cost Budgets
- `IDEA-054` Result Destinations: Leads, Map, Email, Sheets, CRM Later
- `IDEA-055` Run Progress, Retry, and Failure State
- `IDEA-056` What Changed Since Last Scan
- `IDEA-060` Twin-Style "What Fetchi Does" Setup Summary
- `IDEA-061` Deep Auto-Fetch Cadence and Destination Settings

### Initial job types

- Source new leads
- Search fresh buying signals
- Enrich known saved leads
- Watch saved leads daily or weekly
- Search a named source or source family
- Find more like a selected or won customer
- Explain one lead from evidence
- Draft outreach from verified evidence
- Search a selected map area

### Dependencies

- Deterministic job and tool contracts
- Shared workspace memory
- Fetch/run lineage
- Saved-lead pipeline and dedupe
- Scheduled runtime before recurring-monitoring claims
- Approved Suggested Actions from playbooks
- Source adapters and provider abstraction
- Honest job progress and failure reporting

### Risks

- Chat becoming a second unsupported runtime
- LLM directly selecting providers without an approved plan
- Claiming background monitoring before it exists
- Auto-actions without user approval
- Cloning one implementation per "agent mode"
- Turning Chat into unrelated open-world Q&A

### What comes off if this goes in

A public agent marketplace, cloned agent runtimes, unrelated generic-assistant features, voice polish, and automatic outreach remain out until bounded job execution and product-truth routing are proven.

### Related changelog IDs

`RUN-2` through `RUN-5`, `HAB-1`, `NOT-1`, `ACT-1` through `ACT-3`, `CHAT-1` through `CHAT-5`, `JOB-1`, `JOB-2`, `WATCH-1`, `WATCH-2`, `TWIN-6`, `IA-4`, `POWER-1`

### Decision needed

What is the first unified-job proof: source fresh leads from Chat, search one named source, enrich saved leads, or create a Watch over saved leads?

---

## BET-04 — Evidence-Backed Opportunity Engine

**Status:** promoted in product architecture; runtime completion remains sequenced  
**Classification:** Build now only through one approved checkpoint at a time  
**Area:** Signals, evidence, classification, scoring, contact route

### Customer problem

Lead lists provide volume but rarely prove why a business needs the user's service now. Unsupported urgency destroys trust.

### Proposed capability

SerpApi, approved social/search sources, and authoritative source adapters discover candidates. Firecrawl hydrates known sources. Deterministic gates require signal, dated evidence, ownership checks, approved classification, score reasons, and action before opportunity language. The DB preserves replayable lineage.

### Candidate ideas

- `IDEA-029` Prospect-to-Opportunity Promotion Wire
- `IDEA-030` Source Adapter Registry
- `IDEA-031` Claim Guard Defect Review
- `IDEA-032` Contact Route Ownership Verification
- `IDEA-033` Source-First Opportunity Detail
- `IDEA-034` Evaluate Saved Prospect Into Opportunity
- `IDEA-035` Source Reliability Learning

### Dependencies

- Active vertical playbooks
- Provider and evidence contracts
- Runtime lineage
- Deterministic Claim Guard
- Approved labels and Suggested Actions
- Account/watch history for promotion

### Risks

- Search snippet promoted as evidence
- Contact details attached to the wrong entity
- Permit holder treated as buyer
- Score or urgency without a dated artifact
- Watch change treated as intent without classification

### What comes off if this goes in

No cloned vertical app, broad crawler, autonomous runtime agent, or auto-outreach enters the checkpoint.

### Related changelog IDs

`LAW-1` through `LAW-8`, `LANE-1` through `LANE-8`, `PROV-1` through `PROV-9`, `TRUST-1` through `TRUST-3`, `SRC-1` through `SRC-3`, `EVID-1` through `EVID-3`, `WATCH-1`, `POWER-1`

### Decision needed

Which source/vertical pair is the next runtime proof after current roadmap and final-proof status are verified?

---

## BET-05 — Lightweight Lead Pipeline

**Status:** partially promoted and partially built  
**Classification:** Continue only through scoped checkpoints  
**Area:** Leads, lifecycle, notes, export, retention

### Customer problem

A useful Fetch or Chat job is lost if the user cannot retain, triage, contact, revisit, and watch the businesses found. A full CRM would create scope drift.

### Proposed capability

Fetchi remains a thin, workspace-private lead pipeline: saved leads, lifecycle, notes, dedupe memory, watch state, field-gated actions, and export. It stops before custom deal stages, email sequences, complex reporting, and broad CRM integrations.

### Candidate ideas

- `IDEA-036` Fast Inbox-Style Triage
- `IDEA-037` One-Tap Won/Lost Reason
- `IDEA-038` Export Current Filtered View
- `IDEA-039` Google Sheets Destination
- `IDEA-040` Shareable Read-Only Lead
- `IDEA-041` Claim-a-Seat Expansion
- `IDEA-042` Saved Search and Re-Run

### Dependencies

- Existing saved-lead pipeline
- Honest lifecycle semantics
- Export safety
- Workspace scoping
- Event capture for learning
- Shared watch and source-history state

### Risks

- Becoming a CRM
- Mixing prospect lifecycle with opportunity signal/score
- Exporting unsupported or unverified claims
- Treating Watch as a separate pipeline

### What comes off if this goes in

No custom fields, deal forecasting, sequence builder, CRM replacement, or broad integration marketplace.

### Related changelog IDs

`CRM-1` through `CRM-8`, `TWIN-2`, `PLG-1`, `PLG-2`, `MEMORY-1`, `WATCH-1`

### Decision needed

Which next pipeline feature creates the most retention without crossing the CRM-drift fence?

---

# Parked Bets

## BET-P01 — Social-Demand Intent Lane

**Status:** parked  
**Classification:** Later

Public social posts asking for a service may be high-intent signals, but access, compliance, platform terms, identity, and reply-in-channel rules make this unsuitable before the public-record opportunity loop is proven. Once approved source access exists, Chat may launch this as another bounded source job through the same engine.

Related changelog IDs: `SIG-1`, `SIG-2`, `CHAT-4`, `JOB-1`.

## BET-P02 — Worldwide Expansion

**Status:** parked  
**Classification:** Parked

Keep provider and playbook architecture geography-aware, but do not expand beyond the launch market strategy before the domestic loop converts.

Related changelog IDs: `GEO-1` through `GEO-4`.

---

# Rejected Product Directions

- Public marketplace of cloned agents or vertical apps
- Separate runtime implementation for every agent template or source
- Generic scraped lead-list positioning
- Autonomous LLM agent loop as production runtime
- Broad crawling as the default discovery system
- Auto-outreach without explicit user control
- Full CRM replacement
- Cross-customer sharing of leads, watchlists, private strategy, or workspace outcomes
- Engagement mechanics such as streaks, infinite feeds, and manufactured urgency
- Score-driven coral treatment
- Unlimited usage promises

Related changelog IDs: `POS-5`, `ARCH-1`, `EVAL-2`, `RANK-REJECT`, `TWIN-4`, `LAW-10`, `JOB-1`, `TWIN-6`.

---

# Idea Promotion Protocol

At each checkpoint boundary:

1. Verify current `main`, open PRs, current checkpoint, and post-merge proof status.
2. Review newly captured ideas and affected product bets.
3. Classify each idea.
4. Ask what comes off if it goes in.
5. Promote approved product truth to the correct canonical document.
6. Define one narrow checkpoint with allowed/protected files and proof.
7. Leave everything else captured, parked, rejected, or superseded.

## Canonical Promotion Destinations

| Idea type | Destination |
|---|---|
| Stable product definition | `docs/PRODUCT_CONTEXT.md` |
| Binding product decision | `docs/DECISIONS.md` |
| Sequenced work | `docs/ROADMAP.md` |
| Provider/evidence architecture | `docs/AGENT_WEB_DATA_ARCHITECTURE.md`, `docs/PROVIDER_CONTRACTS.md` |
| Vertical behavior | `docs/product/vertical-playbook-registry.md`, scoped playbook |
| Lead Funnel behavior | `docs/product/lead-funnel-product-spec.md` |
| UI law | `docs/DESIGN_SOURCE_OF_TRUTH.md`, scoped design taxonomy |
| Active implementation | Approved checkpoint issue and branch |

---

# Harvest Template

Use this after substantive product discussions:

```md
## IDEA-XXX — Name

Status: captured | candidate | promoted | parked | rejected | superseded
Classification: Build now | Build now only if something else moves out | Next | Later | Parked | Reject
Product bet: BET-XX
Captured: YYYY-MM-DD

Problem:

Idea:

Customer value:

Why it could win:

Dependencies:

Risks:

What comes off if this goes in:

Related changelog IDs:

Decision needed:
```

# Current Harvest — 2026-07-10

## New ideas captured

- Workspace Brain
- Structured memory and instruction precedence
- Context Compiler
- What Fetchi Has Learned
- Memory approval, lock, forget, reset, and rollback
- Living Market
- Fetch history and New Since Last Fetch
- Operational territory map
- Chat as custom agent command center
- Unified typed job engine
- Source-specific scouts
- Saved Lead Watcher
- Recurring Watches created through Chat
- Run-plan preview, source selection, caps, budgets, destinations, progress, and failures
- What Changed Since Last Scan
- Twin-style agent setup grammar inside deep Settings

## Decisions already reflected in current product direction

- One horizontal platform with vertical-aware playbooks
- One customer-facing Fetchi operator with hidden specialized internal roles
- Fetch is the one-button default run
- Chat is the bounded custom command and execution layer, not only a reader
- Leads is shared memory and pipeline
- Map is territory intelligence
- One deterministic runtime engine supports typed jobs; no cloned agent runtimes
- Provider boundaries remain SerpApi/source discovery, Firecrawl hydration after a source exists, LLM interpretation inside contracts, and DB/audit lineage
- Evidence and Claim Guard constrain conclusions and claims, not legitimate sourcing power
- Memory must be sourced, inspectable, reversible, and workspace-private

## Open decisions

- Which memory updates apply automatically?
- What is the first Workspace Brain implementation slice?
- Should Living Market begin with run history, watched accounts, or Map coverage?
- What is the first unified Chat job?
- Which initial sources are customer-selectable versus playbook-controlled?
