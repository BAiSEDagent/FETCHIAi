# Commercial Roofing — Vertical Playbook v1

> **Status:** CP15 playbook contract — v1.0 product/spec source of truth.
> **Scope:** Product-spec proof only. This is not runtime proof and does not prove the agent, search, scoring, provider, or classifier works.
> **Conforms to:** `docs/product/vertical-playbook-registry.md` · `docs/design/lead-card-taxonomy.md`
> **Proof rule:** Vertical behavior is proven by deterministic contracts/smokes and later fixtures, never by this doc alone.

---

## Playbook Identity

| Field | Value |
|---|---|
| vertical id | `commercial_roofing` |
| display name | Commercial Roofing |
| status | active |
| version | 1.0 |
| launch-supported | true |
| launch status | core-supported launch vertical |
| target customer | Local/regional commercial roofing contractors |
| playbook file | `docs/product/playbooks/commercial-roofing.md` |

---

## Positioning

### What this vertical sells

Commercial roof replacement, roof repair, flat/low-slope roof work, membrane systems, metal roof work, coatings, roof maintenance, storm inspection, insurance/restoration support, and drainage/gutter work for commercial and institutional assets.

### Who Buys

- Property managers
- Building owners
- Facility managers
- HOAs / condo associations
- Retail centers
- Warehouses / industrial facilities
- Schools
- Hospitals / medical campuses
- Hotels / hospitality
- Restaurants / franchises
- Churches / nonprofits
- Government / municipal buildings
- Multi-location businesses

Out of scope as customers: single-family homeowners, residential-only leads, roofing contractors treated as buyers, and generic directories with no commercial asset/account evidence.

---

## Prospect Pool Vs Opportunity

Fetchi product law applies:

- No prospect without evidence.
- No opportunity without signal.
- No score without reason.
- No explanation without action.

### Prospect Pool Minimum Bar

A Commercial Roofing Prospect Pool record requires all of:

- Verified commercial asset/account.
- Source-linked fit evidence.
- Service-area fit.
- Plausible contact route.

Portfolio pages, company websites, assessor records, property manager pages, and multi-location directories usually prove fit only. They are useful buyer-account worklist evidence, not urgency evidence.

### Opportunity Minimum Bar

A Commercial Roofing Opportunity requires:

- Prospect Pool bar.
- Fresh source-linked roofing signal tied to that asset/account.

Roof permits, public bids/RFPs, board agendas, capital projects, dated leak reports, code notices, restoration notices, or corroborated storm-related records can support Opportunity status when they are source-linked, fresh, and tied to a specific commercial asset/account.

Weather/storm exposure may support Signal Watch or watchlist context. Weather alone must not claim roof damage, insurance eligibility, or active buying intent.

Permit holder, applicant, contractor, or general contractor is context, not automatically the buyer. Public procurement buyers must route through the published procurement path.

---

## Approved UI-Visible Labels

The UI may only render labels from these approved lists. The classifier must not invent labels. If a signal cannot be mapped to an approved label with enough evidence, it must use an approved fallback state.

### Signal Labels

Signal labels use short stable uppercase labels.

| Label | Allowed when | Required evidence | Blocked when |
|---|---|---|---|
| `REROOF PERMIT` | An official permit names reroof, re-cover, tear-off, or replacement. | Permit address, status/date, scope, and commercial asset tie. | Permit is missing, closed/stale with no fresh follow-on, residential-only, or unrelated. |
| `ROOF REPAIR PERMIT` | An official permit names roof repair. | Permit record with roof-repair scope tied to a commercial address. | General building permit has no roof scope. |
| `PUBLIC BID` | Active procurement, RFP, IFB, or public solicitation names roof work. | Open/recent public notice, due date or active window, scope, and contact/procurement path. | Closed, awarded, stale, or consultant-only with no roofing purchase. |
| `CAPITAL IMPROVEMENT` | A capital plan, board packet, bond item, budget line, or agenda explicitly names roof work. | Public plan, agenda, minutes, budget, or board material tied to a named facility. | Out-year planning has no action status or roof reference. |
| `STORM EXPOSURE` | Fresh hail, wind, tornado, hurricane, or declared-disaster exposure is tied to a commercial asset area. | Official storm/weather source plus date/severity and asset/geography match. | Weather is broad, stale, unlinked to an asset, or phrased as damage certainty. |
| `LEAK REPORTED` | A public source references a roof leak or water intrusion at an identifiable property. | Dated review, complaint, service notice, code record, agenda, or public document tied to the property. | Generic water issue has no roof/property tie or no date. |
| `TENANT IMPROVEMENT` | TI/buildout activity may touch roof systems. | TI permit or buildout source; roof-adjacent scope required for opportunity use. | Interior-only TI has no rooftop units, penetrations, parapet, canopy, solar, roof access, or roof scope. |
| `OWNERSHIP CHANGE` | Fresh public record shows a commercial asset changed hands. | Deed, assessor update, transaction record, or credible announcement tied to the property. | Old transaction, name fragment only, or no asset tie. |
| `MANAGER CHANGE` | New PM/facilities leadership or management assignment is tied to a relevant asset/portfolio. | Public role, assignment, portfolio, or management announcement. | Generic personnel move has no property/portfolio relevance. |
| `CODE NOTICE` | Official notice references roof, leak, water intrusion, exterior envelope, or drainage issue. | Code-enforcement notice/complaint with date and property tie. | Generic property-maintenance issue has no roof/water relevance. |
| `RESTORATION` | Public source references storm recovery, restoration, claim-adjacent scope, or repair recovery work. | RFP, owner notice, restoration solicitation, or project document tied to the asset. | Weather exposure alone or restoration-vendor marketing with no owner action. |

