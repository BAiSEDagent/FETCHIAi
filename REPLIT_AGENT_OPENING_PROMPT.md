# Replit Agent — Opening Prompt for Fetchi Build

## Paste this exactly when you start the build session

---

I'm building Fetchi.ai, a signal-based lead generation SaaS for local service businesses.

**Read these files in this order before writing any code:**

1. `replit.md` — your operating instructions and architecture rules
2. `FETCHI_CLAUDE_CODE_BRIEF.md` — the complete product specification (4,000+ lines, 32 sections)
3. `db/schema.ts` — the complete Drizzle ORM schema, 41 tables (do not rewrite this)
4. `db/index.ts` — database connection and atomic counter functions (do not rewrite this)
5. `db/seed.ts` — Phase 1 seed data (do not rewrite this)
6. `design/fetchi_landing_page_v2.html` — landing page design reference
7. `design/fetchi_core_screens.html` — core app screens design reference
8. `design/fetchi_settings_screens.html` — settings screens design reference
9. `design/fetchi_map_view.html` — map tab design reference
10. `design/fetchi_admin_screens.html` — admin console design reference (16 base screens; additional operations screens follow the same design language)

**The brief is the source of truth. If anything you do conflicts with it, the brief wins.**

---

## What I want you to build

The complete Fetchi product. Section 19 of the brief lists 68 items — build all of them. Customer app, admin console, all 10 agents, Stripe billing (monthly + annual), map tab, voice input, eval framework, SEO pages, webhook system, user referrals, promo codes, affiliate skeleton, conversion tracking, OAuth send-as for Google/Microsoft, scout policy with cost layer separation, market coverage gating, and margin protection (Section 31), Today's Stack mobile swipe review mode (Section 30), and search provider architecture (Section 32). No deferrals.

The growth systems (referrals, promos, affiliates, tracking, OAuth) are documented in Section 28 of the brief. The operations cockpit improvements (Search Ops, Cost & Margin, Provider Keys & Model Routing, Source Registry, Deployment Health, Signal Quality Controls, and customer-facing evidence/freshness/find-more improvements) are documented in Section 29. Today's Stack mobile swipe review mode is documented in Section 30. Search provider architecture is documented in Section 32. Read these sections carefully before building those features.

---

## Critical rules — do not violate these

1. **DO NOT use the Replit Stripe connector.** Stripe is BYOK — build the integration from scratch using the spec in Section 15 of the brief: checkout sessions, webhook handler, subscription sync, billing portal, top-up flow. Build Stripe AROUND `workspace_subscriptions`, `consumeOpportunityCredit()`, and `checkTrialGate()` — never replacing them.

2. **DO NOT enable Replit AI Integrations for Anthropic.** All LLM calls go through `lib/agents/providers.ts`. Each agent reads its provider and model from the `agent_registry` table at runtime — never hardcoded in code.

3. **DO NOT modify** `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`, or `db/seed.ts`. These are finalized — use them as-is.

4. **Install required dependencies for the approved stack only.** The stack is: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, postgres-js, Clerk, Stripe, Resend, Mapbox GL JS, Deepgram, SerpAPI client, the LLM provider SDKs (anthropic, openai, groq, google-generative-ai — install only the ones I configure in the admin panel), and any standard dependency explicitly required by the brief (e.g. `disposable-email-domains`, `zod` for validation, `date-fns` for date handling). Ask before adding anything outside this stack.

5. **DO NOT hardcode** prices, opportunity limits, score thresholds, cron schedules, email content, or feature gates. All of these live in the four config tables: `pricing_tiers`, `system_settings`, `email_templates`, `tier_features`. Code reads from these tables at runtime.

6. **Mobile-first.** Every component must work at 375px width. Write default Tailwind styles for mobile, add `lg:` overrides for desktop. Never desktop-first.

7. **Minimum touch target 44×44px.** Use padding to expand hit areas.

