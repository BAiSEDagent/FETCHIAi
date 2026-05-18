# Fetchi.ai — Build Handoff Package

This zip contains everything Replit Agent needs to build Fetchi.ai from scratch.

## What this is

Fetchi.ai is a signal-based lead generation SaaS for local service businesses (roofers, cleaners, HVAC, landscapers). It watches public sources for buying signals (permits, storm damage, new business listings, job postings), detects who needs the service right now, explains why, and helps the contractor reach out.

This is a complete spec — schema, seed data, design mockups, operating instructions, and the full product brief. There is no application code yet. Replit Agent builds the application code from this spec.

---

## Folder structure when you unzip

```
fetchi-handoff/
├── START_HERE.md                     ← this file
├── REPLIT_AGENT_OPENING_PROMPT.md    ← paste this exact text into Replit Agent first
├── replit.md                         ← drop at project root — Replit Agent reads this every session
├── FETCHI_CLAUDE_CODE_BRIEF.md       ← the full 4,000+ line product spec (source of truth)
│
├── db/                               ← drop entire folder into project root
│   ├── schema.ts                     ← complete Drizzle ORM schema (41 tables)
│   ├── index.ts                      ← DB connection + atomic counter functions
│   └── seed.ts                       ← Phase 1 seed data
│
├── drizzle.config.ts                 ← drop at project root
│
└── design/                           ← UI reference mockups for every screen
    ├── fetchi_landing_page_v2.html   ← landing page design
    ├── fetchi_core_screens.html      ← chat, my leads, lead profile, onboarding
    ├── fetchi_settings_screens.html  ← all settings pages
    ├── fetchi_map_view.html          ← map tab design
    └── fetchi_admin_screens.html     ← 16 admin operations screens
```

---

## Step-by-step instructions

### Step 1: Create the Replit project
- Open Replit
- Start a new project, choose Next.js + TypeScript template
- Replit auto-provisions a Postgres database (DATABASE_URL is auto-injected — don't set it manually)

### Step 2: Copy files into the project
- Drop `replit.md` at the project root
- Drop `FETCHI_CLAUDE_CODE_BRIEF.md` at the project root
- Drop `drizzle.config.ts` at the project root
- Create a `db/` folder and drop `schema.ts`, `index.ts`, and `seed.ts` into it
- Create a `design/` folder and drop all 5 HTML mockups into it
- Keep `REPLIT_AGENT_OPENING_PROMPT.md` open — you'll paste its contents into Replit Agent

### Step 3: Start the Replit Agent session
- Open Replit Agent
- Paste the entire contents of `REPLIT_AGENT_OPENING_PROMPT.md` as your first message
- Replit Agent will read the files in order and confirm scope before writing code

### Step 4: Wire API keys into Replit Secrets
Replit Agent will prompt you for these. The full list is in `replit.md` under "Secrets to wire into Replit Secrets." For Phase 1 you'll need at minimum:

- Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`)
- Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and the 8 price IDs)
- Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_PHYSICAL_ADDRESS`)
- SerpAPI (`SERPAPI_API_KEY`)
- Mapbox (`NEXT_PUBLIC_MAPBOX_TOKEN`)
- Deepgram (`DEEPGRAM_API_KEY`)
- Admin (`FETCHI_ADMIN_USER_IDS` — comma-separated Clerk user IDs)
- App (`APP_SECRET`, `UNSUBSCRIBE_SECRET`, `NEXT_PUBLIC_APP_URL`)
- OAuth send-as (`GOOGLE_OAUTH_*` and `MICROSOFT_OAUTH_*`)
- LLM providers (`ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `GOOGLE_AI_API_KEY` — add the ones you configure in admin)

**Critical: Do NOT set `DATABASE_URL` manually. Replit auto-injects it.**

**Critical: Do NOT use the Replit Stripe connector. Use BYOK Stripe only.**

---

## What Replit Agent will build

Section 19 of the brief lists 68 build items. Everything ships in Phase 1:

- Customer app — landing, auth, onboarding, chat, leads, profile, settings, trial gate, usage, billing, map tab, voice input, refer page, integrations page
- Admin console at `/admin` — full operations console covering dashboard, workspaces, billing ops, support, abuse, agent registry, prompts management, pricing CRUD, system settings CRUD, email templates CRUD, feature flags, announcements, referrals, promo codes, affiliates, acquisition analytics, OAuth oversight, Search Ops, Cost & Margin, Provider Keys & Model Routing, Source Registry, Deployment Health, and Signal Quality Controls
- 10 background agents (signal detection, deduplication, enrichment, scoring, staleness, outcome learning, notification, onboarding, conversation, outreach) — all configured at runtime via the admin panel, never in code
- Stripe billing — BYOK, monthly + annual, 4 tiers, top-up flow
- Webhook system for outbound integrations
- OAuth send-as for Google Workspace and Microsoft 365
- User referrals, promo codes, affiliate skeleton
- Conversion tracking with UTM capture
- Eval framework

---

## Key architectural rules (Replit Agent must follow)

1. **DATABASE_URL is auto-injected by Replit** — never set manually
2. **No Replit Stripe connector** — BYOK Stripe only, integration code is built from the brief
3. **No Replit AI Integrations for Anthropic** — all LLM calls go through `lib/agents/providers.ts`
4. **Provider-agnostic LLM** — every agent reads its provider + model from `agent_registry` table at runtime. Never hardcoded. Set via admin panel at `/admin/agents`
5. **No hardcoded constants** — prices, thresholds, cron schedules, email content all live in 4 config tables (`pricing_tiers`, `system_settings`, `email_templates`, `tier_features`) and are edited via admin panel
6. **Mobile-first** — write mobile Tailwind styles first, add `lg:` overrides for desktop. 44×44px minimum touch targets
7. **Every database query uses `workspace_id`** — workspace scoping enforced in application code
8. **Search provider architecture** — provider-agnostic at the architecture level, SerpAPI-native at launch. SerpAPI engines: use `google_light` (not `google`), `google_news_light` (not `google_news`)
9. **Atomic counters only** — `consumeOpportunityCredit()` uses UPDATE...WHERE...RETURNING, never read-then-write

The full architecture rules are in `replit.md` at the project root.

---

## If something is unclear

The brief is 4,000+ lines and authoritative. If Replit Agent's approach contradicts anything in the brief, the brief wins.

If Replit Agent gets architecturally stuck, you can consult Claude (Anthropic's chat) in a separate session, paste back the answer, and have Replit Agent continue. Don't let Claude touch the repo directly — single builder, single mental model.

---

## File reference quick-lookup

| When you need… | Look at… |
|---|---|
| The full product spec | `FETCHI_CLAUDE_CODE_BRIEF.md` |
| Operating instructions for Replit Agent | `replit.md` |
| The exact prompt to start the build | `REPLIT_AGENT_OPENING_PROMPT.md` |
| Database table definitions | `db/schema.ts` |
| Atomic counters and trial gate logic | `db/index.ts` |
| Seed data for Phase 1 | `db/seed.ts` |
| Drizzle ORM config | `drizzle.config.ts` |
| Customer app UI reference | `design/fetchi_core_screens.html`, `design/fetchi_settings_screens.html` |
| Map tab UI reference | `design/fetchi_map_view.html` |
| Admin console UI reference | `design/fetchi_admin_screens.html` |
| Landing page UI reference | `design/fetchi_landing_page_v2.html` |

Ready to build.
