# Commercial Cleaning / Janitorial — Vertical Playbook (DRAFT)

> **Status:** Draft worked-template. Design/product spec only.
> **Target home (later, not now):** `docs/product/playbooks/commercial-cleaning.md`
> **Conforms to:** `docs/product/vertical-playbook-registry.md` + `docs/design/lead-card-taxonomy.md`
> **Proof status:** This document is a spec. It does NOT prove the classifier works. Vertical behavior is proven only by fixtures/tests (see §19), never by this doc or any design board.

This is the worked example. The other nine launch verticals should be authored by cloning this structure and swapping the vertical-specific content.

---

## 1 · vertical_key
```
commercial_cleaning
```

## 2 · vertical_name
```
Commercial Cleaning / Janitorial
```
- `public_status`: `core`
- `playbook_version`: `commercial_cleaning_v1`
- `active`: `true`

## 3 · Supported customer types
Who this user (the Fetchi subscriber) typically wins as a customer. Used to interpret whether a signal's *target business* is a plausible buyer.

- Office buildings / commercial office tenants
- Coworking & flex-office operators
- Medical / dental / clinic facilities
- Retail & showroom spaces
- Restaurants & food service (back-of-house / nightly)
- Event venues & banquet halls
- Property management companies (multi-tenant CRE)
- Schools / daycares / churches (facility cleaning)
- Gyms / fitness studios
- Light industrial / warehouse breakrooms & offices

Out of scope as customers (see §10 disqualification):
- Single-family residential
- Individual homeowners / apartments (consumer cleaning is a different product)

## 4 · Services covered
What the subscriber sells (drives outreach + service-fit labeling).

- Recurring janitorial / nightly office cleaning
- Post-construction / final clean (move-in ready)
- Day porter services
- Floor care (strip & wax, carpet, tile)
- Window cleaning (interior / low-rise)
- Restroom sanitation & restocking
- Event setup/teardown cleaning
- Move-in / move-out turnover cleaning

## 5 · Services NOT covered
Used to disqualify signals that imply a different trade.

- Restoration (water/fire/mold) → belongs to `restoration` playbook
- Pest control → `pest_control`
- HVAC duct cleaning → `hvac`
- Hazmat / biohazard remediation
- Exterior pressure-washing of structures (often landscaping/restoration)
- Residential maid service

---

## 6 · Supported signal types
Raw, vertical-agnostic signal types this playbook *consumes*. (Raw signals are stored once, engine-wide; the playbook decides which it cares about.)

| signal_type | Why cleaning cares |
|---|---|
| `new_business_registration` | new office = needs a cleaning contract from day one |
| `commercial_lease` | new tenant move-in = turnover + recurring contract |
| `commercial_buildout_permit` | buildout precedes a required final/post-construction clean |
| `tenant_move_in` | move-in turnover cleaning |
| `review_complaint` | "dirty / unclean" review burst = displacement opportunity |
| `property_management_change` | new PM often re-bids facility services |
| `event_scheduled` | venue/banquet events need setup-teardown cleaning |
| `business_expansion_hiring` | facility/office-manager hire signals a growing facility need |

NOT consumed by this playbook (handed to other verticals or discarded):
- `weather_hail` / `weather_wind` / `storm_damage` → discarded for cleaning (unless it produces a `water_intrusion` → that routes to `restoration`, not cleaning)
- `roof_permit`, `electrical_permit`, `plumbing_permit` (unless part of a full commercial buildout that implies final clean)

## 7 · Approved signal labels (Layer 2)
The ONLY signal labels the UI may render for this vertical. AI classifies into these; it must not invent others.

```
NEW BIZ
NEW LEASE
BUILDOUT
MOVE-IN
REVIEW
PROPERTY MGR
EVENT
HIRING
```

## 8 · Approved vertical-fit / service labels (Layer 3)
The ONLY service-fit labels the UI may render. This is the chip where Fetchi expresses the cleaning-specific service meaning.

