# Fetchi Cleanup Plan

Status: Repo hygiene tracking. Do not mix cleanup with product implementation.

## Goal

Keep Fetchi’s repo usable as the project moves from handoff material and agent sessions into a real product codebase.

Cleanup should remove stale artifacts, archive old context safely, and make active source-of-truth docs obvious.

## Guardrails

- Do not delete historical files blindly.
- Archive first unless we are certain nothing references the file.
- Do not mix cleanup with feature implementation.
- Do not change protected DB/billing/provider files during cleanup.
- Do not start broad cleanup until PR #2 visual QA is settled.
- Keep app code changes separate from docs/hygiene changes.

## Phase 1 — Clean PR #2 before merge

Before PR #2 becomes the UI/design baseline:

- Remove committed `attached_assets/*` screenshot and targeted-element artifacts unless intentionally referenced by docs.
- Confirm no PR #5 fixture route or shared-resolver experiment files are present.
- Confirm no stale `.fetchi-avatar` or old kana mascot references remain in customer app surfaces unless explicitly approved.
- Run `npm run type-check`.
- Run `rm -rf .next && npm run build`.
- Confirm visual QA passes on:
  - `/app/chat`
  - `/app/today`
  - `/app/leads`
  - `/app/leads/[id]`

## Phase 2 — Reconcile repo hygiene PR #3

After PR #2 is resolved:

- Rebase or update PR #3 if needed.
- Keep useful docs/templates from PR #3.
- Replace stale mascot/kana rules with current brand-mark rules.
- Add Issue #6 Agent Control Room as required context for agents.
- Add PR #5 as superseded / do-not-use context.
- Add the 10 core-supported verticals and Vertical Playbook Registry context.
- Add Settings spec as active planning context.

## Phase 3 — Product/spec docs home

The repo now has starter docs for:

- `docs/PM_OPERATING_SYSTEM.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/CLEANUP_PLAN.md`
- `docs/DESIGN_SOURCE_OF_TRUTH.md`
- `docs/product/vertical-playbook-registry.md`
- `docs/design/lead-card-taxonomy.md`

Continue moving stable decisions from chat/Issue #6 into these files.

## Phase 4 — Archive old design / handoff references

Archive old design/handoff clutter only after active docs stop relying on them.

Candidate archive locations:

- `docs/archive/2026-05-handoff/`
- `docs/archive/design-html-v1/`
- `docs/archive/codex-prompts/`
- `docs/archive/screenshots/`

Each archive folder should include a short README:

> Historical reference only. Not active source of truth.

## Phase 5 — Branch and PR cleanup

After PR #2 is merged or otherwise resolved:

- Close PR #5 as superseded unless explicitly reopened.
- Reconcile PR #3 if still useful.
- Remove or ignore stale `claude/*` branches created during failed context sync.
- Keep one active execution branch at a time.

## Phase 6 — Repo Control Hardening

This phase prevents future repo-state drift. It does **not** purge or de-track
anything already committed.

In scope (this checkpoint):

- Ignore future prompt/screenshot/memory/log/zip artifacts via targeted
  `.gitignore` patterns (not a broad `attached_assets/` ignore).
- Add `scripts/pm/preflight.sh` (read-only drift gate) and
  `scripts/pm/proof.sh` (type-check + clean build proof packet).
- Document STOP rules in `docs/PM_OPERATING_SYSTEM.md` (Repo Control Protocol).
- Do **not** purge history in this checkpoint.

Future cleanup (deferred, separate checkpoints):

- Decide whether to de-track existing committed `attached_assets`, `.agents`,
  and `zipFile.zip`. Until then they remain tracked and untouched.
- Decide separately whether to rewrite history.
- History rewrite requires explicit Adam approval and a backup, and must not be
  combined with product work.

## Completed — Archive original handoff mockups

The five original Replit handoff HTML mockups (`fetchi_core_screens.html`,
`fetchi_landing_page_v2.html`, `fetchi_settings_screens.html`,
`fetchi_map_view.html`, `fetchi_admin_screens.html`) were moved from
`design/` into `design/_archive/original-handoff-mockups/` via `git mv`.

