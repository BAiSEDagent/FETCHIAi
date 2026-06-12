# Fetchi Vertical Research Pack Template

Status: Research template / not implementation.

Use this template to research a vertical before writing or updating a Fetchi
vertical playbook. A research pack is source material for a later contract; it
is not code, not UI, not runtime proof, and not evidence that an agent works.

Fetchi product laws apply throughout:

- No opportunity without signal.
- No prospect without evidence.
- No score without reason.
- No explanation without action.
- UI-visible labels must come from approved taxonomy/playbooks, not AI freestyle.
- No user-visible claim without source-linked evidence.

## 1. Header

- Vertical name:
- Vertical ID candidate:
- Research date:
- Researcher/source:
- Status: research template / not implementation
- Launch vertical: yes/no
- Related playbook: none / existing path

## 2. Research Purpose

This research pack is used to prepare a vertical for playbook conversion. It
should define and validate:

- approved signal candidates
- approved vertical-fit label candidates
- evidence requirements
- scoring factors
- disqualification rules
- contact routes
- safe outreach angles
- example records

This research pack does not approve code, UI, provider runtime, DB/schema,
outreach sending, export implementation, CRM sync, or a new vertical playbook.

## 3. Buyer / Account Types

Document who buys, who operates, and who blocks access.

- Primary buyer types:
- Economic buyer:
- Day-to-day operator:
- Likely gatekeeper:
- Procurement/government path, if applicable:
- Multi-location, franchise, or portfolio considerations:
- What not to mistake for the buyer:

Research notes:

- Separate the account that needs the service from contractors, vendors,
  intermediaries, or residential consumers.
- Do not infer decision-maker authority from a name or title unless source-linked
  evidence supports it.

## 4. Service Sold / Jobs To Be Done

Describe what vendors in this vertical sell and when buyers need it.

- Core services the vendor sells:
- Emergency vs planned work:
- Recurring vs one-time work:
- High-ticket vs low-ticket jobs:
- Seasonality:
- Service-area constraints:
- Compliance/licensing concerns, if relevant:

## 5. Prospect Pool Qualification

Minimum bar for an evidence-backed prospect:

- Verified account, asset, or business exists.
- Vertical/service fit evidence is source-linked.
- Geography or service-area fit is supported.
- Plausible contact route exists or is explicitly marked for review.
- Evidence is source-linked and attributable.
- No freshness, urgency, why-now, damage, need, buying intent, or budget claim is
  made unless a qualifying signal exists.

Prospect Pool records are buyer-account worklists. They are not opportunities.

## 6. Signal-Backed Opportunity Qualification

Minimum bar for a signal-backed opportunity:

- Prospect Pool bar is satisfied.
- Fresh public signal is tied to the account, asset, or location.
- Approved signal label candidate is identified.
- Approved vertical-fit label candidate is identified.
- Evidence date and freshness window are documented.
- Score has a reason and evidence citation.
- Suggested action is clear.
- Contact route is documented.

Signal-backed Opportunity is not the same thing as Prospect Pool. Public
evidence can support relevance, but it cannot create certainty, urgency, or
buying intent without corroboration.

## 7. Public Buying Signals

Use this table for every signal candidate.

| Signal name | Signal type | What it may indicate | Required evidence | Freshness window | Source examples | Risk / blocked claim | Prospect Pool only vs Opportunity eligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |

Rules:

- Weather, exposure, event, or context signals cannot claim active damage,
  active need, or buying intent without corroborating evidence.
- Score alone cannot create urgency.
- A signal can be Opportunity eligible only when it is fresh, source-linked, and
  mapped to an approved signal label candidate.

## 8. Evidence Sources

Research must separate source discovery from evidence hydration.

- SerpApi is discovery/search.
- Firecrawl is evidence hydration/enrichment after a source exists.
- LLM is classify/score/explain/draft only inside approved contracts.
- Claim Guard blocks unsupported user-visible claims.

| Source category | Example sources | Discovery provider fit | Hydration provider fit | Evidence fields to extract | Reliability level | Update frequency / freshness concern | Notes / risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| permits/licenses |  |  |  |  |  |  |  |
| public bids/RFPs |  |  |  |  |  |  |  |
| municipal/county records |  |  |  |  |  |  |  |
| business registrations |  |  |  |  |  |  |  |
| property/parcel/assessor records |  |  |  |  |  |  |  |
| review sites |  |  |  |  |  |  |  |
| company websites |  |  |  |  |  |  |  |
| directories |  |  |  |  |  |  |  |
| social/news |  |  |  |  |  |  |  |
| job postings |  |  |  |  |  |  |  |
| weather/events where relevant |  |  |  |  |  |  |  |
| industry-specific sources |  |  |  |  |  |  |  |

## 9. Approved Label Candidates

Labels are candidates until accepted into a playbook. Research must not invent
UI-visible labels at runtime.

