# Contact Route / Outreach Play Contract

Status: CP16 contract proof / not runtime implementation.

This contract defines contact-route and safe outreach-mode guardrails. It does
not send messages, create CRM or export records, call providers, write to the
database, change routes/UI, or implement runtime agent behavior.

## 1. Status / Scope

CP16 defines how Fetchi can:

- keep the outreach CTA available for every lead/prospect/card
- choose the safest outreach output mode from evidence, route, lane, procurement,
  and claim safety
- show a contact route when source-linked evidence supports it
- mark a route as ready, review-needed, procurement-only, or blocked
- block unsafe claims while still returning a safe alternative when possible
- produce a recommended action for every downgrade, review, or hard block

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

## 3. Outreach CTA Rule

The outreach CTA is always available. Fetchi should not decide whether the user
is allowed to ask for outreach. Fetchi decides what kind of outreach is safe to
generate.

Unsafe claims are removed or blocked from the draft. Missing or weak evidence
downgrades the output to generic or evidence-limited outreach instead of
dead-ending the user.

`no_outreach` is not a normal user-facing CP16 mode. A no-outreach outcome is
reserved for external legal/compliance decisions outside this contract or for
procurement hard blocks where direct outreach would bypass the required path.

## 4. Route Readiness Levels

| Readiness | Meaning |
| --- | --- |
| `verified_route` | Route has cited evidence and contact details are source-supported. |
| `plausible_route` | Route is source-linked and usable, but less direct or less specific. |
| `procurement_only` | Outreach must use a public bid or procurement path. |
| `needs_review` | Route needs contact/evidence review before personalized outreach. |
| `blocked` | Route input is malformed or unsafe to rely on. |

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

## 6. Safe Outreach Modes

| Mode | Meaning |
| --- | --- |
| `source_backed_personalized_draft` | A signal-backed opportunity has source-supported route, signal, and claims. |
| `evidence_limited_draft` | A prospect can receive low-risk outreach with risky or unsupported claims removed. |
| `generic_outreach_template` | Evidence or route context is missing/weak; no lead-specific personalization. |
| `procurement_only` | Prepare procurement-safe response only; do not bypass procurement. |
| `manual_review_recommended` | A safe draft may need human review because claim or route support is incomplete. |

The output should expose:

- `outreachCtaAvailable: true`
- `allowedOutreachMode`
- `blockedClaims`
- `personalizationAllowed`
- `routeReadiness`
- `selectedRoute`
- `gateReasons`
- `recommendedAction`
- `violations`
- fixed zero side-effect counters

An `outreachAllowed` boolean, if present for compatibility, must not imply CTA
availability. The CTA remains available; the allowed mode controls what Fetchi
can safely produce.

## 7. Required Evidence

- Every source-backed route must cite evidence indexes.
- Every draft claim must cite evidence indexes.
- Named contact claims require exact cited support.
- Email, phone, form, portal, and URL claims require exact cited support.
- Decision-maker authority cannot be inferred from a contact existing.
- A public contact source supports "contact through this route," not "this
  person will buy."
- Invalid evidence indexes are malformed input and may hard-block into manual
  review.

## 8. Lane-Based Rules

### `signal_backed_opportunity`

- Can produce `source_backed_personalized_draft` when route, signal, and claims
  pass.
- Can use signal-specific outreach only when fresh signal evidence exists.
- High-risk claims require cited/verbatim support.
- Unsupported high-risk claims are blocked from the draft and downgrade the mode
  to `manual_review_recommended`.

### `evidence_backed_prospect`

- Can produce `evidence_limited_draft` when route and low-risk evidence pass.
- Cannot use urgency, active buying intent, damage, active need, budget,
  insurance/claim certainty, vendor-selection certainty, or decision-maker
  authority claims.
- Risky claims should be removed/blocked and the output should stay
  `evidence_limited_draft` when a safe draft remains possible.
- If route support itself is weak, the output may become
  `manual_review_recommended`.

### `exploratory_prospect`

- Can produce `generic_outreach_template`.
- Must not use lead-specific claims unless evidence supports them.
- Should recommend enriching evidence/contact route.

### Missing Evidence

- Can produce `generic_outreach_template` only.
- Must not produce lead-specific personalization.
- Recommended action should be hydrate evidence.

### Procurement / Public Bid Path

If procurement is required, direct outreach must not bypass procurement. The
allowed mode becomes `procurement_only`. A procurement-safe response may be
prepared, but not direct outreach to an unsupported individual route.

## 9. Blocked Claims

Block or remove unsupported claims about:

- urgency
- damage
- active need
- budget
- decision-maker authority
- buying intent
- insurance/claim certainty
- vendor-selection certainty
- personalized facts not in evidence

Blocked claims downgrade the outreach mode instead of blocking the outreach CTA.

## 10. Recommended Actions

Every blocked, downgraded, or review-needed decision must produce an action:

- hydrate evidence
- hydrate contact evidence
- use procurement portal
- send to review
- enrich evidence and contact route
- draft evidence-limited outreach without risky claims
- draft source-backed personalized outreach

## 11. Relationship To Claim Guard

CP16 gates contact-route and outreach-mode eligibility before user-visible play
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
