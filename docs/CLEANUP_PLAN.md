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

## Current Status

Planning/scaffold only.

No cleanup implementation has been performed by this file.