```
NEW OFFICE          (new tenant/office needs recurring janitorial)
FINAL CLEAN         (post-construction / move-in ready)
MOVE-IN             (turnover cleaning)
CLEANLINESS REVIEW  (displacement from a "dirty" review)
EVENT VENUE         (setup/teardown / banquet cleaning)
RECURRING           (recurring contract via property manager)
FACILITY NEED       (growth/hiring implies facility service need)
RESTAURANT          (nightly back-of-house)
```

### Signal → fit mapping (the translation table)
| Raw signal | signal_label | vertical_fit_label |
|---|---|---|
| `new_business_registration` (office) | `NEW BIZ` | `NEW OFFICE` |
| `commercial_lease` (move-in) | `NEW LEASE` | `MOVE-IN` |
| `commercial_buildout_permit` | `BUILDOUT` | `FINAL CLEAN` |
| `review_complaint` (cleanliness) | `REVIEW` | `CLEANLINESS REVIEW` |
| `property_management_change` | `PROPERTY MGR` | `RECURRING` |
| `event_scheduled` (venue) | `EVENT` | `EVENT VENUE` |
| `business_expansion_hiring` (facility/office mgr) | `HIRING` | `FACILITY NEED` |
| `commercial_lease` (restaurant) | `NEW LEASE` | `RESTAURANT` |

---

## 9 · Evidence requirements
Per Product Law #1 (no lead without evidence). Each fit label states what public proof must exist before the card can show a confident score. Missing evidence → `missing_evidence` fallback (NOT a fabricated score).

| vertical_fit_label | required_evidence (min) | corroborating (optional) |
|---|---|---|
| `NEW OFFICE` | business registration record OR commercial lease record | business website / Google listing |
| `FINAL CLEAN` | commercial buildout permit record | GC name, project value |
| `MOVE-IN` | commercial lease record with move-in window | property listing |
| `CLEANLINESS REVIEW` | ≥2 dated public reviews mentioning cleanliness within window | business profile, review platform link |
| `RECURRING` | property-management change record (new PM of record) | portfolio size |
| `EVENT VENUE` | scheduled event record (public listing/permit) | venue capacity |
| `FACILITY NEED` | active job posting for facility/office manager | company size / location count |
| `RESTAURANT` | commercial lease OR food-service permit | listing / opening date |

Evidence types map to engine sources: SerpAPI = broad discovery; Firecrawl = enrichment after a URL/domain exists (per DECISIONS.md). Evidence must be a citable public artifact, never inferred prose.

## 10 · Disqualification rules
Conditions that force `discarded` (not shown as a ranked opportunity; visible in admin/audit only).

1. **Residential context** — single-family home, apartment unit, homeowner. Cleaning here is consumer, out of scope.
2. **No business/property context** — signal cannot be tied to a commercial entity or address.
3. **Weather/damage with no cleanup relevance** — hail/wind/roof signals route away; only `water_intrusion` → `restoration`, never cleaning.
4. **Wrong-trade buildout** — a buildout permit that is purely mechanical/electrical with no occupancy/final-clean implication.
5. **Out of service area** — target address outside the workspace market radius (Business Profile / Market Area).
6. **Already-a-customer** — target matches the workspace's uploaded customer/exclusion list.
7. **Stale beyond window** — signal older than the freshness cap for its type (see §11).

## 11 · Scoring weights / ranking logic
Score = `service_fit_score` (0–100) = *service-fit strength*, per the card taxonomy. **Score never decides card color.** It decides ranking, review priority, and eligibility vs. the sensitivity floor.

Weighted inputs (illustrative weights; tune via fixtures in §19):

