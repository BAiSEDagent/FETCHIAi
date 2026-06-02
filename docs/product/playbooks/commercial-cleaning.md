# Commercial Cleaning / Janitorial — Vertical Playbook v1

> **Status:** Active — v1.0 product/spec source of truth.
> **Scope:** Product-spec proof only. Does NOT prove the classifier/agent is implemented.
> **Conforms to:** `docs/product/vertical-playbook-registry.md` · `docs/design/lead-card-taxonomy.md`
> **Proof rule:** Vertical behavior is proven by fixtures/tests (§ Example cards), never by this doc alone.

---

## Playbook identity

| Field | Value |
|---|---|
| vertical id | `commercial_cleaning` |
| display name | Commercial Cleaning / Janitorial |
| status | active |
| version | 1.0 |
| launch-supported | true |
| playbook file | `docs/product/playbooks/commercial-cleaning.md` |

---

## Positioning

### What this vertical sells
Recurring and project-based commercial cleaning services for businesses, properties, and facilities — including nightly janitorial contracts, post-construction final cleans, move-in/move-out turnover cleans, day porter services, floor care, and event cleanup.

### Who buys
- Office building tenants and operators (new and expanding)
- Commercial property managers (CRE multi-tenant buildings)
- Restaurants and food-service operators (nightly back-of-house)
- Medical / dental / clinic operators (compliance-grade sanitation)
- Schools, daycares, and churches (facility cleaning contracts)
- Gyms, fitness studios, and wellness centers
- Event venues and banquet halls
- Retail spaces and showrooms
- Light industrial / warehouse offices and breakrooms

Out of scope as customers: single-family residential, individual homeowners, consumer maid services.

### What "need this week" means for this vertical
A commercial cleaning prospect has a need this week when:
- A buildout permit is filed and a move-in/opening date is within 30–45 days (final clean window)
- A new business listing or commercial lease is confirmed and the space has not yet opened (new office setup)
- A restaurant permit or food-service license is filed for a new location (opening clean + nightly contract)
- A property management change is confirmed (new PM typically re-bids facility services)
- A cleanliness complaint burst appears in public reviews within the past 21 days (displacement opportunity)
- A school, daycare, or medical office opening is announced within 60 days

Services NOT covered (signals route away):
- Water/fire/mold restoration → `restoration` playbook
- Pest control → `pest_control` playbook
- HVAC duct cleaning → `hvac` playbook
- Hazmat / biohazard remediation
- Exterior pressure-washing → `landscaping` or `restoration`
- Residential maid service → out of vertical scope

---

## Approved UI-visible labels

> **Rule:** The UI may only render labels from these approved lists. The classifier must not invent labels. If a signal cannot be mapped to an approved label with sufficient confidence and evidence, it must use a fallback state.

### Signal labels (Layer 2 — what fired)

```
NEW BIZ
NEW LEASE
BUILDOUT
MOVE-IN
REVIEW
PROPERTY MGR
EVENT
HIRING
RESTAURANT
MEDICAL
SCHOOL
```

### Vertical-fit / service labels (Layer 3 — what the signal means for this user)

```
Final Clean
Janitorial Contract
New Office
Restaurant
Medical Office
School / Daycare
Gym / Fitness
Property Manager
Move-Out Clean
Post-Construction Clean
Recurring Service
```

### Freshness / urgency labels (Layer 4 — time context)

```
Just now
Xh ago          (e.g. "6h ago")
Yesterday
Xd ago          (e.g. "3d ago")
Xw ago          (e.g. "2w ago")
Expiring soon
```

### Fallback state labels (honest, never fabricated)

```
Needs review
Weak fit
Missing evidence
Exploratory
Discarded
```

### Disallowed / freestyle labels

The classifier must never produce labels such as:
- Any label not in the approved lists above
- Generic AI-generated descriptions used as signal or fit labels
- Score numbers used as labels
- Color or surface names used as labels
- Vertical names used as chip labels (e.g. "Commercial Cleaning" must not appear as a card chip)

---

## Supported signals

Each signal entry defines: signal id, approved signal label, when valid, required evidence, useful source types, vertical-fit labels it can produce, fallback state if evidence is weak, and an example lead card copy.

---

### new_business_listing

