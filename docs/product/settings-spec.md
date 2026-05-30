# Fetchi Settings — Product/Design Spec v2

Status: Spec only. No schema change, no app code, no billing implementation, no route change, no branch.

## Shared Foundations

Config is source of truth:

- prices, limits, top-up rates, Stripe IDs -> `pricing_tiers`
- thresholds, trial config, cron, rate limits -> `system_settings`
- tier unlocks -> `tier_features`
- email content -> `email_templates`

No price, threshold, or email body should be inlined in application code.

Core objects touched:

- Workspace
- Subscription
- Signal
- Opportunity
- Admin Config

Email-only at launch. SMS/device push are parked because of TCPA risk. All `push_on_*` fields drive email at launch and must be labeled as email in the UI.

Mobile-first: design at 375px first, `lg:` after. Minimum touch target is 44x44px.

Every read must be `workspace_id` scoped. Every error should map to a friendly message.

---

## Tab 1 — Usage

### Product purpose

Read-only awareness of opportunities consumed vs. plan/trial allowance, reset timing, and what happens at the limit.

### User jobs

- How many opportunities are left?
- When does usage reset?
- What happens at the limit and how does the user get more?
- During trial, how many free opportunities are left?

### MVP controls/content

Meter-only for v1.

- Used / limit from `workspace_subscriptions.opportunities_used` and `workspace_subscriptions.opportunities_limit`.
- If `opportunities_limit` is null, render a safe fallback such as "Usage limit syncing" or "Custom limit pending." Do not render or advertise Unlimited. Never divide by zero for the progress bar.
- Reset date from `workspace_subscriptions.opportunities_reset_at`.
- Trial state uses `trial_opportunities_used`, `trial_opportunities_limit`, and `trial_ends_at`.
- Link to Plan & Billing for top-up or upgrade.
- Usage never charges and never mutates counters.

### Mobile behavior

Single column:

1. meter
2. reset line
3. trial/top-up CTA

CTA is full width.

### Desktop behavior

Two-column layout:

- meter and reset on left
- plan summary and CTA on right

Desktop layout only at `lg:`.

### Data/config dependencies

- `workspace_subscriptions` read
- `pricing_tiers` for tier label and top-up rate display
- `system_settings` for limit-warning threshold if shown

### Read-only vs editable

Fully read-only. Only action is navigation to Plan & Billing.

`consumeOpportunityCredit()` remains the sole opportunity counter writer.

### Empty/loading/error states

- Loading: skeleton meter.
- Zero used: render cleanly as 0 used.
- Missing/unsynced subscription: honest `Usage is syncing` fallback, not a broken bar.
- At limit: full meter plus top-up/upgrade routes.

### Upgrade/trial/billing implications

Usage is the read side of the trial gate. At-limit and trial-ending are upgrade moments. The tab mutates nothing.

### Non-goals

- No historical chart.
- No CSV export.
- No per-agent/search cost breakdown.
- No in-tab charging.
- No event-based consumption breakdown in v1.

### Open question

Should a near-limit banner live here, or only through the limit-warning email?

### Risks

- Counter drift if Usage reads stale data instead of the live atomic state.
- Trial vs paid meter confusion if both render without clear separation.

### Acceptance criteria

- Meter reflects live `workspace_subscriptions` across monthly, annual, trial, finite-limit, and null-limit fallback states.
- Null limit renders a safe syncing/custom fallback and never divides by zero.
- No write path exists from this tab.
- 375px layout works.
- CTA touch target is at least 44x44px.

---

## Tab 2 — Notifications

### Product purpose

Control when and how Fetchi emails about opportunities, expiring leads, and account/usage events without silencing anything time-critical.

### User jobs

- Email me a daily digest at my chosen time.
- Email me for strong leads.
- Warn me before leads expire.
- Warn me before I hit my limit.

### MVP controls/content

Maps to existing `notification_preferences` fields:

- `Email me a daily digest` -> `daily_digest_enabled`
- Digest time picker -> `daily_digest_time`, HH:MM local
- `Email me for high-fit opportunities` -> `push_on_high_score`
- High-fit threshold -> `high_score_threshold`, default 85
- `Email me before leads expire` -> `push_on_expiring_leads`
- `Email me a weekly summary` -> `weekly_summary_enabled`, default off
- `Email me usage limit warnings` -> `limit_warning_enabled`, default on
- Notification destination is read-only at launch: show Clerk primary email. If `notification_email` is null, fall back to Clerk primary. Editable override is marked coming later.

No `push` appears in user-facing copy.

### Mobile behavior

Labeled toggle rows. Time and threshold controls expand inline.

### Desktop behavior

Same controls, constrained width. Controls may align right at `lg:`.

### Data/config dependencies

- `notification_preferences` read/write except destination read-only
- `email_templates` for content rendered by Resend, not edited here
- `system_settings` for digest cron/default thresholds
- Sender/CAN-SPAM address from environment/config, not this tab

### Read-only vs editable

Editable:

- toggles
- time
- threshold

Read-only:

- notification destination at launch
- email content, admin-only through `email_templates`

### Empty/loading/error states

- Loading: skeleton.
- No prefs row: render seeded defaults and persist on first change.
- Invalid time/threshold: inline validation, no silent save.
- Save failure: friendly inline error, revert to last saved value.

### Upgrade/trial/billing implications

Notifications are not tier-gated at launch.

`limit_warning` and trial-ending emails are billing-critical and must always send.

### Non-goals

- No SMS.
- No device/web push.
- No Slack or personal webhooks.
- No per-signal-type notification routing.
- No user-edited email body.
- No editable destination override.
- No custom verification flow.
- No quiet hours in MVP.

### Open questions

None blocking.

### Risks

- Schema field names include `push`, but launch behavior is email-only. UI must label as email.
- Timezone handling for `daily_digest_time` must be unambiguous.

### Acceptance criteria

- Each editable field round-trips to `notification_preferences`.
- Zero `push` strings in user-facing copy.
- Destination renders Clerk primary or existing `notification_email` if non-null and is read-only.
- 375px layout works.
- All controls have 44x44px touch targets.

---

## Tab 3 — Signal Sensitivity

### Product purpose

Workspace-facing surfacing controls layered over playbook/signal confidence floors: which signals Fetchi watches and how strict the surfacing bar is.

### User jobs

- Show only strong-fit leads, or broaden the pool.
- Turn off signal types that do not apply.
- Never show leads with specific excluded keywords.

### MVP editable fields

Existing `signal_preferences` fields only:

- `permits_enabled`
- `storm_enabled`
- `new_listings_enabled`
- `job_postings_enabled`, default off
- `events_enabled`, default off
- `min_score_threshold`, guardrailed sensitivity floor
- `excluded_keywords`, chip input

### Future / playbook-level categories

Not editable MVP toggles:

- Reviews & complaints
- Property & tenant changes
- Other vertical-specific categories

MVP exposes only existing `signal_preferences` fields. The broader seven-category signal taxonomy is product direction for the Vertical Playbook Registry and future settings expansion.

Future categories may be shown as informational coming-later context, but they are not working toggles in v1.

### Sensitivity floor guardrails

`min_score_threshold` is bounded by safe constants or `system_settings` once config exists so users cannot set it to 0 or 100 in a way that makes the product useless.

Final numbers are pending.

This floor is distinct from Notifications `high_score_threshold`. They are separate fields with separate jobs and must never be cross-wired.

### Vertical-aware copy

Use neutral copy in v1.

Do not hardcode vertical strings such as cleaning, roofing, HVAC, plumbing, etc. inside the React component.

Playbook-aware copy can come later from the Vertical Playbook Registry/config.

Allowed:

- neutral defaults
- a note that playbook-aware copy is future

### Mobile behavior

Three sections:

1. signal toggles
2. sensitivity slider with stricter/broader labeling and 44px thumb
3. excluded keyword chips

### Desktop behavior

Same three sections, wider. Slider shows numeric value at `lg:`.

### Data/config dependencies

- `signal_preferences` read/write
- `service_profiles.vertical` read, reserved for future playbook copy
- `system_settings` for floor bounds when config exists

### Read-only vs editable

Editable:

- existing MVP signal toggles
- floor
- keywords

Read-only/informational:

- available signal-type set
- future categories
- classifier/playbook outputs

### Empty/loading/error states

- Loading: skeleton.
- No prefs row: seeded defaults.
- Floor so high nothing surfaces: show intentional guidance.
- All signals off: `Fetchi will not surface new opportunities until you enable at least one signal.`
- Save failure: inline error, revert.

### Upgrade/trial/billing implications

No signal-type tier gating at launch. All MVP toggles are available to all paid/trial tiers unless a future `tier_features` decision changes it.

Sensitivity does not redefine the metered count.

### Non-goals

- No user-set per-signal weighting.
- No user-authored vertical labels.
- No new signal types beyond the existing five.
- No regex keywords.
- No future-category toggles.
- No hardcoded vertical copy.
- No tier gating.

### Open question

Final guardrail numbers for `min_score_threshold` remain provisional until config decision.

### Risks

- Confusing `min_score_threshold` with `high_score_threshold`.
- Hardcoding vertical labels instead of loading them from config later.

### Acceptance criteria

- Only the seven MVP `signal_preferences` fields are editable.
- Future categories are not working toggles.
- `min_score_threshold` is bounded by safe min/max.
- Floor and notification threshold are separate fields.
- Zero hardcoded vertical strings in the component.
- Nothing-surfaces states read as intentional guidance.
- 375px layout works.
- All controls have 44x44px touch targets.

---

## Tab 4 — Plan & Billing

### Product purpose

Show current plan, what each plan includes, and enable upgrade, payment management, top-up, and promo while reading all pricing truth from config.

Conservative v1.

### User jobs

- What plan/cost am I on?
- Upgrade or switch interval.
- Manage card, invoices, or cancellation.
- Buy more opportunities.
- Apply a promo code.

### MVP controls/content

