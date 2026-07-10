> [!IMPORTANT]
> **Historical product capture and research ledger.** This file preserves product ideas, decisions, laws, architecture notes, and prior checkpoint context so they are not lost. It is **not** the current roadmap, active checkpoint, implementation status, or runtime proof. Current GitHub `main`, open PRs, `docs/ROADMAP.md`, `docs/DECISIONS.md`, and completed post-merge proof remain authoritative. Repo-status marks inside this file may be stale until a separate verification pass updates them.

# Fetchi — Product Notes & Decisions Changelog

**Purpose:** a single durable capture of every product idea, decision, law, and architecture note from the research/strategy run (firecrawl-lead-gen, NM run, Twin, founder-lens, Codex architecture memo, nationwide/Shovels, Suggested Actions). Nothing here is lost. Each item has a stable **ID** and a **Repo status** column left as `⬜ unverified` — the next pass checks the live repo and marks each **✅ built / 🟨 specced-only / ⬜ missing / ❌ rejected-confirmed**.

**Compiled:** 2026-06-15 · **Sources:** Adam research RTFs + Codex/founder-lens conversations, CP11–CP18 era. **Caveat:** repo has moved to CP17B/CP18; some of this landed, some didn't — that's what the verification pass is for.

Legend — Class: `RULE` (binding law) · `BUILD` (build now) · `NEXT` · `LATER` · `PARK` · `REJECT` · `DECISION` (needs Adam).

---

## 1. Identity & Positioning

| ID | Item | Class | Repo |
|---|---|---|---|
| POS-1 | Fetchi = the **live demand feed** for local commercial services (what changed overnight, who needs you, proven with sources). NOT a lead dashboard. | RULE | ⬜ |
| POS-2 | Promise: "Tell us what you sell — we'll find buyers who need it this week." | RULE | ⬜ |
| POS-3 | Dual promise: ALSO "we build your buyer universe day one, then watch it for signals." | RULE | ⬜ |
| POS-4 | Leads are the *monetization* of the feed, not the product. | RULE | ⬜ |
| POS-5 | One horizontal platform, vertical-aware via playbooks/config. NOT roofing-only, NOT cloned niche apps, NOT a generic scraped lead list, NOT a public agent marketplace. | RULE | ⬜ |

## 2. Product Laws (binding)

| ID | Item | Class | Repo |
|---|---|---|---|
| LAW-1 | No opportunity without a fresh signal. | RULE | ⬜ |
| LAW-2 | No lead without evidence. | RULE | ⬜ |
| LAW-3 | No score without reason. | RULE | ⬜ |
| LAW-4 | No explanation without action. | RULE | ⬜ |
| LAW-5 | No unsupported user-visible claim; UI labels come only from approved playbook/taxonomy (AI may rank/interpret, never freestyle). | RULE | ⬜ |
| LAW-6 | Every **urgency/why-now** claim must cite a **dated** artifact (permit/posting/review/article/listing date). No date → weak/missing, never urgency. | RULE | ⬜ |
| LAW-7 | **No orphan claims** — every claim shown to a user needs an evidence pointer. | RULE | ⬜ |
| LAW-8 | "No signal doesn't mean no lead — it means no why-now claim." | RULE | ⬜ |
| LAW-9 | No prior without sample size (n-gate any conversion-rate display; show the n). | RULE | ⬜ |
| LAW-10 | Design: coral = urgent-action surface only; score never drives card color. | RULE | ⬜ |

## 3. Lead-Supply Model — lanes & levels

| ID | Item | Class | Repo |
|---|---|---|---|
| LANE-1 | **Lane A — Signal Discovery:** SerpApi → Firecrawl hydration → classifier → opportunity → contact route → outreach. | RULE | ⬜ |
| LANE-2 | **Lane B — Prospect Mining / Market Builder:** Firecrawl workflows / SerpApi Maps / directories → prospect evidence packet → fit classifier → Prospect Pool. | RULE | ⬜ |
| LANE-3 | **Lane C — Enrichment:** known prospect/domain → map/scrape/extract → better outreach; doesn't change lead kind. | RULE | ⬜ |
| LANE-4 | Three levels: Prospect (light fit) → Evidence-backed Lead (fit score, NO urgency) → Signal-backed Opportunity (full urgency score). | RULE | ⬜ |
| LANE-5 | `LeadKind` = signal_backed_opportunity \| evidence_backed_prospect \| exploratory_prospect. | RULE | ⬜ |
| LANE-6 | `SourceEvidenceType` = permit \| maps_listing \| directory \| company_website \| news \| job_posting \| review \| database \| property_portfolio. | RULE | ⬜ |
| LANE-7 | firecrawl-lead-gen / company-directories skills power Lane B + enrichment + internal tooling ONLY — never the opportunity lane, never production runtime authority ("agent workflow references"). | RULE | ⬜ |
| LANE-8 | Don't let the cheap high-volume prospect lane ship ahead of proving live signal discovery. | RULE | ⬜ |

## 4. Core Loop & Run Engine