**Signal id:** `new_business_listing`
**Approved signal label:** `NEW BIZ`
**When valid:** A new commercial entity registers, files a DBA, or appears for the first time as an active business on a public directory (Google Business, state secretary of state, county clerk) within the freshness window (30 days).
**Required evidence:** Business registration record OR Google Business listing with creation date OR commercial lease filing.
**Useful source types:** State SOS filings, county business license records, Google Maps new listing alerts, SerpAPI `google_light` queries.
**Vertical-fit labels produced:** `New Office`, `Janitorial Contract`
**Fallback state if evidence is weak:** `needs_review` (single unverified listing) → `missing_evidence` (no dated record found)
**Example card copy:**
> "New office registration filed in Austin — 3,200 sqft commercial space at 4th & Lamar. No cleaning contract in place yet."

---

### building_permit

**Signal id:** `building_permit`
**Approved signal label:** `BUILDOUT`
**When valid:** A commercial buildout, renovation, or tenant-improvement permit is pulled at a commercial address within 45 days. Strongest when a move-in or opening date is also confirmed.
**Required evidence:** Permit record with permit number, address, and issue date. Move-in/opening date required for `urgent_action` (coral) surface.
**Useful source types:** County permit portals, city building department records, SerpAPI `google_light` permit queries.
**Vertical-fit labels produced:** `Final Clean`, `Post-Construction Clean`, `New Office`
**Fallback state if evidence is weak:** `missing_evidence` (permit found, no move-in date) → `needs_review` (permit implied, no record pulled)
**Example card copy:**
> "Commercial buildout permit filed for Lumen Coworking — 6,100 sqft at 5th St, Austin. Move-in June 22. Final clean window opens now."

---

### tenant_improvement

**Signal id:** `tenant_improvement`
**Approved signal label:** `BUILDOUT`
**When valid:** A tenant-improvement permit is filed for a commercial space — typically a retail, medical, or office retrofit for a new occupant. Distinct from structural construction permits.
**Required evidence:** Permit record with TI designation, address, and commercial tenant context.
**Useful source types:** County permit portals, commercial real estate news, SerpAPI permit queries.
**Vertical-fit labels produced:** `Post-Construction Clean`, `New Office`, `Medical Office`
**Fallback state if evidence is weak:** `missing_evidence` if no tenant identity is confirmed.
**Example card copy:**
> "Tenant-improvement permit for 2,800 sqft medical suite at Beltline Medical Plaza — fit-out nearing completion, final clean scope likely."

---

### hiring

**Signal id:** `hiring`
**Approved signal label:** `HIRING`
**When valid:** An active job posting for a facilities manager, office manager, or building operations role appears at a commercial entity within 30 days. Implies a growing facility need.
**Required evidence:** Active job posting URL with post date, role title, and company/address.
**Useful source types:** Indeed, LinkedIn, Glassdoor, SerpAPI `google_jobs` queries.
**Vertical-fit labels produced:** `Janitorial Contract`, `New Office`, `Recurring Service`
**Fallback state if evidence is weak:** `weak_fit` (noisier signal — requires corroboration with facility/operations role specificity)
**Example card copy:**
> "Cedar Park Towers posted a Facilities Manager role 4 days ago — multi-tenant CRE typically re-bids janitorial when hiring new facility leadership."

---

### negative_review

**Signal id:** `negative_review`
**Approved signal label:** `REVIEW`
**When valid:** Two or more dated public reviews mentioning cleanliness, sanitation, or facility condition appear within a 21-day window. One review alone → `needs_review`.
**Required evidence:** ≥2 dated public reviews mentioning cleanliness from a public review platform (Google, Yelp, Tripadvisor), with review dates and platform links.
**Useful source types:** Google Maps reviews, Yelp, SerpAPI `google_light` reviews queries.
**Vertical-fit labels produced:** `Janitorial Contract`, `Recurring Service`
**Fallback state if evidence is weak:** `needs_review` (single review only) → `missing_evidence` (no dated review record pulled)
**Example card copy:**
> "Two Google reviews in 6 days at Glenwood Bistro cite cleanliness concerns — active window for a displacement outreach."

---

### restaurant_opening

**Signal id:** `restaurant_opening`
**Approved signal label:** `RESTAURANT`
**When valid:** A food-service permit, restaurant business license, or commercial kitchen permit is filed for a new restaurant, café, or food-service location. Opening within 60 days.
**Required evidence:** Food-service permit OR business license with food-service category, address, and filed date.
**Useful source types:** County health department records, city business license filings, SerpAPI `google_light` restaurant opening queries.
**Vertical-fit labels produced:** `Restaurant`, `Final Clean`
**Fallback state if evidence is weak:** `needs_review` (listing only, no permit confirmed)
**Example card copy:**
> "Food-service permit filed for Lakeview Brasserie — 4,400 sqft new restaurant at Domain North, Austin. Opening in 8 weeks. Nightly back-of-house scope from day one."