A README was added to the archive folder noting the superseded assumptions.
`docs/DESIGN_SOURCE_OF_TRUTH.md` was updated with an "Archived design
artifacts" guard note.

These files are kept for historical reference only and are not live
source-of-truth.

## Local Claude Design specs — superseded once repo docs carry current truth

Local Claude Design files that circulated during planning sessions are superseded by the repo docs once repo docs carry their current truth. The following should not remain as live local source-of-truth:

- `FETCHI_SETTINGS_SPEC.md`
- `FETCHI_VERTICAL_PLAYBOOKS_SPEC.md`
- `FETCHI_CORAL_SPEC.md`
- `playbook-commercial-cleaning-DRAFT.md`

Archived mockups under `design/_archive/*` remain as historical reference only and are not affected by this note.

## Completed — Current-tree de-track + design board archive

- All `attached_assets/**` removed from active repo tracking via `git rm -r --cached`.
  Files remain on local disk and in git history. Future additions are blocked by
  the broad `attached_assets/` entry in `.gitignore`.
- `zipFile.zip` removed from active repo tracking via `git rm --cached`.
  Remains gitignored.
- 9 v2 design-system boards (coral audit, token board, theme boundary) moved from
  `attached_assets/` into `design/_archive/design-boards-v2/` for provenance.
  README added to archive folder.
- `.gitignore` consolidated: replaced targeted `Pasted-*`, `Screenshot_*`,
  `targeted_element_*`, `.rtf`, `.zip` patterns with a single `attached_assets/` rule.
- `.agents/skills/**` intentionally left tracked and untouched pending a separate
  decision.
- No history rewrite performed. Files accessible in git history if ever needed.

## Completed — Product Proof CP1 — Vertical-Fit + Fallback Lead Card Display

`LeadCard.tsx`, `MyLeadsView.tsx`, and `lib/seed-chat.ts` updated to support
five label layers (status/lifecycle, signal, vertical-fit, freshness, score)
and five fallback states (needs_review, weak_fit, missing_evidence, exploratory,
discarded). Fixture examples added to `lib/seed-chat.ts` covering strong
vertical-fit, weak_fit, missing_evidence, and exploratory states.

Scope: UI/data-display proof only.
Not agent/search/classifier proof.
Does not touch DB/provider/billing/auth.

## Completed — Product Proof CP2 — Commercial Cleaning Playbook v1

`docs/product/playbooks/commercial-cleaning.md` restructured and completed
as a full v1 vertical playbook for Commercial Cleaning / Janitorial.
`docs/product/vertical-playbook-registry.md` updated with an Active Playbook
Registry table confirming `commercial_cleaning` v1.0 is active and pointing
to the playbook file.

Scope: product-spec proof only.
No app/component/lib/db/auth/billing/provider/schema changes.
Establishes approved labels, evidence requirements, scoring rubric, query
templates, outreach plays, disqualification rules, and fallback state rules
for one non-roofing launch vertical.

## Completed — Product Proof CP3 — Agent Web Data Architecture Docs

Created three architecture source-of-truth docs and updated this plan:
`docs/AGENT_WEB_DATA_ARCHITECTURE.md`, `docs/PROVIDER_CONTRACTS.md`,
`docs/PLAYBOOK_SEARCH_EXAMPLES.md`.

Scope: docs-only architecture proof.
No app/code/provider/schema changes.
Defines the SerpApi (discovery) / Firecrawl (evidence hydration) responsibility
split, the signal state model, the evidence gate, the fallback flow, the
conceptual provider contracts, and playbook-to-query examples — before any
provider contract, schema, or agent implementation is written (scoped to CP4+).

## Product Proof CP5A — No-op Provider Wiring Proof

State:
- verifies CP4 provider contracts can be consumed through a shell-run no-op smoke path
- no live SerpApi calls
- no Firecrawl calls
- no DB/schema changes
- no routes/UI changes
- no fake leads/opportunities
- prepares for CP5B real provider smoke proof

## Product Proof CP5B — SerpApi Discovery Smoke Proof