| Factor | Weight | Notes |
|---|---|---|
| Signal-type base relevance | 0.30 | `BUILDOUT`/`NEW LEASE` high; `HIRING` lower |
| Evidence strength / corroboration | 0.25 | more confirmed evidence → higher |
| Freshness | 0.20 | newer = higher; decays over the type's window |
| Buyer fit (customer type match) | 0.15 | office/CRE/medical strong; edge types lower |
| Contract value proxy | 0.10 | sqft / multi-location / recurring potential |

Freshness windows by signal type (after which the lead expires → fallback or drop):
- `NEW BIZ` / `NEW LEASE` / `MOVE-IN`: 30 days
- `BUILDOUT`: 45 days
- `REVIEW` burst: 21 days
- `PROPERTY MGR` change: 60 days
- `EVENT`: until event date
- `HIRING`: 30 days

### Two-layer confidence model (do not conflate)

> **Workspace Signal Sensitivity is the user-facing control layered OVER playbook-specific and signal-type-specific evidence/confidence floors. It is NOT one blunt global threshold.**

There are two separate gates a candidate must clear:

1. **Playbook / signal-type floor** (`min_confidence_by_signal_type`) — set by THIS playbook, per signal type. Decides whether a candidate is even eligible to become a surfaced opportunity given its evidence. Noisier signal types demand more corroboration.
2. **Workspace sensitivity** — the user's Conservative/Balanced/Aggressive dial, applied on top. Tightens or loosens how much of the eligible pool gets *emphasized* in Today's Run / digest.

`min_confidence_by_signal_type` (provisional examples — tune via fixtures):
- `commercial_buildout_permit` — surfaces on standard permit evidence (permit record alone is strong).
- `commercial_lease` — needs lease/move-in evidence (a record with a move-in window).
- `review_complaint` — requires stronger corroboration: 2 dated reviews, OR one strong review plus another public signal.
- `business_expansion_hiring` — lower confidence unless tied to facility/office operations roles.
- `event_scheduled` — confidence depends on event date proximity, venue type, and whether cleaning scope is implied.
- `property_management_change` — moderate; a confirmed new PM of record, else `needs_review`.

**Sensitivity numbers — PROVISIONAL EXAMPLES, NOT APPROVED SETTINGS.** Conservative ~80 / Balanced ~70 / Aggressive ~60 are illustrative only. The Settings spec (Signal Sensitivity tab) is still being drafted by Replit and is the authority for final numbers. This playbook must not be read as locking those thresholds. Below the applicable floor → `weak_fit`.

## 12 · Fallback states
Uses the five approved states from `lead-card-taxonomy.md`. Must look intentional, never broken.

| state | Commercial-cleaning trigger |
|---|---|
| `needs_review` | signal maps to a cleaning fit, but evidence is thin (e.g. single review, unconfirmed lease) |
| `weak_fit` | mapped + evidenced, but `service_fit_score` below the workspace sensitivity floor |
| `missing_evidence` | label allowed but required public artifact not yet confirmed (e.g. lease implied but record not pulled) |
| `exploratory` | only if the workspace vertical is `Other` and is *guessing* cleaning relevance; never used for core cleaning workspaces |
| `discarded` | any §10 disqualification fired |

A fallback card never shows a confident score and never invents a label.

---

## 13 · Example opportunity cards
Design examples ONLY. Not agent proof (see §19 for proof).

### Urgent-action / coral rule (tightened)

> `opportunity_surface = urgent_action` (coral) requires evidence of an **action window** — a dated deadline the buyer is moving toward. Coral does NOT mean "good lead" or "high score."

Qualifying action-window evidence for cleaning:
- move-in date approaching
- final inspection / opening date
- event date
- lease start date
- bid / rebid window (e.g. PM contract renewal date)
- cleanliness complaint burst inside an active review window

No dated action window → the card is `default` (dark raised), regardless of how strong the fit score is.

