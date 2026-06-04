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

## Current visual direction

**Dark product / operator surface** — all authenticated app surfaces (chat, today, leads, lead detail, map, settings). Dark base, raised cards, parchment accents where appropriate.

**Cream marketing / light surface** — public marketing, pricing pages, vertical SEO, public-facing content, and onboarding handoff flows.

**Shared brand tokens** — `#58937E` (brand green), `#D85A30` (coral), `#EBE6D9` (parchment), `#2D2B2A` (dark), Outfit (headings), DM Sans (body) — stable across both surfaces.

**2026-06-04 brand mark note:** Fetchi Stack is the promoted brand mark. Its three-block geometry is fixed; the `tone` prop only swaps fills. On dark surfaces, the top block remains the fresh-signal block. Retired kana/avatar treatments should not be reused in new UI.

**Coral — approved uses only:**

- Active `urgent_action` lead-card surface when backed by dated action-window evidence
- Primary CTA and monetization CTA
- Cap-reached or upgrade moment
- Approved brand/CTA affordance

**Coral is NOT:**

- High score — score does not create a coral card
- Storm / hail / weather signal
- Vertical identity color
- Lifecycle or status color
- Generic icon or accent color

**Current design authority map:**

| Topic | Authority |
|---|---|
| Visual / color / surface | `docs/DESIGN_SOURCE_OF_TRUTH.md` (this file) |
| Lead-card taxonomy | `docs/design/lead-card-taxonomy.md` |
| Settings | `docs/product/settings-spec.md` |
| Vertical registry | `docs/product/vertical-playbook-registry.md` |
| Commercial cleaning playbook | `docs/product/playbooks/commercial-cleaning.md` |

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

## Archived design artifacts

- `design/_archive/*` is historical reference only.
- Do not lift colors, typography, mascot/avatar, page layout, trial copy, or lead-card behavior from archived mockups.
- Current design authority lives in this document plus `docs/design/lead-card-taxonomy.md` and current product specs.

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
