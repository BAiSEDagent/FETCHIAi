> **UPDATE (2026-06-22):** The MVP direction was **de-sanitized** after this ADR was written. The **architecture decision below still stands** (Option B: conductor spine + SerpApi×Firecrawl bounded adapters; web-agent only as caged escalation; Maps/Local primary; Firecrawl = Stroke 2). **BUT** anywhere this doc says "confidence-labeled," "data gaps," or implies user-facing lanes/labels, treat it as **superseded** — the MVP shows **no user-facing confidence labels, data-gaps, lanes, or proof rails**; just an abundant list. The product source of truth is **`FETCHI_MVP_THE_SWEEP.md`**.

# ADR-001: Multi-Source Discovery + Enrichment Engine (SerpApi × Firecrawl)

**Status:** Proposed
**Date:** 2026-06-22
**Deciders:** Adam (founder), PM, cofounder review
**Related:** `FETCHI_MVP_MULTISOURCE_SCOPE.md` (the MVP this serves)

## Context

The MVP is a wide, **location-aware** lead agent that must *feel* like it swept the whole web and came back with contactable value — anywhere in the country, with deeper coverage where we've built it (Texas/TDLR first). Adam is user #1 (dogfood: use Fetchi's output to cold-email small businesses about Fetchi).

We have two provider families and a proven spine:

- **SerpApi** — cheap (~$0.01/search), fast, structured, national. Google **Web**, **Maps/Local** (business name + phone + website + address + category in one call), **News** (events/signals), **Jobs** (hiring signals).
- **Firecrawl** — per-page enrichment. **Scrape** (~1 credit, cheap), **Search**, **Extract** (structured, ~5 credits), **Interact** (browser automation: clicks/forms/login), and an open-source **web-agent** (a research-grade autonomous loop on LangChain Deep Agents: plan-act-observe, parallel subagents, on-demand skills). Firecrawl also ships a ready-made `firecrawl-lead-gen` skill (extraction fields, quality bar, CRM-ready JSON/CSV deliverable).
- **The CP21 conductor** — already proven: deterministic, transactional persistence, lineage, per-candidate error isolation, lane safety. This is the spine. Fetchi's thesis is explicitly "one deterministic machine, not an autonomous agent."

The question: **how do we build the discovery + enrichment engine, and what role should Firecrawl's autonomous web-agent play?**

## Decision

Build a **two-stage pipeline behind the existing deterministic conductor**:

1. **Discovery (breadth) — SerpApi.** Location + vertical → the universe of businesses. Google **Maps/Local** is the primary move (instant business + phone + website), with Web/News/Jobs for coverage and signals. National backbone runs everywhere; TDLR and other location-gated adapters layer in by geography.
2. **Enrichment (depth) — Firecrawl.** For each discovered business, scrape its site for email, owner/contact, services, and a one-line personalization hook. Lift the `firecrawl-lead-gen` extraction fields, quality bar, and deliverable format directly.

Use Firecrawl's **autonomous web-agent only as a caged, budget-capped escalation** for hard-to-find contacts — never as the runtime spine. Borrow its *parallel + streaming* pattern (enrich many leads concurrently, show progress) for perceived value, without adopting the LangChain Deep Agents harness as the orchestrator.

This is **Option B** below.

## Options Considered

### Option A: Adopt the Firecrawl web-agent (Deep Agents) as the engine
| Dimension | Assessment |
|-----------|------------|
| Complexity | High — new LangChain runtime alongside the conductor |
| Cost | High + **unpredictable** (autonomous LLM loop per run) |
| Scalability | Good for research depth, poor for cost control at lead volume |
| Team familiarity | Low — new framework |
| Fit with thesis | **Conflicts** — Fetchi is "one deterministic machine, not an autonomous agent" |

**Pros:** Ready-made plan-act loop, parallel subagents, the "research agent" feel out of the box.
**Cons:** A second orchestrator competing with the proven conductor; reintroduces the nondeterminism and unpredictable per-run cost Fetchi deliberately avoided; hard to enforce budget caps and lane safety inside an autonomous loop.

### Option B: Deterministic conductor + Firecrawl/SerpApi as bounded adapters (RECOMMENDED)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — adds adapters + an enrichment stage to a proven spine |
| Cost | **Low + predictable** — cheap SerpApi breadth, cheap Firecrawl scrape, escalate only on miss |
| Scalability | Strong — caps, dedupe-before-enrich, parallel enrichment |
| Team familiarity | High — extends what's already built |
| Fit with thesis | **Strong** — deterministic spine preserved; agent is a tool, not the runtime |