8. **Every database query uses workspace_id.** Workspace scoping is enforced in application queries (RLS policies can be added later if needed).

9. **Search provider architecture:** Fetchi is provider-agnostic by architecture and SerpAPI-native at launch. Before building search code, read/install the SerpAPI web-search skill. Use `google_light` (not `google`), `google_news_light` (not `google_news`), `google_maps`, and `google_jobs` in the SerpAPI adapter. Never call SerpAPI directly outside `lib/search/providers/serpapi.ts` and `lib/search/SearchProvider.ts`.

10. **Brand:** ツ in green rounded square. Outfit (headings) + DM Sans (body). Brand green `#58937E`. Dark `#2D2B2A`. Parchment `#EBE6D9`.

---

## Build order — execute in checkpoints, not all at once

The scope is large (68 items in Section 19 of the brief). Do NOT try to build everything in one pass. Execute in checkpoints. **Pause and confirm with me at each checkpoint before continuing.**

**Checkpoint 1 — Foundation**
- Install dependencies for the approved stack
- Run `npx drizzle-kit push` to apply the schema
- Run `npx tsx db/seed.ts` to load seed data
- Verify `npm run dev` starts cleanly
- Confirm with me before proceeding

**Checkpoint 2 — Customer app shell**
- App layout (sidebar, credits widget, mobile hamburger)
- Clerk auth + email verification + disposable email block
- Onboarding (3 steps + finding screen)
- Main chat rendering seeded leads (UI only, no live LLM)
- My Leads list, Lead Profile (read seeded data)
- Confirm with me before proceeding

**Checkpoint 3 — Admin shell + config tables**
- `/admin` layout (dark sidebar, gated by FETCHI_ADMIN_USER_IDS)
- `/admin/pricing` reading from `pricing_tiers`
- `/admin/system-settings` reading from `system_settings`
- `/admin/email-templates` reading from `email_templates`
- `/admin/agents` reading from `agent_registry`
- **Screenshot `/admin/agents` and `/admin/pricing` and show me before proceeding**

**Checkpoint 4 — Billing + trial gate**
- Stripe BYOK integration (checkout, webhook, portal) per Section 15 of the brief
- Trial gate UI (modal at 5-lead threshold)
- Trial expiry page at `/app/expired`
- Card-on-file auto-charge on trial end
- Confirm with me before proceeding

**Checkpoint 5 — LLM provider abstraction + agent stubs**
- `lib/agents/providers.ts` with LLMProvider interface
- Anthropic + OpenAI + Groq + Google + Together + Custom implementations
- All 10 agents registered, reading config from `agent_registry`
- Agent runner that loads provider/model at runtime
- Confirm with me before proceeding (no live execution yet)

**Checkpoint 6 — Live agent execution + scout system**
- Install/read the SerpAPI web-search skill before search code. Build `lib/search/SearchProvider.ts`, `lib/search/providers/serpapi.ts`, and `search_providers`-backed routing first. Then wire Signal Detection, Deduplication, Enrichment, and Quality Scoring agents to real search calls through SearchProvider.
- Conversation Agent wired to chat UI
- Outreach Drafting wired to lead profile
- Nightly cron schedules from `system_settings`
- Weather events fetch job
- **Scout schedule system** (`scout_schedules`, `scout_runs`, `market_coverage` tables) — per-workspace cron evaluation, market coverage gate, hard daily caps by tier from `system_settings`, atomic run recording for scheduled + manual chat/map scans
- **Scout margin protection** — auto-pause for credits-zero, dormant workspace, cost-per-lead anomaly, consecutive empty runs
- **Customer scouting settings page** (`/app/settings/scouting`) + onboarding step 4 for mode selection using calm customer labels: Only when I ask / Once each morning / A few times per day / Custom schedule. Do not show "aggressive" to customers.
- **Credit consumption rule** — lead credits consumed only on delivered lead cards, never on scans, never on passes. Empty runs never call `consumeOpportunityCredit()`. Delivered cards consume exactly once, then `scout_runs.credit_consumed = true` and `leads_delivered` records the count. Admin can manually credit back via `/admin/billing`.
- **Empty-run UX** — show "Fetchi checked X sources, no strong leads matched" message, do not consume credits
- Confirm with me before proceeding

