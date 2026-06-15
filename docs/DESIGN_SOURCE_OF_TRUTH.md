# Fetchi Design Source of Truth

Status: Current design rules and intent. This file does not own implementation
token values, branch state, PR state, or product proof.

## Authority

Live code owns design token values:

- `app/globals.css`
- `tailwind.config.ts`

This document owns design rules, intent, and guardrails only. Do not hardcode
color values, token values, branch names, PR state, or coordination state here.

Current product/design companions:

- `docs/PM_OPERATING_SYSTEM.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/design/lead-card-taxonomy.md`
- `docs/product/vertical-playbook-registry.md`
- `docs/product/playbooks/*`

## Surface Model

Authenticated product/operator surfaces use the dark operator surface.

Marketing, pricing, public vertical pages, and onboarding handoff surfaces use
the cream marketing/onboarding surface.

## Brand Mark

Fetchi Stack is the current brand mark. Retired kana, mascot, and avatar
treatments are historical and must not appear in new UI unless Adam explicitly
approves a future checkpoint.

## Coral Rule

Coral is reserved for urgent-action and monetization moments explicitly allowed
by current taxonomy and product docs.

Coral must not be derived from score alone. There is no score-to-coral logic.
High score, vertical, lifecycle, weather category, or generic status cannot make
a card coral.

## Lead-Card Rule

Lead-card design must preserve six separate layers:

- status/lifecycle
- signal
- vertical fit
- freshness
- score
- surface color

Do not collapse those layers into one label, one color, or one state.

Fallback states must be intentional and honest. Missing evidence, weak fit,
review-needed, exploratory, discarded, and contact-route uncertainty states
should explain the limitation instead of pretending the record is stronger than
it is.

## Labels And Verticals

UI-visible labels must come from approved playbooks, the vertical registry, or
the lead-card taxonomy. AI-generated labels are not allowed to freestyle into
the UI.

Verticals are added by playbook/config and shared product rules, not by cloned
screens or separate app experiences.

## Design Evidence

Design evidence is not product proof. Mockups, screenshots, boards, and design
artifacts can show visual direction or flow intent; they do not prove search,
classification, scoring, evidence, contact route, outreach, billing, or runtime
behavior.

Archived design artifacts are historical only. Do not lift old colors,
typography, mascot/avatar treatments, page layouts, trial copy, branch state,
or lead-card behavior from archived mockups unless current docs explicitly
promote that rule.
