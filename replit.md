> ## ⚠️ HISTORICAL — Replit build notes, superseded
> The active workflow is Codex → GitHub → `main`, with Replit used for post-merge proof and cleanup unless Adam explicitly scopes otherwise.
> Current controlling sources: live code plus `docs/PM_OPERATING_SYSTEM.md`, `docs/PRODUCT_CONTEXT.md`, `docs/DECISIONS.md`, and `docs/DESIGN_SOURCE_OF_TRUTH.md`.
> Do not infer the active branch, checkpoint, product behavior, pricing, design, or schema/migration process from this file when it conflicts with current code or docs.

# Fetchi.ai — Agent Instructions

## Project
Signal-based lead generation SaaS for service businesses.
Owner: Adam Teschel

## Tech stack
- Next.js 14 App Router, TypeScript
- Tailwind CSS + shadcn/ui
- Neon PostgreSQL 16 via Drizzle ORM (DATABASE_URL auto-injected by Replit — never set manually)
- Clerk Organizations for auth
- LLM — provider-agnostic via lib/agents/providers.ts. Supports anthropic, openai, google, groq, together, custom. Provider + model for each of the 10 agents is set through the admin panel at /admin/agents — never in code. Seed value is 'set-in-admin' as a reminder.
- All provider API keys are optional — only add keys for providers you actually use
- Search provider abstraction for signal detection — SerpAPI is the default launch provider, but all runtime search calls go through `lib/search/SearchProvider` and `search_providers`.
- Stripe for billing — BYOK only, DO NOT use Replit Stripe connector
- Resend for email
- Mapbox GL JS + Mapbox Geocoding API for maps
- Deepgram Nova-3 for voice

---

## CRITICAL: Stripe — BYOK only, do not use the Replit Stripe connector

Stripe must be built from scratch using BYOK Stripe. Replit has a built-in Stripe connector that auto-scaffolds its own payment schema and checkout UI. **Do not use it.** The Fetchi subscription model is too custom — trial counters, tier-specific limits, the 5-lead gate, top-up rate per opportunity, monthly + annual billing — the Replit connector would overwrite this with its own schema and break everything.

**What to build (from the brief, Section 15):**
- Stripe checkout sessions for tier subscription (monthly + annual price IDs)
- Webhook handler at `/api/stripe/webhook` for `customer.subscription.*`, `invoice.payment_*`, `checkout.session.completed`
- Subscription state sync into `workspace_subscriptions` table
- Billing portal redirect
- Top-up flow (one-time payment, increments `opportunities_used` reset, applies tier-specific top-up rate)
- Trial expiry auto-charge when card on file
- Coupon API integration for promo codes (`promo_codes` table mirrors Stripe coupons via API)

**Rules:**
DO NOT use the Replit Stripe connector.
DO NOT run any Stripe setup wizard.
DO NOT modify the `workspace_subscriptions` schema in `db/schema.ts`.
DO NOT modify `consumeOpportunityCredit()` in `db/index.ts`.
DO NOT modify `checkTrialGate()` in `db/index.ts`.

These three functions are the source of truth for subscription state. Build Stripe AROUND them, never replacing them.