Signal label candidates:

- 

Vertical-fit/service-meaning label candidates:

- 

Status/lifecycle labels, only if the existing approved set is insufficient:

- 

Freshness/urgency labels, mapped to existing freshness rules:

- 

Rules:

- Do not mix status, signal, vertical-fit, freshness, score, or surface color.
- Surface color is never derived from score.
- AI may classify, explain, and draft only inside approved labels and evidence.

## 10. Fallback / Uncertainty Mapping

Map uncertainty to existing fallback states only:

- needs_review
- weak_fit
- missing_evidence
- exploratory
- discarded

Do not create new fallback enums in research. "No Contact Route" is not a
fallback enum unless separately approved; treat it as a contact-route/readiness
condition.

| Condition | Existing fallback state | Review note | Suggested action |
| --- | --- | --- | --- |
|  |  |  |  |

## 11. Scoring Factors

Separate Prospect Fit, Opportunity Urgency, and Outreach Readiness. A score must
have a reason and cited evidence.

### Prospect Fit

| Scoring factor | Reason | Evidence required | Downgrade condition | Blocked inference |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

### Opportunity Urgency

| Scoring factor | Reason | Evidence required | Downgrade condition | Blocked inference |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

### Outreach Readiness

| Scoring factor | Reason | Evidence required | Downgrade condition | Blocked inference |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 12. Disqualification / Downgrade Rules

Document where the vertical should block, downgrade, or send to review.

- Hard disqualifiers:
- Soft downgrades:
- Stale-record rules:
- Wrong-buyer traps:
- Residential/consumer-only traps, if relevant:
- Irrelevant signal traps:
- Duplicate/same-account handling:
- Outside-service-area handling:

## 13. Contact Route Research

Document practical contact-route paths without assuming authority.

- Best contact route:
- Backup route:
- Procurement route:
- Public contact source:
- Named-contact rules:
- What cannot be assumed:
- Outreach owner/gatekeeper notes:

Named contact claims require source-linked contact evidence. A public contact
route can support "contact through this channel"; it cannot prove a person is
the decision-maker unless cited evidence says so.

## 14. Safe Outreach Angles

Provide outreach guidance that stays inside evidence.

- Evidence-backed opener examples:
- Safe CTA examples:
- Blocked claims:
- Compliance/privacy cautions:
- When no outreach draft should be generated:

Rule: No outreach draft should claim urgency, budget, damage, need,
decision-maker authority, or buying intent unless cited evidence supports it.

## 15. Suggested Actions

Every explanation must pair with a recommended action. Use actions such as:

- find more similar prospects
- hydrate evidence
- verify contact route
- export
- save
- draft outreach only when allowed
- send to review
- discard

## 16. Example Records

Include at least:

- 3 export-ready prospects
- 2 signal-backed opportunities
- 2 needs-review records
- 1 discarded/wrong-buyer trap

Each example must include:

- account/asset
- evidence summary
- source type
- label candidates
- lane: Prospect Pool or Opportunity
- fallback if any
- score reason
- suggested action
- blocked claim reminder

| Example | Account/asset | Evidence summary | Source type | Label candidates | Lane | Fallback if any | Score reason | Suggested action | Blocked claim reminder |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Export-ready prospect 1 |  |  |  |  | Prospect Pool |  |  |  |  |
| Export-ready prospect 2 |  |  |  |  | Prospect Pool |  |  |  |  |
| Export-ready prospect 3 |  |  |  |  | Prospect Pool |  |  |  |  |
| Signal-backed opportunity 1 |  |  |  |  | Opportunity |  |  |  |  |
| Signal-backed opportunity 2 |  |  |  |  | Opportunity |  |  |  |  |
| Needs-review record 1 |  |  |  |  | Prospect Pool | needs_review |  |  |  |
| Needs-review record 2 |  |  |  |  | Prospect Pool | needs_review |  |  |  |
| Discarded/wrong-buyer trap |  |  |  |  | Prospect Pool | discarded |  | discard |  |

## 17. Research Gaps / Open Questions

List unresolved inputs before playbook conversion.

- Unknowns:
- Source availability gaps:
- Regional variability:
- Provider limitations:
- Paid data/API candidates:
- Legal/compliance risks:
- Product decisions needed:

## 18. Playbook Conversion Checklist

This research can become a playbook only when:

- [ ] Buyer types defined.
- [ ] Approved signal candidates ready.
- [ ] Approved vertical-fit candidates ready.
- [ ] Evidence requirements defined.
- [ ] Freshness windows defined.
- [ ] Disqualification rules defined.
- [ ] Contact routes defined.
- [ ] Outreach rules defined.
- [ ] Examples complete.
- [ ] Ambiguous labels resolved.
- [ ] Source risks documented.
- [ ] Fallback mapping complete.