### Vertical-Fit / Service Meaning Labels

Vertical-fit labels use title case and explain what the signal means for the roofing user.

| Label | Allowed when | Required evidence | Blocked when |
|---|---|---|---|
| `Commercial Roof` | Property is clearly commercial/institutional and roofing is plausible. | Assessor, company site, PM portfolio, permit, or public record proving commercial use. | Residential-only or ambiguous use. |
| `Roof Replacement` | Source points to replacement, reroof, tear-off, or re-cover. | Permit, bid, agenda, project, or public scope language. | No replacement wording. |
| `Roof Repair` | Source points to repair rather than full replacement. | Repair wording, leak complaint, code notice, repair bid, or permit. | Source only says roofing generically. |
| `Flat Roof` | Source says flat/low-slope or verified asset context strongly supports it. | Permit/spec/project text, verified photo/manual review, or source-linked roof-form evidence. | Inferred from building type with no reviewable support. |
| `Membrane Roof` | Source names membrane or single-ply work. | Bid/spec/permit/project wording. | Inferred from asset type only. |
| `TPO` | Source explicitly names TPO. | Permit, bid, spec, or project notes naming TPO. | No explicit TPO evidence. |
| `EPDM` | Source explicitly names EPDM. | Permit, bid, spec, or project notes naming EPDM. | No explicit EPDM evidence. |
| `PVC` | Source explicitly names PVC. | Permit, bid, spec, or project notes naming PVC. | No explicit PVC evidence. |
| `Metal Roof` | Source explicitly names metal or panel roof work. | Permit, bid, spec, or project language tied to the asset. | Inferred from industrial use alone. |
| `Roof Coating` | Coating, restoration coating, reflective/cool-roof, or life-extension scope is named. | Bid/spec/project text naming coating/restoration. | Energy interest only, with no roof coating source. |
| `Roof Maintenance` | Account fits recurring maintenance/inspection work. | Portfolio/facilities responsibility plus maintenance-oriented context. | One-off event has no maintenance relevance. |
| `Property Portfolio` | Buyer controls or manages multiple relevant assets. | Portfolio page, location directory, PM evidence, owner evidence, or reserve/planning evidence. | Single property with no portfolio evidence. |
| `Facility Roof` | Account is operationally responsible for a facility, campus, or portfolio. | Facilities function, campus responsibility, or operations role evidenced publicly. | No operational-responsibility evidence. |
| `Storm Inspection` | Storm exposure creates a safe inspection/watchlist angle. | Official storm source, date/severity, asset match, and commercial fit. | Phrased as confirmed damage without corroboration. |
| `Insurance Restoration` | Public source explicitly ties work to restoration/recovery/claim-adjacent activity. | RFP, owner notice, project document, or public restoration scope. | Weather exposure alone. |
| `Drainage / Gutters` | Scope references drainage, gutter, ponding, overflow, edge/perimeter, or related roof-water control. | Permit, bid, complaint, inspection note, or project document. | Generic exterior maintenance with no roof-water tie. |

### Fallback States

Use only the approved fallback states from `docs/design/lead-card-taxonomy.md`:

| State | Commercial Roofing trigger |
|---|---|
| `needs_review` | Evidence exists but is incomplete, conflicting, weakly tied to the asset, or contact route confidence is poor/generic. |
| `weak_fit` | Commercial fit exists but roofing relevance or route quality is too weak for confident ranking. |
| `missing_evidence` | Candidate lacks source-linked proof for a required claim. |
| `exploratory` | Fit or signal is plausible but not yet qualified; safe for research/watchlist only. |
| `discarded` | Hard mismatch such as residential-only, wrong entity, no evidence, stale/irrelevant signal, or outside service area. |