**Stripe API keys to wire into Replit Secrets:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_STARTER_PRICE_ID
STRIPE_GROWTH_PRICE_ID
STRIPE_PRO_PRICE_ID
STRIPE_SCALE_PRICE_ID
STRIPE_STARTER_ANNUAL_PRICE_ID
STRIPE_GROWTH_ANNUAL_PRICE_ID
STRIPE_PRO_ANNUAL_PRICE_ID
STRIPE_SCALE_ANNUAL_PRICE_ID
```

---

## CRITICAL: DATABASE_URL is auto-injected

Replit automatically provides DATABASE_URL for the built-in PostgreSQL database.
Do NOT add DATABASE_URL to Replit Secrets manually.
Do NOT modify the database connection in db/index.ts.

To apply schema: npx drizzle-kit push
To load seed data: npx tsx db/seed.ts

---

## CRITICAL: Search provider architecture — SerpAPI-native at launch, provider-agnostic by design

Before implementing Query Builder, SearchProvider, Signal Detection, scout execution, or `search_signals`, the builder must read/install the SerpAPI web-search skill:

```
npx skills add serpapi/skills
```

If unavailable, copy/read:

```
skills/serpapi-web-search/SKILL.md → .claude/skills/serpapi-web-search/SKILL.md
```

This is build-time context for the launch adapter only. Do **not** vendor-lock the product architecture to SerpAPI.

Rules:
- Product architecture: `Query Builder → SearchProvider → provider adapter → parsed signal → evidence-backed lead card`.
- Launch provider: SerpAPI via `lib/search/providers/serpapi.ts`.
- Provider config lives in `search_providers` and `/admin/search-providers`.
- `query_strategies` stores query templates and provider engines.
- Admin freeform notes/skill context can reference SerpAPI, but structured config + adapter code are the source of truth.
- Never call SerpAPI directly from routes, React components, or agent code.
- Every search execution logs provider, engine, query, location, workspace_id, trigger, cost estimate, result count, and error state.

---

## Architecture rules

- **LLM is fully provider-agnostic** — all 10 agents read their provider + model from the agent_registry table at runtime. Never hardcode a model name or provider in agent code. Set provider + model for each agent through the admin panel at /admin/agents.
- All LLM calls route through lib/agents/providers.ts LLMProvider interface — never call Anthropic/OpenAI/Groq/Google SDKs directly from agent code
- Escalation (optional higher-tier model) is also configured per-agent in the admin panel — not in code
- Never hardcode SerpAPI calls — always use SearchProvider abstraction in lib/search/ and the active provider row from `search_providers`. SerpAPI details belong only in `lib/search/providers/serpapi.ts`.
- Search provider rule: Fetchi is provider-agnostic by architecture and SerpAPI-native at launch. Use `google_light` (not `google`), `google_news_light` (not `google_news`), `google_maps`, and `google_jobs` for the launch SerpAPI adapter.
- Never hardcode Claude prompts — always read from prompts table via lib/prompts/
- Every database query must include workspace_id — workspace scoping enforced in application code (RLS policies can be added later)
- Opportunity counter uses atomic SQL only — see consumeOpportunityCredit() in db/index.ts
- Learning context lives in workspace_learning table — NOT workspace_settings
- SMS fields are NOT in notification_preferences — email only at launch (TCPA risk)

---

## Design system

- Fonts: Outfit (headings, weight 600-800), DM Sans (body) — Google Fonts
- Brand green: #58937E | Brand dark: #3D6B5A | Brand light: #EAF3EF
- Coral: #D85A30 | Background: #EBE6D9 (parchment) | Dark: #2D2B2A
- Avatar: ツ in green rounded square — border-radius 14px, border 3.5px #2D2B2A, box-shadow 5px 5px 0 #2D2B2A, transform rotate(-2deg)
- Wordmark: Outfit weight 600, letter-spacing -0.045em
- Sidebar background: #2D2B2A, width 220px
- Reference design/fetchi_core_screens.html and design/fetchi_settings_screens.html for all UI patterns
- DO NOT reference haink_*.html files — they are obsolete and wrong

---

## Coding style

- TypeScript strict mode throughout
- Prefer React Server Components in Next.js App Router
- Use Drizzle query builder — raw SQL only for atomic counter operations
- Keep API routes thin — all business logic lives in lib/, not route handlers
- Every user-facing error maps to a friendly message — never expose raw errors or stack traces
- Mobile-first always: write default (mobile) Tailwind styles first, add lg: overrides for desktop
- Never build desktop-first and shrink down
- Minimum touch target: 44×44px on all interactive elements — use padding to expand hit area
- Test every new component at 375px width before marking it done

---

## Phase 1 scope — everything in this build

Phase 1 includes the full customer app AND the full admin console.
No deferrals. No "Phase 2" or "Phase 3" splits. Build everything.

Customer app: landing, auth, onboarding, chat, leads, profile, settings,
trial gate, usage, billing, map tab, voice input.

Admin console (/admin): dashboard, workspaces, billing ops, support tools,
pricing & plans, system settings, email templates, agent registry, prompts,
abuse detection, agent operations, system health, feature flags, announcements,
conversion funnel, retention cohorts, data export, Search Ops, Cost & Margin,
Provider Keys & Model Routing, Source Registry, Deployment Health, and Signal Quality Controls.

Background systems: Stripe billing, all 10 agents, Query Builder, nightly cron,
weather events, webhook system, eval framework, search replay metadata, cost/margin metadata,
and provider/source/deployment health reporting.

## Admin-controlled configuration — NEVER hardcode

These four tables hold values the admin panel writes and the code reads at runtime:

- pricing_tiers — all prices, opportunity limits, top-up rates, Stripe price IDs
- system_settings — trial config, score thresholds, rate limits, cron schedules, abuse thresholds
- email_templates — all email content with variable substitution
- tier_features — which features unlock at which tier

Code MUST read from these tables at runtime. Never inline a price, threshold,
cron schedule, or email body in code. If you find yourself typing a number
that someone might want to change in 3 months, it belongs in system_settings.

---

## Replit Agent build checkpoints

This is a build-from-scratch handoff. Replit Agent should write application code, but should not rewrite the protected handoff files unless a checkpoint explicitly requires a small fix approved by Adam.

Execute the build in checkpoints. Pause and confirm with Adam at each checkpoint before continuing.

**Checkpoint 1 — Foundation**
1. Create/verify a Next.js 14 App Router + TypeScript project.
2. Install dependencies for the approved stack only: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, postgres-js, Clerk, Stripe, Resend, Mapbox GL JS, Deepgram, SerpAPI client, configured LLM provider SDKs, plus explicitly required utilities such as `zod`, `date-fns`, and `disposable-email-domains`.
3. Run `npx drizzle-kit push`.
4. Run `npx tsx db/seed.ts`.
5. Verify `npm run dev` starts cleanly.

**Checkpoint 2 — Customer app shell**
- Build app layout, Clerk auth, email verification, onboarding, seeded chat, My Leads, Lead Profile, basic settings, and mobile navigation.

**Checkpoint 3 — Admin shell + config tables**
- Build `/admin` layout, admin gating by `FETCHI_ADMIN_USER_IDS`, and config-table screens for pricing, system settings, email templates, prompts, and agents.
- Screenshot `/admin/agents` and `/admin/pricing` before moving to live agent execution.

**Checkpoint 4 — Billing + trial gate**
- Build BYOK Stripe checkout, webhooks, billing portal, subscription sync, top-ups, trial gate, and trial-expiry page.
- Build around `workspace_subscriptions`, `consumeOpportunityCredit()`, and `checkTrialGate()`; do not replace those primitives.

**Checkpoint 5 — Provider abstraction + agent stubs**
- Build `lib/agents/providers.ts`, `lib/search/SearchProvider.ts`, runtime agent config loading, and all 10 agent shells without live execution.

**Checkpoint 6 — Live signal/agent execution + scout coverage gate**
- Wire SerpAPI, Query Builder, deduplication, enrichment, scoring, conversation, outreach, notification, cron, weather jobs, scout schedules, and `market_coverage` gating before scheduled scouts run.
- Scheduled scout gate checks: user mode, plan cap from `system_settings`, market coverage cap, remaining credits, daily spend cap, and pause state. Manual chat searches remain allowed within plan/spend limits.

**Checkpoint 7 — Growth and integrations**
- Build referrals, promo codes, affiliate skeleton, UTM tracking, OAuth send-as, webhooks, and eval framework.

**Checkpoint 8 — Operations cockpit + deployment**
- Build Search Ops, Market Coverage, Search Provider Registry, Cost & Margin, Provider Keys & Model Routing, metadata-first Source Registry, Deployment Health, Signal Quality Controls, testing, deployment readiness, and `/api/health`.

Dependency rule: install only packages required by the approved stack or explicitly required by the brief. Ask Adam before adding anything outside that stack.

---

## Secrets to wire into Replit Secrets

**DATABASE_URL is NOT in this list — Replit auto-injects it. Do not add it.**

```
# LLM Provider API Keys
# Add keys only for providers you configure in the admin panel at /admin/agents
# All are optional — the system won't call a provider unless an agent is configured to use it
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
TOGETHER_API_KEY=
# For custom OpenAI-compatible endpoints:
# CUSTOM_LLM_BASE_URL=
# CUSTOM_LLM_API_KEY=

