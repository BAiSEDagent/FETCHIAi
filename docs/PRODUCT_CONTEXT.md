# Fetchi Product Context

Status: Product source of truth. Update this as product strategy becomes stable.

## Product Definition

Fetchi is a signal-to-opportunity engine for local and commercial service businesses.

Fetchi watches public buying signals, interprets what they mean for a specific business, scores the opportunity, explains why it matters, and helps the business owner act before competitors do.

Fetchi is not a generic lead list, a scraped directory, or a roofing-only product.

## Core Promise

> Tell us what your business sells — we’ll find buyers who need it this week.

## Core Loop

```txt
Signal -> Prospect + Enrichment -> Opportunity -> Contact Route -> Outreach Play
```

## Product Laws

1. No opportunity without signal.
2. No lead without evidence.
3. No score without reason.
4. No explanation without action.

## Lead Supply Lanes

Fetchi remains a signal-to-opportunity engine, not a generic scraped lead list.
It can surface two honest lead-supply lanes:

1. **Signal-backed Opportunities** — A fresh public buying signal has been
   hydrated with evidence. Only this lane can claim urgency, answer "why now,"
   and later become a scored opportunity after classification and action
   routing.
2. **Evidence-backed Prospect Leads** — A high-fit target account has public or
   otherwise legitimate evidence, but no confirmed fresh buying signal. These
   prospects can be useful for pipeline building and research, but they cannot
   claim "why now."

No-signal prospects must not use urgent opportunity language, coral urgency,
freshness labels, or "need this week" copy. Directory, database, maps, or
company-site mining can support an evidence-backed prospect, but it does not
create an opportunity unless a separate buying signal is found.

## Launch Vertical Strategy

Fetchi launches with ten core-supported verticals:

1. Commercial Roofing
2. HVAC
3. Commercial Cleaning / Janitorial
4. Plumbing
5. Landscaping / Property Maintenance
6. Electrical Contractors
7. Restoration Services
8. Pest Control
9. Painting / Tenant Improvement
10. Dumpster Rental / Junk Removal

See `docs/product/vertical-playbook-registry.md` for the vertical playbook model.

## Lead Card Strategy

Opportunity cards must separate:

- status
- signal
- vertical-fit
- freshness
- score
- surface color

See `docs/design/lead-card-taxonomy.md` for the card taxonomy and fallback-state contract.

## Positioning

Fetchi should stay horizontally capable across service businesses while becoming vertical-aware in:

- acquisition pages
- onboarding
- labels
- query strategies
- scoring
- evidence requirements
- outreach drafts

One app. One codebase. Vertical-specific playbooks.

## Current Strategic Guardrails

- Do not clone Fetchi per vertical.
- Do not let AI freestyle UI labels.
- Do not hardcode roofing into the core architecture.
- Do not claim agent behavior is proven because a design board exists.
- Do not ship unsupported vertical claims without playbook fixtures/tests.
- Keep SerpAPI as signal discovery at launch.
- Treat Firecrawl as enrichment after a URL/domain/source exists, not as a SerpAPI replacement.

## Current Product State

Fetchi is still in product-proof mode.

The current focus is clean control/design authority, the parallel security
target, then the first live Commercial Cleaning runtime slice.