Do not introduce `No Contact Route` as a fallback state. Missing or poor routes are contact-route confidence conditions that can cause `needs_review`, `weak_fit`, or exclusion from export.

---

## Supported Public Signals

| Signal | What it means | Where to find it | Freshness window | Opportunity strength | Common false positives | Required evidence | Blocked claims |
|---|---|---|---|---|---|---|---|
| Reroof / roofing permits | Official work intent for roof replacement, re-cover, tear-off, or roof system work. | City/county permit portals, commercial reroof applications, permit search pages. | Strongest 0-90 days, especially before final/closeout. | Very high when active and asset-tied. | Closed permit, already completed work, residential permit, contractor-only record. | Address, status/date, roof scope, commercial asset tie, source URL/record ID. | "Buyer has not chosen a roofer", "permit holder is buyer", damage certainty. |
| Commercial building permits with explicit roof scope | Broader commercial permit includes roof assembly, rooftop equipment, penetrations, parapet, canopy, solar, or roof replacement scope. | Building permit portals and project records. | 0-90 days. | High when roof is explicit. | Interior remodel with no roof work. | Permit text naming roof-related work. | Urgency from generic construction alone. |
| Tenant improvement with roof-adjacent scope | TI/buildout may create roof work around rooftop units, penetrations, roof access, canopies, parapets, solar, or equipment screening. | Permit portals, plan notes, project pages. | 0-60 days for opportunity; 0-180 days as context. | Medium; high only with explicit roof scope. | Interior-only TI. | TI record plus explicit roof-adjacent scope. | "This TI needs roof work" without scope evidence. |
| Active public bid / RFP / procurement | Buyer is openly soliciting roofing services or roof-related design/construction. | SAM.gov, state/county/district procurement, public bid systems. | Open solicitation through due date; short recent active window after close for follow-up only. | Very high. | Closed/awarded bids, consultant-only RFPs, stale notices. | Active notice, due date, public contact, scope, procurement path. | "We can bypass procurement", "budget is ours", "award is open" unless sourced. |
| Capital improvement / board agenda | Public body or institution is planning, funding, approving, or discussing roof work. | Board agendas, minutes, capital improvement plans, bond docs, budget packets. | 0-180 days around action status; out-year plans are context only. | High when roof is named and funded/actioned. | Concept memo, out-year plan, no approval. | Roof-specific item tied to facility and public action status. | "Budget is allocated" unless source says it. |
| Storm/hail/wind exposure | Fresh weather event near an asset creates inspection/watchlist context. | NOAA SPC daily reports, NOAA Storm Events archive, FEMA declarations, official weather sources. | Same day to 14 days for watchlist context; validated archive can lag 75-90 days. | Medium support; high only with asset match and corroboration. | County-level match, preliminary report, stale historical storm, no asset tie. | Official event source, date/severity, asset geocode/service area, commercial fit. | "Your roof is damaged", "insurance will cover this", "claim is approved". |
| Leak complaint / review / water intrusion | Public issue indicates roof/water-intrusion pain. | Google reviews, public complaint portals, tenant-facing reviews, code/service requests. | 0-90 days; 0-180 days if official/code-backed. | Medium to high if property-specific and repeated/corroborated. | Anonymous noise, plumbing issue, wrong business/location. | Identifiable property plus dated leak/water text, ideally second source. | Diagnosis or damage certainty beyond source text. |
| Insurance/restoration signal | Public evidence owner is acting on storm recovery or restoration. | RFPs, owner notices, restoration solicitations, public project docs. | 0-60 days. | High when owner action is explicit. | Weather only, vendor marketing, no owner action. | Source referencing restoration/recovery/claim-adjacent work for the asset. | Insurance approval, coverage certainty, claim outcome. |
| Code violation referencing roof/water intrusion | Official maintenance/code pressure can trigger repair. | City code enforcement, complaint systems, public notices. | 0-180 days. | Medium. | Generic maintenance issue unrelated to roof. | Notice/complaint with roof or water-intrusion relevance. | Legal conclusion beyond public notice. |
| Ownership change | New ownership may trigger due diligence, capex reset, lender work, or vendor review. | County clerk/recorder, assessor updates, transaction announcements. | 0-180 days. | Medium for prospecting; low by itself for urgency. | Long-term hold buyer, no roof context, old deal. | Recorded ownership change tied to commercial property. | Immediate roof need from ownership alone. |
| Property manager change | New PM or facilities leadership can open vendor review. | PM announcements, people pages, portfolio pages, news, job postings. | 0-120 days. | Medium for Prospect Pool; low-to-medium for opportunity only with roof context. | Personnel move with no asset tie. | Role/assignment tied to asset, portfolio, or geography. | Authority or spend approval unless sourced. |
| Facility manager hiring | Active facilities role reveals operations function and sometimes backlog/transition. | Company job pages, ATS, LinkedIn/company jobs. | 0-90 days. | Low-to-medium. | Routine backfill, unrelated location, non-roof role. | Active posting tied to relevant site/city/portfolio. | Current roof problem unless stated. |
| Building age / permit-history gap | Older assets with no visible reroof record are good fits but not urgent. | Assessor year-built data plus permit-history search. | Stable fit evidence, not urgency. | Medium fit, low urgency. | Incomplete permit history, private reroof, missing jurisdiction data. | Year-built or age evidence plus searched permit history. | "Overdue", "unsafe", or "needs replacement now" without signal. |