- Current-plan summary: `tier`, `billing_interval`, `status` from `workspace_subscriptions`; price/limits/bullets from `pricing_tiers`.
- Plan picker: tiers from `pricing_tiers` where active, ordered by `display_order`, `is_popular` highlighted, monthly/annual toggle showing both prices.
- Agency hidden from public picker through app-level visibility filter. Agency may remain in database/config but not show in MVP plan selection.
- TODO: add `pricing_tiers.is_public` or equivalent after schema decision.
- Upgrade routes through checkout only if already scoped.
- Manage card/invoices/cancel/downgrade routes to Stripe billing portal.
- No custom downgrade/proration logic in-app.
- Top-up flow lives here as one-time purchase at tier top-up rate.
- Promo codes apply at checkout only and validate against `promo_codes`.
- No apply-promo-to-active-subscription in v1.
- Trial state: trial banner plus add-card/choose-plan action when `status = trialing`.

### Mobile behavior

Current-plan card -> monthly/annual toggle -> stacked plan cards -> manage billing/top-up/promo rows.

One primary CTA per card.

### Desktop behavior

Plan cards in row with popular emphasized. Current-plan/actions in header or sidebar at `lg:`.

### Data/config dependencies

- `pricing_tiers`
- `workspace_subscriptions` read
- `tier_features`
- `promo_codes` read/validate
- Stripe checkout/portal/webhooks built around existing primitives
- Env price IDs reconciled with `pricing_tiers`; table is source of truth

### Read-only vs editable

Read-only:

- plan facts from config

Actions:

- select/change plan
- switch interval
- manage payment through portal
- buy top-up
- apply promo at checkout

Must not touch:

- `workspace_subscriptions` schema
- `consumeOpportunityCredit()`
- `checkTrialGate()`
- protected billing primitives

### Empty/loading/error states

- Loading: skeleton plan cards.
- Unsynced subscription: honest syncing state.
- Past due: banner and fix-payment CTA.
- Canceled/expired: read-only history and reactivate path.
- Invalid/expired promo: inline error, no partial apply.
- Stripe error: friendly message, never raw error.

### Upgrade/trial/billing implications

Preserves card-free trial -> checkout path. `billing_interval` and selected Stripe price ID carry the pricing-page choice.

Top-up applies tier rate through existing logic; do not reimplement billing primitives.

Fetchi does not offer unlimited plans. High-volume customers use explicit capped plans, top-ups, or custom capped agreements.

### Non-goals

- No in-app invoice rendering.
- No proration UI.
- No custom downgrade logic.
- No public Agency tier.
- No `pricing_tiers.is_public` schema change yet.
- No promo-on-active-subscription.
- No Unlimited plan.
- No Replit Stripe connector.
- No hardcoded prices.

### Open questions

None blocking. Downgrade and promo behaviors are deliberately deferred to Stripe portal / future billing spec.

### Risks

- Highest-risk tab.
- Drift between env price IDs and `pricing_tiers`.
- Accidental edit to protected billing primitives.
- Sync lag between Stripe and `workspace_subscriptions`.

### Acceptance criteria

- All prices, limits, bullets, and top-up rates render from `pricing_tiers`.
- Grep shows zero hardcoded prices/limits.
- Agency absent from in-app picker through app-level filter, with no schema change.
- Monthly/annual toggle shows both prices and carries the choice into checkout.
- Card/invoices/cancel/downgrade route to Stripe portal.
- No in-app proration logic.
- Promo applies at checkout only.
- No change to `workspace_subscriptions` schema, `consumeOpportunityCredit()`, or `checkTrialGate()`.
- Friendly messages on billing failures.
- 375px layout works.
- One clear CTA per card.
- All controls have 44x44px touch targets.

---

## Roadmap Deltas

Later:

- Quiet hours. May be added later, but must never suppress urgent lead alerts, expiring-lead alerts, limit warnings, trial-ending, payment, or billing-critical messages.
- Editable `notification_email` override and verification flow.
- Vertical-playbook-aware Signal Sensitivity copy from Vertical Playbook Registry/config.
- Future signal taxonomy categories: Reviews & complaints, Property & tenant changes, and other vertical-specific categories.
- `pricing_tiers.is_public` or equivalent after schema decision.
- Promo-on-active-subscription and custom downgrade/proration rules after billing spec.

---

## Cross-Cutting Acceptance Guardrails

- No `push` in user-facing copy.
- `min_score_threshold` is not `high_score_threshold`.
- No hardcoded vertical strings in components.
- No hardcoded prices, thresholds, or email bodies.
- Protected billing primitives and `workspace_subscriptions` schema untouched.
- Quiet hours absent in MVP.

## Implementation Sequencing Recommendation

Do not implement all four tabs in one pass.

Recommended split:

1. Settings CP1 — Usage read-only + safe existing data.
2. Settings CP2 — Notifications email-labeled controls.
3. Settings CP3 — Signal Sensitivity existing fields only.
4. Settings CP4 — Plan & Billing read-only/current plan + portal links only.

Plan & Billing should come last because it has the highest blast radius.
