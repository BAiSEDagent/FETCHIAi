# Fetchi Design Source of Truth

Status: Design context map.

## Active Design Truth

Current active design and product docs:

- docs/design/lead-card-taxonomy.md
- docs/product/vertical-playbook-registry.md
- docs/PRODUCT_CONTEXT.md
- docs/PM_OPERATING_SYSTEM.md

Current live coordination:

- GitHub Issue 6: Agent Control Room

## Active UI Baseline

The active UI baseline is PR 2 on branch codex/issue-1-design-system-lock until it is merged, replaced, or rejected.

Customer surfaces to review:

- app chat
- app today
- app leads
- app lead detail
- app map
- app settings

## Lead Card Design Truth

Lead-card label, surface, fallback, and proof rules live in docs/design/lead-card-taxonomy.md.

Key rules:

- Status, signal, vertical-fit, freshness, score, and surface color are separate concerns.
- Coral is urgent-action surface only.
- Score does not decide card surface.
- Fallback states must look intentional and honest.
- Design boards are visual targets, not agent proof.

## Vertical Design Truth

Launch verticals and the playbook registry model live in docs/product/vertical-playbook-registry.md.

Key rules:

- Ten core-supported launch verticals.
- One app and one codebase.
- Future verticals are added by playbook/config.
- AI must not freestyle UI labels.

## Historical Design References

Old design HTML files, screenshots, token boards, handoff prompts, and agent-generated mockups may be useful for historical context but are not source of truth unless explicitly promoted here.

Historical assets should eventually move under archive folders in docs/archive/.

Each archive folder should say: Historical reference only. Not active source of truth.

## Deprecated Context

- PR 5 / codex/issue-4-lead-surface-grammar is superseded unless explicitly reopened.
- Old kana/mascot/avatar treatments should not be reintroduced without approval.
- Old design artifacts should not override current card taxonomy or product context docs.

## How to Add New Design Context

When Claude Design or another design tool creates a new board/spec:

1. Treat the board as design evidence, not product proof.
2. Extract stable decisions into docs.
3. Add or update the relevant source-of-truth file.
4. Link the artifact here if it remains active.
5. Archive it when superseded.