---

## Freshness Table

Freshness is per signal, not global.

| Signal family | Suggested window | Use |
|---|---|---|
| Storm exposure | Same day to 14 days for watchlist context; validated archive may lag 75-90 days | Signal Watch or opportunity support only when asset-matched; never damage certainty alone. |
| Reroof / roof repair permits | Strongest 0-90 days, especially before final/closeout | Opportunity when commercial asset and roof scope are explicit. |
| Commercial permit with roof scope | 0-90 days | Opportunity when roof scope is explicit. |
| Tenant improvement roof-adjacent scope | 0-60 days for opportunity; up to 180 days for context | Needs explicit roof-adjacent scope. |
| Public bids/RFPs | Open solicitation through due date; short recent active window after close | Strong opportunity through procurement path. |
| Agendas/capital improvement | 0-180 days depending on action status; out-year plans as context | Opportunity when roof-specific and actioned/funded. |
| Leak reports/code notices | 0-90 days for reviews/complaints; 0-180 days for official/code records | Opportunity support when property-specific and source-linked. |
| Insurance/restoration | 0-60 days | Opportunity only when owner/public source references restoration/recovery work. |
| Ownership/manager change | 0-180 days for ownership; 0-120 days for PM change | Fit/vendor-review context unless paired with roof signal. |
| Facility manager hiring | 0-90 days | Outreach-readiness/context signal, not urgency alone. |
| Portfolio evidence | Stable fit evidence | Prospect Pool only unless a fresh asset-specific signal exists. |

---

## Evidence Source Rules

| Source group | What it can prove | What it cannot prove | Supports | Example query templates | Safety note |
|---|---|---|---|---|---|
| Search/discovery | Existence, business identity, property name, location, public descriptions. | Roof condition or urgency by itself. | Mostly Prospect Pool. | `"[company]" facilities`, `"[address]" commercial property`, `site:[domain] [city] [property]` | Discovery snippets are not evidence unless source content is checked. |
| Permit sources | Official work intent, status, scope, address, valuation, owner/contractor/applicant fields, system details. | Whether job is unwon or whether applicant/contractor is buyer. | Opportunity when roof scope is explicit. | `site:[city portal] reroof [address]`, `"roof replacement" permit [city]`, `"commercial reroof" [county]` | Permit holder/applicant/contractor is context, not automatically buyer. |
| Municipal/county records | Ownership, parcel data, deeds, assessor use, public agendas, capital plans, code notices. | Current roof condition without signal. | Prospect Pool; Opportunity when agenda/CIP/code notice names roof/water work. | `site:.gov assessor parcel [address]`, `"roof replacement" site:.gov agenda`, `site:.gov code roof leak [city]` | Do not infer beneficial ownership from name fragments. |
| Procurement/RFP | Active buying intent, project scope, due dates, contacts, funding path. | Whether direct outreach outside procurement is appropriate. | Strong Opportunity. | `site:sam.gov roof replacement`, `site:.gov "roof repair" bid`, `site:.gov procurement roof` | Public-sector buyers route through the published procurement path. |
| Weather/storm | Storm exposure, severity, storm type, date, geography, historical pattern. | Parcel-level damage certainty, insurability, or claim outcome. | Signal Watch; Opportunity support only when asset-matched and safe. | `NOAA SPC storm reports [date]`, `NOAA Storm Events [county] hail`, `FEMA disaster declarations [state]` | Weather alone cannot claim roof damage. |
| Commercial real estate/property | Asset type, ownership, management assignment, portfolio context. | Roof condition or urgency. | Mostly Prospect Pool; Opportunity support when a fresh transaction/assignment is paired with roof context. | `"[portfolio manager]" retail portfolio`, `"[owner]" acquired "[property]"`, `"[property]" leasing brochure` | Transaction context is not roof proof. |
| Company websites | Buyer fit, location count, facilities/construction roles, contact forms, service area. | Actual roof problems unless stated. | Prospect Pool. | `site:[company] facilities`, `site:[company] locations`, `site:[company] contact` | Use as route/fit evidence, not urgency evidence. |
| Property manager portfolio pages | Managed asset classes, geography, portfolio size, role titles, contact info. | Whether any asset currently needs roof work. | Prospect Pool. | `site:[pm domain] portfolio retail`, `site:[pm domain] industrial property management` | Strong PM fit proof; no urgency without asset signal. |
| Google Business/reviews | Public reviews, visible complaints, location legitimacy, main phone. | Technical diagnosis or claimability. | Prospect Pool plus weak-to-medium signal support. | `"[property]" google reviews leak`, `"[business]" maps reviews roof`, `"[hotel]" "water intrusion"` | Reviews show public reports, not root cause. |
| News/job postings/public announcements | Hiring, management changes, expansions, board actions, fundraising, project timing, contact names. | Actual roof need unless text says so. | Mixed; strong context and watchlist input. | `"[company]" "facilities manager"`, `"[district]" "roof replacement"`, `"[church]" "raise the roof"` | Do not upgrade announcements into opportunities without roof-specific evidence. |