State:
- proves ONE real SerpApi `google_light` call runs behind the CP4 SearchProvider contract
- normalizes hits into pre-evidence CandidateSignal[] only (a snippet is a candidate, never a lead/opportunity)
- no Firecrawl / evidence hydration
- no DB/schema changes or DB writes
- no routes/UI/runtime wiring
- no scoring/classifier/fit-decision/outreach; no fake leads/opportunities
- no new dependencies
- SerpApi is called only from `lib/providers/serpapi-search-provider.ts`; the secret is read only in the shell smoke script
- prepares for CP5C Firecrawl evidence hydration

## Product Proof CP5C — Firecrawl Evidence Hydration Smoke Proof

State:
- proves one real Firecrawl scrape call can run behind EvidenceProvider
- normalizes a known source URL into EvidenceDocument only
- no SerpApi changes or calls
- no DB/schema changes
- no routes/UI changes
- no fake leads/opportunities/evidence
- no scoring/classifier/outreach
- prepares for evidence gate design between CandidateSignal and Opportunity

## Product Proof CP6 — Candidate → Evidence Gate Contract

State:
- defines deterministic candidate+evidence gate
- proves candidates cannot pass without source-linked evidence
- returns approved fallback states for missing/weak/mismatched evidence
- no provider calls
- no DB/schema changes
- no routes/UI changes
- no scoring/classifier/outreach
- prepares for later classification/scoring only after evidence gate passes

## Product Proof CP7 — Lead Supply Architecture Update

State:
- defines signal-backed opportunities vs evidence-backed prospect leads
- adds LeadKind / SourceEvidenceType concepts
- documents the Prospect Mining lane and Prospect Pool distinction
- treats Firecrawl Workflows as agent workflow references, not runtime authority
- no provider implementation, DB/schema, UI/routes, scoring/classifier/outreach
- prepares for fixture packs and prospect mining contract proof

## Product Proof CP8 — Prospect Mining Contract Proof

State:
- adds inert prospect-mining TypeScript contracts and deterministic validation
- proves evidence-backed prospects are Prospect Pool items, not opportunities
- blocks missing source evidence, missing access notes, urgency language, and opportunity-only fields
- no provider calls, DB/schema, UI/routes, scoring/classifier/outreach, CRM sync/export, or workflow runtime
- prepares for later Prospect Pool fixtures and export/CRM contract proof

## Product Proof CP9 — Prospect Mining Fixture Pack

State:
- adds deterministic Commercial Cleaning prospect-mining fixtures
- proves directory, maps listing, company website, and property portfolio prospects can enter Prospect Pool without becoming opportunities
- proves urgency language and opportunity fields are blocked
- no provider calls, Firecrawl workflow runtime, DB/schema, routes/UI, scoring/classifier/outreach, CRM sync, or package changes
- prepares for later prospect-mining fixture packs and CRM-ready export planning

## Product Proof CP10A — README Entry Point

State:
- adds a complete root README as the repo entry point
- summarizes Fetchi product laws, lead-supply lanes, launch verticals, source-of-truth docs, protected files, local commands, and validation discipline
- no runtime code, DB/schema, provider, auth, billing, route/UI, package, or connector contents-API changes

## Product Proof CP10B — Roadmap Rebalance + Next Proof Sequence

State:
- rebalances roadmap after CP6–CP10A landed
- moves stale UI/design stabilization out of active Now
- defines next contract-first proof sequence toward scoring/classification
- no code, runtime, provider, DB/schema, UI/routes, package, or implementation changes

## Product Proof CP11 — Prospect Fit / Outreach Readiness Scoring Contract

State:
- adds inert prospect scoring contract
- separates Prospect Fit and Outreach Readiness from Opportunity Urgency
- blocks opportunity urgency scoring for evidence-backed prospects
- requires score reasons for non-null scores
- no runtime scoring, provider calls, DB/schema, routes/UI, classifier/outreach, CRM sync/export, or package changes
- prepares for CP12 signal-backed opportunity scoring contract

## Product Proof CP12 — Signal-backed Opportunity Scoring Contract

State:
- adds inert signal-backed opportunity urgency scoring contract
- requires signal, source-linked evidence, provider lineage, freshness window, and why-now reasons
- blocks opportunity urgency for evidence-backed prospects
- requires machine-readable score reasons for non-null urgency scores
- no runtime scoring, provider calls, DB/schema, routes/UI, classifier/outreach, CRM sync/export, or package changes
- prepares for CP13 Classification Contract Harness