**A · Urgent-action (coral) — buildout WITH dated move-in window**
```
status: New
signal_label: BUILDOUT · 3W
vertical_fit_label: FINAL CLEAN
biz: Lumen Coworking — Austin, TX
score: 84
opportunity_surface: urgent_action   → coral card, coralInk text
action_window: move_in_date 2026-06-22 (≈3 weeks out)   ← REQUIRED for coral
why_now: "Buildout permit + posted June 22 move-in — final clean must be booked before opening."
evidence: [commercial_buildout_permit, property_record, move_in_date]
```

**A2 · SAME buildout, NO dated window → default dark (not coral)**
```
status: New
signal_label: BUILDOUT · 3W
vertical_fit_label: FINAL CLEAN
biz: Northgate Office Park — Round Rock, TX
score: 84   (same score as A — color is NOT score-driven)
opportunity_surface: default   → dark card
action_window: none confirmed
why_now: "Buildout permit on file — final clean likely, but no move-in/opening date confirmed yet."
evidence: [commercial_buildout_permit]
```

**B · Default (dark raised) — new office, recurring**
```
status: New
signal_label: NEW BIZ · 6h
vertical_fit_label: NEW OFFICE
biz: Greater Round Rock Dental — Round Rock, TX
score: 81
opportunity_surface: default   → dark card
why_now: "New business filing + 4,200 sqft lease — recurring janitorial not yet contracted."
```

**C · Pipeline (dark + green stripe) — saved**
```
status: Saved
signal_label: PROPERTY MGR · 12D
vertical_fit_label: RECURRING
biz: Cedar Park Towers — Cedar Park, TX
score: 88   (high score, still dark — it's pipeline, not urgent_action)
opportunity_surface: pipeline
```

**D · needs_review fallback (dashed, honest)**
```
fallback_state: needs_review
signal_label: REVIEW · 5D
biz: Glenwood Bistro — Frisco, TX
score: —    (no confident score)
body: "A cleanliness review appeared, but Fetchi needs a second source before ranking this."
```

**E · discarded (admin/audit only)**
```
fallback_state: discarded
signal: weather_hail
biz: 14 Elm St (single-family) — Allen, TX
reason: "Residential + weather signal — not a commercial cleaning fit."
```

## 14 · Query templates
How the scout searches for cleaning-relevant signals. (SerpAPI broad discovery at launch; placeholders, not final strings.)

- `new commercial business {{market_city}} {{lookback}}` — new-biz/office discovery
- `commercial lease signed {{market_city}} office OR retail OR medical`
- `building permit commercial buildout {{market_city}} {{lookback}}`
- `{{market_city}} office OR clinic OR restaurant reviews "dirty" OR "not clean" OR "unsanitary"`
- `new property management company {{market_city}} commercial`
- `event venue {{market_city}} upcoming events {{lookback}}`
- `"facilities manager" OR "office manager" hiring {{market_city}}`

Each template tags candidate results with the `signal_type` it's hunting, for the classifier to label.