---

## Scoring Factors

This playbook does not implement scoring runtime. It defines factor families and evidence rules only.

Score reasons must be source-readable. A reason should look like "active reroof permit", "commercial warehouse", "hail report within market this week", or "named facilities contact found", not "AI thinks this is hot".

Score does not determine surface color. Coral/urgent-action surface requires urgent-action evidence, not a score.

### Prospect Fit

| Factor | Reason | Positive signals | Negative/disqualifying signals | Required evidence |
|---|---|---|---|---|
| Commercial use confirmed | Prevents residential drift. | Office, retail, industrial, school, hospital, hotel, municipal, association, nonprofit campus. | Residential-only, ambiguous building type, apartment unit with no common-element buyer. | Assessor, PM/site page, permit, company site, or public record. |
| Target asset type | Aligns with local/regional commercial roofer ICP. | Warehouse, retail center, office, school, healthcare, HOA, hospitality, government. | Tiny residential-style asset, land-only record, unrelated business. | Asset-type evidence. |
| Buyer control over asset | Separates influencer/context from approver. | Owner, PM, HOA/community manager, facilities lead, procurement authority. | Contractor mistaken as buyer, generic directory listing only. | Public ownership, management, role, or procurement tie. |
| Roof relevance | Increases likelihood of meaningful work. | Low-slope, membrane, roof system, large roof area, repeated maintenance context. | No roof-linked context. | Permit/spec/source language or verified asset context. |
| Service-area fit | Keeps records usable. | Property in configured market/service radius. | Outside footprint or missing location. | Address/geography match. |
| Evidence quality | Strong sources deserve more confidence. | Official permit, procurement, county record, company people page. | Unlinked AI inference, scraped directory only. | Direct source link or named public record. |
| Portfolio value | Multi-site accounts can produce repeat work. | PM portfolio, location directory, owner portfolio, reserve/planning evidence. | Single site with weak economics and no fit evidence. | Public portfolio evidence. |

### Opportunity Urgency

| Factor | Reason | Positive signals | Negative/disqualifying signals | Required evidence |
|---|---|---|---|---|
| Explicit roof scope | Best indicator of near-term buying. | Reroof permit, roof repair permit, roof replacement agenda, roof bid. | General construction with no roof mention. | Official scope text. |
| Storm recency/severity | Legitimate inspection trigger. | Fresh hail/wind/tornado/hurricane reports near asset. | Old event, broad county-only match, no commercial asset tie. | Weather timestamp/severity and asset tie. |
| Publicly reported failure | Indicates real pain. | Leak complaint, occupied-space water issue, code notice. | Single vague review, wrong property, no roof/water language. | Public text linked to property. |
| Funding/procurement stage | Buying motion is already underway. | Appropriation, active RFP/IFB, public due date. | Concept memo only, stale/awarded bid. | Public funding or bid source. |
| Transition event with asset risk | Ownership/PM changes can open vendor review. | New owner/PM/FM plus deferred-maintenance context. | Personnel move with no asset tie. | Fresh public transition evidence. |

