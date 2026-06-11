# Prospect Pool Export Contract

Status: Product proof for CP14. Contract/spec only. No runtime export, CRM sync,
DB/schema, provider, UI, billing, auth, or outreach implementation is approved by
this file.

## Export Principle

Prospect Pool export makes prospects usable as buyer-account worklists for
CSV/Sheets-style workflows. Export does not turn prospects into opportunities.

An exported prospect is still a prospect. It may be useful for account research,
review, routing, or manual outreach planning, but it must not claim urgency,
active buying intent, a CRM opportunity stage, or "needs this week" status unless
a separate signal-backed opportunity exists.

Signal-backed opportunities are not Prospect Pool exports. They belong to the
Opportunities lane of Lead Funnel.

## Export Statuses

| Status | Meaning |
| --- | --- |
| `export_ready_prospect` | The record is an evidence-backed prospect with required export fields and no opportunity-only claims. |
| `needs_review` | The record has enough account/evidence context for review worklists, but a weak or generic contact route prevents ready export. |
| `not_exportable` | The record is missing required context, is a signal-backed opportunity, carries unsupported claims, or falls into a blocked fallback state. |

## Required Export Fields

Every Prospect Pool export row must preserve:

- `lead_kind`
- `export_status`
- `prospect_label`
- `account_name` when known
- `evidence_summary`
- `fit_reason` or `fit_reasons`
- `confidence`
- `contact_route_context`
- `blocked_claims`
- `lineage_source_urls`
- `not_opportunity_yet_reason`

Exported prospects must preserve evidence, fit reason, confidence, contact route
context, blocked claims, lineage/source URLs, and `lead_kind`. If any required
field is absent, the record is not exportable.

## Allowed Fields

Allowed Prospect Pool export fields are account/worklist fields only:

- prospect/account name
- buyer type or vertical-fit label from an approved playbook/taxonomy
- location fields such as address, city, state, and service area
- source type, source name, source URL, and fetched/observed timestamp
- evidence summary and evidence snippets
- fit reason(s)
- confidence
- contact route context, including route type, route summary, route confidence,
  and route source URLs
- blocked claims list
- not-opportunity-yet reason
- export status
- run/source lineage IDs when they identify how the row was produced
- manual review notes

These fields can support CSV, spreadsheet, and future CRM account-worklist
mapping. They do not create an opportunity.

## Blocked Fields And Claims

Prospect Pool export must block opportunity-only fields and claims, including:

- opportunity urgency score
- urgent-action surface
- "needs this week"
- active buying intent
- why-now reason
- fresh signal urgency
- CRM opportunity stage
- opportunity amount, close date, probability, or deal stage
- sourced or unsourced opportunity status
- unsourced decision-maker identity
- outreach draft, auto-send state, or sequence enrollment

Decision-maker identity can appear only as sourced contact route context. An
unsourced decision-maker claim blocks export.

Unsupported urgency or unsupported decision-maker claims block export. A
`discarded` or `weak_fit` fallback blocks export.

## CRM-Ready Mapping Shape

CP14 defines a mapping shape only. It does not implement CRM sync.

```ts
type ProspectPoolCrmMapping = {
  crm_object_intent: 'buyer_account_worklist'
  lead_kind: 'evidence_backed_prospect' | 'exploratory_prospect'
  export_status: 'export_ready_prospect' | 'needs_review'
  account_name: string | null
  prospect_label: string
  evidence_summary: string
  fit_reasons: string[]
  confidence: number
  contact_route_context: string
  blocked_claims: string[]
  lineage_source_urls: string[]
  opportunity_stage: null
  opportunity_urgency_score: null
}
```

The mapping is account/worklist shaped. It must not set a CRM opportunity stage,
create a deal, infer a pipeline value, or sync a record.

## CSV / Sheets Guardrails

- One prospect account per row.
- Include `lead_kind` and `export_status` visibly in every row.
- Preserve source URLs as plain URLs, not hidden metadata.
- Preserve blocked claims as an explicit cell or serialized list.
- Preserve contact route context with confidence and source context.
- Do not include hidden opportunity-only columns.
- Do not convert `needs_review` rows into ready opportunities through formulas,
  filters, colors, or column names.
- Do not use spreadsheet labels such as "Hot", "Urgent", "Buying now", or
  "Needs this week" for Prospect Pool rows.
- Keep CSV/Sheets export deterministic and replayable from source lineage.

## Commercial Cleaning Examples

### Export-ready prospect

A medical office appears in a public tenant directory with a source URL, address,
approved Commercial Cleaning fit label, evidence summary, fit reasons, source
lineage, confidence, and a sourced website/contact-page route. It can become
`export_ready_prospect` as a buyer-account worklist row.

It must not say the medical office needs cleaning this week unless a dated
signal-backed opportunity exists.

### Needs review

A retail center appears on a property manager portfolio page, but the contact
route is generic: "research the property manager website." The record may be
useful for review, but it should be `needs_review`, not ready export.

### Not exportable

A storage facility buildout with a dated permit, move-in window, and why-now
reason is a signal-backed opportunity candidate. It is not a Prospect Pool export.

A residential maid-service account, a discarded fit, or a record with only a
generic "decision maker is the office manager" claim and no source is
`not_exportable`.

## Relationship To Lead Funnel

Lead Funnel = Prospect Pool + Signal Watch + Opportunities + Suggested Actions.

Prospect Pool export belongs only to the Prospect Pool lane. It supports buyer
universe worklists and review workflows. Signal Watch can later find fresh dated
signals. Opportunities require fresh signal evidence, why-now reasons, and
separate opportunity scoring.

Export does not bypass Lead Funnel separation:

- Prospect Pool export does not create opportunities.
- Prospect Pool export does not create Opportunity Urgency scores.
- Prospect Pool export does not create urgent-action surfaces.
- Prospect Pool export does not create CRM deals.
- Signal-backed opportunities are not Prospect Pool exports.

## Non-Goals

- no app code
- no UI/routes
- no DB/schema
- no provider runtime
- no CSV generation
- no Google Sheets integration
- no CRM sync
- no CRM object creation
- no opportunity creation
- no opportunity scoring
- no outreach draft
- no auto-send
- no billing/admin/settings changes
- no package changes
