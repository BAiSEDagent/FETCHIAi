# Contact Route / Outreach Play Contract

Status: CP16 contract proof / not runtime implementation.

This contract defines contact-route and outreach-play eligibility guardrails. It
does not send messages, create CRM or export records, call providers, write to
the database, change routes/UI, or implement runtime agent behavior.

## 1. Status / Scope

CP16 defines when Fetchi can:

- show a contact route
- mark a route as ready, review-needed, procurement-only, or blocked
- allow a draft outreach play
- block outreach when claims, contact evidence, route type, or lead lane are
  unsafe
- produce a recommended action when outreach is not allowed

Non-goals:

- no email sending
- no CRM sync
- no export implementation
- no provider calls
- no DB writes
- no UI/routes
- no search/agent runtime behavior
- no package changes

## 2. Contact Route Meaning

A contact route is a source-linked path a user can take to reach the likely
account, organization, public procurement process, or review channel.

A route can support "contact through this path." It is not proof that a named
person has buying authority unless the cited evidence says so.

## 3. Outreach Play Meaning

An outreach play is a suggested evidence-backed message/action pattern. It is
not an automated send, sequence, CRM task, or guarantee of buyer intent.

An outreach play is not allowed unless route safety, lead lane, cited evidence,
and claim safety all pass.

## 4. Route Readiness Levels

| Readiness | Meaning |
| --- | --- |
| `verified_route` | Route has cited evidence and contact details are source-supported. |
| `plausible_route` | Route is source-linked and usable, but less direct or less specific. |
| `procurement_only` | Outreach must use a public bid or procurement path. |
| `needs_review` | Route needs contact/evidence review before outreach. |
| `blocked` | Route cannot be used safely. |

## 5. Route Types

Approved route types:

- `direct_email`
- `direct_phone`
- `contact_form`
- `front_desk`
- `procurement_portal`
- `public_bid_contact`
- `property_manager_company`
- `general_business_contact`
- `social_profile`
- `unknown`

Route type is not status, signal, vertical-fit, freshness, score, surface color,
or urgency.

## 6. Outreach Play Levels

| Level | Meaning |
| --- | --- |
| `draft_allowed` | A safe, evidence-backed draft play can be generated. |
| `manual_review_only` | A human should review route/evidence before drafting. |
| `procurement_only` | Use the procurement path; do not bypass it. |
| `enrich_contact_route` | More contact evidence is needed. |
| `no_outreach` | Outreach is blocked. |

## 7. Required Evidence

- Every route must cite evidence indexes.
- Every outreach claim must cite evidence indexes.
- Named contact claims require exact cited support.
- Email, phone, form, portal, and URL claims require exact cited support.
- Decision-maker authority cannot be inferred from a contact existing.
- A public contact source supports "contact through this route," not "this
  person will buy."

## 8. Lane-Based Rules

### `signal_backed_opportunity`

- May allow `draft_allowed` only when route and claims pass.
- May use signal-specific outreach only when fresh signal evidence exists.
- May claim urgency only when cited evidence supports it.
- Must still have a valid contact route and recommended action.

### `evidence_backed_prospect`

- May show a contact route.
- May allow low-risk outreach only when evidence supports the opener.
- Must not claim urgency, active buying intent, damage, active need, budget, or
  decision-maker authority without fresh cited signal evidence.

### `exploratory_prospect`

- May be reviewed or enriched.
- Must not generate an outreach draft.
- Should route to evidence/contact review.

### Procurement / Public Bid Path

If procurement is required, direct outreach must not bypass procurement. The
allowed route should become `procurement_only` unless source-linked evidence
says another route is valid.

## 9. Blocked Claims

Block unsupported claims about:

- urgency
- damage
- active need
- budget
- decision-maker authority
- buying intent
- insurance/claim certainty
- "they haven't chosen a vendor"
- personalized facts not in evidence

## 10. Recommended Actions

Every blocked or review-needed decision must produce an action:

- verify contact route
- hydrate contact evidence
- use procurement portal
- send to review
- downgrade to Prospect Pool
- discard
- draft outreach only when allowed

## 11. Relationship To Claim Guard

CP16 gates contact-route and outreach-play eligibility before user-visible play
generation. Claim Guard still validates the final user-visible artifact.

CP16 does not replace Claim Guard. CP16 also must not generate unsupported claims
and rely on Claim Guard to catch them later.

## 12. Side-Effect Rules

The contract must not:

- send email
- write DB
- call providers
- read env
- read system time
- create opportunities
- create scores
- alter routes/UI
- create CRM/export records