---

### property_management_change

**Signal id:** `property_management_change`
**Approved signal label:** `PROPERTY MGR`
**When valid:** A new property management company takes over management of a commercial building or multi-tenant property within 60 days. New PMs routinely re-bid facility services including janitorial.
**Required evidence:** Confirmed new PM of record — county property record update, commercial real estate announcement, or verified public filing.
**Useful source types:** County assessor / property records, LoopNet, commercial real estate news, SerpAPI queries.
**Vertical-fit labels produced:** `Property Manager`, `Recurring Service`
**Fallback state if evidence is weak:** `needs_review` (new PM implied but not confirmed as record)
**Example card copy:**
> "Apex Properties confirmed as new PM for Riverbend Business Park (12 suites) — janitorial contract likely up for re-bid in transition period."

---

### school_or_daycare_opening

**Signal id:** `school_or_daycare_opening`
**Approved signal label:** `NEW BIZ`
**When valid:** A new school, daycare, or childcare facility receives a certificate of occupancy, business license, or enrollment announcement within 60 days of opening.
**Required evidence:** Business license or certificate of occupancy with daycare/school category, address, and date.
**Useful source types:** State licensing boards, county records, SerpAPI `google_light` queries.
**Vertical-fit labels produced:** `School / Daycare`, `Final Clean`
**Fallback state if evidence is weak:** `missing_evidence` (announcement found, no license record)
**Example card copy:**
> "New licensed daycare opening in Round Rock — 3,100 sqft facility approved by TDPRS. Recurring daily cleaning contract from opening day."

---

### medical_office_opening

**Signal id:** `medical_office_opening`
**Approved signal label:** `MEDICAL`
**When valid:** A new medical, dental, or clinic practice files a business license, obtains a certificate of occupancy, or completes a tenant-improvement permit for a healthcare space within 60 days.
**Required evidence:** Healthcare business license OR TI permit for medical suite, with address and filing date.
**Useful source types:** County business license records, SerpAPI permit and new-business queries.
**Vertical-fit labels produced:** `Medical Office`, `Final Clean`, `Recurring Service`
**Fallback state if evidence is weak:** `needs_review` (practice announced, no record confirmed)
**Example card copy:**
> "New dental practice at Round Rock Medical Plaza — TI permit issued last week for 2,200 sqft. Compliance-grade daily cleaning required from open."

---

### event_or_venue_expansion

**Signal id:** `event_or_venue_expansion`
**Approved signal label:** `EVENT`
**When valid:** An event venue, banquet hall, or hospitality facility announces expansion, renovation, or a large scheduled event within 45 days that implies facility cleaning scope.
**Required evidence:** Public event listing with date and venue address, OR expansion permit/announcement with venue name and location.
**Useful source types:** Eventbrite, venue websites, SerpAPI event queries, local news.
**Vertical-fit labels produced:** `Janitorial Contract`, `Recurring Service`, `Final Clean`
**Fallback state if evidence is weak:** `exploratory` (event found, cleaning scope unclear)
**Example card copy:**
> "Westlake Grand Ballroom expanding capacity by 40% — renovation permit filed, reopening in 6 weeks. Post-renovation final clean + recurring event setup scope."

---

## Evidence requirements