### Outreach Readiness

| Factor | Reason | Positive signals | Negative/disqualifying signals | Required evidence |
|---|---|---|---|---|
| Named role found | Makes outreach targeted. | Facilities manager, property manager, procurement contact, board/community manager. | Unsourced contact identity. | Public bio, bid page, directory, role listing, or source-linked route. |
| Practical channel found | Needed for export and action. | Direct phone/email, contact form, office line, procurement contact. | No reachable route or route is generic/poor. | Public channel evidence. |
| Safe explanation available | Lets Fetchi explain "why now" without overclaiming. | Permit, public bid, agenda, storm exposure, leak source. | Heuristic score with no source. | Source-linked signal reason. |
| Procurement appropriateness | Prevents bad public-buyer outreach. | Named purchasing route, bid contact, permitted vendor path. | Attempts to bypass active procurement. | Public solicitation/contact evidence. |

---

## Disqualification / Downgrade Rules

| Rule | Action | Reason |
|---|---|---|
| Residential-only signal or asset | `discarded` | Outside commercial roofing playbook scope. |
| Unclear building type | `needs_review` | Could be commercial, but evidence is incomplete. |
| No source-linked evidence | `discarded` or `missing_evidence` | Violates no prospect without evidence. |
| Old/closed/final permit with no fresh follow-on | Downgrade | Useful history, weak current opportunity. |
| Expired/irrelevant permit | `discarded` or downgrade | Scope no longer supports current buying. |
| Roofing contractor mistaken as buyer | `discarded` | Seller/context entity is not target buyer. |
| Generic directory listing only | `discarded` or `needs_review` | Directory presence does not prove fit or need. |
| Unsupported urgency from weather only | Downgrade to watchlist/context | Weather is a trigger, not damage proof. |
| Missing location or asset identity | `needs_review` | Cannot match service area or evidence. |
| Poor/generic contact route | `needs_review` or not export-ready | Route quality is too weak for action/export. |
| No commercial fit | `discarded` | Out of vertical. |
| Outside service area | `discarded` or filtered | Operationally unusable. |
| TI permit with no roof-adjacent scope | `needs_review` | Good context, weak roofing implication. |
| Public bid already awarded/stale | Downgrade or `discarded` | Buying window likely closed. |
| Permit pulled by contractor with no owner/asset tie | `needs_review` | Useful context, but buyer is not proven. |

---

## Contact Route Rules

| Route | How to identify it | Confidence | Evidence needed | What not to claim |
|---|---|---|---|---|
| Facility manager | Job postings, facilities pages, campus directories, company people pages, public service portals. | High when role is named at site/portfolio level. | Role title plus property, city, or portfolio tie. | Do not imply they approve all capex unless sourced. |
| Property manager | PM portfolio page, employee bio, leasing brochure, associated office, market-leader page. | High for managed portfolios. | Named PM role tied to asset/geography. | Do not assume PM owns the asset. |
| Owner/operator | Assessor, deed record, company owned-property page, location page. | High for private owner-operators; medium for LLC layers. | Ownership record or company-site tie. | Do not claim direct authority through unresolved LLC layers. |
| General contractor context | Permit applicant, contractor listed on permit, public bid document, design/build page. | Medium. | Permit/bid document naming GC. | Do not treat GC as buyer unless project context says so. |
| Asset manager | CRE/PM people pages, portfolio management pages, investor/ownership pages. | Medium to high. | Role title plus portfolio/property tie. | Do not assume onsite knowledge of roof condition. |
| HOA board / community manager | Association site, management-company page, reserve-study or board materials. | Medium to high. | Named community manager, board office, or management office. | Do not state HOA responsibility for every roof unless docs/context support it. |
| Procurement contact | RFP/IFB page, county/state procurement office, school purchasing page. | Very high for public-sector opportunities. | Named public contact plus active/recent solicitation. | Do not encourage bypassing public process. |
| Permit applicant/contractor context | Permit form, portal, attachment, plan set. | Medium. | Address plus applicant/contractor fields. | Do not assume applicant equals asset owner or decision-maker. |
| Company contact form | Official site contact, facilities request page, property office form. | Medium. | Verified official domain. | Do not use generic form for public bid if procurement contact exists. |
| Main office phone | Official site, PM office page, Google Business, campus directory. | Medium. | Verified public phone number. | Do not imply prior relationship or insider knowledge. |
| LinkedIn/company page | Official company page or employee profile with role match. | Medium. | Identity tie to company and role. | Do not claim responsibilities beyond public source. |

