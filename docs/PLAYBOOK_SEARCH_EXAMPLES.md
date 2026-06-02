# Playbook Search Examples

> **Status:** Build-ready examples (CP3). Docs-only — shows how vertical playbooks become
> provider-ready query tasks **without** implementing provider logic.
> **Scope:** No provider code, no schema, no agent implementation. Examples illustrate the
> contract from `docs/PROVIDER_CONTRACTS.md` applied to the CP2 commercial-cleaning
> playbook.
> **Reads with:** `docs/AGENT_WEB_DATA_ARCHITECTURE.md` ·
> `docs/PROVIDER_CONTRACTS.md` · `docs/product/playbooks/commercial-cleaning.md`

---

## Purpose

This document shows how an approved vertical playbook turns into concrete,
provider-ready query tasks — and what evidence each task must produce before it can become
an opportunity. It is the bridge between the playbook (what to look for) and the provider
contracts (how the system asks). It implements nothing; it specifies inputs and expected
outputs so CP4/CP5 can build against worked examples.

---

## Shared query template rules

- **All query templates come from playbooks.** No query string is invented at runtime by
  an agent or hardcoded in a route/component. Templates live in the vertical playbook (for
  commercial cleaning: `docs/product/playbooks/commercial-cleaning.md` → Query templates).
- **Approved placeholders only:**
  - `{city}`
  - `{state}`
  - `{county}`
  - `{date_window}`
  - `{service_radius}`
  - `{vertical}`
- **No AI-freestyle query categories in the UI.** The UI never shows or offers a query
  category that does not map to a playbook signal type.