## Product Proof CP13 — Classification Contract Harness

State:
- adds inert Commercial Cleaning classification contract harness
- proves signal, vertical-fit, fallback, and surface labels must come from approved playbook/taxonomy values
- blocks freestyle UI-visible labels
- blocks urgent_action surface without evidence and why-now reasons
- no LLM runtime, provider calls, DB/schema, routes/UI, scoring, outreach, CRM sync/export, or package changes
- prepares for later classifier implementation and additional vertical fixture packs

## Product Proof CP13B-A — Stale Repo Entry Audit

State:
- audits root/docs instruction files for stale control surfaces
- identifies delete candidates without deleting them
- preserves protected/source-of-truth docs
- no code, runtime, provider, DB/schema, routes/UI, package, or implementation changes
- prepares for CP13B-B approved stale-file removal

## Product Proof CP13B-B — Remove Approved Stale Repo Entry Files

State:
- deletes stale root control files approved by CP13B-A audit
- removed CODEX_KICKOFF.md, START_HERE.md, and REPLIT_AGENT_OPENING_PROMPT.md
- preserves AGENTS.md, DESIGN_SYSTEM_V2.md, protected technical files, README.md, and current source-of-truth docs
- no code, runtime, provider, DB/schema, routes/UI, package, or implementation changes
- reduces risk of future agents reviving old kickoff/build flows

## Product Proof CP13C — Agent Control Docs Refresh

State:
- refreshes AGENTS.md to remove stale Issue #1 / DESIGN_SYSTEM_V2 active-authority instructions
- points agents to README.md, Issue #6, PM operating system, roadmap, product context, design source of truth, and lead-card taxonomy
- preserves DESIGN_SYSTEM_V2.md, protected technical files, README.md, and current source-of-truth docs
- no code, runtime, provider, DB/schema, routes/UI, package, or implementation changes
- reduces risk of future agents following stale kickoff/design workflow

## Product Proof CP14A — Lead Funnel Product Spec

State:
- adds Lead Funnel product spec as docs-only checkpoint
- updates roadmap to place CP14A before CP14 Prospect Pool Export Contract
- defines Lead Funnel as Prospect Pool + Signal Watch + Opportunities + Suggested Actions
- preserves evidence/prospect/opportunity guardrails
- no code, runtime, provider, DB/schema, routes/UI, package, export, CRM, or outreach implementation changes
- keeps runtime Firecrawl, broad crawling, CRM sync, export UI, and auto-outreach parked

## Product Proof CP14A-B — Roadmap MVP Completion + Remaining Work Update

State:
- updates roadmap with PM build-completion snapshot, working MVP definition, and remaining MVP chunks
- preserves CP14 as Prospect Pool Export Contract and adds downstream CP16-CP18 planning sequence
- no code, runtime, provider, DB/schema, routes/UI, package, export, CRM, billing, or outreach implementation changes
- keeps runtime Firecrawl, broad crawling, CRM sync, auto-outreach, DB/schema, and provider runtime parked unless explicitly scoped

## Product Proof CP14 — Prospect Pool Export Contract

State:
- adds Prospect Pool export contract/spec and inert deterministic smoke proof
- defines export readiness, required fields, blocked fields/claims, CSV/Sheets guardrails, and CRM-ready account-worklist mapping shape
- proves Prospect Pool export does not turn prospects into opportunities
- no runtime export, CSV generation, CRM sync, DB/schema, provider, routes/UI, billing, package, or outreach changes

## Product Proof CP15 — Commercial Roofing Playbook v1

State:
- adds Commercial Roofing as a v1 core-supported vertical playbook/spec
- adds an inert Commercial Roofing classification contract and smoke proof for approved labels, fallback states, surfaces, and blocked claims
- preserves Prospect Pool vs Opportunity separation, weather-safety rules, procurement routing, and contractor-as-buyer guardrails
- no runtime classifier, provider, Shovels, DB/schema, routes/UI, CRM/export, outreach, billing, admin, settings, package, or Claim Guard changes

## Current Status

Planning/scaffold plus Repo Control Hardening tooling and STOP rules.

Current-tree artifact de-tracking complete (see completed entry above).