Rules:

- Permit contractor/applicant is not automatically the buyer.
- Procurement contact should be used for public-sector opportunities.
- Do not fabricate named contacts.
- Do not claim authority unless sourced.

---

## Suggested Actions

These are action chips/run starters, not generic prompts.

| Suggested action | Best surface | Required inputs | Expected output | Guardrails |
|---|---|---|---|---|
| Find recent reroof permits near this market | Chat, Today, Watchlist | Geography, service radius, permit keywords | Official commercial reroof permits with address, date, status, scope | Exclude residential; do not infer buyer from contractor-only record. |
| Find commercial buildings hit by hail this week | Chat, Today, Watchlist | Geography, date window, hail/wind threshold | Asset-matched storm exposure watchlist with date/type and commercial fit | Weather alone cannot create damage-certainty language. |
| Show property managers with flat-roof portfolios | Prospect Pool, Chat | Market, asset types, PM/portfolio terms | Exportable fit list with labels and reasons | Fit-only unless specific property signal exists. |
| Find schools or municipalities with roof agenda items | Chat, Today, Watchlist | State/metro, date window, agenda/procurement terms | Public agenda items, appropriations, roof-focused board actions | Route through procurement/public meeting path where applicable. |
| Find tenant-improvement projects that may touch the roof | Prospect Pool, Chat | Geography, permit categories, rooftop scope terms | TI list filtered to rooftop units, penetrations, canopies, parapets, solar | Interior-only TI stays `needs_review` or Prospect Pool context. |
| Explain why this is a roof-fit prospect | Lead Detail | Record ID/evidence | Source-linked fit reasons separating fit from urgency | Must cite source; no urgency upgrade without signal. |
| Find contact route for this property manager or facility account | Lead Detail | Entity name, address, source evidence | Best found route with confidence and reason | Do not fabricate named contacts. |
| Compare fit versus urgency for this record | Lead Detail | Record evidence | Structured Prospect Fit, Opportunity Urgency, Outreach Readiness reasons | No numeric score without visible reasons. |
| Export roof-fit prospects for review | Prospect Pool | Filters, confidence threshold, service area | CSV-ready reviewed fit list with labels/reasons | Drop missing evidence and poor route unless user chooses review queue. |
| Draft first outreach for this public-bid or permit-backed record | Lead Detail, Chat | Record evidence, route type, blocked claims | Evidence-based first-touch outline | Block unsupported damage, insurance, code, procurement, and urgency claims. |

---

## Outreach Safety

Do not write aggressive spam. Outreach must use public evidence to establish relevance, not certainty.

| Outreach angle | Evidence it may reference | Safe claim | Blocked claim | Best next action |
|---|---|---|---|---|
| Prospect outreach | Portfolio page, facilities role, ownership record, commercial fit. | "You manage or operate properties in this market and we work on commercial roofs like these." | "You need roof replacement now." | Offer inspection baseline, maintenance review, or portfolio audit. |
| Signal-backed opportunity outreach | Reroof permit, public bid, board agenda, fresh storm exposure, public leak report. | "I noticed a recent public record related to roof work or storm exposure at this property." | "Your roof is definitely damaged" or "we saw your claim." | Offer scope review, alternate pricing, inspection, or procurement response support. |
| Follow-up | Public due date, board vote, active permit/bid window. | "Following up because the public project timing still appears active." | "You have not chosen a roofer yet." | Suggest a next step tied to public timing. |
| Call-script angle | Public role, asset type, specific evidence source. | "Calling because I found a public record tied to this property and wanted to confirm the right roofing route." | "I know the roof is failing." | Confirm owner/PM/FM route or procurement path. |
| Email angle | Permit number, agenda title, bid title, asset fit. | Subject names public record or asset; body states source and evidence-matched offer. | Insurance outcome promises, unsupported code assertions, pressure without signal. | Ask for correct contact or offer narrow inspection/bid support. |

Blocked claims include:

- "Your roof is damaged" from weather alone.
- "Insurance will cover this."
- "Claim is approved."
- "Budget is allocated" unless source says it.
- "You have not chosen a roofer yet."
- "We can bypass procurement."
- Unsourced decision-maker identity.
- Unsupported urgency / "needs this week."

---

## Example Records

Design examples only. Classifier behavior is proven by `scripts/pm/commercial-roofing-classification-smoke.ts`.

### Export-Ready Prospects

**1. Regional property manager with retail portfolio**

