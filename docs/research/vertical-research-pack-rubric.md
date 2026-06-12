# Fetchi Vertical Research Pack Review Rubric

Status: PM review rubric / not implementation.

Use this rubric to decide whether a completed vertical research pack is ready to
be converted into a Fetchi vertical playbook contract. The rubric protects the
same product laws as the template:

- No opportunity without signal.
- No prospect without evidence.
- No score without reason.
- No explanation without action.
- UI-visible labels must come from approved taxonomy/playbooks, not AI freestyle.
- No user-visible claim without source-linked evidence.

## Review Ratings

- Green: ready for playbook draft.
- Yellow: usable but needs source, label, freshness, or contact-route cleanup.
- Red: not ready; too speculative or source-weak.

## Category Rubric

| Category | Green standard | Yellow warning | Red blocker | Review question |
| --- | --- | --- | --- | --- |
| Buyer clarity | Primary buyer, economic buyer, operator, gatekeeper, and wrong-buyer traps are specific and source-informed. | Buyer roles are plausible but broad, or procurement paths are under-described. | Buyer is vague, consumer/residential mixed with commercial, or contractor/intermediary is mistaken for buyer. | Can the playbook tell who should and should not become a prospect? |
| Signal quality | Signals are public, source-linked, account/asset/location tied, and convertible into approved signal label candidates. | Signals are relevant but some are indirect, stale, or need better evidence fields. | Signals are generic interest, keyword matches, or context-only claims treated as buying intent. | Does each opportunity signal prove a why-now reason without overclaiming? |
| Evidence source reliability | Sources are named by category, reliability, update frequency, and extractable fields. | Sources exist but reliability or freshness concerns need cleanup. | Sources are unavailable, unverifiable, or mostly anecdotal. | Can the later playbook cite source-linked evidence for each user-visible claim? |
| Freshness logic | Each opportunity-eligible signal has a freshness window and dated evidence requirement. | Freshness exists but windows are loose or inconsistent by source type. | Urgency can be inferred from stale records, score, or undated evidence. | Would stale evidence be blocked or downgraded deterministically? |
| Label discipline | Signal, vertical-fit, status, freshness, score, and surface concepts are separated. | Some candidate labels need consolidation or naming cleanup. | Runtime AI could freestyle UI labels or mix surface color with score/status. | Are all UI-visible labels candidates for explicit playbook approval? |
| Prospect vs Opportunity separation | Prospect Pool and signal-backed Opportunity bars are clearly separate. | Some examples blur freshness or why-now language. | Prospects are treated as opportunities without fresh signal evidence. | Could a prospect be exported without implying urgency or active buying intent? |
| Scoring reasonability | Prospect Fit, Opportunity Urgency, and Outreach Readiness factors are separated and evidence-backed. | Score factors are useful but need clearer downgrade or blocked-inference rules. | Scores can appear without evidence, reason, or lane-specific meaning. | Does every score reason cite evidence and avoid unsupported certainty? |
| Contact route practicality | Best, backup, procurement, and public contact-source routes are documented with assumptions blocked. | Contact routes are plausible but generic or need source validation. | Named contacts or decision-maker authority are assumed without source-linked contact evidence. | Can a user act on the contact route without being misled? |
| Outreach safety | Safe openers, CTAs, blocked claims, and no-draft conditions are explicit. | Outreach guidance is directionally safe but needs more examples. | Outreach encourages unsupported urgency, budget, damage, need, authority, or buying intent claims. | Would Claim Guard block any suggested outreach language? |
| Fallback/disqualification quality | Existing fallback states are mapped cleanly: needs_review, weak_fit, missing_evidence, exploratory, discarded. | Some conditions need clearer downgrade versus discard handling. | New fallback enums are invented or wrong-buyer/stale/source-weak cases are not handled. | Can uncertainty be represented without expanding the taxonomy? |
| Example record quality | Examples cover export-ready prospects, signal-backed opportunities, needs-review records, and wrong-buyer traps. | Examples exist but are thin on source type, score reason, or blocked-claim reminders. | Examples are missing, speculative, or fail to separate Prospect Pool from Opportunity. | Could the examples become deterministic smoke fixtures later? |
| Provider feasibility | Discovery, hydration, and LLM responsibilities are separated: SerpApi for discovery, Firecrawl for hydration, LLM inside contracts. | Provider mapping is plausible but needs source-specific validation. | Provider responsibilities are mixed or imply broad crawling/runtime work without source constraints. | Is source discovery separated from evidence hydration? |
| Regional variability handling | Regional rules, source availability, licensing, and service-area differences are documented. | Regional variability is acknowledged but not operationalized. | The pack assumes one jurisdiction/source pattern applies everywhere. | Would the playbook degrade safely across regions? |
| Product-law compliance | The pack preserves evidence, labels, reasons, actions, and Claim Guard constraints. | Minor wording needs tightening to avoid overclaiming. | The pack encourages opportunities without signals, prospects without evidence, scores without reasons, explanations without actions, or AI-freestyled labels. | Does the pack obey every Fetchi product law? |

## Blocked Claims Review

The pack is not playbook-ready if it encourages unsupported claims like:

- active buying intent without signal
- damage without corroboration
- budget without evidence
- decision-maker authority without source
- urgency from score alone
- outreach without evidence
- AI-freestyled labels
- treating surface color as score
- treating Prospect Pool as Opportunity

## PM Approval Output

When PM approves or rejects a research pack, the decision should include:

- rating: Green/Yellow/Red
- approved next step
- labels needing review
- sources needing validation
- risks
- what is explicitly not approved