| ID | Item | Class | Repo |
|---|---|---|---|
| RUN-1 | **The loop:** build the list (day 1) → watch the pooled accounts for fresh events (promote prospect→opportunity) → keep discovering new accounts. One funnel with a lifecycle, not two lanes. | RULE | ⬜ |
| RUN-2 | **One machine, six triggers** — single orchestrator + `RunMode` config (trigger, scope, signal-on/off, budget). NOT six runner implementations. | RULE | ⬜ |
| RUN-3 | Mode 2 (chat-triggered) = the proof (manual version of all six) → build first. | BUILD | ⬜ |
| RUN-4 | Mode 6 (scheduled scout) = the business → cron around mode 2. | NEXT | ⬜ |
| RUN-5 | **No express lane through the guard** — every mode (esp. chat) passes the full trust loop. | RULE | ⬜ |
| RUN-6 | **Learning-ready from run #1** — every run writes lineage, every dismissal captures a reason, every record carries outcome hooks, every run has a budget envelope. | RULE | ⬜ |
| RUN-7 | 12-step runtime flow: profile → playbook → query-gen (deterministic templates first; LLM variants only if they compile to approved templates) → SerpApi discovery → candidate extraction (no scoring) → Firecrawl hydration → evidence gate → classification → scoring (deterministic + LLM reasons tied to evidence IDs) → opportunity creation → contact route → outreach → outcome learning. | RULE | ⬜ |

## 5. Onboarding & Habit Loop

| ID | Item | Class | Repo |
|---|---|---|---|
| HAB-1 | **Morning Brief** = primary habit loop: 3–7 cards, **finishable** ("done for today"), never infinite scroll. **NOT timed** — no countdown/duration shown, ever (the finishability comes from a small bounded card count, not a clock). | BUILD | ⬜ |
| HAB-2 | Variable reward = real revenue (honest variability), not engagement candy. | RULE | ⬜ |
| HAB-3 | Day-1 magic = **recognition** (a named local building/business + dated evidence). Onboarding seed biases toward prominent recognizable accounts, not max volume. | RULE | ⬜ |
| HAB-4 | Onboarding flow: what do you sell → where → customer types → optional website → first Lead Funnel. | NEXT | ⬜ |

## 6. Notifications / Promotion Wire

| ID | Item | Class | Repo |
|---|---|---|---|
| NOT-1 | **Promotion Wire** = retention engine. #1 notification = prospect→opportunity promotion ("a building you're watching just filed a reroof permit"). Build with first runtime. | BUILD | ⬜ |
| NOT-2 | Notification hierarchy: Promotion > new high-fit opp in territory > response/route progress > expiring window (only if real) > weekly digest. | NEXT | ⬜ |
| NOT-3 | **Every push passes the Claim Guard** (a notification is a user-visible claim). | RULE | ⬜ |
| NOT-4 | Never-notify: pool growth, score recalcs, evidence weakening (in-app flag only), streaks, tips, re-engagement begging. Caps/day + quiet hours. | RULE | ⬜ |

## 7. The Demand Graph

| ID | Item | Class | Repo |
|---|---|---|---|
| GRAPH-1 | The demand graph = the evidence lineage you already store. **DO NOT build a graph DB** — relational + lineage encodes it. | RULE | ⬜ |
| GRAPH-2 | Relationships that matter: owns / manages / occupies, affected-by, converted-via, portfolio-of. People as roles (PM/FM/owner), not just names. | NEXT | ⬜ |
| GRAPH-3 | Entity resolution (same property across permit/assessor/review sources) is the real incremental work. | LATER | ⬜ |
| GRAPH-4 | Moat one-liner: **own the joins and the outcomes** — everyone can buy the same records; no one can buy what happened next. | RULE | ⬜ |

## 8. Network Effect & Outcome Learning (the moat)

| ID | Item | Class | Repo |
|---|---|---|---|
| MOAT-1 | **Outcome Learning** = the missing moat. Collect won/lost/pass-reason from run #1; conversion priors per vertical×metro×signal×buyer type. | BUILD (collect) / NEXT (display) | ⬜ |
| MOAT-2 | Network effect runs **across metros/verticals, NEVER within** (same-metro+vertical users are competitors). Learning transfers; leads/watchlists never shared. | RULE | ⬜ |
| MOAT-3 | Hierarchical priors with shrinkage: global → vertical → metro → workspace (fall back to parent when n small). | NEXT | ⬜ |
| MOAT-4 | Cold start: playbooks/research packs are the priors + pass-reasons (signal from day 1). | RULE | ⬜ |
| MOAT-5 | Floor-exploration: always show a small % from under-sampled segments so ignored-buyer-type loops don't blind the model. | NEXT | ⬜ |
| MOAT-6 | Source reliability scores (which sources survive the gate + convert) — learned globally. | LATER | ⬜ |

## 9. Provider Architecture & Contracts

