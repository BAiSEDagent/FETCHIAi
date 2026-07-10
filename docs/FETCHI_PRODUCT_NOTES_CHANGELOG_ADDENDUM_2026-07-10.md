> [!IMPORTANT]
> **Historical product-memory addendum.** This file extends `docs/FETCHI_PRODUCT_NOTES_CHANGELOG.md`. It is not current roadmap, active checkpoint, implementation status, or runtime proof. Current GitHub `main`, open PRs, `docs/ROADMAP.md`, `docs/DECISIONS.md`, and completed post-merge proof remain authoritative.

# Fetchi Product Notes Changelog Addendum — 2026-07-10

## Chat Agent Workbench + Unified Job Engine

**Sources:** Twin agent setup references and PM correction.

This addendum corrects the earlier over-sanitized interpretation of Chat. Safety constrains what Fetchi may claim; it does not prevent Fetchi from running legitimate sourcing, signal-search, enrichment, monitoring, and workflow jobs. **Items marked ⟲ supersede earlier wording.**

| ID | Item | Class | Repo |
|---|---|---|---|
| CHAT-4 ⟲ | **Chat is Fetchi's agent command center and execution surface.** It may launch bounded jobs to source net-new prospects, search fresh buying signals, enrich known leads, watch saved leads, search named sources such as TDLR/local news/permits/reviews/hiring, explain evidence, and draft outreach. It is not restricted to reading existing records. This supersedes the narrow `ARCH-2` "router/reader" interpretation while preserving its no-guess/no-bypass guardrails. | RULE | ⬜ |
| CHAT-5 | **Fetch and Chat serve different user jobs.** Fetch is the one-button default lead run using saved profile/playbook defaults. Chat is the custom command layer for specific goals, sources, scopes, enrichment, watches, and follow-up actions. Both reuse the same deterministic execution, provider, evidence, dedupe, memory, budget, and Claim Guard spine. | RULE | ⬜ |
| JOB-1 | **One runtime engine, typed jobs — not cloned agent runtimes.** Initial job types: `source_prospects`, `search_fresh_signals`, `enrich_saved_leads`, `watch_saved_leads`, `search_specific_source`, `find_similar_leads`, `explain_lead`, `draft_outreach`, and `search_map_area`. | RULE | ⬜ |
| JOB-2 | Every job compiles to an inspectable run plan: goal, target/territory, sources, filters, dedupe scope, evidence requirements, lead/result cap, cost budget, cadence, destination, progress, retry/failure policy, and next actions. The LLM may interpret the request, but code owns orchestration and approved tool boundaries. | NEXT | ⬜ |
| WATCH-1 | A user may turn saved leads into a daily/weekly **Watch**. Each scan searches approved sources for new dated evidence and may promote a prospect to an opportunity only after evidence, ownership, classification, freshness, and Claim Guard checks pass. | NEXT | ⬜ |
| WATCH-2 | Watched accounts retain `first_seen`, `last_checked`, `last_changed`, source history, failed-source state, and the evidence that caused any prospect→opportunity promotion. "What changed since last scan" must be computed from stored lineage, never invented. | NEXT | ⬜ |
| MEMORY-1 | Fetch, Chat, Leads, Map, Auto-Fetch, and recurring Watches share one workspace-private lead and market memory: known, dismissed, contacted, won/lost, enrichment state, source history, territory history, and last-seen state. No surface gets an isolated memory silo. | RULE | ⬜ |
| MEMORY-2 | Explicit workspace instructions and locked exclusions outrank learned preferences. A Chat correction becomes a durable structured rule only after explicit confirmation; freeform conversation text is not automatically promoted into operating memory. | RULE | ⬜ |
| TWIN-6 | Adopt Twin's **setup grammar** — what the agent does, apps/destinations, ICP, target geography, sources, filters, workflow, cadence, dedupe memory, caps, and failure handling — inside Fetchi's deep Settings/Auto-Fetch configuration. Do not adopt a public marketplace of cloned lead-agent templates. | NEXT | ⬜ |
| IA-4 | Surface roles: **Fetch = default run; Chat = custom agent command center; Leads = memory and pipeline; Map = territory intelligence; Settings = business context, sources, rules, learning, cadence, and destinations.** | RULE | ⬜ |
| POWER-1 | Evidence gates and Claim Guard control what Fetchi may conclude, label, score, notify, or recommend. They must not reduce legitimate source coverage, sourcing power, enrichment, monitoring, or user-directed execution. Guard the claims, not the capability. | RULE | ⬜ |

## Product interpretation

The Twin examples validate a repeatable setup grammar:

- purpose
- connected applications and result destinations
- ICP and geography
- source selection
- keywords, filters, and caps
- workflow steps
- dedupe memory
- cadence
- retries and failed-source state

Fetchi should package this as one workspace operator with vertical-aware playbooks and typed jobs, not as a marketplace of cloned lead-hunter agents.