```txt
buyer/account type: property manager
signal or fit evidence: public portfolio page lists retail centers in target metro; PM office route found
approved labels: Property Portfolio, Commercial Roof
lead_kind: prospect
confidence: high
contact route: property manager / PM office
why it is or is not an opportunity: strong fit and route; no fresh roof signal at a specific center
blocked claims: one of your centers needs replacement now; active buying intent
recommended next action: Find recent reroof permits and leak/code records against managed addresses
```

**2. Owner-operator of industrial warehouses**

```txt
buyer/account type: building owner / owner-operator
signal or fit evidence: assessor and company site tie operator to warehouse assets; facilities role exists
approved labels: Facility Roof, Commercial Roof
lead_kind: prospect
confidence: high
contact route: facilities manager or operations office
why it is or is not an opportunity: good commercial roofing fit; no fresh asset-specific roofing signal
blocked claims: your warehouses have storm damage; replacement is due
recommended next action: Offer maintenance baseline or asset-management review
```

**3. HOA management company with reserve-planning context**

```txt
buyer/account type: HOA / condo association manager
signal or fit evidence: association-management evidence plus community manager route and roof/reserve planning context
approved labels: Property Portfolio, Roof Maintenance
lead_kind: prospect
confidence: medium-high
contact route: community manager or board/management office
why it is or is not an opportunity: good fit for maintenance/reserve planning; no current roof-work signal
blocked claims: association has approved roof replacement; insurance coverage
recommended next action: Find reserve-study or board references and common-element responsibility evidence
```

### Needs-Review Prospects

**4. Office tenant-improvement project with no roof wording**

```txt
buyer/account type: office / property manager
signal or fit evidence: TI permit exists at a commercial office address, but scope does not mention roof or rooftop equipment
approved labels: Tenant Improvement
lead_kind: needs_review
confidence: medium
contact route: permit center or property office
why it is or is not an opportunity: commercial fit exists, but roofing implication is weak
blocked claims: this TI needs roof work; urgent roof scope
recommended next action: Pull plan notes or a second source confirming rooftop scope
```

**5. Commercial parcel in recent hail swath**

```txt
buyer/account type: building owner / property manager unknown
signal or fit evidence: fresh official storm exposure nearby, but property type and buyer route are incomplete
approved labels: STORM EXPOSURE, Storm Inspection
lead_kind: needs_review
confidence: medium-low
contact route: main office or further research needed
why it is or is not an opportunity: signal exists, but asset fit and route are incomplete; no damage certainty
blocked claims: your property took hail damage; insurance will cover this
recommended next action: Resolve property type through assessor and find ownership/PM route
```

### Signal-Backed Opportunities

**6. Industrial warehouse official reroof permit**

```txt
buyer/account type: industrial warehouse owner
signal or fit evidence: official reroof permit shows commercial address, replacement scope, valuation, and active permit status
approved labels: REROOF PERMIT, Roof Replacement
lead_kind: opportunity
confidence: high
contact route: owner route, PM, or listed permit context
why it is or is not an opportunity: direct roof-work signal tied to a commercial asset
blocked claims: you have not awarded the job; we know your roof failed
recommended next action: Reach out with inspection/scope-alternate offer and confirm handling path
```

**7. Public school district roof agenda / bid**

```txt
buyer/account type: public school district
signal or fit evidence: board agenda and public bid name roof replacement at a specific campus
approved labels: CAPITAL IMPROVEMENT, PUBLIC BID, Roof Replacement
lead_kind: opportunity
confidence: high
contact route: purchasing or facilities contact on the public record
why it is or is not an opportunity: explicit roof project with public buying motion
blocked claims: we can skip procurement; budget is allocated unless source says it
recommended next action: Route through public bid contact and offer compliant pre-bid support
```

### Discarded / Not Exportable

**8. Contractor-as-buyer trap**

```txt
buyer/account type: roofing contractor
signal or fit evidence: listing is for a roofer, not a buyer; no commercial asset/account evidence
approved labels: missing_evidence
lead_kind: discarded
confidence: low
contact route: none
why it is or is not an opportunity: seller mistaken for buyer; violates target-account logic
blocked claims: any buyer-facing claim
recommended next action: Discard and suppress from future buyer searches
```

---

## Non-Goals

- No DB/schema changes.
- No provider integration.
- No Shovels adapter.
- No SerpApi/Firecrawl runtime changes.
- No live feasibility run.
- No app/UI/routes.
- No billing/admin/settings.
- No CRM/export/outreach runtime.
- No Claim Guard checkpoint.
- No global `SignalType` enum changes.
- No claim that research/design proves the agent, search, scoring, provider, or classifier works.