What counts as valid evidence (per Product Law #1: no lead without evidence):

| Evidence type | Definition | Required for |
|---|---|---|
| **Dated source** | A public artifact with a verifiable date — permit record, filing date, review date, listing creation date | All signals |
| **Source URL or source name** | A citable public URL or named record (e.g. "Travis County permit #2026-04-1234") | All signals |
| **Business / prospect identity** | A confirmed business name tied to a commercial address — not a residential address | All signals |
| **Location** | Street address or city/county within workspace service radius | All signals |
| **Reason cleaning need exists** | A clear causal link between the signal and a cleaning service need (new tenant → no cleaning contract; buildout → final clean required; dirty reviews → displacement) | All signals |
| **Action window** | A specific dated deadline (move-in date, opening date, event date, lease start) that creates urgency | Required for `urgent_action` (coral) surface only |

Evidence must be a citable public artifact. Inferred prose, AI-generated assumptions, or agent-drafted paraphrases are not evidence.

Missing any required evidence tier → the card must drop to `missing_evidence` or `needs_review`, not show a confident score.

---

## Disqualification rules

Conditions that force `discarded`. Cards in this state are not shown as ranked opportunities; visible in admin/audit only.

1. **Residential-only** — Signal tied to a single-family home, apartment unit, condo, or individual homeowner. Consumer cleaning is out of scope.
2. **Too far outside service radius** — Target address is outside the workspace's configured market area / service radius.
3. **No business identity** — Signal cannot be tied to a named commercial entity or commercial property address.
4. **No dated signal** — Signal has no verifiable date within the freshness window for its type. Undated signals cannot be ranked.
5. **Service mismatch** — Signal clearly implies a different trade: water/fire/mold damage → `restoration`; pest activity → `pest_control`; structural roof damage → `roofing`; electrical-only permit → `electrical`.
6. **Duplicate signal** — The same raw signal event has already generated an opportunity for this workspace (deduplication rule).
7. **Stale signal** — Signal age exceeds the freshness window for its type (see Scoring rubric for windows). Stale signals expire and are not re-surfaced.
8. **No evidence** — A signal was detected but no public supporting artifact was found or confirmed.
9. **Weak connection to cleaning need** — The signal is real but the causal link to a cleaning service is too speculative (e.g. a weather event with no facility damage or event context).
10. **Already a customer** — Target matches the workspace's customer/exclusion list.

---

## Scoring rubric

Score = `service_fit_score` (0–100). Score expresses service-fit strength and governs ranking priority. Score does NOT determine card surface color (see `lead-card-taxonomy.md`).

### Score bands

**90–100 — Confirmed, actionable, time-sensitive**
- Reason: Strong signal type + confirmed evidence + dated action window approaching
- Evidence threshold: Permit/lease/license record confirmed + move-in/opening date within freshness window
- Recommended action: Prioritize outreach today — include specific evidence reference
- Fallback state if not actionable: None — this band requires full evidence; if evidence gaps appear, score drops

**75–89 — Strong signal, good evidence, no urgent window**
- Reason: Strong signal type + confirmed evidence + no specific action date confirmed
- Evidence threshold: Permit/lease/license/review confirmed, no dated move-in/opening window
- Recommended action: Outreach within 48 hours — opportunity is real, window may open soon
- Fallback state if not actionable: `needs_review` if second corroborating source would strengthen confidence

**60–74 — Moderate signal, partial evidence**
- Reason: Signal type maps to cleaning, evidence partially confirmed, fit is plausible but not certain
- Evidence threshold: One source confirmed, corroboration incomplete
- Recommended action: Review before outreach — verify evidence and check contact route
- Fallback state if not actionable: `weak_fit` if score is below workspace sensitivity floor; `missing_evidence` if required artifact is absent

**40–59 — Weak signal or noisy evidence**
- Reason: Signal type is noisier (hiring, event), evidence is thinner, cleaning need is inferred not confirmed
- Evidence threshold: Signal detected, no direct cleaning-need evidence
- Recommended action: Use sparingly — only with Aggressive workspace sensitivity; not surfaced at Balanced or Conservative
- Fallback state if not actionable: `exploratory` or `weak_fit`

**Below 40 — Discard or exploratory only**
- Reason: Signal does not reliably map to a cleaning need, evidence too weak to rank
- Evidence threshold: Signal present, no cleaning-specific evidence
- Recommended action: Do not surface as a ranked opportunity; route to `discarded` or hold as `exploratory` in Other workspaces
- Fallback state: `discarded` (disqualification) or `exploratory` (Other vertical, learning mode)

### Freshness windows (after which a signal expires)

| Signal type | Freshness window |
|---|---|
| `new_business_listing` / `restaurant_opening` / `school_or_daycare_opening` / `medical_office_opening` | 30 days |
| `building_permit` / `tenant_improvement` | 45 days |
| `property_management_change` | 60 days |
| `negative_review` burst | 21 days |
| `hiring` | 30 days |
| `event_or_venue_expansion` | Until event date |

### Scoring weights (illustrative — tune via fixtures)

| Factor | Weight | Notes |
|---|---|---|
| Signal-type base relevance | 0.30 | Buildout / new lease high; hiring lower |
| Evidence strength / corroboration | 0.25 | More confirmed sources → higher |
| Freshness | 0.20 | Newer = higher; decays over window |
| Buyer fit (customer type match) | 0.15 | Office / CRE / medical strong; edge types lower |
| Contract value proxy | 0.10 | Square footage / multi-location / recurring potential |

### Workspace sensitivity layers

Two separate gates a candidate must clear:

1. **Playbook / signal-type floor** — set per signal type by this playbook. Decides eligibility regardless of workspace settings. Noisier signal types require stronger corroboration.
2. **Workspace sensitivity** — user's Conservative / Balanced / Aggressive dial, applied on top. Tightens or loosens how much of the eligible pool appears in Today's Run and digests.

> Numbers are illustrative only. Conservative ~80 / Balanced ~70 / Aggressive ~60. The Settings spec is the authority for approved thresholds.

Below the applicable floor → `weak_fit`. Below a disqualification threshold → `discarded`.

---

## Fallback state rules

Uses the five approved states from `docs/design/lead-card-taxonomy.md`. Fallback cards must look intentional and honest — never broken.

| State | Commercial Cleaning trigger | UI treatment |
|---|---|---|
| `needs_review` | Signal maps to a cleaning fit but evidence is thin — single unverified review, unconfirmed lease, implied permit | Dashed border, no confident score, "Fetchi needs a second source before ranking this" |
| `weak_fit` | Signal confirmed + evidence meets playbook floor, but `service_fit_score` is below the workspace sensitivity setting | Dimmed chip, score shown but muted, "Below your sensitivity threshold" |
| `missing_evidence` | Label is allowed and signal type is valid, but the required public artifact was not found or confirmed (e.g. lease implied but record not pulled) | Dashed border, score dash (—), "Evidence not confirmed yet" |
| `exploratory` | Used only when workspace vertical is `Other` and the system is guessing at cleaning relevance — never used for confirmed commercial-cleaning workspaces | Dimmed chip, "Exploratory — Fetchi is still learning your market" |
| `discarded` | Any §Disqualification rule fired (residential, out of area, wrong trade, stale, no evidence, already a customer) | Not surfaced as ranked opportunity; visible in admin/audit only |

A fallback card never shows a confident score and never invents a label. If evidence becomes available later, the card must be re-evaluated — not retroactively upgraded in-place.

---

## Query templates

SerpAPI-oriented discovery queries, grouped by signal type. No provider code. Use SerpAPI `google_light` engine for broad discovery; `google_maps` for location-specific lookups; `google_news_light` for recent announcements. Placeholders: `{city}`, `{state}`, `{county}`, `{vertical}`, `{service_radius}`, `{date_window}`.

### new_business_listing
```
new commercial business {city} {state} {date_window}
new office opening {city} office space lease signed {date_window}
business license filed {county} commercial {date_window}
new tenant {city} office building OR retail OR coworking {date_window}
```

### building_permit / tenant_improvement
```
commercial buildout permit {city} {state} {date_window}
tenant improvement permit {county} commercial office OR medical OR retail {date_window}
building permit commercial renovation {city} {date_window}
```

### restaurant_opening
```
new restaurant opening {city} {state} {date_window}
food service permit {county} restaurant OR cafe OR kitchen {date_window}
restaurant grand opening {city} {date_window}
```

### negative_review
```
"{city}" restaurant OR office OR gym reviews "dirty" OR "not clean" OR "unsanitary" {date_window}
{city} business reviews cleanliness complaint {date_window}
```

### property_management_change
```
new property management company {city} commercial {date_window}
property management change {county} commercial building {date_window}
"{city}" commercial real estate property manager change {date_window}
```

### school_or_daycare_opening
```
new daycare opening {city} {state} {date_window}
new school {city} licensed childcare {date_window}
daycare license {county} approved {date_window}
```

### medical_office_opening
```
new medical office {city} {state} {date_window}
dental clinic opening {city} tenant improvement permit {date_window}
medical suite {county} certificate of occupancy {date_window}
```

### hiring
```
"facilities manager" OR "office manager" OR "building manager" hiring {city} {state}
facility operations job posting {city} {date_window}
```

### event_or_venue_expansion
```
event venue {city} expansion OR renovation {date_window}
banquet hall {city} renovation permit OR opening {date_window}
new event space {city} {state} opening {date_window}
```

---

## Enrichment checklist

Fields to collect after a source URL or signal artifact is found — before a lead card is surfaced. Each field is optional unless marked required.

| Field | Required | Notes |
|---|---|---|
| Business name | Required | Confirmed legal or DBA name, not inferred |
| Street address | Required | Full commercial address; disqualify if residential |
| City / state / zip | Required | Must be within {service_radius} |
| Website | Recommended | For contact-route discovery |
| Decision-maker / contact route | Recommended | Facilities manager, office manager, PM, owner — with role confidence |
| Opening date / project date | Required for urgent_action | Move-in date, opening date, lease start, event date |
| Square footage | Recommended | Drives contract value proxy in scoring |
| Source evidence URL | Required | Citable public artifact URL or record identifier |
| Source name / type | Required | e.g. "Travis County permit #2026-04-1234", "Google Business listing", "Yelp review 2026-05-28" |
| Source date | Required | Date of the public artifact, not discovery date |
| Number of locations | Recommended | Multi-location = higher contract value proxy |
| Notes for outreach | Optional | Context that should inform the outreach draft — not fabricated |

Do not fabricate or infer any enrichment field. If a field is missing, leave it blank — do not fill with AI-generated prose.

---

## Outreach plays

AI-drafts constrained by playbook tone and evidence rules. Never sent automatically (Product Law #3: explanation → action, user controls send). Tone: practical, facility-operator, no-fluff. Each template references the actual signal as proof.

---

### 1 — New office opening (new_business_listing / commercial lease)

**When to use:** New commercial business registration or lease signed, no cleaning contract yet in place. No dated action window confirmed (dark card, not coral).

**Subject:** Cleaning for {{business_name}}'s new space at {{address}}

**Body:**
Hi {{contact_first}} — saw {{business_name}} recently opened at {{address}} in {{city}}. Most new offices don't have a janitorial contract on day one — we handle recurring nightly and weekly cleaning for commercial spaces in {{city}} and can put together a simple quote.

Happy to do a quick walkthrough this week.

— {{user_name}}, {{user_company}}

**Evidence reference:** `{{signal_evidence}}` (e.g. "New business filing, Travis County, May 28")
**CTA:** Request a walkthrough or quote call

---

### 2 — Post-construction / final clean (building_permit with move-in date)

**When to use:** Commercial buildout or TI permit found, move-in or opening date confirmed within 30–45 days. Use for coral (urgent_action) cards only when action window is confirmed.

**Subject:** Post-construction clean for {{business_name}}'s new space

**Body:**
Hi {{contact_first}} — noticed {{business_name}} pulled a buildout permit at {{address}}. Before move-in you'll need a final/post-construction clean — we handle {{services}} for commercial spaces around {{city}} and can walk the site this week to quote it.

Move-in coming up {{action_window_date}}, so timing matters.

— {{user_name}}, {{user_company}}

**Evidence reference:** `{{permit_record}}` (e.g. "Travis County commercial buildout permit #2026-04-1234, issued May 12")
**CTA:** Schedule a site walk this week

---

### 3 — Restaurant opening (restaurant_opening)

**When to use:** Food-service permit or restaurant license filed for a new location. Opening within 60 days.

**Subject:** Nightly cleaning for {{business_name}}'s new kitchen

**Body:**
Hi {{contact_first}} — saw {{business_name}} is opening at {{address}} in {{city}}. Restaurants need reliable nightly back-of-house cleaning from day one — health inspections, grease management, and keeping the floor clean before every open.

We work with several restaurants in {{city}} and can have a quote to you before your opening date.

— {{user_name}}, {{user_company}}

**Evidence reference:** `{{food_service_permit}}` (e.g. "City of Austin food-service permit, filed June 1")
**CTA:** Request a pre-opening quote

---

### 4 — Property manager recurring janitorial (property_management_change)

**When to use:** New property manager confirmed as PM of record for a commercial building. Re-bid window is open.

**Subject:** Janitorial proposal for {{building_name}} — new management

**Body:**
Hi {{contact_first}} — congratulations on taking over {{building_name}} at {{address}}. New property managers typically review facility services early on — we provide recurring janitorial for commercial buildings in {{city}} and would be glad to put together a competitive proposal for your review.

— {{user_name}}, {{user_company}}

**Evidence reference:** `{{pm_change_record}}` (e.g. "Apex Properties confirmed as new PM, county records, June 3")
**CTA:** Request a facility services proposal

---

### 5 — Weak-fit / exploratory soft-touch (weak_fit or exploratory state)

**When to use:** Signal is real but cleaning need is inferred, not confirmed — hiring signal, venue event, or ambiguous listing. Use only when workspace sensitivity is Aggressive and the user chooses to act on lower-confidence leads. Do not use for `discarded` cards.

**Subject:** Quick note for {{business_name}}

**Body:**
Hi {{contact_first}} — came across {{business_name}} at {{address}} while scouting for cleaning opportunities in {{city}}. I don't have full context on your current setup, but if you're ever looking at janitorial services or a one-time clean, we'd be happy to walk the space.

No pressure — just wanted to reach out.

— {{user_name}}, {{user_company}}

**Evidence reference:** `{{signal_description}}` (light touch — mention signal type only if it adds context)
**CTA:** No hard CTA — invite a conversation

---

## Example cards

Design examples only — not classifier proof. Each example includes: signal label, vertical-fit label, freshness label, evidence, score reason, fallbackState if any, and recommended action.

Proof of classifier behavior requires fixtures/tests feeding structured signals through the playbook and asserting approved outputs.

---

### Strong / actionable examples

**Card 1 — Buildout + dated move-in (urgent_action / coral)**
```
status:             New
signal_label:       BUILDOUT · 3W
vertical_fit_label: Final Clean
freshness_label:    3w ago
score:              91
opportunity_surface: urgent_action  →  coral card
action_window:      Move-in June 22 (≈3 weeks)  [REQUIRED for coral]
evidence:           Travis County commercial buildout permit #2026-04-1234, issued May 12
why_now:            "Buildout permit + confirmed June 22 move-in — final clean must be booked before opening."
fallbackState:      null
recommended_action: Outreach today — include permit and move-in date
```

**Card 2 — New restaurant opening (default dark, actionable)**
```
status:             New
signal_label:       RESTAURANT · 6H
vertical_fit_label: Restaurant
freshness_label:    6h ago
score:              87
opportunity_surface: default  →  dark card
evidence:           Austin food-service permit, filed this morning, 4,400 sqft at Domain North
why_now:            "Food-service permit filed — new restaurant opening in 8 weeks, nightly back-of-house scope from day one."
fallbackState:      null
recommended_action: Outreach within 48 hours — pre-opening quote window
```

**Card 3 — New dental office (medical, default dark)**
```
status:             New
signal_label:       MEDICAL · 2D
vertical_fit_label: Medical Office
freshness_label:    2d ago
score:              84
opportunity_surface: default  →  dark card
evidence:           TI permit for 2,200 sqft medical suite at Round Rock Medical Plaza, issued May 29
why_now:            "Dental practice fit-out nearing completion — compliance-grade daily cleaning required from open."
fallbackState:      null
recommended_action: Outreach this week — healthcare compliance timeline
```

**Card 4 — Property management change (pipeline / dark)**
```
status:             Saved
signal_label:       PROPERTY MGR · 12D
vertical_fit_label: Property Manager
freshness_label:    12d ago
score:              88
opportunity_surface: pipeline  →  dark card  (high score, but pipeline — not coral)
evidence:           Apex Properties confirmed as new PM for Riverbend Business Park, county records June 3
why_now:            "New PM taking over 12-suite CRE building — janitorial re-bid window typically opens in first 30 days."
fallbackState:      null
recommended_action: Outreach to new PM with recurring proposal
```

**Card 5 — New daycare opening (School / Daycare, urgent window)**
```
status:             New
signal_label:       NEW BIZ · 1D
vertical_fit_label: School / Daycare
freshness_label:    Yesterday
score:              82
opportunity_surface: urgent_action  →  coral card
action_window:      Opening July 1 (≈4 weeks)  [REQUIRED for coral]
evidence:           TDPRS daycare license approved May 30, Round Rock facility, 3,100 sqft
why_now:            "Licensed daycare opening July 1 — daily facility cleaning required from day one for compliance."
fallbackState:      null
recommended_action: Outreach today — include license date and opening date
```

---

### Fallback / exploratory examples

**Card 6 — needs_review (single review, thin evidence)**
```
status:             New
signal_label:       REVIEW · 5D
vertical_fit_label: Janitorial Contract
freshness_label:    5d ago
score:              —
opportunity_surface: fallback  →  dashed / dimmed
evidence:           One Google review mentioning cleanliness at Glenwood Bistro, June 1 — second source not yet confirmed
fallbackState:      needs_review
why_shown:          "A cleanliness review appeared, but Fetchi needs a second source before ranking this."
recommended_action: Wait for second review or seek corroboration before outreach
```

**Card 7 — missing_evidence (buildout permit, no move-in date)**
```
status:             New
signal_label:       BUILDOUT · 3W
vertical_fit_label: Final Clean
freshness_label:    3w ago
score:              —
opportunity_surface: fallback  →  dashed / dimmed
evidence:           Commercial buildout permit on file — no move-in/opening date confirmed yet
fallbackState:      missing_evidence
why_shown:          "Buildout permit found. Fetchi couldn't confirm a move-in or opening date to establish the clean window."
recommended_action: Monitor for move-in date — upgrade to confident card when confirmed
```

**Card 8 — exploratory (venue event, cleaning scope unclear)**
```
status:             New
signal_label:       EVENT · 4D
vertical_fit_label: Janitorial Contract
freshness_label:    4d ago
score:              —
opportunity_surface: fallback  →  dashed / dimmed
evidence:           Event venue renovation announced — cleaning scope not confirmed
fallbackState:      exploratory
why_shown:          "Venue expansion detected. Cleaning need is plausible but not confirmed — Fetchi is still learning this signal."
recommended_action: Use only with Aggressive sensitivity — soft-touch outreach if at all
```

**Card 9 — discarded (residential address — admin/audit only)**
```
fallbackState:      discarded
signal:             new_business_listing
signal_evidence:    Listing at 14 Elm St, Allen, TX — confirmed single-family residential
disqualification:   Residential context — out of commercial cleaning scope
why_discarded:      "Address is single-family residential. Not a commercial cleaning fit."
visible_to:         Admin / audit only — not surfaced as a ranked opportunity
```

**Card 10 — weak_fit (score below Balanced floor)**
```
status:             New
signal_label:       HIRING · 8D
vertical_fit_label: Janitorial Contract
freshness_label:    8d ago
score:              62
opportunity_surface: fallback  →  muted chip
evidence:           Facilities manager job posting at Westgate Athletic Club, Indeed, June 1
fallbackState:      weak_fit
why_shown:          "Signal confirmed, but score is below your Balanced sensitivity threshold. Switch to Aggressive to see more signals like this."
recommended_action: Visible at Aggressive sensitivity — not surfaced at Balanced or Conservative
```

---

## Related sections (legacy content preserved)

### One signal → many opportunities (cross-vertical rule)

**Approved direction:** One raw signal can generate different opportunities across different workspaces/playbooks. That is core Fetchi behavior — the same renovation permit means `Final Clean` to a cleaning contractor and `Roof` to a roofer.

**V1 guardrails:**
- One raw signal may create one surfaced opportunity per workspace/playbook fit.
- Do not double-count or double-charge the same workspace for the same raw signal.
- If a workspace serves multiple services, choose the strongest playbook match as the primary opportunity.
- Billing / credits attach to surfaced opportunities, not raw signals.
- The same raw signal can count separately for different customer workspaces — opportunity meaning differs per business.

### Contact-route priorities

Ranked roles to target, best-first:
1. Facilities / Operations Manager
2. Building Manager / Property Operations (multi-tenant CRE)
3. Office Manager / Administrator
4. Property Manager (multi-tenant CRE)
5. Regional Operations Manager (multi-location)
6. Franchise / Operator contact (restaurants, gyms)
7. Owner / GM (small single-location)
8. Procurement / Purchasing (larger orgs)

Confidence rules: named role + verified public email/phone = high; generic info@ = medium; unnamed = low (often `needs_review`).

### Fixture / test requirements (proof checklist)

Before claiming `commercial_cleaning_v1` is production-supported, these fixtures must pass:

1. Buildout + dated move-in/opening window → `Final Clean` + `urgent_action`
2. New lease → `Move-Out Clean` or `New Office` + `default` surface + evidence list includes lease record
3. Review burst (2 reviews) → `Janitorial Contract` confident; 1 review → `needs_review`
4. Cross-vertical isolation: `weather_hail` to cleaning workspace → `discarded`, never a cleaning label
5. Same signal, two verticals: `building_permit` → cleaning = `BUILDOUT · Final Clean`; roofing = `PERMIT · Roof`
6. Missing evidence: lease implied, record not pulled → `missing_evidence`, score —
7. Below floor: valid fit, score 64, Balanced floor 70 → `weak_fit`
8. Disqualify residential: single-family address → `discarded`
9. Surface ≠ score: saved lead, score 88 → `pipeline` (dark), NOT coral
10. No freestyle: ambiguous signal → output label ∈ approved set or a fallback; never a novel string
11. Action-window drives coral: same permit at score 84, (a) with dated window → `urgent_action`; (b) without → `default`

### Open questions

1. **Restaurant nightly vs. one-time:** Does `Restaurant` fit label need a recurring vs. one-time variant, or is context carried in `why_now`?
2. **Review-burst threshold:** Is 2 dated reviews the right confident bar, or does it vary by business size/review volume?
3. **Property-manager change confidence:** Does a new PM reliably re-bid janitorial, or is this always `needs_review` without further corroboration?
4. **Action-window detection coverage:** How reliably can move-in/opening/event dates be extracted from public sources? If detection is weak, most cleaning leads will surface as dark (non-urgent) cards.
5. **Multi-service workspaces (post-V1):** When a workspace sells cleaning + restoration, do secondary matches become separately billable?