**Pros:** Keeps the moat (deterministic, cost-predictable, lineage, lane safety); gets the SerpApi-breadth × Firecrawl-depth magic; lifts a proven extraction playbook; parallel/streaming gives the agent *feel* without the agent *runtime*.
**Cons:** We build the orchestration glue ourselves (but we already have it — the conductor).

### Option C: Pivot the product base to the web-agent template
| Dimension | Assessment |
|-----------|------------|
| Complexity | Very High — base switch |
| Fit with thesis | **Rejects it** |

**Pros:** Fastest way to a flashy agent demo.
**Cons:** Throws away the conductor, persistence, lane safety, and CP21 proof — same mistake as a Convex migration. Rejected.

## Trade-off Analysis

The real tension is **autonomous magic vs. deterministic control**. Option A buys the "research agent" feel at the cost of cost-predictability, lane safety, and the core thesis. Option B gets ~90% of the felt magic — because the magic is actually the **SerpApi-breadth → Firecrawl-depth → parallel enrichment** combo, not the autonomous loop — while keeping every property that makes Fetchi defensible and cheap to run.

Cost is decisive. The cost-smart path: one SerpApi Maps call returns N businesses; Firecrawl **basic scrape** (cheap) enriches each; escalate to **Extract/Interact/web-agent** (5×+) *only* for the records where basic scrape didn't surface a contact. That keeps per-lead COGS low while maximizing the "it found me real contacts" hit rate. An autonomous agent (Option A) can't make that escalation decision deterministically or cap it cleanly.

## Consequences

**Easier:**
- Perceived value lands day one (Maps gives contactable businesses immediately, anywhere).
- Per-lead cost stays low and predictable; the builder/runner economics hold.
- The `firecrawl-lead-gen` playbook drops into the prospect lane with little rework; CRM-ready JSON/CSV export is near-free.
- Parallel enrichment + streaming progress = visible agent effort (the felt value).

**Harder:**
- We own the escalation logic (scrape → extract → interact/agent) and its budget gates.
- Social coverage stays partial (access/legal-gated) — labeled "expanding."

**Revisit later:**
- If customers demand deep autonomous research per lead, reconsider the web-agent as an *opt-in, premium, capped* mode — still behind the conductor, never as the spine.

## Action Items (sequencing)

1. [ ] **Checkpoint 1 (national breadth):** SerpApi **Maps + Web** discovery behind the source router → conductor → confidence-labeled prospect list with phone/site. Ships value in any location, including NM.
2. [ ] **Checkpoint 2 (Firecrawl enrichment):** per-lead scrape for email/owner/hook using the `firecrawl-lead-gen` extraction fields; parallel + streaming; CRM-ready JSON/CSV export.
3. [ ] **Checkpoint 3 (signals + TX depth):** SerpApi News/Jobs signal enrichment; wire the existing **TDLR (TX)** adapter as location-gated depth for Dallas/Houston/Austin.
4. [ ] **Checkpoint 4 (caged escalation + intel-on-demand):** Firecrawl Extract/Interact as budget-capped fallback for missing contacts. Add a user-initiated **per-lead deep dive** (adapt the `firecrawl-deep-research` skill): on one chosen lead, run a focused cited account brief (business, recent news, reviews, hiring, tailored outreach angle) for the cold email/call. Expose a **depth dial** (Quick / Thorough / Exhaustive → source count + budget) so the expensive research spend is user-directed at the leads that matter. Never run an exhaustive dive across the whole list. The autonomous web-agent, if used, lives here behind a hard cost cap — escalation, never the spine.

> Note: `firecrawl-deep-research` is a *report* generator (its own description forbids using it for lists/top-N). It is NOT the lead-gen engine — it is the per-lead intel feature only. The broad list is always SerpApi-breadth × Firecrawl-depth (CP1–CP2).
5. [ ] **Cross-cutting:** keep per-candidate error isolation, dedupe-before-enrich, confidence labels, and per-run budget envelope from the conductor on every stage.

The conductor proven in CP21 is the spine. This bolts discovery + enrichment on top — no base switch, no second orchestrator.