- **Snippets create candidates only.** A SerpApi hit produces a `candidate_signal`. It
  must be hydrated by Firecrawl and pass the evidence gate before it can be surfaced
  (Product Law #4).
- **Launch engines are the light variants:** `google_light`, `google_news_light`,
  `google_maps`, `google_jobs`.

---

## Commercial Cleaning examples

Source: the CP2 commercial-cleaning playbook. Each example is a provider-ready query task
plus the evidence it must produce. Query templates are quoted from the playbook with
placeholders intact.

---

### Example 1 — New business / new office

- **Signal type:** `new_business_listing`
- **Approved signal label:** `NEW BIZ`
- **Vertical-fit label:** `New Office`
- **SerpApi engine:** `google_light`
- **Query template:** `new office opening {city} office space lease signed {date_window}`
- **Expected Firecrawl path:** `scrapeUrl` on the listing/announcement source; `extract`
  business name, address, and lease/open date.
- **Required evidence:** business registration or Google Business listing with a creation
  date; commercial (non-residential) address within `{service_radius}`.
- **Fallback if evidence is weak:** `needs_review` (single unverified listing) →
  `missing_evidence` (no dated record found).

### Example 2 — Building permit / tenant improvement

- **Signal type:** `building_permit` / `tenant_improvement`
- **Approved signal label:** `BUILDOUT`
- **Vertical-fit label:** `Final Clean` (or `Post-Construction Clean`)
- **SerpApi engine:** `google_light`
- **Query template:** `commercial buildout permit {city} {state} {date_window}`
- **Expected Firecrawl path:** `scrapeUrl` on the county/city permit portal record;
  `extract` permit number, address, issue date, and move-in/opening date if present.
- **Required evidence:** permit record with permit number, address, and issue date. A
  confirmed move-in/opening date is required to reach the `urgent_action` (coral) surface.
- **Fallback if evidence is weak:** `missing_evidence` (permit found, no move-in date) →
  `needs_review` (permit implied, no record pulled).

### Example 3 — Restaurant opening

- **Signal type:** `restaurant_opening`
- **Approved signal label:** `RESTAURANT`
- **Vertical-fit label:** `Restaurant`
- **SerpApi engine:** `google_light` (use `google_news_light` for announcements)
- **Query template:** `food service permit {county} restaurant OR cafe OR kitchen {date_window}`
- **Expected Firecrawl path:** `scrapeUrl` on the health-department/business-license
  record; `extract` business name, address, food-service category, filed date.
- **Required evidence:** food-service permit or business license with food-service
  category, address, and filed date; opening within the freshness window.
- **Fallback if evidence is weak:** `needs_review` (listing only, no permit confirmed).

### Example 4 — Negative review / cleanliness complaint

- **Signal type:** `negative_review`
- **Approved signal label:** `REVIEW`
- **Vertical-fit label:** `Janitorial Contract`
- **SerpApi engine:** `google_light` (and `google_maps` for the business's review profile)
- **Query template:** `"{city}" restaurant OR office OR gym reviews "dirty" OR "not clean" OR "unsanitary" {date_window}`
- **Expected Firecrawl path:** `scrapeUrl` / `mapDomain` on the review profile;
  `extract` review dates and cleanliness-related review text.
- **Required evidence:** ≥2 dated public reviews mentioning cleanliness within a 21-day
  window, with review dates and platform links.
- **Fallback if evidence is weak:** `needs_review` (single review only) →
  `missing_evidence` (no dated review record pulled).

### Example 5 — Property management change

- **Signal type:** `property_management_change`
- **Approved signal label:** `PROPERTY MGR`
- **Vertical-fit label:** `Property Manager`
- **SerpApi engine:** `google_light` (use `google_news_light` for CRE announcements)
- **Query template:** `property management change {county} commercial building {date_window}`
- **Expected Firecrawl path:** `scrapeUrl` on the county property record / CRE
  announcement; `extract` new PM name, building name, address, effective date.
- **Required evidence:** confirmed new PM of record (county property record update, CRE
  announcement, or verified public filing) within 60 days.
- **Fallback if evidence is weak:** `needs_review` (new PM implied but not confirmed).

### Example 6 — Hiring / facilities role (optional)

- **Signal type:** `hiring`
- **Approved signal label:** `HIRING`
- **Vertical-fit label:** `Janitorial Contract`
- **SerpApi engine:** `google_jobs`
- **Query template:** `"facilities manager" OR "office manager" OR "building manager" hiring {city} {state}`
- **Expected Firecrawl path:** `scrapeUrl` on the job posting; `extract` company, role
  title, post date, address.
- **Required evidence:** active job posting URL with post date, role title, and
  company/address.
- **Fallback if evidence is weak:** `weak_fit` (noisier signal — requires corroboration
  of facility/operations role specificity); `exploratory` when only loosely tied to a
  cleaning need.

---

## Cross-vertical reuse examples

One raw public signal maps to **different** opportunities depending on the workspace's
vertical and active playbook. The same `building_permit` / renovation signal reads
differently per trade. (Only the commercial-cleaning playbook is authored in CP2; the
other readings below are illustrative direction, not authored playbooks yet.)

| Raw signal | Vertical | Approved signal label · vertical-fit label |
|---|---|---|
| Building permit (commercial buildout) | Commercial Cleaning | `BUILDOUT` · **Final Clean** |
| Building permit (commercial buildout) | Roofing | `PERMIT` · **Roof** |
| Building permit (commercial buildout) | Electrical | `PERMIT` · **Panel Upgrade** |
| Tenant improvement permit | Painting / Tenant Improvement | `BUILDOUT` · **Tenant Improvement** |
| Renovation permit | Dumpster / Junk Removal | `RENOVATION` · **Dumpster Need** |

Rules:
- The same raw signal may create one surfaced opportunity per workspace/playbook fit.
- Each vertical applies its own labels, evidence rules, scoring, and fallback behavior.
- Billing/credits attach to surfaced opportunities, not to raw signals — the same raw
  signal can count separately for different customer workspaces.

---

## Provider use summary

| Discovery use case | SerpApi engine | Firecrawl endpoint | Evidence produced | Fallback if weak |
|---|---|---|---|---|
| New business / new office | `google_light` | `scrapeUrl` + `extract` | Listing/registration with creation date, commercial address | `needs_review` → `missing_evidence` |
| Building permit / TI | `google_light` | `scrapeUrl` + `extract` | Permit record (number, address, issue date, move-in date) | `missing_evidence` → `needs_review` |
| Restaurant opening | `google_light` / `google_news_light` | `scrapeUrl` + `extract` | Food-service permit/license with filed date | `needs_review` |
| Negative review burst | `google_light` / `google_maps` | `scrapeUrl` / `mapDomain` + `extract` | ≥2 dated cleanliness reviews with links | `needs_review` → `missing_evidence` |
| Property management change | `google_light` / `google_news_light` | `scrapeUrl` + `extract` | New PM of record with effective date | `needs_review` |
| Hiring / facilities role | `google_jobs` | `scrapeUrl` + `extract` | Active posting with post date, role, address | `weak_fit` / `exploratory` |

---

## Build order recommendation

- **CP4 — Provider Contract Skeletons.** Implement the `SearchProvider` and
  `EvidenceProvider` interfaces from `docs/PROVIDER_CONTRACTS.md` as skeletons (no live
  calls), wired behind the abstractions, with budget/run-id plumbing.
- **CP5 — SerpApi + Firecrawl smoke proof.** Run the MVP path: 3–5 commercial-cleaning
  query templates in one city, real SerpApi discovery, real Firecrawl hydration, and at
  least one qualified decision plus one fallback decision — proving the loop end to end.
- **CP6 — Evidence spine / schema proposal.** Propose the evidence/lineage schema **only
  after explicit DB approval.** No schema work begins before that approval.
