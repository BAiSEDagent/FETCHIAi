# Lead Funnel Product Spec

## Purpose

Fetchi Lead Funnel is the day-one value layer:

- Build the buyer universe.
- Prove fit with evidence.
- Separate prospects from opportunities.
- Suggest next actions.
- Watch for fresh signals.

This spec captures product direction only. It does not add runtime, UI, provider, DB/schema, export, CRM, or outreach implementation.

## Product Definition

Lead Funnel = Prospect Pool + Signal Watch + Opportunities + Suggested Actions.

The Lead Funnel starts by building an evidence-backed buyer universe, then watches that universe and public sources for signals that can become action-ready opportunities.

## Core User Promise

"Fetchi builds your buyer universe, proves why each account fits, watches for buying signals, and gives you the next action."

This strengthens but does not replace:

"Tell us what your business sells - we'll find buyers who need it this week."

## Data Lanes

### Prospect Pool

Prospect Pool records are evidence-backed accounts that appear to fit the user's ICP or vertical playbook. They are not opportunities unless a qualifying fresh signal exists.

Allowed claims:

- identity
- location
- buyer type
- source-linked fit reason
- contact route hint when supported
- recommended next action

Blocked claims:

- urgency
- "needs this week"
- active buying intent
- contract status
- decision-maker identity unless sourced
- opportunity urgency score
- full coral urgent-action treatment

### Signal Watch

Signal Watch monitors Prospect Pool records and public sources for new evidence that may create a signal-backed opportunity.

Examples:

- permits
- openings
- hiring
- complaints/review bursts
- property manager changes
- buildouts
- weather
- renovations
- expansions

Signal Watch can flag changes for review. It cannot create an opportunity without dated source-linked evidence and a why-now reason.

### Opportunities

Opportunities are fresh signal-backed records only.

Every Opportunity must require:

- fresh dated signal
- source-linked evidence
- why-now reason
- approved vertical/playbook label
- reasoned score
- action

No opportunity can be created from fit evidence alone. Evidence-backed prospects stay in Prospect Pool or Watchlist until the signal requirements are met.

### Suggested Actions

Suggested Actions are vertical-aware action chips or run starters, not generic AI prompts.

Suggested Actions must come from approved playbooks/specs. AI may rank or select suggested actions, but must not freestyle product-visible actions.

Examples:

- Find new office openings near me
- Build a prospect list for recurring janitorial accounts
- Find contact routes
- Explain why this is a fit
- Draft first outreach
- Export ready-to-review prospects

## Dashboard Sections

Conceptual dashboard sections:

- Today's Opportunities
- Prospect Pool
- Watchlist
- Needs Review
- Contact Routes
- Suggested Actions / Run Starters

This spec does not design UI and does not add components.

## Lead Card / Record Requirements

Every record/card must have:

- `lead_kind`
- evidence source
- fit reason
- allowed label
- confidence
- blocked claims when relevant
- next action

Product laws:

- No lead without evidence.
- No score without reason.
- No explanation without action.
- No opportunity without signal.

## Commercial Cleaning Example

These examples follow the Firecrawl proof pattern without importing raw data files into the repo.

Examples that can become Opportunities only when the dated signal is sourced:

- industrial facility with facilities hiring signal
- storage expansion / buildout signal

Examples that remain Prospect Pool or Watchlist unless a fresh signal appears:

- medical office as evidence-backed prospect
- gym / fitness as evidence-backed prospect
- school/daycare as evidence-backed prospect
- property manager as evidence-backed prospect

The ongoing-facility examples can support fit, buyer type, location, source-linked reason, and recommended next action. They must not claim active urgency or "needs this week" until Signal Watch finds a qualifying dated signal with evidence and a why-now reason.

## Source / Provider Boundary

- SerpApi = discovery / what changed.
- Firecrawl = evidence hydration/extraction after a source exists.
- LLMs = classify, score, explain, and draft inside approved contracts/playbooks/taxonomy.
- DB/audit = lineage.

No runtime provider changes are included in this checkpoint.

## Relationship to CP14

CP14 comes next and should define Prospect Pool Export Contract:

- export-ready fields
- blocked fields
- CRM-ready mapping shape
- CSV/export guardrails
- no CRM sync implementation yet

## Non-Goals

- no app code
- no UI/routes
- no DB/schema
- no provider runtime
- no Firecrawl runtime integration
- no export UI
- no CRM sync
- no auto-outreach
- no broad crawling
- no cloned agent marketplace