| ID | Item | Class | Repo |
|---|---|---|---|
| PROV-1 | Hard boundaries: SerpApi = discovery only; Firecrawl = hydration only; LLM = interpretation inside contracts only; only audit layer connects them into an opportunity. | RULE | ⬜ |
| PROV-2 | SearchProvider contract (discovery; google_light default). | BUILD | ⬜ |
| PROV-3 | EvidenceProvider contract (hydration; Firecrawl scrapeUrl). | BUILD | ⬜ |
| PROV-4 | EnrichmentProvider contract. | NEXT | ⬜ |
| PROV-5 | ContactRouteProvider contract (refuses invented names/emails/phones). | NEXT | ⬜ |
| PROV-6 | **ResearchProvider = DEFER** (don't build — agentic escape hatch). | PARK | ⬜ |
| PROV-7 | PermitProvider contract + NoopPermitProvider (switchable; ShovelsPermitProvider behind a flag later). | NEXT | ⬜ |
| PROV-8 | Provider **failure fingerprints** — adapters fail loudly into run metadata, never silently degrade. | BUILD | ⬜ |
| PROV-9 | Builder/runner cost split as policy: high-reasoning models only at config-time; cheap Haiku-class in the per-lead hot path. Never reverse. | RULE | ⬜ |

## 10. Data Model (10 records)

| ID | Item | Class | Repo |
|---|---|---|---|
| DATA-1 | provider_runs (replay unit) | BUILD | ⬜ |
| DATA-2 | search_tasks | BUILD | ⬜ |
| DATA-3 | signal_candidates | BUILD | ⬜ |
| DATA-4 | prospect_candidates | BUILD | ⬜ |
| DATA-5 | hydrated_sources | BUILD | ⬜ |
| DATA-6 | evidence_records | BUILD | ⬜ |
| DATA-7 | opportunity_explanations (score reasons evidence-linked) | BUILD | ⬜ |
| DATA-8 | contact_route_evidence | NEXT | ⬜ |
| DATA-9 | audit_replay_records | BUILD | ⬜ |
| DATA-10 | Privacy: workspace-private vs shared/global split; shared caches must NOT leak workspace intent/strategy. | RULE | ⬜ |

## 11. Cost / Trust / Safety

| ID | Item | Class | Repo |
|---|---|---|---|
| COST-1 | _light engines by default; cap queries per workspace/run. | RULE | ⬜ |
| COST-2 | **Dedupe by normalized URL/domain BEFORE Firecrawl**; hydrate only top candidates. | RULE | ⬜ |
| COST-3 | Cache source hydration by URL + content-hash + freshness window. | RULE | ⬜ |
| COST-4 | Log estimated cost on every provider run; per-workspace + global rate limits; retry only retryable errors. | RULE | ⬜ |
| COST-5 | **Idiot index per lead** = searches × hydrations × LLM calls per surfaced record, budget-enveloped per workspace/day, measured from run 1. | NEXT | ⬜ |
| TRUST-1 | Fake-opportunity prevention: requires ALL 5 (signal candidate + hydrated evidence + approved classification + score reason + action) or it's fallback. | RULE | ⬜ |
| TRUST-2 | Weak evidence stored + explained, classified as needs_review/missing_evidence/weak_fit/exploratory/discarded, NEVER upgraded. | RULE | ⬜ |
| TRUST-3 | Claim Guard is the RETENTION system; every production guard-block = a defect to study. | RULE | ⬜ |

## 12. Nationwide / Worldwide & Provider Switches

| ID | Item | Class | Repo |
|---|---|---|---|
| GEO-1 | Fetchi is **nationwide** (maybe worldwide) — NOT one metro. One metro = calibration/dyno run only. | RULE | ⬜ |
| GEO-2 | Nationwide-native architecture: market_coverage.country + graded coverageStatus per metro/vertical; query strategies in DB; SerpApi location-parameterized. | RULE | ⬜ |
| GEO-3 | Prefer NATIONAL sources over per-jurisdiction scrapers: NOAA SPC, Shovels (permits), SAM.gov (procurement), SerpApi. | DECISION | ⬜ |
| GEO-4 | Worldwide = parked, door open. Never hardcode US assumptions outside playbook/config (signal sources, freshness windows, label sets in DB). | PARK | ⬜ |
| SW-1 | Switchable providers: turn paid ones (Shovels) on when MRR supports it. Write the **flip-trigger into DECISIONS.md** (e.g. ≥X qualified permits/week AND roofing MRR ≥ 3×$599). | DECISION | ⬜ |
| SW-2 | Shovels trial = 250 calls FREE (≤25k records) → spike costs $0; do free SerpApi+Firecrawl permit test first to see if Shovels is convenience vs necessity. | DECISION | ⬜ |
| SW-3 | Shovels adapter gotchas: money fields in CENTS; geo_id needs a resolution call first (cache in market_coverage); pull Lists endpoint for permit_tags vocab. | NEXT | ⬜ |

## 13. Vertical Playbooks

| ID | Item | Class | Repo |
|---|---|---|---|
| VERT-1 | 10 launch verticals; Commercial Cleaning has v1 playbook; Roofing v1 next. Other 8 frozen behind loop proof. | RULE | ⬜ |
| VERT-2 | Per-vertical first signal lanes + engines documented (Roofing=permit/TI/storm; Cleaning=new-biz/review/PM-change/hiring; etc.). | NEXT | ⬜ |
| ROOF-1 | Permits beat weather as apex roofing signal; weather = watchlist layer only (weather → asset match → corroborating signal). | RULE | ⬜ |
| ROOF-2 | NOAA SPC = same-day preliminary (watchlist); Storm Events DB lags 75–90 days (not "this week"). | RULE | ⬜ |
| ROOF-3 | **Permit holder ≠ buyer** (some jurisdictions only let contractors pull permits) → mandatory disqualification + contact-route rule. Shovels solves via property_legal_owner. | RULE | ⬜ |
| ROOF-4 | Public procurement = its own signal lane (schools/municipal/hospital; SAM.gov, bond cycles); never suggest bypassing procurement (Claim Guard block). | NEXT | ⬜ |
| ROOF-5 | `SignalType` enum needs extending: storm/weather, procurement, ownership change, code violation, capital improvement (scoped change to lib/providers/contracts.ts). | DECISION | ⬜ |
| ROOF-6 | Freshness is per-signal-type, not global (SPC 0–14d, permits 0–90d, agendas 0–180d) → playbook freshness table by label. | NEXT | ⬜ |
| ROOF-7 | Label conservatism: "Leak Reported" not "Leak Risk"; "Insurance Restoration" not "Insurance Claim"; never assert hail damage/claimability. | RULE | ⬜ |

## 14. Suggested Actions (chat UX)

| ID | Item | Class | Repo |
|---|---|---|---|
| ACT-1 | Vertical-aware **Suggested Actions** (not "prompts") — playbook-driven, not hardcoded in React. New playbook field `suggested_actions`. | NEXT (spec first) | ⬜ |
| ACT-2 | Five action types: discovery / explanation / outreach / contact / workflow. Four surfaces: chat empty state, Today, Lead Detail, Prospect Pool. | NEXT | ⬜ |
| ACT-3 | AI may rank/interpret but cannot freestyle product-visible actions (same as labels). Also powers onboarding ("based on your business, here's how to start"). | RULE | ⬜ |

## 15. PLG / Growth

| ID | Item | Class | Repo |
|---|---|---|---|
| PLG-1 | **Shareable work order** = the PLG engine: forward opportunity → read-only lead page → "Claim this lead" → seat invite → expansion. The forward is the demo. | NEXT | ⬜ |
| PLG-2 | Single-player works first (solo contractor replacing windshield-time); multi-player = expansion vector. | RULE | ⬜ |
| PLG-3 | Weekly market digest = shareable object ("what changed in DFW commercial roofing this week"). | NEXT | ⬜ |
| PLG-4 | Library-as-distribution: playbook × metro SEO pages (the dormant `seoPages` table). | LATER | ⬜ |

## 16. Competitive (Twin) takeaways

| ID | Item | Class | Repo |
|---|---|---|---|
| TWIN-1 | Twin = market validation, not a model to copy. Their agents = scrape→enrich→export = Prospect Pool/Enrichment, not Opportunity. | NOTE | ⬜ |
| TWIN-2 | Export to Sheets/CSV is **table stakes** (every Twin agent delivers to Sheets/email/Notion/CRM). CSV export first. | NEXT | ⬜ |
| TWIN-3 | "Ready-to-review" framing = trust positioning. | NOTE | ⬜ |
| TWIN-4 | Never compete on browser-agent infra (Twin spent €12M + 2 yrs). Managed providers (SerpApi+Firecrawl) is the right call. | RULE | ⬜ |
| TWIN-5 | Clone counts = weak directional demand, not revenue. Don't drift to LinkedIn/recruiting/crypto. | NOTE | ⬜ |

## 17. Concept Ranking (consolidated)

| ID | Item | Class | Repo |
|---|---|---|---|
| RANK-BUILD | Run executor + Morning Brief + Promotion Wire + outcome collection + per-run budget envelopes. | BUILD | ⬜ |
| RANK-NEXT | Market Pulse feed; shareable work-order + claim-a-seat; conversion-prior display (n-gated); weekly digest; CSV export. | NEXT | ⬜ |
| RANK-LATER | Territory Coverage Report; agency/multi-metro tier; route-intelligence; SEO pages; map view. | LATER | ⬜ |
| RANK-REJECT | Lead marketplace/exclusivity (Angi move); community-verified signals; cross-customer watchlist sharing; public business-profile/SEO-bait pages for prospects; CRM drift (become a CRM); engagement mechanics (streaks/infinite feeds); agentic browsing as default. | REJECT | ⬜ |

## 18. Sequencing & Proof Bars

| ID | Item | Class | Repo |
|---|---|---|---|
| PROOF-1 | **The one loop to prove before ANY vertical expansion:** brief → action → outcome → visibly better brief. One vertical, ten paying users. | RULE | ⬜ |
| PROOF-2 | **First-loop funnel proof bar:** 50 candidates → 15 hydrated w/ usable evidence → 5 surfaced opportunities → 5 correctly rejected/fallbacked → every claim replayable → margin survives. | RULE | ⬜ |
| PROOF-3 | First proof verticals: Cleaning/Janitorial + Roofing, one city (calibration). | NEXT | ⬜ |
| PROOF-4 | 10-customer test: 10 contractors, 1 vertical, 1–2 metros, 30 days, charged day 1. Measure: brief-open days/wk (≥4), card action rate, time-to-first-contacted-lead (<7d), first verified win + attribution, day-30 renewal + cancel reasons. Tell: they open before the notification and complain when it's late. | NEXT | ⬜ |
| PROOF-5 | Recorded-real is allowed as a fallback only; the real next bar is live discovery of an UNKNOWN qualifying record + DB persistence round-trip. | RULE | ⬜ |

## 19. Open Decisions for Adam

| ID | Item | Class | Repo |
|---|---|---|---|
| DEC-1 | Shovels vs SerpApi+Firecrawl for permits — run the free test, then set the flip-trigger. | DECISION | ⬜ |
| DEC-2 | `SignalType` enum extension scope (roofing/procurement signals) — when and exactly which. | DECISION | ⬜ |
| DEC-3 | Make Outcome Learning a first-class mode captured from run #1 (vs parked). | DECISION | ⬜ |
| DEC-4 | National source stack (NOAA SPC + Shovels + SAM.gov) as the backbone vs local portals. | DECISION | ⬜ |

---

## Biggest risks (carry forward)
- **The quiet morning** — empty brief kills the ritual. Fill silence with honest market motion (pool/watch/pulse), never inflated urgency.
- **One acted-upon overclaim** — a contractor humiliated before a PM tells the whole supply house. Claim Guard = retention, not compliance.
- **Proof-layer outpacing runtime** — contracts/smokes are not runtime proof; recorded-real is not live discovery; don't add inert artifacts before the loop turns over.
- **Notification spam** — the Promotion only works while promotions are rare and real.

---

# Addendum — updates since initial capture (added 2026-06-15, later session)

New decisions, corrections, and evaluations from extended cofounder discussion. Same Class/Repo conventions. **Items marked ⟲ SUPERSEDE earlier lines.**

## 20. Scope & Signal Model

| ID | Item | Class | Repo |
|---|---|---|---|
| POS-6 ⟲ | Fetchi is for **ANY small business**, not commercial-only. Horizontal engine + playbooks; new SMB type = new playbook, not new code. "Any SMB" = TAM/north-star; launch stays focused on signal-rich verticals in big metros. (Supersedes commercial-only emphasis.) | RULE | ⬜ |
| SIG-1 ⟲ | Signals come in **families**, not "rich vs poor": (a) **public-record** (permits/licenses/leases/openings/property/hiring/reviews) → B2B/property; (b) **social-demand intent** ("anyone know a good ___?" on FB groups/Nextdoor/Reddit/X) → consumer services, *highest intent*; (c) cross-cutting (reviews=switching, hiring=growth, news/events). Almost every SMB has ≥1. (Supersedes any "signal-poor SMB" framing.) | RULE | ⬜ |
| SIG-2 | **Social-demand lane guardrails:** public posts/public groups via legitimate access only — never bypass access controls/CAPTCHAs (FB hostile, Meta sued scrapers; Reddit/X have real APIs). **Reply-in-channel** (surface post as dated evidence + draft an in-thread reply), never extract-and-cold-call. It's another source adapter into the same pipeline. **LATER lane** — after public-record loop proven. | RULE | ⬜ |
| HAB-1 ⟲ | Morning Brief is **NOT timed** — no countdown/duration ever; finishability = bounded card count, not a clock. (Corrected.) | RULE | ✅ (doc) |

## 21. Architecture Clarifications

| ID | Item | Class | Repo |
|---|---|---|---|
| ARCH-1 | **The Scout = ONE deterministic pipeline (stations), NOT an autonomous agent.** Code holds orchestration; the LLM fills only 3 caged slots (classify→approved label · write score-reason tied to evidence IDs · draft from template). SerpApi/Firecrawl are tools the pipeline calls at *fixed stations*, not plugins an LLM chooses. NEVER model the runtime on an agent framework. | RULE | ⬜ |
| ARCH-2 | **Chat = a 4th AI surface, but a ROUTER/READER not a generator.** It launches the Scout (intent→approved Suggested Action) or reads/drafts from already-gated data; never answers open-world from model weights; if it can't answer from gated data or a run, it offers to scout, not guess. "No express lane through the guard — especially chat." Today: stub (`seed-chat.ts` placeholder). | RULE | ⬜ |
| ARCH-3 | **Two agents — don't conflate:** the BUILDER (Codex — *may* use agent SDKs/skills/plugins to write Fetchi) vs the RUNTIME (the Scout — deterministic, no agent loop). | RULE | ⬜ |

## 22. Provider Economics & Adapter Rules

| ID | Item | Class | Repo |
|---|---|---|---|
| COGS-6 | Discovery + hydration are **cheap, near-fixed PLATFORM costs**; per-opportunity COGS ≈ **$0.02–0.06, LLM-dominated.** The #1 margin lever is the builder/runner model split (cheap model in the per-lead hot path), NOT provider choice. | RULE | ⬜ |
| SERP-2 | **SerpApi Production tier ($150) minimum** — "U.S. Legal Shield" (scraping indemnification) only at Production+. | DECISION | ⬜ |
| SERP-3 | SerpApi adapter (JS SDK, already in package.json): retry w/ jittered backoff (429/5xx only, honor `Retry-After`, never 401); `async=true` + Search Archive for batch scout (archive replay = **free** = lineage). Monthly search cap is the ceiling; **cadence is the dominant cost lever** (weekly default, per-workspace dial). | NEXT | ⬜ |
| FC-3 | Firecrawl: basic scrape = 1cr; `json`/`question`/`highlights` = **5cr (5×)** → scrape + own cheap LLM extract. **Workhorses = Scrape + Map; AVOID Crawl/Interact/Search/Agent.** Own DB cache (URL+content-hash+freshness) saves money (FC's `maxAge` saves latency, not credits). Dedupe before hydrate. | RULE | ⬜ |
| FC-4 | **Firecrawl Monitor (1cr/page/check + webhook on change) = a near-drop-in Signal-Watch *detection* engine** for known-page changes. But the qualifying/labeling/opportunity DECISION stays in Fetchi's gate (FC "judge" ≠ classifier). Signal Watch = SerpApi re-query for NEW records + FC Monitor for CHANGES to known pages. | NEXT | ⬜ |

## 23. Source-Adapter Strategy (from CP19)

| ID | Item | Class | Repo |
|---|---|---|---|
| SRC-1 | **Discovery ≠ "search Google."** CP19 proved generic Google can't find fresh structured records (indexes the listing shell, not detail). Discovery = query the **authoritative source** (TDLR JSON endpoint, Shovels, SAM.gov). Pattern: SerpApi discover/validate source → source adapter → Firecrawl hydrate → gates. | RULE | ⬜ |
| SRC-2 | **Bounded-market correction:** hand-crafted source adapters for big target metros = **moat, not death march** — adapters cluster by state/source (TDLR = 1 adapter, 5 TX metros); ~10–15 cover the launch market. **Hybrid:** national aggregator = breadth floor + hand-crafted = depth premium. Build **demand-driven** (one market per paying-customer pull, not 15 upfront). | RULE | ⬜ |
| SRC-3 | TDLR = proof-of-pattern + TX coverage + Shovels-decision input, **not** the national permit strategy. May defer Shovels if free state adapters cover launch cities. Undocumented endpoints (TDLR JSON) are fragile → failure fingerprints; documented aggregator > per-state internal scraping for the long tail. | DECISION | ⬜ |

## 24. Tools Evaluated

| ID | Item | Class | Repo |
|---|---|---|---|
| EVAL-1 | **Perplexity:** research-tool-only (offline playbook authoring) + maybe Embeddings for entity-resolution. Sonar/Deep Research/Agent = synthesis = NOT runtime evidence (violates "LLM explanation isn't evidence" / "no orphan claims"). | NOTE | ⬜ |
| EVAL-2 | **Autonomous agents (babyagent / Firecrawl web-agent / FC `/agent`):** NOT the runtime (= the pattern the Scout rejects). Offline playbook-authoring only; web-agent is forkable → possible future internal "research a vertical → draft pack → human curates" admin tool (LATER). Resist "fork it as our engine." | REJECT (runtime) / LATER (builder) | ⬜ |
| EVAL-3 | **Thumbtack Partner Platform:** NOT a lead source (marketplace leads = CRM drift). Maybe-Later connector. Competitive contrast = **model not segment** (outbound signal vs inbound shared marketplace). **Steal:** their job-status lifecycle (`appt_scheduled→job_complete→invoice_paid` + invoice amount) as the **Outcome Learning schema template.** | NOTE | ⬜ |

## 25. Sequencing Update (supersedes §18 ordering)

| ID | Item | Class | Repo |
|---|---|---|---|
| SEQ-1 | **CP19 = live provider mechanics + live rejection-guard proof — achieved.** Live SerpApi + Firecrawl run IDs; gates caught a residential/off-market false-positive live (the moat working live); generic-Google discovery proven insufficient. Render still **in-memory (not persisted).** | — | ✅ |
| SEQ-2 | Order: close CP19 → **CPSEC1** (Next.js patch, standalone, NEXT not deferred) → **CP20A** (source-adapter proof: first *accepted* live DFW opportunity; no protected files) → **CP20B** (persistence: scoped `db/schema.ts` approval; write + replay-from-DB) → **promotion wire** (separate later checkpoint, NOT bundled into CP20B). | BUILD (in order) | ⬜ |

## 26. Lead-Detail / Chat Presentation (steal conceptually — LATER, opportunity-lane)

| ID | Item | Class | Repo |
|---|---|---|---|
| LAYOUT-1 | **Source-first answer layout (Perplexity-style trust, adapted to Fetchi's laws).** Per-lead detail / chat answer pattern: **claim first** ("This is a strong janitorial prospect because…") → **Evidence** as numbered citations ([1] business license filed May 28 · [2] new office lease announcement · [3] website contact page) → **Decision block** (passed evidence gate · Signal: NEW BIZ · Fit: New Office · Score: 82 · Recommended action: send walkthrough offer within 48h). Every claim shows its receipts → makes the product laws ("no claim without evidence / no score without reason / no explanation without action") **visible** instead of asserted. This is the trust layer Perplexity proved people believe. | NOTE (LATER) | ⬜ |
| LAYOUT-2 ⚠ | **Lane fence (critical):** LAYOUT-1 is the **OPPORTUNITY-lane per-lead DETAIL / chat surface — NOT the Sweep MVP list.** The Sweep/prospect list stays **de-sanitized** (no scores/gates/labels/lanes/data-gaps shown — abundance + perceived value). Do **NOT** bolt evidence/score/decision panels onto the Sweep list — that re-introduces the exact sanitization apparatus that was deliberately stripped. Receipts appear only on **signal-backed opportunity** leads, in their detail/chat view, where showing the work builds trust. Eventual — after the opportunity lane + entity/contact resolution exist; the current MVP (The Sweep) deliberately does not surface this. | RULE | ⬜ |

## 27. Lead Pipeline / Lightweight CRM (the stickiness layer)

| ID | Item | Class | Repo |
|---|---|---|---|
| CRM-1 | **Fetchi becomes a LIGHTWEIGHT lead pipeline the user owns — NOT a HubSpot/Salesforce clone.** Persist swept leads per-workspace with user-set lifecycle: New → Saved → Contacted → Won/Lost/Dismissed + notes. Actions: save, dismiss/delete, mark status, bulk. These are the USER organizing THEIR leads (≠ the stripped scoring/confidence apparatus — fine to show). **CRM-DRIFT FENCE:** stop at "my leads + status + export"; NO deal stages, custom fields, email sequences, reporting dashboards, or 3rd-party integrations. (Twin's bet = sync to existing CRM; ours = BE the thin list. Keep it thin.) | RULE | ⬜ |
| CRM-2 ★ | **Dedupe-before-sweep = the RETENTION ENGINE (the strategic core).** Every new sweep/chat result is differenced against the saved pipeline (existing name+phone key). Turns repeat sweeps from "same 100 every time" into "what's NEW since last time" = honest shippable **Signal-Watch v1** + the reason to return. The pipeline is a MEMORY layer, not storage. | RULE | ⬜ |
| CRM-3 | **Persistence is FOUNDATIONAL** — first real DB writes in the MVP arc (Sweep was ephemeral/session-only). Requires schema + per-workspace lead storage. = natural **TRIGGER for the deferred Replit→Neon/Vercel move** (real user data wants the production DB, not Replit Helium). CRM build + infra decouple likely come together. Schema change = `db/schema.ts` (protected) needs scoped approval. | DECISION | ⬜ |
| CRM-4 | **Dismiss = permanent don't-show-again** — dismissed leads never resurface in future sweeps (dedupe memory includes dismissals, not just saves). Pile gets CLEANER with use — opposite of every list tool. | NEXT | ⬜ |
| CRM-5 | **CSV export from the UI** — export current filtered view (existing export fns wired to saved list + filters). CSV-first; "send to email tool / Sheets" later. | NEXT | ⬜ |
| CRM-6 | **Add-from-chat** — chat finds leads → "Add to my list"; chat results also dedupe against pipeline. **DEPENDS on chat surface** (still a stub, see ARCH-2). | NEXT | ⬜ |
| CRM-7 | **Won/Lost + one-tap "why" capture** — lightweight now, but = the seed of the **Outcome Learning moat** (what converts). Capture the data now; build the learning later. | NEXT | ⬜ |
| CRM-8 | **UX ideas:** "New since last sweep" view (hero retention feature) · inbox-style fast triage (Save/Dismiss, keyboard + bulk) · "My Leads" as the HOME surface (app = your pipeline you grow, not a search box) · saved searches + re-run/schedule (where scout-run + Signal Watch live) · lead detail drawer (contact/source/notes/status/enriched email; eventual home of §26 source-first layout, opportunity-grade only). | NOTE | ⬜ |

---

## 28. Chat-First + Fetch Naming Pass (added 2026-07-04 · sources: Fable audit/prototype session, PM calls, OpenClaw ABQ transcript, Firecrawl extract)

| ID | Item | Class | Repo |
|---|---|---|---|
| NAME-1 ★ | **Engine nouns NEVER reach customer surfaces.** Sweep, conductor, provider, hydration, lanes, run plan = internal-only vocabulary. Second instance of the sanitization failure (2026-06-22, 2026-07-04). When briefs use engine vocabulary for UI, TRANSLATE, don't transcribe. | RULE | ⬜ |
| NAME-2 | **User-facing verb = Fetch / "Fetch leads."** Tab noun: Fetch. Button verb: Fetch leads. Variants where needed: Fetch buyers, Fetch new leads. Internal code keeps `sweep` (routes/files/actions/DB unchanged — zero migration). | RULE | ⬜ |
| NAME-3 | **"Daily Run" killed as a product concept.** Future automation naming: Auto-Fetch / Scheduled Fetch, as a setting inside Fetch — only after scheduling runtime exists. | DECISION | ⬜ |
| IA-1 | **Today demoted off nav** — its runtime isn't real (seed `opportunities` + demoQueue). Page survives off-nav. Today returns later as "what changed since yesterday" once monitoring is real. | DECISION | ⬜ |
| IA-2 | **Nav gates are symmetric: a tab requires a real screen AND real runtime.** Fetch tab passes (`/app/sweep` is a working compose→run→save surface). Chat fails slot 1 (placeholder reply) — recommended order Fetch · Leads · Chat · Settings; Map off nav until real. Chat promotes to slot 1 when the morning brief ships. | RULE | ⬜ |
| IA-3 | **Guardrail as checkable copy rule:** zero customer-visible strings claiming background work until recurring runtime exists — "checked overnight/N sources," "monitoring," "I'll keep scouting," "new signals today," "Checkpoint N." Empty states describe user actions, never claimed secret work. | RULE | ⬜ |
| CHAT-1 ★ | **Chat = context-aware search/research operator, NOT the Sweep UI and NOT a form.** Business Profile = default operating context; user message = goal/override; agent searches → extracts → narrates with citations → next action. "Find fresh signals in my market" is a complete request. Contract: `FETCHIAi/docs/design-spikes/fetchi-chat-prototype/CHAT_RESPONSE_CONTRACT.reference.md`. | RULE | 🟨 |
| CHAT-2 | **The OpenClaw ABQ transcript = the response bar** (voice + anatomy: context used → search lanes → query fanout → findings → fresh signals w/ dated sources → older context → prospect categories → candidates w/ evidence labels → next actions). The guard lives in the WRITING, not in UI ceremony. Evidence labels: Fresh signal · Older context · Prospect fit · Weak signal · Needs verification · Runtime-later opportunity candidate. | RULE | 🟨 |
| CHAT-3 | **Daily habit loop moves INTO Chat (later):** notification → morning brief → compact lead cards ("added these 3 to your Leads") → objects live in My Leads. Chat = front door, Leads = filing cabinet. A quiet morning is honest in chat ("nothing strong today — widen the search?"), broken in a tab. Don't turn on until the recurring runtime can keep the daily promise. | LATER | ⬜ |
| EVID-1 ★ | **Firecrawl search/extract validated as the opportunity-lane feed shape** (2026-07-04 ABQ extract: 23 leads, per-field citations, dated intent signals — groundbreakings, leases, openings, hiring). No bespoke permit adapters needed for demand events. Mapping: intent_signals+signal_date+citations → candidate signal evidence; signal_date → freshness gate; contact_info → contact route only after ownership check. | RULE | 🟨 |
| EVID-2 ★ | **Contact-ownership cleaning rule (hard):** a phone/email/website attaches to a business ONLY if owned by that named entity. Same contact across N records (the extract's developer phone 480-745-1965 / simoncre.com on nine Lobo Crossing tenants) → demote to role (developer/leasing/PM contact) or drop; unclear → omit or "source contact — verify." Same failure class as TDLR permit-holder≠buyer. Clean QUIETLY — no proof bars. | RULE | ⬜ |
| EVID-3 | **Freshness + claim discipline:** "fresh" requires a dated source inside a config-driven window; old forum/review pages = "Older context," never fresh signals; future openings = pipeline, never "needs this week"; review count alone proves nothing; "needs lead gen" / "under-digitized" = angles/hypotheses, never facts. | RULE | ⬜ |
| PR67-1 | **PR #67 repurposed, not merged, not closed:** strip the visual redesign; keep functional-only "Saved Lead Detail Restoration" (saved leads click through to `/app/leads/[id]` with a saved_leads fallback; opportunity/scored detail untouched; no fake score/signal/outreach). My Leads visual rebuild = later clean checkpoint (CP22G-B). | DECISION | ⬜ |
| PR67-2 | **"Evaluate/grade this lead" = the token bridge (correct, later):** saved lead → evaluate → signal search + hydration + token use → opportunity created → scored detail lights up honestly. Gives tokens a real reason to exist. Not now; locked cards may show it but never simulate output. | LATER | ⬜ |
| CP24A-1 | **Next checkpoint = CP24A Fetch IA Language Pass:** nav swap (Today→Fetch), Sweep→Fetch language pass (UI strings only), badge truth (count `saved_leads`, not `opportunities`), banned-copy grep sweep. No runtime/schema/provider changes. Spec + Codex prompt: `FETCHIAi/docs/design-spikes/claude-mvp-surface-pack/prompts/codex-cp24a-fetch-ia-language-pass.prompt.md`. Adam fill-ins: final tab order, badge semantics. Supersedes CP23A prompt's nav labels. | BUILD | ⬜ |
| SPIKE-1 | Reference artifacts (quarantined, untracked, NOT proof): `FETCHIAi/docs/design-spikes/claude-mvp-surface-pack/` (repo audit A–K, gap matrix, MVP sequence, 11 component sketches) + `FETCHIAi/docs/design-spikes/fetchi-chat-prototype/` (chat-first interactive prototype, double-clickable preview.reference.html, 6 rendered screenshots, response contract). Audit also confirmed `docs/ROADMAP.md` is ~5 checkpoints stale (says CP20C next; main = CP22F-A @ `afb9a67`). | NOTE | 🟨 |

---

## How to use this doc
Next pass: clone `main`, and for each ID mark Repo as **✅ built / 🟨 specced-only / ⬜ missing / ❌ rejected-confirmed**. The gaps between RULE/BUILD items and ⬜/🟨 status are the real backlog. Re-run after each checkpoint.