# SerpAPI — needed for live signal detection
SERPAPI_API_KEY=

# Clerk — required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Stripe — BYOK only, DO NOT use Replit Stripe connector
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_STARTER_PRICE_ID=
STRIPE_GROWTH_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_SCALE_PRICE_ID=
STRIPE_STARTER_ANNUAL_PRICE_ID=
STRIPE_GROWTH_ANNUAL_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_SCALE_ANNUAL_PRICE_ID=

# Resend — required for digest and notification emails
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@fetchi.ai
RESEND_PHYSICAL_ADDRESS=         # Add real address before sending any emails (CAN-SPAM)

# Deepgram — voice input
DEEPGRAM_API_KEY=

# Mapbox — map tab
NEXT_PUBLIC_MAPBOX_TOKEN=

# OAuth Send-As — for outreach via contractor's own email account
# Google: console.cloud.google.com → OAuth 2.0 Client ID, Web application
# Microsoft: portal.azure.com → App registrations, Web platform
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=

# Admin gate
FETCHI_ADMIN_USER_IDS=           # Comma-separated Clerk user IDs that get /admin access

# App config
NEXT_PUBLIC_APP_URL=https://fetchi.ai
APP_SECRET=                      # Random string — used for HMAC webhook signatures AND OAuth token encryption
UNSUBSCRIBE_SECRET=              # Random string for signed unsubscribe URLs
```

---

## Key files — do not rewrite these

- FETCHI_CLAUDE_CODE_BRIEF.md — full product spec and source of truth for all decisions
- db/schema.ts — complete Drizzle ORM schema, all tables and relations
- db/index.ts — database connection, consumeOpportunityCredit(), checkTrialGate()
- drizzle.config.ts — Drizzle configuration
- db/seed.ts — Phase 1 seed data including pricing tiers, system settings, email templates, promo codes, affiliates, agent registry
- design/fetchi_core_screens.html — UI reference: chat, leads, profile, onboarding
- design/fetchi_settings_screens.html — UI reference: all settings pages
- design/fetchi_map_view.html — UI reference: map tab
- design/fetchi_admin_screens.html — UI reference: admin operations screens
- design/fetchi_landing_page_v2.html — landing page reference
