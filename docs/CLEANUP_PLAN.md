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

## Current Status

Planning/scaffold plus Repo Control Hardening tooling and STOP rules.

Current-tree artifact de-tracking complete (see completed entry above).