**Checkpoint 7 — Growth systems**
- User referrals (`/app/refer` + `/admin/referrals`)
- Promo codes (admin CRUD + Stripe coupon sync + signup form integration)
- Affiliate skeleton (admin CRUD + cookie attribution + commission accrual)
- Conversion tracking (UTM capture + `/admin/acquisition`)
- OAuth send-as (Google + Microsoft, `/app/settings/integrations`)
- Confirm with me before proceeding

**Checkpoint 8 — Operations cockpit**
- Search Ops (`/admin/search-ops`)
- Search Provider Registry (`/admin/search-providers`) — structured provider config, skill/docs reference, default engines, test provider; do not rely on freeform context as source of truth
- Cost & Margin (`/admin/costs`)
- Provider Keys & Model Routing (`/admin/providers`)
- Source Registry (`/admin/sources`) — metadata-first in Phase 1; use `query_strategies`, `system_settings`, and agent run metadata, not a new table
- Deployment Health (`/admin/deployment`)
- Signal Quality Controls (`/admin/signal-quality`)
- Scout Controls (`/admin/scout`) — admin override of scout policy, force resume, test scout
- Market Coverage (`/admin/coverage`) — coverage status by geography + vertical, recommended mode, coverage caps, enabled signal types
- Customer improvements from Section 29: evidence drawer, freshness clock, find-more-like-this, outcome tags, territory heat map
- Confirm with me before proceeding

**Checkpoint 9 — Today's Stack (mobile review mode)**
- `/app/today` card stack with front card design (field-report aesthetic, not dating-app)
- Card back / evidence view with trust summary and numbered sources
- Buttons canonical: Pass · Snooze · Open evidence · Add to run
- Swipe gestures as bonus shortcuts (controlled by `todays_stack_swipes_enabled` setting)
- Why pass? modal writing to `lead_pass_reasons` table
- "Added" toast confirming "Draft prepared, not sent"
- `/app/today/run` with route view, drive time, pipeline estimate, draft preparation per stop
- Quality Scoring Agent reads aggregated pass reasons → surfaces suggestions in conversation agent
- Mobile bottom nav: Chat · Today · Leads · Map · Settings
- Confirm with me before proceeding

**Checkpoint 10 — Polish + deploy**
- Remaining admin screens (abuse, agent ops, system health, feature flags, announcements, funnel, cohorts, exports, OAuth oversight)
- Webhook system
- Voice input (Deepgram)
- Map tab (Mapbox)
- Eval framework
- SEO programmatic pages (schema + template only — populate when real data flows)
- Test, deploy to Reserved VM, UptimeRobot health check

---

## API keys to wire into Replit Secrets

See the full list in `replit.md`. The DATABASE_URL is auto-injected by Replit — do not set it manually.

Start with these for development:
- Clerk (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET)
- Resend (RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_PHYSICAL_ADDRESS)
- SerpAPI (SERPAPI_API_KEY)
- Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN)
- Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- FETCHI_ADMIN_USER_IDS (comma-separated Clerk user IDs that get admin access)
- APP_SECRET, UNSUBSCRIBE_SECRET (random strings)

LLM provider keys are added as I configure each agent in admin — start with ANTHROPIC_API_KEY (for conversation + outreach) and GROQ_API_KEY (for everything else).

---

## When you get stuck

If you hit something architectural that isn't clear, **stop and ask me** before guessing. Don't silently rewrite logic, don't add packages I didn't approve, don't simplify something just to make it compile.

I have Claude as a consultant for tough architectural questions — I'll bring you the answer if I need to. Your job is to execute the brief, not redesign it.

Ready when you are. Start with reading the files in order, then confirm you understand the scope before writing any code.