## 15 · Outreach templates
AI drafts; tone/structure constrained by playbook. Never sent automatically (Product Law #3: explanation → action, user controls send).

**Tone:** practical, facility-operator, no-fluff. References the actual signal as proof.

**Template · FINAL CLEAN (buildout)**
```
Subject: Post-construction clean for {{business_name}}'s new space

Hi {{contact_first}} — saw {{business_name}} pulled a buildout permit at {{address}}.
Before move-in you'll need a final/post-construction clean — we handle {{services}} for
commercial spaces around {{market_city}}. Happy to walk the site this week and quote it.
— {{user_name}}, {{user_company}}
```

**Template · NEW OFFICE (recurring)**
```
Subject: Nightly cleaning for {{business_name}}'s new office

Hi {{contact_first}} — congrats on the new space at {{address}}. We provide recurring
janitorial for offices like yours in {{market_city}}. Could put together a simple
per-night quote — want me to send one over?
```

**Template · CLEANLINESS REVIEW (displacement)**
```
Subject: Quick note on facility cleaning

Hi {{contact_first}} — noticed a couple recent reviews mentioning cleanliness at
{{business_name}}. We help {{customer_type}} stay ahead of that with reliable nightly
service. No hard sell — happy to do a walkthrough if useful.
```

## 16 · Contact-route priorities
Ranked roles to target, best-first. Drives the "Best contact" module + confidence.

1. Facilities / Operations Manager
2. Building Manager / Property Operations (multi-tenant CRE buildings)
3. Office Manager / Office Administrator
4. Property Manager (for multi-tenant CRE)
5. Regional Operations Manager (multi-location businesses — chains, clinics, gyms)
6. Franchise / Operator contact (restaurants, gyms, franchised locations)
7. Owner / GM (small single-location businesses)
8. Procurement / Purchasing (larger orgs)

Confidence rules: a named role with a verified public email/phone = high; a generic info@ = medium; unnamed = low (often `needs_review`).

## 17 · Sensitivity settings implications
How the global Signal Sensitivity tab interacts with this playbook.

> **All recommendations in this section are recommended playbook INPUT for the Settings spec — not implementation-approved defaults.** The Signal Sensitivity tab spec (being drafted by Replit) is the authority. This section tells that spec what cleaning *would prefer*; it does not set product defaults.

- The 7 global signal categories map to this playbook's consumed types:
  - **Permits** → `commercial_buildout_permit`
  - **New businesses** → `new_business_registration`, `commercial_lease`
  - **Reviews & complaints** → `review_complaint`
  - **Property & tenant changes** → `property_management_change`, `tenant_move_in`
  - **Events** → `event_scheduled`
  - **Hiring signals** → `business_expansion_hiring`
  - **Weather & damage events** → mostly NOT consumed (discarded for cleaning)
- The workspace dial does NOT set a single blunt score floor — it layers on top of the per-signal-type `min_confidence_by_signal_type` floors (see §11). Below the applicable floor → `weak_fit`.
- Recommended default-on for cleaning: New businesses, Permits, Property/tenant. Recommended default-off: Weather (irrelevant), Hiring (noisier), Events (situational). *(Recommendation only — Settings spec decides.)*
- Turning off all consumed categories = empty product; enforce the "at least one signal on" guard.

## 17b · One signal → many opportunities (PM-approved direction)

**Approved direction:** One raw signal can generate different opportunities across different workspaces/playbooks. That is core Fetchi behavior — the same renovation permit means `FINAL CLEAN` to a cleaner and `PERMIT · ROOF` to a roofer.

**V1 guardrails:**
- One raw signal may create **one surfaced opportunity per workspace/playbook fit**.
- Do **not** double-count or double-charge the same workspace multiple times for the same raw signal (unless multi-service workspaces are explicitly supported later).
- If a workspace serves multiple services, choose the **strongest playbook match** as the primary opportunity; treat secondary matches as related context or later-roadmap, not separate billed opportunities.
- **Billing / credits attach to surfaced opportunities, not raw signals.**
- The same raw signal **can** count separately for different customers/workspaces — opportunity *meaning* differs per business, so it's a distinct opportunity for each.

This is the cross-cutting rule every other playbook inherits. It is not cleaning-specific; it lives here as the worked example but governs the registry.

## 18 · Admin / config fields needed later
For the eventual registry (config or DB). Spec-only — no schema approved here.

```
vertical_key, vertical_name, public_status, playbook_version, active
supported_signal_types[]
approved_signal_labels[]
approved_fit_labels[]
signal_to_fit_map{}            // §8 table
evidence_requirements{}        // per fit label
disqualification_rules[]
scoring_weights{}              // §11
freshness_windows{}           // per signal type
query_templates[]
outreach_templates[]           // keyed by fit label
contact_route_priorities[]
example_cards[]                // design seeds
fallback_state_rules{}
icon_glyph_map{}               // fit label → abstract glyph (no vertical clipart)
```

## 19 · Fixture / test examples needed to prove behavior
Per DECISIONS.md and the taxonomy doc: **the playbook is not "supported" until fixtures pass.** Design boards are not proof. Each fixture feeds a structured raw signal + workspace profile through the playbook and asserts approved outputs.

Minimum fixtures for `commercial_cleaning_v1`:

1. **Buildout + dated move-in/opening window → FINAL CLEAN urgent_action:** input `commercial_buildout_permit` + cleaning workspace + confirmed move-in/opening/final-inspection date inside threshold → assert `signal_label=BUILDOUT`, `fit_label=FINAL CLEAN`, score ≥ floor, `opportunity_surface=urgent_action`, no freestyle label. (No dated window → `default`; see fixture #11.)
2. **New lease → MOVE-IN:** assert correct labels + `default` surface + evidence list includes lease record.
3. **Review burst → CLEANLINESS REVIEW:** 2 dated reviews → confident; 1 review only → `needs_review`.
4. **Cross-vertical isolation:** input `weather_hail` to cleaning workspace → assert `discarded`, never a cleaning label.
5. **Same signal, two verticals:** one `commercial_buildout_permit` → cleaning yields `BUILDOUT·FINAL CLEAN`; roofing yields `PERMIT·ROOF`. Proves engine translation.
6. **Missing evidence:** lease implied but record not pulled → `missing_evidence`, score `—`.
7. **Below floor:** valid fit, score 64, Balanced floor 70 → `weak_fit`.
8. **Disqualify residential:** single-family address → `discarded`.
9. **Surface ≠ score:** saved lead, score 88 → `pipeline` (dark), NOT coral. Proves color isn't score-derived.
10. **No freestyle:** force an ambiguous signal; assert output label ∈ approved set or a fallback — never a novel string.
11. **Action-window drives coral (not score):** same `commercial_buildout_permit` at score 84, run twice — (a) WITH a dated move-in/opening window inside threshold → `opportunity_surface=urgent_action` (coral); (b) WITHOUT any dated window → `opportunity_surface=default` (dark). Asserts coral is driven by action window, never by score.

## 20 · Open questions

**Resolved (kept here as implementation notes):**
- **One signal → many opportunities:** RESOLVED direction (see §17b) — one raw signal may create different opportunities across different workspaces/playbooks. Remaining implementation work: dedupe, workspace-level primary-match selection, and credit attribution rules.
- **Per-vertical floor override:** RESOLVED in §11 (`min_confidence_by_signal_type`) — per-signal-type floors are part of the playbook model; the workspace dial layers on top. (Final numbers pending the Settings spec.)

**Still open:**
1. **Restaurant nightly vs. one-time:** `RESTAURANT` fit can be recurring (nightly) or one-time (opening clean). Do we need two fit labels, or one with context in `why_now`?
2. **Review-burst threshold:** is 2 dated reviews the right confident bar, or does it vary by business size/volume?
3. **Property-manager change:** does a new PM reliably re-bid janitorial, or is this too speculative for `RECURRING` at confident score (vs. always `needs_review`)?
4. **Event venue ownership:** events overlap with the subscriber being the venue vs. servicing the venue — confirm we target the venue operator, not the event host.
5. **Icon/glyph set:** the taxonomy bans vertical clipart. Confirm the abstract fit-label glyph set (shared across verticals) covers cleaning's fit labels without a bucket/mop icon.
6. **Action-window detection coverage:** how reliably can we extract a dated move-in/opening/event/lease-start from public sources? If detection is weak, most cleaning leads default to dark (non-urgent) — acceptable for honesty, but confirm the coral rate won't be near-zero at launch.
7. **Multi-service workspaces (post-V1):** §17b defers these. When a single workspace genuinely sells two services (e.g. cleaning + restoration), do secondary matches eventually become separately billable, and how does the picker present them?
