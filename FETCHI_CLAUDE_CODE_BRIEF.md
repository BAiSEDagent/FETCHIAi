# Fetchi.ai — Full Technical Brief
**Version:** 1.0  
**Date:** April 11, 2026  
**Owner:** Adam Teschel  
**Purpose:** Complete technical specification for building Fetchi.ai — signal-based lead generation SaaS for service businesses.

---

## 1. PRODUCT OVERVIEW

**Fetchi.ai** is a signal-based lead generation agent for local and commercial service businesses. It watches the public internet for buying signals — permit filings, storm damage, new business listings, business license renewals — detects who likely needs a service right now, explains why, and helps the user reach out.

**Name and brand:**
- Product name: **Fetchi**
- Domain: **fetchi.ai**
- Avatar/Icon: **ツ** (katakana tsu) — renders as a subtle face at small sizes, giving the brand personality. White on green rounded square with dark border + box shadow. Slight −2° rotation on the icon.
- Brand color: **#58937E** (muted sage green)
- Brand dark: **#3D6B5A**
- Brand light: **#EAF3EF**
- Accent: **#D85A30** (coral)
- Background: **#EBE6D9** (parchment)
- Dark: **#2D2B2A** (near-black — slightly warmer than pure #2a2a2a)
- Heading font: **Outfit** (weight 600–800) — used in logo wordmark and all display headings
- Body font: **DM Sans** — used for all UI labels, body copy, buttons
- Logo wordmark font: **Outfit** weight 600, letter-spacing −0.045em

**One-sentence promise:**  
"Tell us what your business sells — we'll find the buyers who need it this week."

**Core loop:**
```
Signal → Prospect + Enrichment → Opportunity (scored + explained) → Contact Route → Outreach Play
```

**The 3 laws:**
1. No lead without evidence — every opportunity shows the public signal behind it
2. No score without reason — users see why something ranked high
3. No explanation without action — every lead ends in a clear next step

**Conversation scope (Option 2 — soft boundary):**

Fetchi answers questions about:
- Finding leads and signals in their market
- Outreach — writing emails, follow-ups, scripts
- Sales — pricing guidance, how to quote jobs, closing tips
- Their local market — who's building, who's moving, what's happening
- Their existing leads — status, follow-ups, next steps

Fetchi redirects everything else warmly:
> "That's a bit outside what I'm built for — I'm best at finding you leads and helping you close them. Want me to [suggest relevant action]?"

Fetchi never gives medical, legal, or financial advice. Never answers questions unrelated to their business or sales.

---

## 2. TECH STACK

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | TypeScript throughout |
| UI | Tailwind CSS + shadcn/ui | Fetchi design system on top |
| Fonts | Outfit + DM Sans | Google Fonts. **Outfit** (wght 600–800) for all headings, display text, and the wordmark. **DM Sans** for all body copy, UI labels, buttons, form inputs. Import both via `<link>` in `_document.tsx`. Never use Georgia, Inter, or system fonts. |
| Database | Neon PostgreSQL (via Replit) | Drizzle ORM |
| Auth | Clerk Organizations | Multi-tenant from day one |
| Billing | Stripe | Subscriptions + one-time top-ups |
| Email | Resend | Transactional + digest emails |
| Voice | Deepgram Nova-3 | Browser Web Speech API → Deepgram transcription |
| Maps | Mapbox GL JS + Mapbox Geocoding API | Free tier: 50,000 map loads/month, 100,000 geocoding requests/month. GL JS for the map canvas. Geocoding API for the location search bar (converts "Dallas TX" → lat/lng). Both use `NEXT_PUBLIC_MAPBOX_TOKEN`. Style: `mapbox://styles/mapbox/light-v11`. |
| LLM | Provider-agnostic via `lib/agents/providers.ts` | Supports: `anthropic` \| `openai` \| `google` \| `groq` \| `together` \| `custom` (OpenAI-compatible). Each of the 10 agents has its own `provider` + `model` columns in the `agent_registry` table. **Set provider and model for each agent through the admin panel at `/admin/agents` — never in code.** Default value in seed is `'set-in-admin'` so it's obvious what needs to be configured before agents run. |
| LLM — escalation | Configurable per agent in admin | Optional higher-tier model any agent can call for hard decisions. Provider can differ from primary. Also set via admin panel. |
| Search | Provider-agnostic via `lib/search/SearchProvider` | SerpAPI is the default launch provider, but the product architecture is not vendor-locked. Search providers are registered in `search_providers`, routed through provider adapters such as `lib/search/providers/serpapi.ts`, and configured in Search Ops. **Build-time requirement:** read/install the SerpAPI web-search skill before implementing the launch adapter so engine names, pagination, and parsing are correct. |
| Hosting | Replit (Reserved VM) | Build and launch on Replit. Add UptimeRobot for external health checks. Railway is the migration path if Replit becomes a bottleneck at scale. |
| Cron | Replit Scheduled Deployments | Nightly agent triggers. pg_cron as fallback. |
| Webhooks | Custom outbound webhook system | Per-workspace configurable |
| Prompts | Versioned in database | Never hardcoded in application code |

**Critical architectural rules:**
- **Buy search, build intelligence.** Never build scrapers. Fetchi is search-provider agnostic at the architecture level and SerpAPI-native at launch.
- **Provider abstraction from day one.** All search calls go through `lib/search/SearchProvider` and provider adapters. SerpAPI details live in `lib/search/providers/serpapi.ts` and `search_providers`, never in route handlers or generic business logic. Swapping providers later should not require rewriting the product loop.
- **Application first, infrastructure second.** Ship working product before optimizing.
- **Multi-tenancy from day one.** Every database record belongs to a workspace. Workspace scoping is enforced in every application query via `workspace_id`. Postgres RLS policies can be layered on top later if needed.
- **Prompt version control.** All LLM prompts stored in a `prompts` table with version numbers, timestamps, and performance metrics. Application reads active prompt version at runtime.

---

## 3. THE 6 CORE OBJECTS

Every feature maps to one of these. If it doesn't, question whether it belongs in v1.

```typescript
// 1. Service Profile — what the user sells, where, who they want
interface ServiceProfile {
  workspace_id: string
  business_name: string
  vertical: string          // 'commercial_cleaning' | 'roofing' | 'hvac' | 'landscaping' | 'event_services' | 'other'
  service_description: string
  location_city: string
  location_state: string
  location_radius_miles: number
  ideal_customer_description: string
  created_at: timestamp
  updated_at: timestamp
}

// 2. Signal — public event implying demand
interface Signal {
  id: string
  workspace_id: string
  signal_type: SignalType
  raw_data: jsonb            // full provider response
  parsed_data: jsonb         // extracted relevant fields
  source_url: string
  source_engine: string      // which provider engine found it, e.g. google_light at launch
  location: string
  detected_at: timestamp
  signal_hash: string        // for deduplication
  relevance_score: number    // 0-100 from LLM classification
  why_relevant: string       // LLM explanation
}

type SignalType = 
  | 'building_permit'
  | 'storm_damage'
  | 'new_business_listing'
  | 'business_license_renewal'
  | 'job_posting'
  | 'event_booking'
  | 'google_maps_new_listing'

// 3. Prospect — the business/org that may buy
interface Prospect {
  id: string
  workspace_id: string
  business_name: string
  address: string
  city: string
  state: string
  zip: string
  business_type: string
  phone?: string
  email?: string
  website?: string
  google_place_id?: string
  enrichment_status: 'pending' | 'success' | 'partial' | 'failed'
  enrichment_attempts: number
  enrichment_data: jsonb
  created_at: timestamp
  updated_at: timestamp
}

// 4. Opportunity — Prospect + Signal + fit = heart of the app
interface Opportunity {
  id: string
  workspace_id: string
  prospect_id: string
  signal_id: string
  
  // Scoring
  score: number              // 0-100
  score_history: jsonb[]     // [{score, scored_at, model_version}]
  why_now: string            // LLM-generated explanation
  why_relevant: string       // signal to need inference
  
  // Status
  status: OpportunityStatus
  lead_claimed_by?: string   // workspace_id — for future exclusivity
  lead_visible_to?: string[] // workspace_ids — null means all
  
  // Data lifecycle
  signal_detected_at: timestamp
  signal_verified_at?: timestamp
  signal_expires_at?: timestamp
  last_scored_at: timestamp
  
  // Outcome tracking (critical for learning)
  outcome?: 'won' | 'lost' | 'skipped' | 'not_interested'
  outcome_logged_at?: timestamp
  outcome_notes?: string
  
  // Cost tracking
  opportunity_cost: number   // credits consumed (default 1)
  
  created_at: timestamp
  updated_at: timestamp
}

type OpportunityStatus = 
  | 'new'
  | 'saved'
  | 'contacted'
  | 'responded'
  | 'won'
  | 'lost'
  | 'skipped'
  | 'expired'

// 5. Contact Route — how to reach them
interface ContactRoute {
  id: string
  prospect_id: string
  contact_name?: string
  contact_title?: string
  contact_email?: string
  contact_phone?: string
  contact_linkedin?: string
  source: string
  confidence: number         // 0-100
  verified: boolean
  created_at: timestamp
}

// 6. Outreach Play — what to say
interface OutreachPlay {
  id: string
  workspace_id: string
  opportunity_id: string
  contact_route_id?: string
  
  subject_line: string
  body: string
  signal_reference: string   // which signal is referenced in the outreach
  
  status: 'draft' | 'sent' | 'responded' | 'bounced'
  sent_at?: timestamp
  response_received_at?: timestamp
  
  prompt_version_id: string  // which prompt generated this
  model_used: string
  
  created_at: timestamp
  updated_at: timestamp
}
```

---

## 4. FULL DATABASE SCHEMA

**The canonical schema is in `db/schema.ts` (provided as a separate file alongside this brief).**

The SQL below documents the intent of each table. The builder must use the Drizzle ORM schema file — not this raw SQL — when building. The `db/schema.ts` file is the source of truth for all table definitions, column types, indexes, and relations.

**Key Replit database facts:**
- `DATABASE_URL` is auto-injected by Replit — never set it manually, never hardcode it
- Development database is provisioned automatically when you open the Database tool in Replit workspace
- Production database is separate — schema changes migrate over at publish time
- Drizzle ORM is the standard ORM — Replit Agent sets it up automatically
- Run migrations with: `npx drizzle-kit push` (dev) or via Replit's publish flow (production)
- Drizzle Studio is available in the Replit Database tool → My Data tab for visual inspection
- Run seed data with: `npx tsx db/seed.ts`

**Files provided alongside this brief:**
- `db/schema.ts` — complete Drizzle ORM schema, all tables, indexes, relations, and type exports
- `db/index.ts` — database connection, `consumeOpportunityCredit()`, `checkTrialGate()`
- `drizzle.config.ts` — Drizzle config pointing to `DATABASE_URL`
- `db/seed.ts` — Phase 1 seed data (5 opportunities, 6 prompts, 9 query strategies)

**Do not rewrite these files from scratch.** Copy them into the project as-is and run `npx drizzle-kit push` to apply the schema.

### Workspaces and subscriptions
```sql
-- Managed by Clerk Organizations — workspace_id = Clerk org_id

create table workspace_settings (
  workspace_id text primary key,
  owner_user_id text not null,
  business_name text,
  is_approved boolean default false,       -- Phase 1 gate before Stripe is wired
  onboarding_step integer default 0,       -- 0=not started 1=vertical 2=location 3=customer 4=complete
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table workspace_subscriptions (
  workspace_id text primary key references workspace_settings(workspace_id),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  billing_interval text not null default 'monthly', -- monthly | annual; preserves selected plan through card-free trial
  selected_stripe_price_id text,                    -- selected monthly/annual Stripe price ID for trial-gate checkout
  tier text not null default 'starter',    -- starter | growth | pro | scale
  opportunities_limit integer,             -- null = unlimited
  opportunities_used integer default 0,    -- paid counter (resets monthly)
  trial_opportunities_limit integer default 10,
  trial_opportunities_used integer default 0,  -- separate trial counter
  opportunities_reset_at timestamptz,
  topup_rate_cents integer default 50,     -- cents per opportunity topup
  status text default 'trialing',          -- trialing | active | past_due | canceled | expired
  trial_ends_at timestamptz,
  payment_method_on_file boolean default false,  -- true = card entered, false = card-free trial
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Outcome learning context stored separately from workspace_settings
-- to avoid workspace_settings becoming a dumping ground
create table workspace_learning (
  workspace_id text primary key references workspace_settings(workspace_id),
  learning_context text,                   -- prompt injection string built from last 30 outcomes
  outcomes_counted integer default 0,      -- how many outcomes have been processed
  updated_at timestamptz default now()
);

-- Optional Postgres RLS enhancement (NOT delivered by db/schema.ts — add manually if needed).
-- Workspace scoping is already enforced in every application query via workspace_id.
-- These RLS policies are belt-and-suspenders for defense-in-depth; not required for Phase 1.
-- alter table workspace_settings enable row level security;
-- alter table workspace_subscriptions enable row level security;
-- alter table workspace_learning enable row level security;
```

**Trial credit logic — `consumeOpportunityCredit()`:**
```typescript
// Trial users draw from trial_opportunities_used / trial_opportunities_limit
// Paid users draw from opportunities_used / opportunities_limit
// Logic:
async function consumeOpportunityCredit(workspaceId: string): Promise<boolean> {
  const sub = await getSubscription(workspaceId)
  
  if (sub.status === 'trialing') {
    // Use trial counter
    const result = await db.execute(sql`
      UPDATE workspace_subscriptions
      SET trial_opportunities_used = trial_opportunities_used + 1
      WHERE workspace_id = ${workspaceId}
        AND trial_opportunities_used < trial_opportunities_limit
      RETURNING trial_opportunities_used, trial_opportunities_limit
    `)
    return result.rowCount > 0
  }
  
  // Use paid counter (active/past_due)
  const result = await db.execute(sql`
    UPDATE workspace_subscriptions
    SET opportunities_used = opportunities_used + 1
    WHERE workspace_id = ${workspaceId}
      AND (opportunities_limit IS NULL OR opportunities_used < opportunities_limit)
    RETURNING opportunities_used, opportunities_limit
  `)
  return result.rowCount > 0
}
```

### Service profiles
```sql
create table service_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  business_name text not null,
  vertical text not null,
  service_description text not null,
  location_city text not null,
  location_state text not null,
  location_radius_miles integer default 50,
  ideal_customer_description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Signals
```sql
create table signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  signal_type text not null,
  raw_data jsonb not null,
  parsed_data jsonb,
  source_url text,
  source_engine text,          -- which provider engine found it
  location text,
  detected_at timestamptz default now(),
  signal_hash text unique,     -- sha256 of key fields for dedup
  relevance_score integer,
  why_relevant text,
  created_at timestamptz default now()
);

create index signals_workspace_idx on signals(workspace_id);
create index signals_type_idx on signals(signal_type);
create index signals_detected_idx on signals(detected_at desc);
create unique index signals_hash_idx on signals(signal_hash);
```

### Prospects
```sql
create table prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  business_name text not null,
  address text,
  city text,
  state text,
  zip text,
  business_type text,
  phone text,
  email text,
  website text,
  google_place_id text,
  enrichment_status text default 'pending',
  enrichment_attempts integer default 0,
  enrichment_data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index prospects_workspace_idx on prospects(workspace_id);
```

### Opportunities
```sql
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  prospect_id uuid references prospects(id),
  signal_id uuid references signals(id),
  
  score integer not null default 0,
  score_history jsonb default '[]',
  why_now text,
  why_relevant text,
  
  status text not null default 'new',
  lead_claimed_by text,        -- workspace_id for future exclusivity
  lead_visible_to text[],      -- null = visible to all workspaces
  
  signal_detected_at timestamptz,
  signal_verified_at timestamptz,
  signal_expires_at timestamptz,
  last_scored_at timestamptz,
  
  outcome text,
  outcome_logged_at timestamptz,
  outcome_notes text,
  
  opportunity_cost integer default 1,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index opportunities_workspace_idx on opportunities(workspace_id);
create index opportunities_status_idx on opportunities(workspace_id, status);
create index opportunities_score_idx on opportunities(workspace_id, score desc);
create index opportunities_created_idx on opportunities(workspace_id, created_at desc);
```

### Contact routes
```sql
create table contact_routes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id),
  contact_name text,
  contact_title text,
  contact_email text,
  contact_phone text,
  contact_linkedin text,
  source text,
  confidence integer default 0,
  verified boolean default false,
  created_at timestamptz default now()
);
```

### Outreach plays
```sql
create table outreach_plays (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  opportunity_id uuid references opportunities(id),
  contact_route_id uuid references contact_routes(id),
  
  subject_line text,
  body text not null,
  signal_reference text,
  
  status text default 'draft',
  sent_at timestamptz,
  response_received_at timestamptz,
  
  prompt_version_id uuid,
  model_used text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Prompt version control
```sql
create table prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- 'signal_classification' | 'why_now_generation' | 'outreach_drafting' | 'scoring'
  version integer not null,
  content text not null,           -- the actual prompt text
  model_target text,               -- which model this prompt is tuned for
  is_active boolean default false,
  performance_metrics jsonb default '{}',
  created_by text,
  created_at timestamptz default now(),
  unique(name, version)
);

create index prompts_active_idx on prompts(name, is_active) where is_active = true;
```

### Event tracking (passive UI analytics)
```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id text,
  event_type text not null,        -- 'opportunity_viewed' | 'opportunity_saved' | 'opportunity_skipped' | 'outreach_started' | 'outreach_abandoned' | 'outreach_sent' | 'lead_won' | 'lead_lost' | 'out_of_scope_question'
  opportunity_id uuid,
  metadata jsonb default '{}',     -- for out_of_scope_question: {question, category}
  occurred_at timestamptz default now()
);
-- NOTE: events table is Day 1 schema. Instrumentation (actually writing events) ships with Phase 1.
-- Capture out_of_scope_question events from day one — these are product roadmap signal.

create index events_workspace_idx on events(workspace_id);
create index events_type_idx on events(event_type);
create index events_occurred_idx on events(occurred_at desc);
```

### Webhook configurations
```sql
create table webhook_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  endpoint_url text not null,
  secret text not null,            -- for HMAC signature verification
  events text[] not null,          -- which events to fire on
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Notification preferences
```sql
create table notification_preferences (
  workspace_id text primary key references workspace_settings(workspace_id),
  daily_digest_enabled boolean default true,
  daily_digest_time text default '07:00',
  push_on_high_score boolean default true,
  high_score_threshold integer default 85,
  push_on_expiring_leads boolean default true,
  weekly_summary_enabled boolean default false,
  limit_warning_enabled boolean default true,
  notification_email text,               -- if null, falls back to Clerk user email
  updated_at timestamptz default now()
  -- SMS fields intentionally omitted — email only at launch (TCPA risk)
  -- Add sms_enabled + sms_phone later if/when SMS is built (TCPA risk — email only at launch)
);
```

---

## 5. AGENT ARCHITECTURE

### CRITICAL: Provider-agnostic from day one

**The agents below describe WHAT each agent does — never which LLM powers it.**

Every agent reads its provider, model, escalation provider, escalation model, prompt key, timeouts, retries, batch size, and concurrency from the `agent_registry` table at runtime. These values are set in the admin panel at `/admin/agents`, never in code.

When you see references like "Sonnet" or "Haiku" below, treat them as **historical context only**. The brief was originally written assuming Anthropic. The new pattern: all 10 agents are model-neutral. Pick the provider per agent in admin.

```typescript
// CORRECT: load agent config from registry
const agent = await db.query.agentRegistry.findFirst({
  where: eq(agentRegistry.slug, 'conversation'),
})
const llm = getProvider(agent.provider)  // anthropic | openai | google | groq | together | custom
const response = await llm.call({
  model: agent.model,
  messages: [...],
  maxTokens: agent.maxTokens,
  temperature: parseFloat(agent.temperature),
})

// WRONG: never inline a model name
const response = await anthropic.messages.create({ model: 'claude-sonnet-4-6', ... })
```

### Escalation pattern (replaces Anthropic-specific "advisor")

Any agent can optionally call a higher-tier model for hard decisions. The escalation provider and model are also in `agent_registry` and admin-configurable. Escalation calls are rate-limited per session (default max 3 calls) — set via `system_settings`.

```typescript
// In agent code:
if (needsEscalation(result)) {
  const escalationLlm = getProvider(agent.escalationProvider)
  const verdict = await escalationLlm.call({
    model: agent.escalationModel,
    messages: [...],
  })
}
```

The 10 agents below describe purpose, triggers, prompts, and tools. **Model and provider are NOT part of the agent spec — they're configured at runtime in admin.**

---

### Agent 1 — Conversation Agent (real-time)
**Pattern:** Realtime — synchronous, user-facing chat
**Trigger:** User message in chat UI  
**Trigger:** User message in chat UI  
**Pattern:** Realtime — synchronous, user-facing

**System prompt template:**
```
You are Fetchi (ツ), a lead generation agent for {{business_name}}.

Your job is to help {{owner_name}} find, track, and close leads 
for their {{vertical}} business in {{location_city}}, {{location_state}}.

Service description: {{service_description}}
Ideal customer: {{ideal_customer_description}}

Leads already in system (DO NOT resurface): {{lead_ids_array}}
Current opportunity count: {{opportunities_used}} / {{opportunities_limit}}

You answer questions about:
- Finding leads and signals in their market
- Outreach — writing emails, follow-ups, call scripts  
- Sales — pricing guidance, quoting, closing
- Their local market — activity, signals, opportunities
- Their existing leads — status, next steps, follow-ups

You redirect anything else warmly: "That's a bit outside what 
I'm built for — I'm best at finding leads and helping close them. 
Want me to [relevant suggestion]?"

You never give medical, legal, or financial advice.
You never resurface leads already in the system.
Today's date: {{current_date}}
```

**Tools available to Conversation Agent:**
```typescript
const conversationTools = [
  {
    name: "search_signals",
    description: "Search for buying signals in the user's area using SerpAPI",
    input_schema: {
      query: string,
      location: string,
      signal_type: SignalType,
      radius_miles?: number
    }
  },
  {
    name: "get_my_leads",
    description: "Retrieve saved leads from the user's workspace",
    input_schema: {
      status?: OpportunityStatus,
      limit?: number,
      offset?: number
    }
  },
  {
    name: "draft_outreach",
    description: "Draft personalized outreach email for a specific opportunity",
    input_schema: {
      opportunity_id: string,
      tone?: 'professional' | 'friendly' | 'urgent'
    }
  },
  {
    name: "save_lead",
    description: "Save an opportunity to My Leads",
    input_schema: {
      opportunity_id: string
    }
  },
  {
    name: "update_lead_status",
    description: "Update the status of a lead (contacted, won, lost, etc)",
    input_schema: {
      opportunity_id: string,
      status: OpportunityStatus,
      notes?: string
    }
  },
  {
    name: "get_lead_detail",
    description: "Get full detail on a specific opportunity",
    input_schema: {
      opportunity_id: string
    }
  },
  {
    name: "log_out_of_scope",
    description: "Log a question that fell outside Fetchi's scope — stored as product roadmap signal. Call this every time Fetchi redirects a question.",
    input_schema: {
      question: string,
      category: string    // 'technical' | 'financial' | 'personal' | 'other'
    }
  }
]
```

### Agent 2 — Signal Detection Agent (nightly)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** Nightly cron, per workspace  
**Pattern:** Background — scheduled or triggered, async  
**Session cost:** ~$0.08/hour, typical run 5-10 minutes = ~$0.01/workspace/night

**Pattern:** Background — scheduled or triggered, async  
**Session cost:** depends on provider — track via agent_runs.metadata

```typescript
// Provider-agnostic session creation
const agent = await db.query.agentRegistry.findFirst({
  where: eq(agentRegistry.slug, 'signal_detection'),
})
const llm = getProvider(agent.provider)

const session = await llm.createSession({
  model: agent.model,
  system: buildSignalDetectionSystemPrompt(serviceProfile),
  tools: [
    serpApiSearchTool,
    writeOpportunityTool,
    checkDuplicateTool,
    enrichProspectTool,
  ],
  maxTokens: agent.maxTokens,
  temperature: parseFloat(agent.temperature),
})

// Escalation handled separately, only when needed:
if (needsHardDecision) {
  const escalationLlm = getProvider(agent.escalationProvider)
  await escalationLlm.call({ model: agent.escalationModel, ... })
}
```

**Signal Detection queries by type:**

```typescript
const signalQueries = {
  building_permit: [
    `building permit filed ${location} ${vertical_keywords} site:${county_permit_portal}`,
    `new construction permit ${city} commercial ${current_month}`,
  ],
  storm_damage: [
    // Use NOAA/FEMA APIs directly — not SerpAPI
    // OpenFEMA: https://www.fema.gov/api/open
    // NWS Local Storm Reports: https://mesonet.agron.iastate.edu/json/lsr.php
  ],
  new_business_listing: [
    // Google Maps new listing detection
    // Use diff-detection: scan geographic grid, compare to previous scan
    `new business opening ${city} ${vertical_target} 2026`,
    `grand opening ${city} ${business_type}`,
  ],
  business_license: [
    `new business license filed ${city} ${state} ${current_month}`,
    `business registration ${city} ${vertical_keywords}`,
  ],
  job_posting: [
    `"facilities manager" OR "office manager" hiring ${city}`,
    `"cleaning services" OR "janitorial" job posting ${city}`,
  ]
}
```

### Agent 3 — Outreach Agent (on-demand)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** User requests outreach draft  
**Pattern:** Background — scheduled or triggered, async

Generates personalized outreach using the specific signal as context. Never uses generic templates. Always references what actually happened — the permit, the storm, the new listing.

### Agent 4 — Deduplication Agent (post-scan)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** After every Signal Detection run  
**Pattern:** Background — scheduled or triggered, async

```typescript
// Dedup normalization — CRITICAL
// SerpAPI returns inconsistent business names: "Parkview Office Complex" vs 
// "PARKVIEW OFFICE COMPLEX" vs "Park View Office Complex"
// Normalize before hashing or you'll get duplicates in the first week

function normalizeForDedup(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')  // strip all punctuation, spaces, special chars
    .trim()
}

// IMPORTANT: detected_at is timestamptz — convert to Unix ms before flooring
const detectedAtMs = new Date(signal.detected_at).getTime()
const dedupHash = sha256(
  normalizeForDedup(signal.business_name) +
  normalizeForDedup(signal.address) +
  signal.signal_type +
  // Round to nearest 7-day window
  // WHY: A signal that fires again after 7 days is a NEW lead, not a duplicate.
  // A roofer needs to know if the same building gets hit by another storm a week later.
  // Within the same 7-day window = duplicate. After 7 days = fresh opportunity.
  Math.floor(detectedAtMs / (7 * 24 * 60 * 60 * 1000)).toString()
)
// If hash exists in signals table, merge and discard duplicate
```

### Agent 5 — Staleness Agent (weekly)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** Weekly cron  
**Pattern:** Background — scheduled or triggered, async

Checks opportunities not acted on in 30+ days. Re-verifies signal is still relevant. Updates `signal_expires_at`. Marks expired opportunities so they don't surface in feed.

### Agent 6 — Enrichment Agent (post-opportunity-creation)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** New opportunity created  
**Pattern:** Background — scheduled or triggered, async

Uses SerpAPI to find:
- Business website
- Owner/manager name and title
- Phone number
- Email (if public)
- LinkedIn profile
- Additional context about the business

Writes results to `contact_routes` and updates `prospects.enrichment_status`.

### Agent 7 — Outcome Learning Agent (on outcome log, Managed Agents)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** User marks opportunity as won/lost/skipped  
**Pattern:** Background — scheduled or triggered, async

**The mechanism is prompt injection — not a trained classifier, not numerical weights. Here's exactly how it works:**

When a user logs an outcome, the agent reads the last 30 outcomes for that workspace and builds a `workspace_learning_context` string that gets injected into the signal classification and scoring prompts at runtime via the prompt version control system.

```typescript
// lib/learning/build-context.ts
async function buildWorkspaceLearningContext(workspaceId: string): Promise<string> {
  const recentOutcomes = await db.query(
    `SELECT o.why_now, o.why_relevant, o.score, o.outcome,
            s.signal_type, p.business_type, p.city
     FROM opportunities o
     JOIN signals s ON s.id = o.signal_id
     JOIN prospects p ON p.id = o.prospect_id
     WHERE o.workspace_id = $1
       AND o.outcome IS NOT NULL
     ORDER BY o.outcome_logged_at DESC
     LIMIT 30`,
    [workspaceId]
  )
  
  const won = recentOutcomes.filter(o => o.outcome === 'won')
  const lost = recentOutcomes.filter(o => o.outcome === 'lost' || o.outcome === 'skipped')
  
  return `
WORKSPACE LEARNING CONTEXT (inject into scoring and classification prompts):
This workspace has logged ${won.length} won leads and ${lost.length} lost/skipped leads recently.

Signals that converted to won jobs:
${won.map(o => `- ${o.signal_type} for ${o.business_type} in ${o.city}: "${o.why_now}"`).join('\n')}

Signals that did not convert:
${lost.map(o => `- ${o.signal_type} for ${o.business_type} in ${o.city}: "${o.why_now}"`).join('\n')}

When scoring new opportunities for this workspace, weight signal types and business 
profiles that match the won patterns higher, and discount those matching lost patterns.
  `.trim()
}
```

This context string gets stored in `workspace_learning.learning_context` and is refreshed every time an outcome is logged. The Signal Detection Agent and Quality Scoring Agent read it and prepend it to their scoring prompts.

**Why prompt injection over a classifier:** No training data required at launch. Works from the first outcome logged. Interpretable — you can read the context and understand exactly what Fetchi learned. Upgradeable — swap to a real classifier later when you have 500+ outcomes per workspace without changing the interface. Learning context is stored in the `workspace_learning` table — no columns added to `workspace_settings`.

### Agent 8 — Quality Scoring Agent (nightly)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** Nightly cron, after Signal Detection  
**Pattern:** Background — scheduled or triggered, async

Re-scores all open opportunities based on:
- Signal freshness (how many days since detection)
- Signal strength (original relevance score)
- Similarity to previously won deals (per workspace)
- Proximity to expiry

Updates `score` and appends to `score_history`.

### Agent 9 — Onboarding Completion Agent (first 30 days, Managed Agents)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** Scheduled checks at 24h, 48h, 7d post-signup  
**Pattern:** Background — scheduled or triggered, async

Watches new user behavior and triggers Resend emails based on three specific scenarios:

1. **24h — No leads saved:** User completed onboarding but hasn't saved any leads. Email surfaces one specific high-score opportunity by name with the signal behind it. Personal not generic.

2. **48h — Leads saved, no outreach:** User saved leads but hasn't drafted or sent outreach. Email: "Your leads are getting cold — [Business Name] filed that permit 2 days ago." Include a pre-drafted first line to lower activation energy.

3. **7d — Outreach sent, no outcome logged:** User sent outreach but hasn't marked any lead won, lost, or responded. Email: "Time to follow up on [Business Name]?" Include a drafted follow-up they can send in 30 seconds.

Agent stops after 30 days and hands off to the Notification Agent.

### Agent 10 — Notification Agent (ongoing, Managed Agents)
**Provider/Model:** set in admin panel — see agent_registry  
**Trigger:** After each Signal Detection run + scheduled digest  
**Pattern:** Background — scheduled or triggered, async

Decides what's urgent enough to push vs what waits for digest:
- Score ≥ threshold AND within user's notification preferences → push
- Daily digest → aggregate and send via Resend
- Expiring leads → alert with urgency

---

## 6. ERROR RECOVERY AND IDEMPOTENCY

**Every background agent must be idempotent. A retry must never create duplicate signals, opportunities, or outreach plays.**

### Signal Detection Agent recovery
```typescript
// Before writing any opportunity, always check:
// 1. Has this signal_hash already been written? (dedup table check)
// 2. Has this opportunity already been created for this workspace + signal? 
//    (unique constraint on workspace_id + signal_id in opportunities table)

// Add unique constraint to schema:
// alter table opportunities add constraint opportunities_workspace_signal_unique 
//   unique (workspace_id, signal_id);

// If the agent fails mid-run, on retry it will:
// - Skip signals already written (hash check)
// - Skip opportunities already created (unique constraint)
// - Resume from where it left off naturally
```

### Agent run tracking
```sql
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspace_settings(workspace_id),
  agent_type text not null,     -- 'signal_detection' | 'enrichment' | 'scoring' etc
  status text not null default 'running', -- running | completed | failed
  started_at timestamptz default now(),
  completed_at timestamptz,
  error_message text,
  signals_found integer default 0,
  opportunities_created integer default 0,
  metadata jsonb default '{}'
);

create index agent_runs_workspace_idx on agent_runs(workspace_id, started_at desc);
```

### Retry strategy per agent

| Agent | On failure | Retry | Max retries |
|---|---|---|---|
| Signal Detection | Log to agent_runs, alert via Resend | Next nightly run | 3 nights |
| Enrichment | Mark prospect enrichment_status = 'failed', retry next day | Daily | 3 attempts |
| Deduplication | Safe to retry — idempotent by hash | Immediate | 5 attempts |
| Staleness | Safe to retry — read-only scoring | Next weekly run | — |
| Quality Scoring | Safe to retry — overwrites scores | Next nightly run | — |
| Outcome Learning | Safe to retry — overwrites learning_context | On next outcome log | — |

### SerpAPI rate limit handling
```typescript
// SearchProvider must handle 429s gracefully
async function searchWithBackoff(params: SearchParams, attempt = 0): Promise<SearchResult[]> {
  try {
    return await serpApiClient.search(params)
  } catch (error) {
    if (error.status === 429 && attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000  // exponential backoff: 1s, 2s, 4s
      await sleep(delay)
      return searchWithBackoff(params, attempt + 1)
    }
    throw error  // surface after 3 attempts
  }
}
```

---

## 7. PROMPT A/B TESTING

The `prompts` table supports versioning but needs a defined mechanism for measuring performance and splitting traffic.

### What gets measured (performance_metrics jsonb)
```typescript
interface PromptPerformanceMetrics {
  total_uses: number
  // For signal_classification prompt:
  signals_classified: number
  signals_accepted_by_user: number      // saved or contacted
  signals_rejected_by_user: number      // skipped
  acceptance_rate: number               // accepted / classified
  // For outreach_drafting prompt:
  drafts_generated: number
  drafts_sent_unedited: number          // user sent without changes
  drafts_edited_then_sent: number
  drafts_abandoned: number
  unedited_rate: number                 // sent_unedited / generated
  // For opportunity_scoring prompt:
  opportunities_scored: number
  high_score_leads_acted_on: number     // score > 80 and status changed
  high_score_conversion_rate: number
}
```

### Traffic split mechanism
```sql
-- Add to prompts table:
alter table prompts add column traffic_percentage integer default 100;
-- When two versions of the same prompt are active:
-- v1: traffic_percentage = 50, is_active = true
-- v2: traffic_percentage = 50, is_active = true
-- Application reads both and routes by workspace_id % 100
```

```typescript
async function getPromptForWorkspace(name: string, workspaceId: string): Promise<string> {
  const activePrompts = await db.query.prompts.findMany({
    where: and(eq(prompts.name, name), eq(prompts.is_active, true)),
    orderBy: prompts.version
  })
  
  if (activePrompts.length === 1) return activePrompts[0].content
  
  // A/B split by workspace — consistent assignment per workspace
  const workspaceSlot = parseInt(workspaceId.slice(-2), 16) % 100
  let cumulative = 0
  for (const prompt of activePrompts) {
    cumulative += prompt.traffic_percentage
    if (workspaceSlot < cumulative) return prompt.content
  }
  return activePrompts[activePrompts.length - 1].content
}
```

**Defer building the A/B UI until you have 50+ customers. Until then, manually flip `is_active` to test prompts. The infrastructure supports it from day one.**


---

## 8. QUERY BUILDER

**The Query Builder is the missing link between user intent and SerpAPI execution. Without it the agent can construct generic queries inconsistently. With it, every search is targeted, engine-appropriate, and budget-aware.**

### Where it sits

```
User message
    ↓
Conversation Agent receives intent
    ↓
Query Builder — reasons about what to search before searching
    ↓
SearchProvider fires optimized queries
    ↓
Signal Classifier reads raw results
    ↓
Opportunities written to database
```

The Query Builder is **synchronous, not a Managed Agent**. It runs inside the `search_signals` tool handler. The user is waiting — this must be fast.

### Database schema — query_strategies table

Query strategies live in the database, not in a TypeScript config file. They are prompts effectively — they will change as you learn what works per vertical and per market. Updateable without redeploy.

```sql
create table query_strategies (
  id uuid primary key default gen_random_uuid(),
  vertical text not null,
  signal_type text not null,
  engine text not null,
  query_template text not null,
  priority integer not null default 2,   -- 1=high 2=medium 3=low
  seasonal_months integer[],             -- null=year-round [3,4,5]=spring only
  weather_dependent boolean default false,
  is_active boolean default true,
  performance_metrics jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index query_strategies_vertical_idx on query_strategies(vertical, is_active);
```

**Seed with starter strategies for each vertical at migration time:**

Commercial Cleaning seeds:
- new_business_listing via google_maps: "new office opening {city} {state} {current_month}" [priority 1]
- job_posting via google_jobs: "facilities manager" OR "office manager" hiring {city} [priority 1]
- building_permit via google: "commercial interior renovation permit {city} {current_month} {current_year}" [priority 2]
- new_business_listing via google_maps: "corporate office {city} opened {current_year}" [priority 2]
- business_license via google: "new business license filed {city} {state} {current_month}" [priority 3]

Roofing seeds (storm_damage strategies have weather_dependent=true):
- storm_damage via google_news_light: "hail damage {city} {state} {current_month}" [priority 1, weather_dependent]
- storm_damage via google: "storm damage homes {city} {date_range_30_days}" [priority 1, weather_dependent]
- building_permit via google: "roof permit filed {city} {current_month} {current_year}" [priority 2]
- building_permit via google: "new construction permit {city} {state} residential {current_year}" [priority 2]

HVAC seeds:
- building_permit via google: "HVAC permit commercial {city} {current_month} {current_year}" [priority 1]
- new_business_listing via google_maps: "new commercial building {city} {state} {current_year}" [priority 1]
- job_posting via google_jobs: "HVAC OR mechanical OR facilities hiring {city}" [priority 2]

Landscaping seeds:
- new_business_listing via google_maps: "new commercial property {city} {state} {current_year}" [priority 1]
- building_permit via google: "commercial construction permit {city} exterior {current_month}" [priority 2]
- job_posting via google_jobs: "property manager OR HOA manager hiring {city}" [priority 2]

Event Services seeds:
- event_booking via google_events: "corporate event {city} {current_month} {current_year}" [priority 1]
- new_business_listing via google_maps: "new venue {city} {state} {current_year}" [priority 2]
- event_booking via google: "conference {city} {next_month} {current_year}" [priority 2]

### Search Ops instrumentation

Every query plan and every SerpAPI call must be inspectable from admin. Fetchi's moat is not just calling SerpAPI; it is learning which query strategies produce real opportunities for each vertical, city, and signal type.

For every search execution, write enough metadata into `agent_runs.metadata` and/or event metadata to power the `/admin/search-ops` cockpit:

- workspace id
- vertical
- city/state
- user intent or scheduled trigger
- query strategy id
- engine used (`google_light`, `google_news_light`, `google_maps`, `google_jobs`, etc.)
- query params sent to SearchProvider, with secrets removed
- raw result count
- parsed signal count
- opportunities created
- duplicates skipped
- stale/invalid results skipped
- latency
- estimated API cost
- errors and retry count

Admin must be able to replay a past search safely, compare raw results to parsed signals, and see whether a query strategy is worth keeping. This is the operational difference between a demo and a real SaaS.

### Weather events table

A nightly job fetches NWS alerts per active workspace location and writes here. Query Builder reads from this table — no blocking API call at query time.

```sql
create table weather_events (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  event_type text not null,     -- 'hail' | 'wind' | 'tornado' | 'flood'
  severity text not null,       -- 'minor' | 'moderate' | 'severe' | 'extreme'
  event_date date not null,
  source text not null,         -- 'nws' | 'noaa' | 'fema'
  raw_data jsonb,
  detected_at timestamptz default now(),
  expires_at timestamptz
);

create index weather_events_location_idx on weather_events(city, state, event_date desc);
create index weather_events_active_idx on weather_events(expires_at) where expires_at > now();
```

Weather fetch job runs nightly alongside Signal Detection. Calls NWS Active Alerts API (free, no key): `https://api.weather.gov/alerts/active?area={state}`. Writes hail, wind, tornado, flood events for each active workspace location.

### The Query Builder interface

```typescript
// lib/query-builder/index.ts

interface QueryBuilderInput {
  user_intent: string
  vertical: string
  location_city: string
  location_state: string
  workspace_learning_context: string  // from workspace_learning.learning_context — Agent 7, separate table
  searches_remaining_today: number    // budget awareness
  current_date: string
}

interface SearchQuery {
  engine: string
  params: Record<string, string>
  signal_type: SignalType
  priority: 1 | 2 | 3
}

interface QueryPlan {
  queries: SearchQuery[]
  rationale: string           // why these queries — inspectable for debugging and evals
  expected_signal_types: SignalType[]
  estimated_api_calls: number
  budget_constrained: boolean
}

async function buildQueryPlan(input: QueryBuilderInput): Promise<QueryPlan> {
  // 1. Load active strategies for this vertical from database
  const strategies = await getActiveStrategies(input.vertical)

  // 2. Filter by season
  const currentMonth = new Date(input.current_date).getMonth() + 1
  const seasonal = strategies.filter(s =>
    !s.seasonal_months || s.seasonal_months.includes(currentMonth)
  )

  // 3. Filter weather-dependent strategies by actual events in DB
  const weatherEvents = await getRecentWeatherEvents(input.location_city, input.location_state)
  const viable = seasonal.filter(s => !s.weather_dependent || weatherEvents.length > 0)

  // 4. Build queries with template interpolation
  const allQueries = viable.map(s => ({
    engine: s.engine,
    params: interpolateTemplate(s.query_template, input),
    signal_type: s.signal_type as SignalType,
    priority: s.priority as 1 | 2 | 3
  }))

  // 5. Budget awareness — cut low-priority queries if budget is tight
  const budget_constrained = input.searches_remaining_today < allQueries.length
  const queries = budget_constrained
    ? allQueries.filter(q => q.priority === 1)
    : allQueries

  // 6. LLM refinement — OPTIONAL, only when it adds value
  // Skip refinement when: no learning context AND user intent maps cleanly to strategies
  // WHY: The full pipeline (strategy lookup + weather + LLM + SerpAPI + classify)
  // can take 5-10 seconds. Making LLM refinement conditional keeps simple searches fast.
  const shouldRefine = input.workspace_learning_context?.length > 0 
    || input.user_intent.includes('like') 
    || input.user_intent.includes('similar')
    || input.user_intent.includes('different')

  const finalQueries = shouldRefine
    ? (await refineQueryPlanWithLlm({
        user_intent: input.user_intent,
        proposed_queries: queries,
        learning_context: input.workspace_learning_context,
        weather_events: weatherEvents,
      })).queries
    : queries

  return {
    queries: finalQueries,
    rationale: shouldRefine ? 'LLM-refined based on learning context' : 'Strategy-matched from database',
    expected_signal_types: [...new Set(queries.map(q => q.signal_type))],
    estimated_api_calls: finalQueries.length,
    budget_constrained,
  }
}
```

### Streaming progress — never leave the user waiting silently

The search pipeline takes 3-8 seconds. Stream progress updates via the Conversation Agent:

```typescript
// In the search_signals tool handler, stream status updates before results
async function* streamSearch(input: QueryBuilderInput) {
  yield { type: 'status', message: 'Building search plan...' }
  const plan = await buildQueryPlan(input)
  
  yield { type: 'status', message: `Running ${plan.estimated_api_calls} searches...` }
  const results = await executeQueryPlan(plan)
  
  yield { type: 'status', message: 'Scoring results...' }
  const opportunities = await classifyAndScore(results)
  
  yield { type: 'results', opportunities }
}
// The Conversation Agent renders: "ツ is scanning · Building search plan..."
// then updates to: "ツ is scanning · Running 4 searches..."
// then updates to: "Found 3 leads" and shows cards
```

### Budget awareness — user-facing behavior

When budget is tight, Fetchi tells the user before firing searches:

- searches_remaining_today === 0 → return message offering top-up, do not search
- budget_constrained = true → tell user "running N high-priority searches, X left today — want me to run all?" and await confirmation before executing
- Normal → execute plan silently

### Prompt names to add to prompts table

```
'query_plan_refinement'   — LLM refinement step based on user intent and learning context
```

### Eval tasks for the Query Builder

Two starter tasks for the eval suite:

Task qb-001: user says "find me storm leads", vertical=roofing, location=Houston TX. Expected: google_news_light and google_light engines, storm_damage signal type, weather events must be present, 2-5 queries.

Task qb-002: user says "find cleaning leads", vertical=commercial_cleaning, location=Phoenix AZ. Expected: google_maps and google_jobs engines, new_business_listing and job_posting signal types, no weather dependency, 3-6 queries.

### Build order notes

- Seed query_strategies table at migration time (all verticals above)
- Build weather_events table and nightly weather fetch job
- Implement buildQueryPlan() and refineQueryPlanWithLlm() functions
- Wire Query Builder into search_signals tool handler in Conversation Agent
- Add query_plan_refinement prompt to prompts table
- Add query builder eval tasks to eval suite

**Critical rule: Never call SerpAPI or any future search API directly from business logic. Always go through SearchProvider.**

```typescript
// lib/search/types.ts
interface SearchProvider {
  search(params: SearchParams): Promise<SearchResult[]>
  searchMaps(params: MapSearchParams): Promise<MapResult[]>
  searchNews(params: NewsSearchParams): Promise<NewsResult[]>
  searchLocal(params: LocalSearchParams): Promise<LocalResult[]>
}

interface SearchParams {
  query: string
  location?: string
  language?: string       // 'en', 'ja', etc
  country?: string        // 'us', 'jp', etc
  num_results?: number
}

// lib/search/providers/serpapi.ts
class SerpAPIProvider implements SearchProvider {
  // Launch adapter using SerpAPI. Engine names, pagination, parsing,
  // errors, and cost estimation live here — not in route handlers.
}

// lib/search/index.ts
export const searchProvider = getActiveSearchProvider()
// Reads search_providers. Future: add SerperProvider/DataForSEOProvider/etc without touching product logic
```

**SerpAPI skill — install/read before writing launch search code:**
```bash
# Install the SerpAPI skill so the agent knows exact engine names and parameters
npx skills add serpapi/skills
# or manually:
cp -r skills/serpapi-web-search .claude/skills/
```
This gives the builder correct launch-provider context and eliminates guessing on engine names, parameters, pagination, and parsing. It is build-time context for the SerpAPI adapter, not a reason to vendor-lock the product architecture.

**SerpAPI launch engines to use by signal type:**

Always prefer `_light` variants — faster and cheaper. Only use full engine when knowledge graph or local pack is needed.

| Signal type | Primary engine | Notes |
|---|---|---|
| Building permits | `google_light` | General web search for permit filings |
| Storm damage | `google_news_light` | News results for storm/hail events |
| Storm damage (pre-fetch) | NWS API (free) | Pre-fetch nightly to `weather_events` table |
| New business listings | `google_maps` | No light variant — maps requires full engine |
| Business license renewals | `google_light` with state site | `site:sos.state.tx.us` operator |
| Job postings | `google_jobs` | Structured job results — no light variant |
| Event bookings | `google_events` | Conference/event calendar results |
| Business enrichment | `google_maps` + `google_light` | Contact info lookup |
| News fallback | `bing` | Broader coverage when google_news_light misses |

---

## 9. OPPORTUNITY COUNTER (ATOMIC)

**Critical: Use atomic database operations. Never read-then-write.**

```typescript
// lib/opportunities/counter.ts
async function consumeOpportunityCredit(workspaceId: string): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE workspace_subscriptions
    SET opportunities_used = opportunities_used + 1
    WHERE workspace_id = ${workspaceId}
      AND (
        opportunities_limit IS NULL  -- unlimited tier
        OR opportunities_used < opportunities_limit
      )
    RETURNING opportunities_used, opportunities_limit
  `)
  
  return result.rowCount > 0  // false = over limit, don't create opportunity
}
```

**Tier configuration — set in admin panel, NOT in code:**

All tier pricing, opportunity limits, and top-up rates live in the `pricing_tiers` table. Code reads from this table at runtime. Never inline a price or limit anywhere in the codebase.

```typescript
// CORRECT: read from DB
const tier = await db.query.pricingTiers.findFirst({
  where: eq(pricingTiers.slug, workspaceTierSlug),
})

// WRONG: never do this
const TIERS = { starter: { opportunities_limit: 30, ... } }
```

Seed values (editable in admin after first deploy):

| Tier   | Monthly | Annual  | Annual equiv. | Delivered lead cards/mo | Top-up (M)  | Top-up (A) |
|--------|---------|---------|---------------|--------------------------|-------------|------------|
| Starter| $49     | $490    | $41/mo        | 40                       | $0.80/lead  | $0.65/lead |
| Growth | $129    | $1,290  | $107/mo       | 100                      | $0.70/lead  | $0.55/lead |
| Pro    | $299    | $2,990  | $249/mo       | 300                      | $0.60/lead  | $0.45/lead |
| Scale  | $699    | $6,990  | $582/mo       | 750                      | $0.50/lead  | $0.40/lead |

**Top-up options — also editable from admin (`system_settings` table):**

Bundle structure: small / medium / large. Pricing per lead matches the tier's top-up rate. Stripe one-time payment.

**Tier packaging — package by scouting intensity + lead volume, not generic SaaS features:**

- **Starter — $49/mo or $490/yr:** for owner-operators who want control. Includes only-when-I-ask scouting, optional once-morning scout, 40 delivered lead cards/month, 1 territory, 1 user, basic evidence drawer, basic outreach draft, and Gmail/Outlook compose link. Does **not** include a few-times-per-day scheduled scout.
- **Growth — $129/mo or $1,290/yr:** recommended plan for serious operators. Includes once-each-morning scout, optional up to 3 scouts/day within cap, 100 delivered lead cards/month, Today’s Stack, Today’s Run, outcome learning, email digest, Gmail/Outlook draft integration, 3 team seats, and bad-lead review.
- **Pro — $299/mo or $2,990/yr:** for active sales teams. Includes a few-times-per-day scouting, 300 delivered lead cards/month, multiple territories, team seats, advanced filters, CRM/webhook integrations, source controls, priority scoring, higher scout budget, export, and priority support.
- **Scale — $699/mo or $6,990/yr:** for multi-location operators, franchises, and agencies. Includes custom scout schedule within hard spend caps, 750 delivered lead cards/month, multiple workspaces/locations, more seats, admin controls, API/webhooks, white-glove onboarding, and priority support.

**Annual discount:** annual plans are priced as 10 months paid / 2 months free. Display annual pricing as a lower monthly equivalent: Starter $41/mo billed annually, Growth $107/mo billed annually, Pro $249/mo billed annually, Scale $582/mo billed annually.

**Auto-scouting limits by plan:** Starter defaults to Only when I ask with optional once-morning scout and max 1/day; Growth includes once-each-morning and can opt up to 3/day; Pro can use up to 5/day; Scale can use custom schedules capped internally at 6/day plus the spend cap. Do not underprice or uncap scheduled scouting.


---

## 10. VOICE INPUT PIPELINE

```typescript
// Browser-side: Web Speech API captures audio
// lib/voice/capture.ts
class VoiceCapture {
  recognition: SpeechRecognition
  
  startListening(onResult: (transcript: string) => void) {
    // Web Speech API for browser capture
    // Falls back to Deepgram direct if Web Speech unavailable
  }
}

// Server-side: Deepgram Nova-3 transcription
// lib/voice/transcribe.ts
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY)
  const { result } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-3',
      language: 'en-US',
      smart_format: true,
      // Custom keywords for contractor terminology
      keywords: ['HVAC', 'roofing', 'permit', 'janitorial', 'landscaping']
    }
  )
  return result.results.channels[0].alternatives[0].transcript
}
// Transcript feeds into Conversation Agent as text — no separate code path
```

---

## 11. PROMPT VERSION CONTROL

```typescript
// lib/prompts/index.ts
async function getActivePrompt(name: string): Promise<string> {
  const prompt = await db.query.prompts.findFirst({
    where: and(
      eq(prompts.name, name),
      eq(prompts.is_active, true)
    )
  })
  if (!prompt) throw new Error(`No active prompt found for: ${name}`)
  return prompt.content
}

// Prompt names:
// 'signal_classification'  — is this raw result actually a signal?
// 'why_now_generation'     — why does this signal mean now?
// 'outreach_drafting'      — write the email
// 'opportunity_scoring'    — score 0-100
// 'conversation_system'    — Fetchi's conversation persona
// 'enrichment'             — find contact info
// 'deduplication'          — is this a duplicate?
// 'staleness_check'        — is this signal still valid?
```

**Seed the prompts table with v1 of each prompt at migration time.**

---

## 12. SIGNAL EVALUATION FRAMEWORK

Adapted from Perplexity's search_evals repo (MIT license). Measures signal detection quality.

```typescript
// lib/evals/signal-evals.ts
interface SignalEvalTask {
  id: string
  description: string
  location: string
  vertical: string
  signal_type: SignalType
  expected_signal_found: boolean     // ground truth
  expected_business_name?: string    // if known
  expected_signal_date?: string      // if known
}

interface SignalEvalResult {
  task_id: string
  signal_found: boolean
  business_name_match: boolean
  signal_date_match: boolean
  search_queries_used: number
  api_calls_made: number
  cost_estimate_cents: number
  latency_ms: number
  model_used: string
  prompt_version: string
}

// Run eval suite
async function runSignalEvals(
  tasks: SignalEvalTask[],
  options: {
    dry_run?: boolean      // run first 5 only
    max_workers?: number   // concurrency
    engine?: string        // provider engine to test, e.g. google_light at launch
  }
): Promise<EvalSummary>
```

**Benchmark tasks to build:**
- Did Fetchi find a building permit that was actually filed? (test against known recent permits in test cities)
- Did Fetchi correctly identify the business that needs service? 
- Did Fetchi find the right contact for a known business?
- Did Fetchi correctly score a high-intent vs low-intent signal?
- Did Fetchi correctly classify signal type from raw SerpAPI result?

**Run evals:**
- Before any prompt update (baseline)
- After prompt update (compare)
- Weekly regression check
- Before any model upgrade

```bash
# CLI usage
npx fetchi-evals --suite=signal_detection --engine=google_light --dry-run
npx fetchi-evals --suite=outreach_quality --agent=outreach --configured-model
npx fetchi-evals --suite=full --compare-prompt-versions
```

---

## 13. RATE LIMITING

```typescript
// middleware/rate-limit.ts
// Per-workspace daily search limits enforced at API layer
// NOT just UI — enforced before any SerpAPI call

const SEARCH_LIMITS = {
  starter:   { daily: 200,  hourly: 50  },
  growth:    { daily: 600,  hourly: 150 },
  pro:       { daily: 2000, hourly: 500 },
  scale: { daily: 10000, hourly: 2000 },
}

async function checkSearchRateLimit(workspaceId: string): Promise<boolean> {
  // Atomic check using Redis or Postgres
  // Returns false if rate limit exceeded
  // Logs attempt regardless
}
```

---

## 14. WEBHOOK SYSTEM

```typescript
// lib/webhooks/dispatch.ts
async function dispatchWebhook(
  workspaceId: string,
  eventType: WebhookEvent,
  payload: object
) {
  const configs = await getActiveWebhookConfigs(workspaceId, eventType)
  
  for (const config of configs) {
    const signature = hmac(config.secret, JSON.stringify(payload))
    await fetch(config.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fetchi-Signature': signature,
        'X-Fetchi-Event': eventType,
      },
      body: JSON.stringify(payload)
    })
  }
}

type WebhookEvent = 
  | 'opportunity.created'
  | 'opportunity.scored'
  | 'opportunity.status_changed'
  | 'outreach.sent'
  | 'outreach.responded'
  | 'lead.won'
  | 'lead.lost'
```

---

## 15. PRICING AND STRIPE INTEGRATION

**Stripe products to create:**

All pricing, opportunity limits, and top-up rates are defined in the `pricing_tiers` table and editable from the admin panel at `/admin/pricing`. Seed values are in `db/seed.ts` and shown in the table above. Never reference prices in code — query the table.

Top-up rate drops per tier as a loyalty reward, with an additional discount for annual subscribers. Both `topup_rate_cents_monthly` and `topup_rate_cents_annual` are stored on the tier row.

**Billing interval persistence:** The public pricing page passes `?plan=<slug>&billing=<monthly|annual>` to signup. During workspace creation, persist the choice to `workspace_subscriptions.tier`, `workspace_subscriptions.billing_interval`, and `workspace_subscriptions.selected_stripe_price_id`. This is required because Fetchi starts with a card-free trial; when the 5-lead gate or trial-end checkout fires days later, the app must still know whether the user originally chose monthly or annual. Checkout sessions must use the selected interval's Stripe price ID from `pricing_tiers` and also include `plan` and `billing_interval` in Stripe session metadata.

**Stripe webhook events to handle:**
- `customer.subscription.created` → activate workspace, persist tier, `billing_interval`, `selected_stripe_price_id`, Stripe customer/subscription IDs
- `customer.subscription.updated` → update tier, `billing_interval`, selected price ID, limits, and renewal metadata
- `customer.subscription.deleted` → downgrade/cancel
- `invoice.payment_succeeded` → reset monthly counter
- `invoice.payment_failed` → notify, grace period
- `checkout.session.completed` → handle top-up credit addition

---

## 16. UI SCREENS TO BUILD

Reference the design files already created. Build these screens in the order listed.

### Public screens (no auth required)
1. **Landing page** (`/`) — fetchi_landing_page_v2.html — split layout, animated lead cards, signup form left, demo right
2. **Pricing page** (`/pricing`) — public marketing pricing page with Monthly/Annual toggle
   - Reads all data from `pricing_tiers` table — no hardcoded prices
   - Toggle at top of pricing section: pill-shaped switch, sage-green active state, "Save 2 months" badge next to Annual option
   - Default state: **Annual** selected (anchors visitor to lower per-month equivalent number)
   - Four tier cards: Starter, Growth (marked "Recommended" / "Most popular"), Pro, Scale
   - When toggle = Annual: show annual price big (e.g. `$490/yr`), monthly equivalent small (e.g. `$41/mo`)
   - When toggle = Monthly: show monthly price big (e.g. `$49/mo`), no annual reference
   - Each card shows `features_bullets` array from `pricing_tiers`
   - CTA "Get started free" links to signup with `?plan=<slug>&billing=<monthly|annual>` query params
   - Below cards: "All plans include 7-day free trial. No credit card required to start."
   - Top-up rates shown in a small table below the four cards, with tier-specific rates from `pricing_tiers.topup_rate_cents_monthly` and `topup_rate_cents_annual`
3. **SEO landing pages** (`/[vertical]/[city]`) — programmatic pages per vertical+city combo funneling to signup. Build the schema and template in Phase 1; populate with real signal counts once data is flowing.

### Auth screens
4. **Sign up** (`/signup`) — Google OAuth + email, handled by Clerk. Reads `?plan=<slug>&billing=<monthly|annual>` from URL if present, validates it against `pricing_tiers`, and persists it on workspace creation to `workspace_subscriptions.tier`, `billing_interval`, and `selected_stripe_price_id` so the trial-gate/trial-end checkout uses the original monthly/annual choice.
5. **Log in** (`/login`) — handled by Clerk
6. **Email verification** (`/verify`) — handled by Clerk

### Onboarding (new user, linear flow, no back nav to app until complete)
7. **Onboarding step 1** (`/onboard/vertical`) — "What does your business sell?" — fetchi_core_screens.html screen 4
8. **Onboarding step 2** (`/onboard/location`) — "Where do you work?" — fetchi_core_screens.html screen 5
9. **Onboarding step 3** (`/onboard/customer`) — "Describe your best customer" — fetchi_core_screens.html screen 6
9a. **Onboarding step 4 — scout mode** (`/onboard/scouting`) — "How should Fetchi scout for you?" — calm customer-facing options: **Only when I ask**, **Once each morning**, **A few times per day**, and **Custom schedule** (Pro/Scale only). Default selection reflects tier. Persists the mapped internal mode to `scout_schedules` (`off`, `once_daily`, `three_daily`, `custom`; `aggressive` is admin/internal only and never shown to customers). Sub-text: "You can change this anytime in Settings → Scouting."
10. **Onboarding complete** (`/onboard/finding`) — "On it." screen — fetchi_core_screens.html screen 7. ツ ripple rings, floating lead previews, scanning progress bar. Auto-redirects to /app after 3 seconds.

**Abandoned onboarding:** Store completed step in `workspace_settings.onboarding_step`. On next login, resume from last completed step — never restart from step 1.

### Core app (authenticated)

**App shell — persistent layout:**
- Left sidebar: Fetchi logo + ツ avatar, nav links (Chat, My Leads, Settings), credits widget at bottom showing `32 / 40 leads` with mini progress bar
- Top nav: workspace name, notification bell, user avatar
- Credits widget behavior: always visible in sidebar. Click expands to show reset date, top-up CTA, and link to full usage page.

11. **Main chat** (`/app`) — fetchi_core_screens.html screen 1
    - Empty state (day 1, no leads yet): ツ avatar with ripple, greeting, 4 suggested action cards — fetchi_settings_screens.html screen 5
    - Normal state: conversation with lead cards, outreach drafts, signal explanations
    - Voice input button — mic icon in chat bar

12. **My Leads** (`/app/leads`) — fetchi_core_screens.html screen 2
    - Filter tabs: All / New / Contacted / Won / Lost / Expired / **Map**
    - Map tab: switches to map view — fetchi_map_view.html
    - Sort: Score (default) / Date found / Expiring soon
    - Search by business name
    - Each row: checkbox, signal icon, business name, signal description, status pill, days ago, score
    - Empty state per tab: friendly message per tab (see Section 21 User Flow)
    - Bulk select — checkbox on hover, bulk mark as contacted

13. **My Leads — Map tab** (`/app/leads?view=map`) — fetchi_map_view.html
    - Mapbox GL JS map centered on user's service area from Business Profile
    - Drop pin anywhere on map to set scan center
    - Radius slider + Scan button merged into single pill bar at bottom center of map
    - Signal type filter chips: Storm / Permits / New Listings (top left of map)
    - Search bar for location search (top left, above chips)
    - Lead pins: green = score 80+, amber = score 60-79
    - Click pin → highlights corresponding card in right panel
    - Right panel: lead cards for current map area, each with why-now summary and action buttons
    - Scan button fires Query Builder with `{ lat, lng, radius_miles }` instead of `{ city, state }`
    - Zoom +/- controls top right of map

14. **Today's Stack** (`/app/today`) — mobile-first daily review mode, see Section 30
    - Card stack interface, single visible card with peeking cards behind
    - Buttons canonical: Pass · Snooze · Open evidence · Add to run
    - Swipes are bonus shortcuts (right=add, left=pass, up=evidence, down=snooze)
    - Progress strip: `~2 min to clear · 9 left · ~12s per lead · 3/12`
    - Empty state when no fresh leads: "All clear — Fetchi is scanning for tomorrow's leads. Check back at 7am."
    - Desktop: accessible from sidebar but de-prioritized; mobile is the home for this ritual

14a. **Today's Stack — evidence back** — flip state of the card
    - Trust summary line: `4 sources verified · contact confidence high · signal fresh`
    - Numbered evidence list with sources, dates, links
    - Ranked contact route with confidence indicators
    - Suggested next step (1-line action recommendation)

14b. **Why pass?** — modal triggered after Pass action
    - 6 reason options (multi-select radio): wrong_contact, already_has_vendor, too_small, out_of_area, bad_signal, not_my_customer
    - Optional note field
    - Skip / Save tag / Next lead buttons
    - Writes to `lead_pass_reasons` table — feeds Quality Scoring Agent learning loop

14c. **Today's Run** (`/app/today/run`) — destination for added leads
    - Top stats: stops count, drive time estimate, pipeline value estimate
    - Optional map preview with route line
    - Ordered list of stops with score, signal, address, drive time, draft status
    - Tap stop → expand to prepared outreach draft → edit → send via OAuth send-as
    - Reorder, add more leads, start route actions

15. **Lead Profile** (`/app/leads/[id]`) — fetchi_core_screens.html screen 3
    - Left: full prospect detail — business name, address, contact info, signal detail, score + why now, signal timeline
    - Right: ツ chat panel (toggleable) — pre-loaded with context about this lead
    - Outreach drafts section — generated drafts, edit inline, mark sent
    - Status controls — update outcome, add notes
    - Related leads — other opportunities at same address or same signal event

### Settings (authenticated, sidebar nav)

**Settings sidebar structure:**
```
Workspace settings
  Business profile
  Signal preferences
  Notifications
  Team
  Connections             (OAuth send-as: Google + Microsoft)

Plan & billing
  Current plan
  Usage
  Top up

Account
  Profile
  Security
```

16. **Business Profile settings** (`/app/settings/profile`)
    - Auto-generate from domain: paste website URL → Fetchi calls SerpAPI + configured LLM, extracts service description and ideal customer, pre-fills form. User confirms. One click.
    - Fields: business name, vertical (dropdown), service description (textarea), location city + state + radius, ideal customer description (textarea)
    - Save button — updates service_profiles table, triggers new signal scan
    - If user has Growth/Pro tier: add second vertical button

17. **Signal preferences** (`/app/settings/signals`)
    - Toggle which signal types are active: Building permits / Storm damage / New business listings / Job postings / Events
    - Set minimum score threshold for notifications (slider 0-100, default 70)
    - Excluded keywords — add words that should disqualify a lead (e.g. "residential" for a commercial cleaner)

18. **Notifications settings** (`/app/settings/notifications`)
    - Daily digest: on/off, time of day picker
    - Push on high-score lead: on/off, threshold slider
    - Expiring leads alert: on/off
    - Email address confirmation

19. **Usage page** (`/app/settings/usage`)
    - Header: current tier badge + "Manage plan" button + "Add leads" button
    - Opportunities section: progress bar (used / limit), reset countdown, "X leads remaining"
    - Tabs: Overview / History / Signals breakdown
    - Overview: large progress bar, reset date, top-up options inline (10/$5, 25/$11, 50/$20)
    - History: bar chart — opportunities used per day this month
    - Signals breakdown: pie/bar showing permits vs storm vs listings vs jobs as % of total found
    - Top-up flow: inline Stripe checkout, no page redirect

20. **Plan & billing** (`/app/settings/billing`)
    - Current plan card with tier, price, billing cycle (Monthly/Annual from `workspace_subscriptions.billing_interval`), renewal date
    - Monthly/Annual toggle visible to all subscribers — switching toggle previews the price difference and "Save 2 months" badge before commit
    - Upgrade/downgrade buttons → Stripe checkout with the appropriate `stripe_price_id_monthly` or `stripe_price_id_annual` based on current toggle state
    - When switching from monthly to annual mid-cycle: Stripe handles prorated upgrade automatically
    - Payment method (last 4 digits, update button)
    - Invoice history — last 6 months
    - Cancel subscription — requires typing "cancel" to confirm

21. **Refer & earn** (`/app/refer`) — customer-facing referral page
    - Unique referral link with copy button
    - Share buttons (Twitter/X, LinkedIn, email, SMS)
    - Total referred / total rewards earned
    - Recent referral activity (signed up, converted, reward applied)
    - "How it works" callout pulled from `system_settings`

22. **Integrations / Connections** (`/app/settings/integrations`)
    - Two cards: Google Workspace and Microsoft 365
    - Connect button initiates OAuth flow
    - When connected: shows account email, status badge, disconnect option
    - Used for outreach send-as — emails go from contractor's real address

22a. **Scouting settings** (`/app/settings/scouting`) — user control of automatic scouting. See Section 31.
    - Mode selector: Off / Once daily / Three times daily / Custom
    - Shows current schedule and timezone (e.g. "Morning scout at 6:00 AM CT")
    - Status badge: Active / Paused (with reason if paused)
    - "Pause for today" button (24h pause)
    - Helper text: "Lead credits are only consumed when verified leads are delivered. No charge for empty scans."
    - For Pro/Scale tier: Custom schedule editor (cron-style input with friendly time pickers)
    - Recent scout runs list (last 7 days): timestamp, sources checked, leads delivered, status

### Customer-facing product improvements

These improvements ship inside existing customer screens. They are not separate navigation items unless the UI requires it.

**Evidence drawer on every opportunity card**
- Shows public signal source, source URL when available, engine/source name, detected date, signal type, confidence, score rationale, `why_now`, and recommended next action.
- Includes feedback buttons: “good lead,” “not relevant,” “wrong contact,” “too small,” “already has vendor,” and “bad timing.”
- Feedback writes to outcome/event tracking and feeds Outcome Learning.

**Lead freshness clock**
- Every opportunity displays a freshness state: Hot, Warm, Cooling, Stale.
- Freshness rules are signal-type aware: storm damage decays faster than permit filings; new business listings decay differently than job postings.
- Freshness logic reads thresholds from `system_settings`, never hardcoded constants.

**Find more like this**
- Every good lead has a “Find more like this” action.
- It creates a new Query Builder request using the current opportunity’s signal type, business type, geography, score, and outcome tags.
- The search is still budget-aware and respects workspace limits.

**Outcome tags**
- Won/lost/skipped flows include quick tags: booked estimate, sent quote, won job, wrong contact, too small, already had vendor, bad timing, not ideal customer, duplicate, and bad source.
- Tags are stored in event/outcome metadata and summarized into `workspace_learning.learning_context`.

**Territory heat map**
- The map tab should show more than pins: ZIP/city-level signal density, top signal types by area, underworked neighborhoods, and “scan this area” actions.
- Scan actions pass lat/lng or city/state into Query Builder and write the query plan for admin replay.

### Admin (internal only, gated by FETCHI_ADMIN_USER_IDS env var)

Reference `fetchi_admin_screens.html` for all admin screen designs. Admin uses a separate Next.js layout group with dark sidebar (#1a1918), no ツ branding — "looks like a tool, not a product."

23. **Admin dashboard** (`/admin`) — MRR, active workspaces, signups today, churn rate, agent run health
24. **Workspaces list** (`/admin/workspaces`) — sortable table of all workspaces with status, tier, usage, last activity
25. **Workspace detail** (`/admin/workspaces/[id]`) — 360° view: subscription, usage, leads, agent runs, abuse flags, admin notes, view-as-user mode
26. **Billing operations** (`/admin/billing`) — refunds, credits, trial extensions, tier overrides — all via Stripe API, never direct DB writes
27. **Support tools** (`/admin/support`) — universal customer search, view-as-user (read-only), reset onboarding, resend digest, manual workspace approval
28. **Pricing & Plans** (`/admin/pricing`) — CRUD on `pricing_tiers` table, monthly + annual pricing, top-up rates, Stripe price IDs, feature gating
29. **System Settings** (`/admin/system-settings`) — CRUD on `system_settings` table, organized by category (trial, signals, rate_limits, abuse, cron, compliance, referrals, affiliates, tracking, oauth)
30. **Email Templates** (`/admin/email-templates`) — CRUD on `email_templates`, variable preview, A/B traffic splits
31. **Agent Registry** (`/admin/agents`) — view all 10 agents, edit provider/model/escalation/prompt/skills/timeouts at runtime
32. **Prompts management** (`/admin/prompts`) — CRUD on `prompts` table, versioning, A/B traffic splits, usage stats
33. **Abuse detection** (`/admin/abuse`) — auto-flagged accounts from `abuse_flags`, severity levels, manual review, void/reinstate
34. **Agent operations** (`/admin/agents/runs`) — live agent runs, queue depth, throughput, cost-per-opportunity breakdown
35. **System health** (`/admin/health`) — dependency status: LLM providers, SerpAPI, Stripe, Resend, Mapbox, Deepgram, Neon DB
36. **Feature flags** (`/admin/feature-flags`) — CRUD on `feature_flags`, global + per-workspace + percentage rollouts
37. **Announcements** (`/admin/announcements`) — CRUD on `announcements`, in-app banner control
38. **Conversion funnel** (`/admin/funnel`) — signup → onboarding → first lead → trial gate → card → paid → retained
39. **Retention cohorts** (`/admin/cohorts`) — monthly cohort heatmap with LTV tracking
40. **Data export** (`/admin/exports`) — per-workspace exports + GDPR delete endpoint
41. **Referrals admin** (`/admin/referrals`) — top referrers leaderboard, conversion funnel, fraud watch, void/reinstate rewards
42. **Promo codes admin** (`/admin/promo-codes`) — CRUD on `promo_codes`, redemption stats, Stripe coupon sync status
43. **Affiliates admin** (`/admin/affiliates`) — CRUD on `affiliates`, referral attribution view, commission accrual (no payout UI yet)
44. **Acquisition analytics** (`/admin/acquisition`) — signup source breakdown, UTM performance, LTV by source, promo redemption funnel
45. **OAuth oversight** (`/admin/oauth`) — view all workspace OAuth connections, health by provider, troubleshooting
46. **Search Ops** (`/admin/search-ops`) — query strategies, engine routing, SerpAPI usage, search replay, parser preview, dedup preview, daily budget rules, and coverage by market
46a. **Market Coverage** (`/admin/coverage`) — coverage-gating controls by metro/city/county + vertical: strong/moderate/limited/unsupported, recommended scout mode, coverage-specific max daily scans, enabled signal types, notes, and last coverage check. Writes to `market_coverage` and informs onboarding + scheduled-scout execution.
46b. **Search Provider Registry** (`/admin/search-providers`) — structured search-provider config: active provider, adapter path, key secret name, skill/docs reference, default engines, enabled verticals/signal types, cost estimate, failover provider, and provider notes. Writes to `search_providers`. Do not rely on a freeform prompt box as the only source of API behavior.
47. **Cost & Margin** (`/admin/costs`) — SerpAPI, LLM, Mapbox, Resend, database, and infrastructure cost estimates by workspace, agent, signal type, and plan; cost per lead and gross margin by tier
48. **Provider Keys & Model Routing** (`/admin/providers`) — configured provider key status, per-agent provider/model routing, test-call buttons, error rates, latency, and estimated cost per agent
49. **Source Registry** (`/admin/sources`) — metadata-first registry of public sources and APIs beyond SerpAPI: NOAA/NWS, permit portals, licensing databases, event calendars, Google Maps, Google Jobs; source reliability, geography coverage, parser status, and last successful fetch. Phase 1 stores source controls in `system_settings` and derives source rows from `query_strategies` + `agent_runs.metadata`; do not add a new `source_registry` table unless Adam explicitly approves a schema expansion.
50. **Deployment Health** (`/admin/deployment`) — app version, commit hash, migration status, last seed run, cron status, health checks, webhook health, and production database safety checklist
51. **Signal Quality Controls** (`/admin/signal-quality`) — freshness decay rules, source trust weights, min score thresholds, duplicate sensitivity, source blacklist/whitelist, and calibration review
52. **Scout Controls** (`/admin/scout`) — per-tier scout defaults, margin protection thresholds (cost-per-lead pause, empty-run pause, abuse pass-rate flag), active schedules list, pause reasons breakdown, force resume, test scout. See Section 31.

**Design reference files — use these, do not invent new design decisions:**
- `design/fetchi_landing_page_v2.html` — landing page
- `design/fetchi_core_screens.html` — chat, my leads, lead profile, onboarding steps, finding screen
- `design/fetchi_settings_screens.html` — business profile, signal preferences, notifications, usage, empty state
- `design/fetchi_map_view.html` — map tab with pin + radius + lead pins
- `design/fetchi_admin_screens.html` — 16 base admin screens. Additional operations screens in Phase 1 follow the same dark-sidebar design language.

The `haink_*.html` files in the same folder are **obsolete — do not use them.**

**Design system constants:**
```typescript
const DESIGN = {
  colors: {
    brand: '#58937E',          // sage green
    brandDark: '#3D6B5A',
    brandLight: '#EAF3EF',
    coral: '#D85A30',
    coralLight: '#FAECE7',
    background: '#EBE6D9',     // parchment
    surface: '#F0EDE4',
    dark: '#2D2B2A',           // near-black, slightly warm
    mid: '#5a5550',
    light: '#8a8580',
    faint: '#b8b3ad',
  },
  fonts: {
    heading: "'Outfit', sans-serif",   // weight 600-800, headings + wordmark
    body: "'DM Sans', sans-serif",     // weight 400-600, all UI text
  },
  avatar: 'ツ',  // always this character — white on brand green rounded square
  icon: {
    // The ツ icon — rounded square, dark border, box shadow, -2deg rotation
    background: '#58937E',
    border: '3.5px solid #2D2B2A',
    borderRadius: '14px',
    boxShadow: '5px 5px 0px #2D2B2A',
    rotation: 'rotate(-2deg)',
    fontSize: '32px',
    fontWeight: 800,
  },
  wordmark: {
    font: "'Outfit', sans-serif",
    weight: 600,
    letterSpacing: '-0.045em',
    color: '#2D2B2A',
  },
  sidebar: {
    background: '#2D2B2A',
    width: '220px',
  },
  shadow: '3px 3px 0 #2D2B2A',
  borderRadius: {
    card: '12px',
    modal: '16px',
    icon: '14px',
    pill: '100px',
  },
  mapStyle: 'mapbox://styles/mapbox/light-v11',
}
```

---

## 17. API ROUTES STRUCTURE

```
/api/
  auth/
    [...clerk]/               Clerk webhook handlers
  
  webhooks/
    stripe/                   Stripe webhook handler
  
  opportunities/
    GET /                     List opportunities for workspace
    POST /                    Create opportunity (checks counter atomically)
    GET /[id]                 Get single opportunity
    PATCH /[id]               Update status, outcome
  
  signals/
    POST /scan                Trigger manual signal scan
    GET /                     List signals for workspace
  
  outreach/
    POST /draft               Generate outreach draft
    POST /send                Mark as sent
  
  leads/
    GET /                     List saved leads (supports filter, sort, search params)
    POST /[id]/save           Save opportunity to leads
    POST /bulk-update         Bulk status update
  
  voice/
    POST /transcribe          Transcribe audio → text
  
  search/
    POST /                    Run search through SearchProvider abstraction
  
  settings/
    profile/
      GET /                   Get service profile
      PUT /                   Update service profile
      POST /generate-from-url Auto-generate profile from website URL (SerpAPI + configured LLM)
    signals/
      GET /                   Get signal preferences
      PUT /                   Update signal preferences
    notifications/
      GET /                   Get notification preferences
      PUT /                   Update notification preferences
  
  webhooks-config/
    GET /                     List webhook configs
    POST /                    Create webhook config
    DELETE /[id]              Delete webhook config
  
  billing/
    POST /topup               Create Stripe payment for top-up
    GET /usage                Current usage stats with history
    GET /invoices             Invoice history
  
  map/
    POST /scan                Scan a lat/lng + radius for leads (Query Builder with geo params)
    GET /leads                Get leads within a bounding box for map pins
  
  evals/
    POST /run                 Run eval suite (admin only)
    GET /results              Get eval results
  
  admin/
    prompts/
      GET /                   List all prompts
      POST /                  Create new prompt version
      PATCH /[id]/activate    Activate prompt version
    search-ops/
      GET /                   Query strategy metrics, engine routing, SerpAPI usage
      POST /replay            Replay a past search in dry-run mode by default
      POST /strategies        Create/update query strategies
    costs/
      GET /                   Cost and margin rollups by workspace/agent/provider/source
    providers/
      GET /                   Provider key status + model routing matrix
      POST /test              Run a test provider call without exposing secrets
    sources/
      GET /                   Metadata-first Source Registry list generated from query_strategies, system_settings, and agent_runs.metadata
      PUT /                   Update source enablement/reliability/parser notes stored in system_settings keys
    deployment/
      GET /                   Version, migration, cron, webhook, health-check status
    signal-quality/
      GET /                   Signal quality controls and calibration report
      PUT /                   Update thresholds, decay rules, source weights, blacklists
```

---

## 18. ENVIRONMENT VARIABLES

```bash
# LLM Provider API Keys — add keys only for providers configured in /admin/agents
# All are optional. The system won't call a provider unless an agent is configured to use it.
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
TOGETHER_API_KEY=
# Custom OpenAI-compatible endpoint (optional)
CUSTOM_LLM_BASE_URL=
CUSTOM_LLM_API_KEY=

# SerpAPI
SERPAPI_API_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database (Neon PostgreSQL via Replit)
# DATABASE_URL is auto-injected by Replit — DO NOT set manually

# Stripe — BYOK only, do NOT use Replit Stripe connector
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

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@fetchi.ai
RESEND_PHYSICAL_ADDRESS=      # required for CAN-SPAM compliance

# Deepgram
DEEPGRAM_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=     # public token — safe to expose in browser

# OAuth Send-As — for outreach via the contractor's own email account
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://fetchi.ai/api/oauth/google/callback
MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=https://fetchi.ai/api/oauth/microsoft/callback

# Admin
FETCHI_ADMIN_USER_IDS=         # comma-separated Clerk user IDs with admin access

# App
NEXT_PUBLIC_APP_URL=https://fetchi.ai
APP_SECRET=                    # for HMAC webhook signatures AND OAuth token encryption
UNSUBSCRIBE_SECRET=            # for generating signed unsubscribe URLs (CAN-SPAM)
```

---

## 19. BUILD ORDER (PHASE 1)

**Goal: Complete product including admin operations platform. No deferrals to "phase 2 or 3" for anything specified in this brief.**

**Coding rule: every component is built mobile-first. Write default styles for mobile, add `lg:` overrides for desktop. Any component that doesn't work on a 375px screen (iPhone SE) is not done.**

**No admin panel deferral. The admin console builds alongside the customer app — not after it. Pricing, system settings, agent registry, email templates, abuse flags, feature flags, announcements all live in admin from day one.**

### Phase 1 build order

**Foundation**
1. Database schema — copy `db/schema.ts`, `db/index.ts`, `drizzle.config.ts` into project, run `npx drizzle-kit push`
2. `replit.md` file at project root
3. SerpAPI skill — `npx skills add serpapi/skills` so engine names are correct
4. Clerk auth + workspace-scoped query enforcement + email verification required
5. Disposable email block — Clerk webhook handler rejects disposable domains
6. Seed all data — `npx tsx db/seed.ts` populates workspace, pricing tiers, system settings, email templates, agent registry, tier features, query strategies, prompts, sample opportunities

**Customer app**
7. App shell — sidebar, credits widget, mobile hamburger collapse below lg
8. Onboarding — 3 steps + finding screen, writes service_profiles, tracks onboarding_step, resumes on re-login
9. Main chat — renders seeded leads, empty state with action cards
10. My Leads — list view, all filter tabs, empty states, bulk select
11. Lead Profile — detail view, ツ chat panel, outreach drafts section
12. Trial gate — `checkTrialGate()` in search_signals handler, gate modal with card collection, "Not now" dismissal
13. Business Profile settings — form including auto-generate from URL
14. Signal preferences settings — reads from `system_settings` for defaults
15. Notifications settings
16. Usage page — progress bar shows opportunities_used/limit, reset countdown, top-up options
17. Plan & billing page — reads tiers from `pricing_tiers` table, monthly/annual toggle
18. Trial expiry page (`/app/expired`) — card-free vs card-on-file paths
19. Map tab — Mapbox GL JS with lead pins, radius control, scan with lat/lng
20. Voice input — Deepgram integration on chat bar

**Admin console (`/admin`)** — separate Next.js layout group, dark sidebar, no customer branding, gated by `FETCHI_ADMIN_USER_IDS` env var
21. Admin auth + layout — env var gating, dark sidebar matching admin design
22. Admin dashboard — MRR, active workspaces, signups, churn at a glance
23. Workspaces list + 360° workspace detail view (subscription, usage, leads, agent runs, notes)
24. Billing operations — refunds, credits, trial extensions, tier overrides via Stripe API
25. Support tools — universal customer search, view-as-user mode, reset onboarding, resend digest
26. **Pricing & Plans admin** — CRUD on `pricing_tiers` and `tier_features` tables, monthly/annual pricing, Stripe price IDs, feature gating
27. **System Settings admin** — CRUD on `system_settings` table, organized by category (trial, signals, rate_limits, abuse, cron, compliance)
28. **Email Templates admin** — CRUD on `email_templates` table, preview, variable docs, A/B traffic splits
29. **Agent Registry admin** — view all 10 agents, edit provider/model/escalation/prompts/skills/timeouts at runtime — no code changes
30. Prompts admin — CRUD on `prompts` table, versioning, A/B traffic splits, usage stats
31. Abuse detection — auto-flagged accounts from `abuse_flags`, severity levels, resolution actions
32. Agent operations — live agent runs, queue depth, throughput, cost-per-opportunity from `agent_runs`
33. System health — dependency status for all providers (Anthropic, SerpAPI, Stripe, Resend, Mapbox, Deepgram, Neon)
34. Feature flags admin — CRUD on `feature_flags` table, global + per-workspace overrides
35. Announcements admin — CRUD on `announcements` table, in-app banners
36. Conversion funnel — signup → onboarding → first lead → trial gate → card → paid → retained
37. Retention cohorts — monthly cohort heatmap with LTV tracking
38. Data export — per-workspace exports with GDPR delete endpoint

**Background systems**
39. Stripe billing — subscription creation, webhooks, top-up flow, trial expiry auto-charge, reads pricing from `pricing_tiers` table
40. SearchProvider abstraction layer (`lib/search/SearchProvider.ts`)
41. LLM provider abstraction layer (`lib/agents/providers.ts`) — anthropic, openai, google, groq, together, custom
42. All 10 background agents — read config from `agent_registry`, prompts from `prompts` table
43. Query Builder — `buildQueryPlan()`, reads from `query_strategies` and `system_settings`
44. Nightly cron — Replit Scheduled Deployments, schedules read from `system_settings` (cron_* keys)
45. Weather events table + nightly NWS fetch job
46. Auto-generate service profile from URL — SerpAPI + LLM
47. Webhook system — per-workspace outbound, reads from `webhook_configs`
48. Eval framework — signal quality tests against real outcomes

**Growth, tracking, integrations (Section 28):**
49. User referral system — generate `referral_code` at signup, `/refer/<code>` route, customer-facing `/app/refer` page with link/share/stats, reward triggering on conversion event, fraud detection
50. Referral admin screen — `/admin/referrals` with leaderboard, funnel, fraud watch, manual void/reinstate
51. Promo codes — schema, admin CRUD at `/admin/promo-codes`, signup form integration, Stripe coupon API sync for percent/dollar codes, redemption tracking
52. Affiliate skeleton — `/admin/affiliates` CRUD, cookie-based attribution at landing, automatic `affiliate_referrals` creation on signup, commission accrual tracking (NO payout UI yet)
53. Conversion tracking — UTM capture at landing with cookie persistence, `signup_sources` population at signup, `/admin/acquisition` analytics screen
54. OAuth send-as — Google Workspace and Microsoft 365 OAuth flows, encrypted token storage, customer page at `/app/settings/integrations`, send via Gmail/Outlook API at outreach send time, admin oversight at `/admin/oauth`
55. Search Ops admin — `/admin/search-ops` with query strategy CRUD, engine routing, SerpAPI usage, search replay, parser preview, dedup preview, budget rules, and coverage map
56. Cost & Margin admin — `/admin/costs` with estimated cost per lead, cost by workspace, cost by provider/agent/source, gross margin by tier, and daily spend alerts
57. Provider Keys & Model Routing admin — `/admin/providers` with key status, agent routing, test calls, latency, error rate, and cost by model
58. Source Registry admin — `/admin/sources` with source reliability, geography coverage, parser health, last successful fetch, and enabled/disabled controls. Phase 1 is metadata-first: derive rows from `query_strategies`, `system_settings`, and `agent_runs.metadata`; do not add a new source table.
59. Deployment Health admin — `/admin/deployment` with app version, migration status, cron status, dependency health, webhook health, and production database safety checklist
60. Signal Quality Controls admin — `/admin/signal-quality` with threshold tuning, freshness decay, source trust weights, duplicate sensitivity, blacklists/whitelists, and calibration review
61. Today's Stack (mobile review mode) — `/app/today` card stack, evidence flip, why-pass modal, swipe + button actions, writes to `lead_pass_reasons` and `todays_run_items`. See Section 30.
62. Today's Run (`/app/today/run`) — route view of added leads, draft preparation via outreach agent (not sent), reorder, start-route action
63. Quality Scoring Agent learning loop — read aggregated `lead_pass_reasons` data and surface suggestions in conversation agent ("you're passing on a lot of small jobs — want me to filter to commercial-only?")
64. Scout schedule system — `scout_schedules` and `scout_runs` tables, per-workspace cron evaluation in workspace timezone, hard daily caps by tier from `system_settings`, atomic `recordScoutRun()` function. See Section 31.
65. Scout margin protection — auto-pause logic for credits-zero, dormant workspace, cost-per-lead anomaly, consecutive empty runs. Nightly job that re-evaluates pause conditions and notifies users via email when pause fires.
66. Settings → Scouting page (`/app/settings/scouting`) and admin Scout Controls (`/admin/scout`) — customer-facing mode selector with onboarding prompt, admin-facing tier defaults + threshold tuning + force resume + test scout
67. Market coverage gate — `market_coverage` table, `/admin/coverage` screen, onboarding coverage rating, and scheduled-scout execution gate that checks user preference + plan cap + coverage cap + spend cap + pause state before any automatic scout run. Manual chat searches remain allowed within plan limits. See Section 31.3a.
68. Search Provider Registry — `search_providers` table, `/admin/search-providers` screen, build-time SerpAPI skill requirement, launch `serpapi` provider adapter, and structured provider routing so Fetchi remains provider-agnostic even though SerpAPI is the default launch search provider. See Section 32.

**Everything in this brief ships in Phase 1. No deferrals.**

### Seeded data spec — `seed.ts`

Create `prisma/seed.ts` or `db/seed.ts` with realistic data covering all signal types and score ranges. This data powers the entire Phase 1 product demo.

**One seeded workspace:**
```typescript
const SEED_WORKSPACE = {
  workspace_id: 'seed_workspace_01',
  owner_user_id: 'seed_user_01',
  business_name: 'Johnson Roofing Co.',
  is_approved: true,
  onboarding_step: 4,
}

const SEED_SERVICE_PROFILE = {
  vertical: 'roofing',
  service_description: 'Commercial and residential roofing — repairs, replacements, storm restoration. Licensed in Texas.',
  location_city: 'Dallas',
  location_state: 'TX',
  location_radius_miles: 50,
  ideal_customer_description: 'Commercial property managers, HOA boards. Buildings 5,000–50,000 sq ft.',
}
```

**Five seeded opportunities — cover all cases:**

| # | Business | Signal Type | Score | Status | Why interesting |
|---|---|---|---|---|---|
| 1 | Parkview Office Complex | storm_damage | 94 | new | Tests high-score storm lead |
| 2 | Addison Corporate Park | storm_damage | 88 | new | Tests second storm lead same event |
| 3 | Frisco Medical Center | building_permit | 76 | contacted | Tests permit lead + contacted status |
| 4 | Legacy Town Center | building_permit | 82 | won | Tests won outcome — learning context |
| 5 | North Dallas Tech Hub | new_business_listing | 71 | new | Tests maps listing lead |

Each seeded opportunity must include:
- Full `prospects` record with address, business_type, phone, email, website
- Full `signals` record with raw_data, parsed_data, why_relevant
- Full `contact_routes` record with contact name, title, email, confidence score
- At least one `outreach_plays` record in draft status with realistic subject + body
- `why_now` text (2-3 sentences explaining the signal)

This ensures chat, lead profile, outreach drafts, and all filter tabs work from day one.

### Leads vs Opportunities — API clarification

These are the **same table** (`opportunities`) accessed through different API routes with different filters:

- `/api/opportunities` — all opportunities for workspace, used by agents and internal logic
- `/api/leads` — opportunities where status IN ('saved', 'contacted', 'responded', 'won', 'lost', 'skipped'), used by My Leads page

There is no separate leads table. "Lead" is a UX term for an opportunity the user has interacted with. The My Leads page shows the user's pipeline. The chat shows all opportunities including new unsaved ones.

### Card-free trial handling

Two types of trial users:
- **Card-free** — signed up without entering payment info (`payment_method_on_file = false`)
- **Card on file** — entered card during signup (not required but offered)

On trial expiry:
- Card-free users → `/app/expired` — must enter card to continue
- Card-on-file users → auto-charge the stored selected plan/interval from `workspace_subscriptions.tier` + `billing_interval`, send "Trial ended — your plan is active" email via Resend

The `/app/expired` page must handle both cases. Card-free shows the plan selector + payment form. Card-on-file shows "Your trial ended — your selected plan is now active" with plan name, billing interval, and a manage billing link.


## 20. SUCCESS METRICS

**The v1 success metric:**
"Show me 25 high-quality opportunities per week that I actually act on."

**Time-to-first-lead:** Under 24 hours from signup
**Signal accuracy:** Measured by eval suite — target >80% precision
**Outreach draft quality:** User sends without editing >50% of time
**Monthly churn:** Target <5%
**Opportunity counter:** Atomic — zero double-counts ever
**Agent cost per customer:** Target <$3/month at launch scale
**Settings completion rate:** >80% of users fill out Business Profile within 48h of signup
**Email verification rate:** >70% of email signups verify within 24h
**Trial gate conversion:** >40% of users who hit the gate add a card
**Trial to paid conversion:** >25% of trial starters become paying customers

---

## 21. USER FLOW

Every screen transition must be explicitly handled. No dead ends.

### Acquisition flow
```
Landing page (/)
    ↓
Sign up — Google OAuth or email (/signup)
    ↓ [if email signup]                    ↓ [if Google OAuth]
Verification email sent                    Skip — already verified
User clicks link in inbox
    ↓                                           ↓
Email verified ←────────────────────────────────┘
    ↓
Onboarding step 1 — vertical (/onboard/vertical)
    ↓
Onboarding step 2 — location (/onboard/location)
    ↓
Onboarding step 3 — ideal customer (/onboard/customer)
    ↓
Finding screen — "On it." (/onboard/finding) — auto-redirect 3s
    ↓
Main chat — leads 1-5 fully accessible, no card required (/app)
    ↓
Lead 6 requested → trial gate fires (if no card on file)
    ↓ [user adds card]              ↓ [user dismisses]
Card collected (not charged)        Session continues
Leads 6-10 unlocked                 Onboarding agent emails 24h later
    ↓
Day 7: trial ends
    ↓ [card on file]                ↓ [no card — never gated]
Auto-charge Starter plan            Redirect to /app/expired
"You're now on Starter" email       Upgrade prompt page
```

**Abandoned onboarding:** Resume from `onboarding_step` on next login. Never restart from step 1.

**Unverified email returning:** If user closes browser before verifying email, on next login show: "Check your inbox — we sent a verification link to [email]. [Resend link]." Block access to `/app` until verified.

### Core product loop
```
Main chat (/app)
    ↓
Fetchi surfaces lead card
    ↓ [tap card]
Lead Profile (/app/leads/[id])
    ↓ [tap Draft outreach]
Outreach draft appears in chat panel
    ↓ [tap Save lead]
Saved to My Leads (/app/leads)
    ↓ [mark as contacted]
Status updated → outcome learning triggered
    ↓ [mark won/lost]
Outcome logged → Outcome Learning Agent fires
```

### Limit hit flow
```
User requests lead / agent creates opportunity
    ↓
Counter check fails (opportunities_used >= opportunities_limit)
    ↓
Fetchi message: "You've used all 40 delivered lead cards this month.
                 Your counter resets in 14 days.
                 Add more now using your plan's current top-up rate."
    ↓ [user taps top-up]
Inline Stripe checkout (no page redirect)
    ↓
Credits added, counter updated
    ↓
Fetchi: "Done — 25 leads added. Want me to keep searching?"
```

### Settings flow
```
Sidebar nav → Business Profile
    ↓ [paste domain URL]
Auto-generate fills form fields
    ↓ [user confirms / edits]
Save → service_profiles updated
    ↓
New signal scan triggered automatically
    ↓
Fetchi message in chat: "Updated your profile. Scanning with new settings now."
```

**Empty states — every list needs one, every empty state needs an action:**
- Chat (new user, no leads): suggested action cards grid — 4 cards
- My Leads / All (no leads): "ツ is scanning. First leads usually arrive within 24 hours." + scan status indicator
- My Leads / Contacted (none): "No contacted leads yet. Save a lead and tap Draft outreach."
- My Leads / Won (none): "No won jobs yet. When you close a deal, mark it here so Fetchi learns what works for you."
- My Leads / Lost (none): "No lost leads. When something doesn't work out, mark it here — it helps Fetchi improve."
- Signal preferences (no exclusions): "No filters set. Add keywords here to exclude irrelevant leads."

---

## 22. SEO ARCHITECTURE

Programmatic SEO — one template, hundreds of pages, all funneling to signup.

### URL structure
```
/roofing-leads-dallas-tx
/commercial-cleaning-leads-phoenix-az
/hvac-leads-houston-tx
/landscaping-leads-atlanta-ga
/storm-damage-roofing-leads
/building-permit-leads-contractors
/alternatives/angi-leads
/alternatives/thumbtack
/alternatives/homeadvisor
```

### Database table — seo_pages
```sql
create table seo_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  vertical text,
  city text,
  state text,
  page_type text not null,   -- 'vertical_city' | 'signal_type' | 'alternative'
  h1 text not null,
  meta_description text not null,
  competitor_name text,       -- for alternative pages
  is_published boolean default false,
  created_at timestamptz default now()
);
```

### Template content — what each page shows
- H1 targeting the exact search query
- Live signal count for that city/vertical (pulled from signals table)
- Sample lead card showing a real recent signal (anonymized)
- "How Fetchi finds [vertical] leads in [city]" — 150 words
- 3 testimonial slots (placeholder until real customers)
- Single CTA: "Find [vertical] leads in [city] free" → signup

### Priority build order for SEO pages
1. **Competitor alternative pages first** — `/alternatives/angi-leads`, `/alternatives/thumbtack` — highest intent, users already paying and frustrated
2. **Storm-prone Sunbelt city + roofing** — Dallas, Houston, Phoenix, Tampa, Orlando — highest signal density
3. **Commercial cleaning + major metros** — franchise concentration makes these high-value
4. **All other vertical + city combos** — generated from seo_pages seed data

### What NOT to do with SEO pages
- Do not populate them with fake signal data — wait until real signals are flowing
- Do not build them as separate sites — same Next.js app, same domain, subfolder structure
- Do not stuff keywords — write for the contractor searching, not for Google

---

## 23. TRIAL, ABUSE PREVENTION, AND SUBSCRIPTION STATE MACHINE

Every workspace has a subscription status. The app must handle all states gracefully.

### State transitions
```
trialing (unverified email) → blocked until email verified
trialing (verified, <5 leads seen, no card) → full access to leads 1-5
trialing (verified, 5 leads seen, no card) → GATE: card required for leads 6-10
trialing (verified, card on file) → full access to all 10 trial leads
trialing → active (card charged on day 7)
trialing → expired (7 days elapsed, no card ever entered)
active → past_due (payment fails)
past_due → active (payment retried successfully)
past_due → canceled (payment fails after grace period)
canceled → active (resubscribes)
```

### The exact trial flow

```
Sign up (email or Google OAuth)
    ↓
[Email signup] Verify email → click link in inbox — REQUIRED before any access
[Google OAuth] Skip — Google already verified
    ↓
Access granted — 10 free leads, 7-day trial, NO card required yet
    ↓
User sees leads 1, 2, 3, 4, 5 in chat — full access, no friction
    ↓
Lead 6 requested → GATE fires (trial_opportunities_used >= 5, no card on file)
    ↓
Modal: "ツ found 5 leads for you. Add a card to see all 10."
    ↓ [user adds card]              ↓ [user dismisses]
Card collected (NOT charged yet)    Onboarding agent emails 24h later
Leads 6-10 unlocked                 "Your 5 remaining leads are waiting"
    ↓
Trial ends at day 7
    ↓ [card on file]                ↓ [no card on file]
Auto-charge Starter plan            Workspace → expired state
Send "Trial ended, you're active"   Redirect to /app/expired
```

### Email verification — Clerk config (zero code required)

In the Clerk dashboard:
- **Email verification**: set to "Required" for email signups
- **Google OAuth**: automatically verified — skip verification flow
- **Session creation**: block until email is verified

This means a user who signs up with email cannot access `/app` until they click the verification link. Clerk enforces this natively — no middleware needed.

### The 5-lead gate

```typescript
// lib/trial/gate.ts
interface GateResult {
  allowed: boolean
  reason?: 'trial_card_gate' | 'trial_expired' | 'limit_reached'
  leads_seen?: number
  message?: string
}

async function checkTrialGate(workspaceId: string): Promise<GateResult> {
  const sub = await getSubscription(workspaceId)

  // Not on trial — use normal opportunity counter
  if (sub.status !== 'trialing') return { allowed: true }

  // Card already on file — full trial access
  if (sub.payment_method_on_file) return { allowed: true }

  // Under 5 leads seen — free access, no gate
  if (sub.trial_opportunities_used < 5) return { allowed: true }

  // 5+ leads seen, no card — GATE
  return {
    allowed: false,
    reason: 'trial_card_gate',
    leads_seen: sub.trial_opportunities_used,
    message: `You've seen ${sub.trial_opportunities_used} leads — Fetchi is working. Add a card to see all 10 in your trial.`
  }
}

// Call this BEFORE consumeOpportunityCredit() in the search_signals tool handler
// If gate fires, return the gate message to the Conversation Agent instead of searching
```

### Gate modal copy — exact wording

```
┌─────────────────────────────────────────────┐
│                                              │
│          ツ found 5 leads for you.           │
│                                              │
│   Add a card to see the rest of your free   │
│   trial leads — you've got 5 more coming.   │
│                                              │
│   We won't charge anything until your       │
│   7-day trial ends. Cancel before then      │
│   and you owe nothing.                       │
│                                             │
│   [Add card — see my remaining leads]       │
│                                             │
│   [Not now — I'll come back later]          │
│                                             │
└─────────────────────────────────────────────┘
```

"Not now" closes the modal. Does not block the session. Onboarding Completion Agent emails 24 hours later:

> **Subject:** Your 5 remaining Fetchi leads are waiting
>
> You saw 5 leads in your trial — the next 5 are ready whenever you are.
> No charge until your trial ends on [date].
> [See my remaining leads →]

### Abuse prevention layers

**Layer 1 — Disposable email block (30 mins, day one)**

```typescript
// lib/auth/email-quality.ts
import disposableDomains from 'disposable-email-domains'  // npm package

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return disposableDomains.includes(domain)
}

// In Clerk webhook handler for user.created:
// If disposable email → delete user + workspace, return 400
// Message: "Please sign up with a real business email address."
```

**Layer 2 — IP rate limiting (1 hour, day one)**

```typescript
// middleware.ts — rate limit signups per IP
// Max 3 new workspaces per IP per 24 hours
// Use Replit KV or a simple postgres table for the counter
// Return 429 with: "Too many signups from this location. Try again tomorrow."
```

**Layer 3 — Phone verification via Clerk (30 min config, day one)**

In Clerk dashboard, enable optional phone collection at signup.
Not required to start — but show "Verify your phone for priority support" nudge
on day 2. Phone-verified users get a `phone_verified` flag on their workspace.
Future: make phone required if abuse rate exceeds threshold.

**Layer 4 — Card after 5 leads (built above — strongest lever)**

Bad actors will not enter real credit card details. This gate eliminates all
systematic abuse because the card is the commitment signal. Serial free-trial
abusers stop at Layer 1 (disposable email) or Layer 4 (card gate).

**Layer 5 — Nightly abuse detection query (cron-scheduled)**

```sql
-- Run nightly, alert if any row returns
SELECT
  split_part(cu.email_address, '@', 2) as email_domain,
  count(distinct ws.workspace_id) as trial_accounts,
  count(distinct ws.workspace_id) filter (
    where ws.created_at > now() - interval '7 days'
  ) as new_this_week
FROM workspace_settings ws
JOIN clerk_users cu ON cu.id = ws.owner_user_id
JOIN workspace_subscriptions wsub ON wsub.workspace_id = ws.workspace_id
WHERE wsub.status IN ('trialing', 'expired')
  AND cu.email_address NOT LIKE '%@gmail.com'  -- personal emails expected to be 1:1
  AND cu.email_address NOT LIKE '%@yahoo.%'
  AND cu.email_address NOT LIKE '%@hotmail.%'
GROUP BY 1
HAVING count(distinct ws.workspace_id) > 2
ORDER BY trial_accounts DESC;
```

### Trial event tracking — add to events table

```typescript
// New event types — add to event_type enum
'trial_gate_shown'           // user hit the 5-lead gate
'trial_gate_converted'       // user entered card at gate
'trial_gate_dismissed'       // user clicked "Not now"
'trial_gate_email_sent'      // 24h follow-up email sent
'email_verification_sent'    // verification email sent on signup
'email_verification_completed' // user clicked verification link
'disposable_email_blocked'   // signup rejected for disposable email
```

**The conversion funnel these events reveal:**
```
email_verification_sent → email_verification_completed  (target: >70%)
trial_gate_shown → trial_gate_converted                 (target: >40%)
trial_gate_shown → trial_gate_dismissed → converted     (target: >20% of dismissed)
```

If `trial_gate_shown → trial_gate_converted` drops below 30%, the gate modal copy needs work. If it's above 60%, consider moving the gate earlier (after 3 leads instead of 5).

### Trial messaging consistency

These strings must be identical everywhere — landing page, onboarding, emails, usage page, gate modal:

```typescript
const TRIAL_COPY = {
  headline: '10 free leads, 7-day trial',
  subline: 'No card required to start',
  gate_subline: 'No charge until your trial ends',
  leads_total: 10,
  gate_threshold: 5,
  trial_days: 7,
}
```

Never say "free trial" without specifying "10 leads, 7 days." Specificity builds trust.

### Schema — all trial fields in one place

```sql
-- workspace_subscriptions already has:
-- trial_opportunities_limit integer default 10
-- trial_opportunities_used integer default 0
-- trial_ends_at timestamptz
-- payment_method_on_file boolean default false
-- status: includes 'trialing' | 'expired'

-- workspace_settings already has:
-- onboarding_step integer default 0

-- No additional schema needed for trial abuse prevention
-- IP rate limiting uses a separate lightweight table:
create table signup_rate_limits (
  ip_hash text primary key,      -- sha256 of IP — never store raw IP
  count integer default 1,
  window_start timestamptz default now()
);
-- Cleanup: delete rows where window_start < now() - interval '24 hours'
```

---

## 24. ERROR STATES

Every user-facing action that calls an external API needs a handled error state. Never show a raw error message.

**Chat — SerpAPI error:**
```
ツ: "I hit a snag searching for that — SerpAPI returned an error. 
    Try a slightly different search, or I can retry in a moment."
[Retry button]
```

**Chat — LLM provider timeout:**
```
ツ: "That took longer than expected. Your request is still processing — 
    I'll show results as soon as they're ready."
[Shows typing indicator, retries automatically once]
```

**Chat — Opportunity limit hit:**
```
ツ: "You've used all 40 delivered lead cards this month. Your counter resets in 18 days.
    Add more now using your plan's current top-up rate."
[Inline top-up options]
```

**Outreach draft — generation failed:**
```
"Couldn't generate a draft right now. [Retry] [Write manually]"
```

**Lead enrichment — contact not found:**
```
Contact section shows: "No contacts found for this business.
[Search manually] — opens SerpAPI Google search for business name + 'contact'"
```

**Stripe payment failed (top-up):**
```
Toast: "Payment failed — please check your card details and try again."
[Update payment method] link
```

**Stripe payment failed (subscription renewal):**
```
Email via Resend: "Your Fetchi payment failed. Update your payment method 
to keep your leads flowing." + direct link to billing settings
```

**Map — Mapbox load failure:**
```
Map canvas shows: "Map unavailable right now. 
[Use list view instead] — switches to list tab automatically"
```

**General network error (any API call):**
```typescript
// lib/errors.ts
class FetchiError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public retryable: boolean
  ) { super(userMessage) }
}

// Never expose raw error.message to users
// Always map to userMessage
// Log full error server-side for debugging
```

---

## 25. MOBILE RESPONSIVENESS

Contractors check leads on their phones in the field. Mobile must work on day one — not as an afterthought. Every component is built mobile-first using Tailwind breakpoints.

**Non-negotiable rule: build mobile-first. Write the mobile styles first, then add `lg:` overrides for desktop. Never build desktop-first and try to shrink it down.**

---

### Breakpoints (Tailwind defaults — do not change)
```
default (no prefix) = mobile, 0px+
sm:  = 640px+   large phone landscape
md:  = 768px+   tablet
lg:  = 1024px+  laptop — primary desktop target
xl:  = 1280px+  large desktop
```

---

### App shell layout

**Mobile (default):**
```
┌─────────────────────────────┐
│ ≡  ツ Fetchi    🔔  [avatar]│  ← top bar, h-14, sticky
├─────────────────────────────┤
│                             │
│        page content         │  ← full width, no sidebar
│                             │
└─────────────────────────────┘
```

**Desktop (lg+):**
```
┌──────────┬──────────────────┐
│          │                  │
│ sidebar  │  page content    │
│  220px   │                  │
│          │                  │
└──────────┴──────────────────┘
```

```tsx
// components/layout/AppShell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile, visible lg+ */}
      <Sidebar className="hidden lg:flex w-[220px] flex-shrink-0" />

      {/* Mobile slide-over sidebar */}
      <MobileSidebar />  {/* renders as fixed overlay below lg */}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile top bar — visible below lg only */}
        <MobileTopBar className="flex lg:hidden" />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#EBE6D9]">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

### Mobile top bar (`MobileTopBar`)
```tsx
// Visible only below lg breakpoint
// Height: h-14 (56px) — enough for comfortable tap targets
// Background: #2a2a2a (dark, matches sidebar)

<div className="flex lg:hidden items-center justify-between 
                px-4 h-14 bg-[#2a2a2a] flex-shrink-0">
  {/* Hamburger */}
  <button className="p-2 -ml-2 text-white" onClick={openSidebar}
          aria-label="Open menu">
    <HamburgerIcon className="w-5 h-5" />
  </button>

  {/* Logo */}
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-full bg-[#58937E] flex items-center 
                    justify-center text-white text-sm font-semibold">ツ</div>
    <span className="font-serif text-white text-lg">Fetchi</span>
  </div>

  {/* Credits pill — compact on mobile */}
  <button className="flex items-center gap-1.5 bg-white/10 
                     rounded-full px-3 py-1.5 text-white text-xs font-semibold">
    <div className="w-1.5 h-1.5 rounded-full bg-[#58937E]" />
    32/50
  </button>
</div>
```

---

### Mobile sidebar slide-over (`MobileSidebar`)
```tsx
// Fixed overlay, slides in from left, z-50
// Backdrop: semi-transparent dark overlay, tap to close
// Width: 280px (slightly wider than desktop sidebar for touch comfort)

<div className={cn(
  "fixed inset-0 z-50 lg:hidden",
  isOpen ? "pointer-events-auto" : "pointer-events-none"
)}>
  {/* Backdrop */}
  <div className={cn(
    "absolute inset-0 bg-black/50 transition-opacity duration-200",
    isOpen ? "opacity-100" : "opacity-0"
  )} onClick={closeSidebar} />

  {/* Drawer */}
  <div className={cn(
    "absolute left-0 top-0 bottom-0 w-[280px] bg-[#2a2a2a]",
    "transition-transform duration-200 ease-out",
    isOpen ? "translate-x-0" : "-translate-x-full"
  )}>
    <SidebarContent onNavClick={closeSidebar} />
  </div>
</div>
```

---

### Touch targets — minimum 44×44px everywhere
```tsx
// All tappable elements must meet minimum touch target size
// Use padding to expand tap area without changing visual size

// BAD — 16px icon with no padding, 16×16 tap target
<button><Icon className="w-4 h-4" /></button>

// GOOD — 16px icon with padding, 44×44 tap target
<button className="p-3"><Icon className="w-4 h-4" /></button>

// Apply to: nav links, filter tabs, lead cards, status buttons,
//           toggle switches, close buttons, back buttons
```

---

### Chat (`/app`) — mobile

```tsx
// Full screen on mobile — all padding reduced
// Lead cards: full width, no max-width constraint
// Chat bubble max-width: 88vw on mobile vs 76% on desktop

<div className="flex flex-col h-full">
  {/* Message history */}
  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 lg:px-6">
    {messages.map(msg => (
      <ChatBubble
        className={cn(
          "max-w-[88vw] lg:max-w-[76%]",  // wider on mobile
          msg.role === 'user' ? "ml-auto" : ""
        )}
      />
    ))}
  </div>

  {/* Lead cards inside chat — full width on mobile */}
  <LeadCard className="w-full lg:max-w-[480px]" />

  {/* Chat input bar — taller on mobile for thumb reach */}
  <div className="px-3 py-3 lg:px-4 border-t bg-white flex-shrink-0">
    <div className="flex items-center gap-2">
      <input className="flex-1 px-4 py-3 lg:py-2.5 rounded-full 
                         bg-[#F0EDE4] text-sm" />
      <button className="w-11 h-11 lg:w-9 lg:h-9 rounded-full 
                          bg-[#58937E] flex-shrink-0" />
    </div>
  </div>
</div>
```

---

### My Leads — mobile

```tsx
// Toolbar: filter tabs scroll horizontally, no wrap
// Lead rows: simplified layout on mobile

{/* Toolbar */}
<div className="sticky top-0 bg-white z-10 border-b">
  {/* Tabs: horizontal scroll, no wrap */}
  <div className="flex gap-1 px-3 py-2 overflow-x-auto 
                   scrollbar-none flex-nowrap">
    {tabs.map(tab => <FilterTab key={tab} />)}
  </div>

  {/* Search: full width on mobile, inline with sort on lg */}
  <div className="px-3 pb-2 flex gap-2 lg:hidden">
    <input className="flex-1 text-sm px-3 py-2 rounded-lg 
                        border bg-[#F0EDE4]" placeholder="Search..." />
  </div>
</div>

{/* Lead row — mobile layout */}
<div className="flex items-center gap-3 px-4 py-3.5 bg-white 
                 border-b active:bg-[#F0EDE4]">
  <div className="w-9 h-9 rounded-lg flex-shrink-0 
                   flex items-center justify-center text-base">
    {signalIcon}
  </div>
  <div className="flex-1 min-w-0">
    <div className="text-sm font-semibold truncate">{bizName}</div>
    <div className="text-xs text-[#8a8580] truncate">{signalDesc}</div>
  </div>
  <div className="flex items-center gap-2 flex-shrink-0">
    <StatusPill />
    <span className="text-sm font-bold text-[#58937E]">{score}</span>
    <ChevronRight className="w-4 h-4 text-[#b8b3ad]" />
  </div>
</div>
```

---

### Lead Profile — mobile

```tsx
// Single column — no 3-column grid
// ツ chat panel: full-screen overlay triggered by FAB

// Layout
<div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px]">
  {/* Main profile — full width on mobile */}
  <div className="flex-1 overflow-y-auto p-4 lg:p-7">
    {/* Score moves below title on mobile */}
    <div className="flex flex-col lg:flex-row lg:items-start 
                     lg:justify-between gap-3 mb-5">
      <div>
        <h1 className="font-serif text-2xl lg:text-[26px]">{bizName}</h1>
        <SignalTag />
      </div>
      {/* Score: inline on mobile, right-aligned on desktop */}
      <div className="flex items-center gap-2 lg:flex-col lg:text-right">
        <span className="font-serif text-4xl lg:text-[48px] 
                          text-[#58937E]">{score}</span>
        <span className="text-xs text-[#8a8580]">Signal score</span>
      </div>
    </div>

    {/* Status controls — sticky bottom bar on mobile */}
    <div className="hidden lg:flex gap-2 mb-5">
      <StatusButtons />
    </div>
  </div>

  {/* ツ chat panel — full screen overlay on mobile */}
  <div className={cn(
    "fixed inset-0 z-40 bg-white lg:static lg:z-auto",
    "lg:border-l transition-transform duration-200",
    chatOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
  )}>
    <ChatPanel onClose={() => setChatOpen(false)} />
  </div>
</div>

{/* Mobile sticky bottom bar */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t 
                 px-4 py-3 flex gap-2 lg:hidden z-30">
  <button className="flex-1 py-3 bg-[#2a2a2a] text-white 
                      rounded-xl text-sm font-semibold">
    Mark contacted
  </button>
  <button
    className="w-12 h-12 bg-[#58937E] rounded-xl flex items-center 
                justify-center flex-shrink-0"
    onClick={() => setChatOpen(true)}
  >
    <span className="text-white text-lg">ツ</span>
  </button>
</div>
```

---

### Settings — mobile

```tsx
// Settings sidebar collapses to horizontal tab strip on mobile

{/* Mobile: top tab strip */}
<div className="flex lg:hidden overflow-x-auto scrollbar-none 
                 border-b bg-white px-2 pt-2 flex-nowrap gap-1">
  {['Profile', 'Signals', 'Notifications', 'Usage', 'Billing'].map(tab => (
    <button key={tab}
      className={cn(
        "flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-t-lg",
        "border-b-2 transition-colors whitespace-nowrap",
        active === tab
          ? "border-[#58937E] text-[#3D6B5A]"
          : "border-transparent text-[#8a8580]"
      )}
    >{tab}</button>
  ))}
</div>

{/* Desktop: left sidebar nav — hidden on mobile */}
<div className="hidden lg:flex flex-col w-[200px] border-r ...">
  <SettingsSidebarNav />
</div>
```

---

### Onboarding — mobile

```tsx
// Card is already centered — works on mobile as-is
// Only change: vertical grid wraps to 1 column below sm

<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {verticals.map(v => <VerticalCard key={v.id} />)}
</div>

// Onboarding card padding: tighter on mobile
<div className="bg-white border-2 border-[#2a2a2a] rounded-2xl 
                 p-6 lg:p-10 mx-4 lg:mx-0 
                 shadow-[4px_4px_0_#2a2a2a] max-w-[520px] w-full">
```

---

### Map tab — mobile

```tsx
// Full screen map, results as bottom drawer

{/* Map: full screen */}
<div className="relative flex-1">
  <MapboxMap className="absolute inset-0" />

  {/* Signal chips: horizontal scroll strip at top */}
  <div className="absolute top-3 left-3 right-3 flex gap-2 
                   overflow-x-auto scrollbar-none flex-nowrap z-10">
    <SignalChips />
  </div>

  {/* Bottom pill bar: scan + radius — full width on mobile */}
  <div className="absolute bottom-4 left-4 right-4 lg:left-1/2 
                   lg:right-auto lg:-translate-x-1/2 lg:w-auto">
    <ScanRadiusBar />
  </div>
</div>

{/* Results: bottom drawer on mobile, side panel on desktop */}
<div className={cn(
  // Mobile: bottom drawer
  "fixed bottom-0 left-0 right-0 z-30 lg:static",
  "bg-white rounded-t-2xl lg:rounded-none",
  "border-t lg:border-l border-[#2a2a2a]/10",
  "h-[55vh] lg:h-full lg:w-[320px]",
  "transition-transform duration-300",
  drawerOpen ? "translate-y-0" : "translate-y-[calc(100%-56px)]"
)}>
  {/* Drawer handle — mobile only */}
  <div className="flex lg:hidden justify-center py-3 cursor-pointer"
       onClick={toggleDrawer}>
    <div className="w-10 h-1 rounded-full bg-[#b8b3ad]" />
  </div>
  <ResultsPanel />
</div>
```

---

### Modal and gate dialogs — mobile

```tsx
// Trial gate modal, top-up modal — full screen on mobile, centered card on desktop

<div className={cn(
  "fixed inset-0 z-50 flex",
  // Mobile: align to bottom for thumb reach
  "items-end lg:items-center",
  "justify-center p-0 lg:p-4"
)}>
  <div className={cn(
    "bg-white w-full lg:max-w-[440px]",
    // Mobile: rounded top corners only, full width
    "rounded-t-2xl lg:rounded-2xl",
    "p-6 lg:p-8",
    "border-2 border-[#2a2a2a]",
    "shadow-[4px_4px_0_#2a2a2a] lg:shadow-[4px_4px_0_#2a2a2a]"
  )}>
    <ModalContent />
  </div>
</div>
```

---

### Typography scaling
```tsx
// Page titles: smaller on mobile
<h1 className="font-serif text-2xl lg:text-[26px]">Business Profile</h1>

// Section headings: consistent
<h2 className="font-sans text-sm font-semibold">Business details</h2>

// Body text: consistent — 13px everywhere, no scaling
<p className="text-sm text-[#5a5550]">...</p>

// Score number on lead profile: scale down on mobile
<span className="font-serif text-4xl lg:text-[48px] text-[#58937E]">94</span>
```

---

### Spacing and padding rules
```tsx
// Page-level padding: tighter on mobile
<div className="p-4 lg:p-7">  {/* 16px mobile, 28px desktop */}

// Card padding: consistent
<div className="p-4 lg:p-5">  {/* 16px mobile, 20px desktop */}

// Section gaps: tighter on mobile
<div className="space-y-3 lg:space-y-4">

// Bottom safe area — account for iPhone home bar
<div className="pb-safe">  {/* or pb-6 as fallback */}
```

---

### What to test before shipping Phase 1

Replit Agent must verify these manually before Phase 1 is "done":

- [ ] Sidebar opens and closes on mobile without layout shift
- [ ] Chat input is accessible above the keyboard when keyboard is open (use `interactive-widget=resizes-content` in viewport meta)
- [ ] Lead cards in chat are full width and readable on 375px (iPhone SE)
- [ ] Filter tabs on My Leads scroll without wrapping
- [ ] Lead Profile shows single column with sticky bottom bar on mobile
- [ ] Onboarding card fits within 375px without horizontal scroll
- [ ] All buttons and interactive elements meet 44×44px minimum tap target
- [ ] Trial gate modal appears as bottom sheet on mobile
- [ ] Settings tabs scroll horizontally and don't wrap

Add this meta tag to `_document.tsx`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, 
      interactive-widget=resizes-content" />
```
The `interactive-widget=resizes-content` ensures the page resizes when the keyboard opens — critical for the chat input bar.

---

## 26. CAN-SPAM COMPLIANCE

Fetchi sends commercial emails on behalf of users (outreach drafts) and sends its own emails (digest, alerts). Both require compliance.

**Every email Fetchi sends must include:**

1. **Accurate sender** — from `hello@fetchi.ai` (not spoofed, not user's address until Gmail connector built)
2. **Physical postal address** — in footer of every email, pulled from `RESEND_PHYSICAL_ADDRESS` env var
3. **Unsubscribe link** — signed URL using `UNSUBSCRIBE_SECRET`, honored within 10 business days
4. **"Advertisement" identification** — digest and alert emails must be identifiable as commercial

**Email template footer (required in all Resend templates):**
```html
<div style="font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
  You're receiving this because you use Fetchi to find leads for your business.<br>
  <a href="{{unsubscribe_url}}">Unsubscribe</a> · 
  <a href="{{preferences_url}}">Email preferences</a> · 
  Fetchi · {{physical_address}}
</div>
```

**Unsubscribe URL generation:**
```typescript
// lib/email/unsubscribe.ts
function generateUnsubscribeUrl(workspaceId: string, emailType: string): string {
  const token = sign({ workspaceId, emailType }, process.env.UNSUBSCRIBE_SECRET)
  return `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${token}`
}

// /app/unsubscribe/route.ts — honors the unsubscribe
// Updates notification_preferences table
// Shows: "You've been unsubscribed from [email type] emails."
// With link back to notification preferences to re-enable
```

**For outreach drafts:**
- Fetchi drafts outreach on behalf of users
- The user is the sender — Fetchi is a tool, not a sender
- Terms of service must include: "You are responsible for CAN-SPAM compliance for any emails you send using Fetchi-generated drafts"
- Fetchi should include a note in the draft UI: "Remember to include your business address and an unsubscribe option in your email signature"

**TCPA note:** Email-only at launch. No phone or SMS outreach. This avoids TCPA exposure entirely.

---

## 27. BUILD STRATEGY

### Replit Agent builds everything

**One tool, one codebase, one mental model.** Replit Agent is the sole builder for this project. No handoff from Claude Code. The brief, schemas, seed file, design mockups, and replit.md are complete enough that the architecture is already decided — what remains is execution against a fixed spec, which is exactly what Replit Agent is built for.

**Why this is the right call:**

- The architecture work is done. The brief, schema, seed, and mockups carry the decisions. Replit Agent doesn't need to make architectural calls during the build.
- Replit Agent knows its own environment (DATABASE_URL injection, Secrets, Drizzle setup, deploy loop). Every line it writes is shaped by where it runs.
- No handoff means no muddied code. Two agents touching the same codebase is the largest source of architectural drift.
- Predictable usage cost vs Claude Code rate limits.

**When to bring in Claude Code:**

Only as a consultant for specific stuck moments — not as a co-builder. If Replit Agent can't figure out a particular pattern (e.g. how the LLMProvider interface should look in TypeScript), ask Claude Code in a separate session, paste the answer back to Replit Agent as additional context. Claude Code never touches the repo directly.

---

### What Replit Agent builds

Everything in Section 19 (the 68-item Phase 1 build order). Customer app, admin console, all 10 agents, Stripe billing, map tab, voice input, eval framework, SEO pages, webhook system. No deferrals. No "Phase 2" or "Phase 3."

---

### What Replit Agent must NOT touch

- The Replit Stripe connector — Stripe is BYOK only
- The Replit AI Integrations for Anthropic — all LLM calls go through `lib/agents/providers.ts`
- The schema.ts file — use as-is, don't rewrite
- The db_index.ts file — use as-is, don't rewrite the atomic counter or trial gate logic
- Any hardcoded values that contradict the four config tables (pricing_tiers, system_settings, email_templates, tier_features)
- DATABASE_URL — Replit auto-injects this, do not set manually

---

### CRITICAL: Stripe — BYOK only, do not use the Replit Stripe connector

Replit has a built-in Stripe connector that auto-scaffolds its own payment schema and checkout UI. **Do not use it.** The Fetchi subscription model is too custom — trial counters, tier-specific limits, the 5-lead gate, annual/monthly plans, tier-specific top-up rates, and admin-managed pricing — the connector would overwrite the intended schema and break the architecture.

**The correct approach:**

Build Stripe from the brief using BYOK Stripe keys only:
- checkout sessions for monthly + annual subscriptions
- top-up checkout sessions
- Stripe webhook handler
- subscription sync into `workspace_subscriptions`
- billing portal redirect
- coupon/discount sync for promo codes
- trial-end/card-on-file flow

Build around `workspace_subscriptions`, `consumeOpportunityCredit()`, and `checkTrialGate()` — never replace those primitives.

---

### CRITICAL: LLM providers — BYOK and provider-agnostic

Do not enable Replit AI Integrations for production Fetchi agent logic. All model calls go through `lib/agents/providers.ts`, and every agent reads provider/model routing from `agent_registry`. Provider keys are configured through Replit Secrets and checked from `/admin/providers` without ever showing secret values.

Replit AI Integrations can be useful for prototypes, but production Fetchi should use BYOK provider keys for cost tracking, rate-limit control, provider portability, and per-agent routing.

---

### Replit Secrets to wire (Replit Agent's job)

```bash
# Anthropic — leave empty in dev unless configured in admin agent registry
ANTHROPIC_API_KEY=

# SerpAPI — required for live signal detection
SERPAPI_API_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Stripe — BYOK only, do NOT use Replit Stripe connector
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

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@fetchi.ai
RESEND_PHYSICAL_ADDRESS=         # fill with real address before sending emails

# Deepgram
DEEPGRAM_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://fetchi.ai
APP_SECRET=
UNSUBSCRIBE_SECRET=
```

**Note:** `DATABASE_URL` is auto-injected by Replit — do not add it to Secrets manually.

---

### REPLIT.MD FILE

The `replit.md` file is provided as a separate file alongside this brief. Drop it at the project root as-is — do not regenerate it from scratch. It contains operating instructions, architecture rules, secrets list, and design system reference that Replit Agent reads at the start of every session.

---

- Own scrapers or crawlers — SerpAPI handles it
- CRM features — Jobber and ServiceTitan do this, integrate don't replicate
- Email sending infrastructure — Resend handles it
- Phone calling or SMS — TCPA risk, email only at launch
- Europe/GDPR compliance — defer until product-market fit
- Japan market — defer until 100 US customers (no centralized permit API, APPI burden, cold outreach culturally misaligned)
- Native iOS/Android apps — build PWA instead (add to home screen, no App Store 30% tax, no review cycle)
- Custom analytics dashboard — focus on leads not metrics, use Resend for digest
- Marketplace lead sharing — build lead_claimed_by schema Day 1 but don't build the claiming logic until customers complain
- SEO pages populated with fake data — build the schema and template in Phase 1, populate only when you have real signal counts per city

---

## 28. GROWTH SYSTEMS — REFERRALS, PROMOS, AFFILIATES, TRACKING, OAUTH

Four related but distinct systems all ship in Phase 1.

### User referrals (viral mechanism)

Every workspace gets a unique `referral_code` at signup, format `<slug>-<random4>` (e.g. `JOHNSON-A4F2`). Referrer shares a link `fetchi.ai/refer/<code>`, friend signs up through it, both get rewards when friend converts to paid.

**Customer-facing page:** `/app/refer` shows the user's unique link, copy button, share buttons (Twitter/X, LinkedIn, email, SMS), total referred, total rewards earned, recent referral activity. Sidebar entry in the app sidebar labeled "Refer & earn — get a free month" or whatever the current reward is (label pulled from `system_settings.referral_referrer_reward_type`).

**Reward structure** (all configurable via `system_settings`):
- Referrer reward: free month, account credit, or bonus opportunities
- Friend reward: extended trial (default 7 → 14 days) or bonus opportunities
- Both rewards trigger only on the `referral_qualification_event` (default: `first_paid_invoice`) — prevents fraud where someone makes a fake account to farm rewards

**Fraud detection:**
- Same IP for referrer and friend → void referral (configurable: `referral_fraud_check_same_ip`)
- Same device fingerprint → flag for manual review
- Friend cancels within 14 days of triggering reward → void and reverse reward
- Admin can manually void any referral with a reason

**Tables involved:** `workspace_settings.referral_code`, `referrals` (one row per signed-up friend, tracks both rewards independently)

**Admin screen:** `/admin/referrals` — top referrers leaderboard, conversion funnel (link clicks → signups → paid → reward triggered), fraud watch list, manually void/reinstate rewards, total payout liability (sum of unpaid rewards).

### Promo codes

Admin creates codes from `/admin/promo-codes`. Code types:
- `trial_extension` — adds N days to trial (handled internally)
- `percent_off_first` — percent off first month subscription (mirrored to Stripe coupon via API)
- `dollar_off_first` — fixed dollar off first month (mirrored to Stripe coupon)
- `free_credits` — adds N bonus opportunities to trial allocation
- `free_month` — first month free of any tier

Code entered at signup (optional field) or at checkout (Stripe-handled). On signup: code validates against `promo_codes` table, applies via the appropriate mechanism, writes to `promo_redemptions`, increments `redemptions_so_far`.

**Stripe coupon sync:** When admin creates a percent or dollar code, backend calls Stripe API to create matching coupon, stores the Stripe coupon ID on the row. When code redeemed at checkout, Stripe checkout session is created with `discounts: [{ coupon: stripeCouponId }]`. Fetchi is source of truth; Stripe is execution layer.

**Admin screen:** `/admin/promo-codes` — list with redemption counts, create/edit/disable, audit log of who redeemed each code.

### Affiliates (skeleton — payout management deferred)

`affiliates` table captures affiliate relationships and commission structure. `affiliate_referrals` tracks workspace signups attributed to each affiliate.

**Attribution flow:**
1. Visitor lands at `fetchi.ai/?ref=AFFILIATECODE`
2. Server sets HTTP-only cookie `fetchi_ref` containing the code, 90-day expiration (configurable: `affiliate_default_attribution_window_days`)
3. At signup, cookie is read; if present and code matches an active affiliate, create `affiliate_referrals` row tying workspace to affiliate
4. When workspace converts to paid, `convertedAt` is set; commission accrues based on `commission_type` and `commission_value`

**What ships in Phase 1:**
- `affiliates` table and admin CRUD at `/admin/affiliates`
- `affiliate_referrals` table populated automatically via cookie attribution
- Commission accrual tracked in `commission_accrued_cents` column
- Admin view of affiliate-attributed workspaces, total accrued, commission ledger

**What defers (build when you actually have affiliates):**
- Payout UI and processing (Stripe Connect or manual ACH)
- Affiliate-facing dashboard (where the affiliate logs in to see their stats)
- 1099 generation and tax reporting
- Public affiliate signup page

For Phase 1, you add affiliates manually via admin and track their referrals automatically. When you have enough affiliates to justify the operational overhead, build the payout system.

### Conversion tracking

Every workspace gets one row in `signup_sources` capturing attribution data at signup. This is the foundation of acquisition analytics.

**Captured at signup:**
- UTM params (source, medium, campaign, content, term) from URL or cookie
- Referrer URL (where they came from)
- Landing page URL on Fetchi
- Promo code used
- Affiliate code used
- User referral code used
- Signup method (`google` | `email`)
- IP country
- Device type

**UTM persistence:** UTM params from the URL are written to a cookie at landing time. If the visitor doesn't sign up immediately, the cookie persists for `utm_cookie_lifetime_days` (default 30) so the eventual signup still attributes correctly.

**Admin screen:** `/admin/acquisition` shows:
- Signups by source over time (chart)
- Conversion rate to paid by source
- LTV by source (paid revenue summed by signup source)
- Top performing utm_campaigns
- Top performing landing pages
- Promo code redemption funnel (clicked → signed up → paid)
- Affiliate attribution breakdown

This screen answers questions like "is my Google Ads spend worth it?" and "which marketing channels produce high-LTV customers vs one-month churners?"

### OAuth send-as (email integration)

The one external integration that ships in Phase 1. Contractor connects their Google Workspace or Microsoft 365 email account; outreach drafts are sent from their real address, replies land in their real inbox.

**Why this and not 10 other integrations:** This is the single most-requested integration in cold outreach tools. Without it, outreach goes from `hello@fetchi.ai` (not theirs), reply goes to Fetchi's inbox (not theirs), they have to copy/paste replies, attribution breaks. With it, the entire outreach flow happens through their existing email infrastructure. Everything else (CRM exports, calendar, Slack) ships via webhooks for now.

**Tables:** `oauth_connections` stores encrypted tokens per workspace per account.

**Provider scope and OAuth flow:**

Google:
- Scopes: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/userinfo.email`
- OAuth flow: standard Authorization Code with PKCE
- Token refresh: refresh_token used to get new access_token when expired

Microsoft:
- Scopes: `Mail.Send`, `User.Read`
- OAuth flow: Microsoft Identity Platform v2.0
- Tenant: `common` (works for both personal and work accounts)

**Customer-facing screen:** `/app/settings/integrations` — single page with two cards (Google + Microsoft), Connect button on each, status indicator when connected, disconnect option. Shows which email account is connected.

**Sending:** When user clicks Send on an outreach draft and they have an active OAuth connection, the email is sent via Gmail/Outlook API using the stored access token. If token is expired, refresh first. If refresh fails, mark connection `error` and prompt user to reconnect.

**Token encryption:** Access and refresh tokens encrypted via APP_SECRET before insert. Decrypted only at send time, in memory, never logged. Never returned via any API endpoint that the customer can call.

**Admin screen:** `/admin/oauth` shows OAuth connection health across workspaces — counts of active, expired, error states. Per-workspace troubleshooting view.

### What does NOT ship in Phase 1

These are integrations and growth features explicitly deferred:
- CRM integrations (Salesforce, HubSpot, Pipedrive, JobNimbus, Buildertrend, Housecall Pro) — ship via webhooks for now, build specific integrations when 20+ customers ask by name
- Slack, Notion, Airtable, Snowflake, Google Drive integrations — wrong audience for Fetchi
- Affiliate payout processing
- Public affiliate signup page
- Affiliate-facing dashboard
- 1099 tax reporting
- Phone/SMS integration (TCPA risk)

---

*This brief is the source of truth. When in doubt, refer back to the core loop: Signal → Opportunity → Outreach. If a feature doesn't serve that loop, it waits.*

---

## 29. OPERATIONS COCKPIT AND SEARCH BUSINESS IMPROVEMENTS

This section converts Fetchi from a lead-finding demo into an operable SaaS. The admin console must make the signal engine, API spend, search quality, source coverage, and deployment risk visible before customers notice problems.

### 29.1 Search Ops cockpit

Route: `/admin/search-ops`

Purpose: operate the query engine. Fetchi should know which queries, engines, verticals, markets, and sources actually produce valuable opportunities.

Required panels:
- Query strategies table: vertical, signal type, engine, query template, priority, enabled/disabled, last run, opportunities created, duplicate rate, invalid rate.
- Engine routing: enable/disable `google_light`, `google_news_light`, `google_maps`, `google_jobs`, and future engines by vertical and signal type.
- SerpAPI usage: requests today, requests by workspace, requests by engine, success/error rate, timeout rate, estimated spend.
- Search replay: choose a past run and replay it against current parsers without writing new opportunities unless explicitly confirmed.
- Parser preview: raw SerpAPI JSON → parsed signal → prospect → opportunity candidate.
- Dedup preview: show the dedup hash inputs and whether a result was created, merged, skipped, or treated as fresh after the 7-day window.
- Budget rules: daily global cap, per-workspace cap, per-chat-request cap, and per-nightly-scan cap.
- Coverage map: vertical + geography coverage strength, weak markets, missing sources, and signal volume trends.

Implementation notes:
- Use `query_strategies`, `agent_runs.metadata`, `events.metadata`, and `system_settings` first. Add a dedicated `search_runs` table later only if the metadata fields become too crowded.
- Never expose API keys or raw secrets in replay logs.
- Search replay defaults to dry-run mode.

### 29.2 Cost & Margin cockpit

Route: `/admin/costs`

Purpose: protect margins. Fetchi charges by subscription and lead volume, so admin must see the cost to produce each lead.

Track by workspace, plan, agent, provider, signal type, and day:
- SerpAPI requests and estimated cost.
- LLM calls, token estimates, and model/provider cost.
- Mapbox map loads and geocoding calls.
- Resend emails sent.
- Deepgram transcription calls.
- Database/storage/infrastructure estimate.
- Cost per raw signal.
- Cost per valid opportunity.
- Cost per saved lead.
- Cost per outreach draft.
- Gross margin by tier.

Required alerts:
- Workspace exceeds expected daily search spend.
- Agent cost spikes over 2x 7-day average.
- Cost per opportunity exceeds configured threshold.
- Free trial account approaches abuse threshold.

### 29.3 Provider Keys & Model Routing

Route: `/admin/providers`

Purpose: keep the LLM layer provider-agnostic and operationally visible.

Required fields/panels:
- Provider key status: configured/missing, never showing the key value.
- Test call button per provider.
- Agent routing matrix: agent slug, provider, model, escalation provider, escalation model, prompt key, max tokens, timeout, retries.
- Latency and error rate by provider/model.
- Estimated cost by provider/model.
- Last successful call timestamp.
- Hard failure mode: if a provider key is missing, the agent should not run and should report a friendly admin-visible error.

Rule: production Fetchi should use BYOK provider keys and the existing `lib/agents/providers.ts` abstraction. Replit AI Integrations can be useful for prototyping, but production agent logic should not depend on Replit-managed AI credentials.

### 29.4 Source Registry

Route: `/admin/sources`

Purpose: make sources a first-class asset. SerpAPI is the default launch search provider, but Fetchi’s moat grows as it learns structured sources by vertical and geography.

**Phase 1 storage rule:** do not add a new `source_registry` table. Build `/admin/sources` as a metadata-first operational view. Derive source rows from `query_strategies`, `system_settings`, and `agent_runs.metadata`. Store source enablement, reliability overrides, parser notes, and admin notes as namespaced `system_settings` keys such as `source.serpapi_google_light.enabled` and `source.noaa_nws.reliability_score`. A dedicated table can be added later once source configuration stabilizes.

Source registry fields:
- source name
- source type: search, API, manual, webhook, public portal
- supported verticals
- supported geographies
- supported signal types
- engine or fetch method
- parser status: none, draft, active, failing
- reliability score
- average result quality
- average cost
- last successful fetch
- failure count
- enabled/disabled
- admin notes

Initial source classes:
- SerpAPI Google Light
- SerpAPI Google News Light
- SerpAPI Google Maps
- SerpAPI Google Jobs
- NOAA/NWS weather feeds
- city/county permit portals
- business license databases
- event calendars
- chamber of commerce/new business listings

### 29.5 Deployment Health

Route: `/admin/deployment`

Purpose: prevent production incidents and make Replit deployment/database state visible.

Required panels:
- current app version / commit hash
- environment: development, preview, production
- last migration time
- migration status
- last seed run
- last successful nightly cron
- queue/cron health
- `/api/health` status
- Stripe webhook health
- Clerk webhook health
- Resend health
- SerpAPI health
- Mapbox health
- LLM provider health
- database connection health
- production database safety checklist

Checklist before production publish:
- no destructive schema changes without review
- no required columns added without defaults
- no raw secrets in logs
- test checkout completed
- test webhook received
- health route passes
- admin auth verified
- workspace scoping manually spot-checked

### 29.6 Signal Quality Controls

Route: `/admin/signal-quality`

Purpose: tune what counts as a good lead without code changes.

Controls:
- min score threshold by vertical
- min score threshold by signal type
- freshness decay by signal type
- stale-after days by signal type
- source trust weights
- duplicate sensitivity
- excluded keywords by vertical
- trusted source whitelist
- bad source blacklist
- review queue for low-confidence parser output
- calibration report comparing scores to outcomes

Signal-type defaults should differ:
- Storm damage: fast decay, high urgency.
- Permit filing: slower decay, longer sales window.
- New business listing: medium decay, depends on business type.
- Job posting: medium decay, weak alone but useful as supporting evidence.
- Event booking: date-bound, expires immediately after event date.

### 29.7 Customer-facing improvements

These ship in existing app screens:

- Evidence drawer: every opportunity exposes source, source URL when available, engine/source, detected date, score rationale, `why_now`, and recommended next action.
- Lead freshness clock: Hot, Warm, Cooling, Stale states with signal-type-specific decay.
- Find more like this: turns a good opportunity into a new Query Builder search.
- Outcome tags: quick tags for won/lost/skipped so learning improves quickly.
- Territory heat map: signal density and sales territory intelligence inside the map tab.

### 29.8 MCP guidance

Replit MCP servers may help Replit Agent during development by connecting to external tools. Do not make MCP the production runtime path for Fetchi search. Production search must remain inside Fetchi’s own `SearchProvider` abstraction so workspace attribution, quotas, cost accounting, replay, deduplication, and audit logging remain under Fetchi control.


---

## 30. TODAY'S STACK — MOBILE SWIPE REVIEW MODE

A mobile-first daily review ritual. Contractors open Fetchi in the morning, review fresh leads as a card stack, add good ones to Today's Run, and reject bad ones with structured reasons that feed the learning loop. The goal is a 2-minute habit that turns Fetchi from "another tab to check" into "the first thing I look at."

### 30.1 Core rules

**Buttons are canonical. Swipes are taught alongside.** Every action has a visible button. Swipe gestures are bonus shortcuts. Power users learn the gestures; everyone else taps buttons. Accessibility requires this; older contractors require this.

**Swipe right does NOT send outreach.** It adds the lead to Today's Run and triggers automatic outreach draft preparation. The user reviews and sends the draft from their own email (via OAuth send-as) later. Outreach is never sent without explicit user action.

**Every passed lead asks why.** A structured 6-option chooser captures `wrong_contact | already_has_vendor | too_small | out_of_area | bad_signal | not_my_customer | other` plus an optional note. This data lives in `lead_pass_reasons` and feeds the Quality Scoring Agent's calibration.

**Today's Stack is opt-in default.** New mobile users open to Chat by default — the conversational AI agent positioning is what differentiates Fetchi. After `todays_stack_mobile_default_after_n_uses` daily uses (default 3), surface a setting "Open to Today's Stack on mobile" as a discoverable preference. Don't force it.

**The daily digest email links to Today's Stack on mobile.** When a user taps a digest email link from their phone, they land directly in Today's Stack — they opened the email *because* they want to review.

### 30.2 The four screens

**1. Card front — the lead**

Designed to look like a field report, not a dating card. Single visible card with one or two peeking behind to signal the stack.

Front shows:
- Signal badge row (e.g. `HAIL · 1.8" · 3D AGO · NO CLAIM`)
- Business name, location, building size or other key qualifier
- Score (large, with reason ribbon — e.g. `94 — Fresh storm + commercial roof`)
- Why now (2-3 sentences from the opportunity's `why_now` field)
- Evidence chips row (storm, permit, ownership, market — clickable to flip)
- Contact route preview (best contact name, title, confidence dots)
- Action buttons row: `Pass · Snooze · Open evidence · Add to run`
- Progress strip top: `~2 min to clear · 9 left · ~12s per lead · 3/12`

**2. Card back — evidence**

Tap evidence chips or "Open evidence" button to flip. The proof side.

Back shows:
- Trust summary line at top: `4 sources verified · contact confidence high · signal fresh`
- Numbered evidence list:
  1. Storm report (NOAA event ID, date, hail size, link)
  2. Building permit (year, type, link to permit record)
  3. Ownership (LLC name, registration status, source)
  4. Market confirmation (adjacent damage, local news, photos if available)
- Contact route ranked: primary contact + 1-2 backups, each with confidence indicator
- Suggested next step (1-line action recommendation from the conversation agent)

**3. Why pass?**

Triggered automatically when a card is passed. Auto-advances to next card after a reason is picked (or skipped with "no reason").

Shows:
- "Tag the pass — tagging helps Fetchi stop surfacing leads like this" header
- 6 reason cards in a vertical list (radio-style multi-select):
  - Wrong contact — Person isn't a decision-maker
  - Already has vendor — Established relationship
  - Too small — Below my job-size threshold
  - Out of area — Outside my service zone
  - Bad signal — Storm/permit doesn't apply
  - Not my customer — Right signal, wrong fit
- Optional note field
- Buttons: `Skip · Save tag · Next lead →`

**4. Today's Run**

The destination for added leads. Mobile-optimized route view.

Top stats: `3 stops · 52 min · $300k est. pipeline`

Below: an optional map preview (route line connecting stops) — Mapbox lightweight static if performance is tight.

Then: ordered list of stops, each showing:
- Stop number + business name + score
- Signal badge + freshness
- Address + drive time
- Draft status: `DRAFT READY` or `EDITING` or `SENT`
- Tap to expand → see prepared outreach draft + edit + send via OAuth send-as

Bottom: `Reorder · Add another · Start route`

### 30.3 Database tables (added to schema)

**`lead_pass_reasons`** — one row per pass with reason, optional note, source surface, workspace_id, opportunity_id. Indexed on (workspace_id, reason) for aggregate analysis.

**`todays_run_items`** — one row per opportunity added to a run, with run_date, route_order, status, outreach_play_id reference. Unique on (workspace_id, opportunity_id, run_date) so same lead can't appear twice on the same day's run.

### 30.4 System settings (all admin-tunable)

All Today's Stack behavior is controlled by `system_settings` keys in the `todays_stack` category:
- `todays_stack_enabled` — global feature toggle (default: true)
- `todays_stack_mobile_default_after_n_uses` — daily uses before "make this my default" surfaces (default: 3)
- `todays_stack_cards_per_session_max` — max cards in one session (default: 15)
- `todays_stack_session_target_seconds` — target time to clear (default: 120)
- `todays_stack_swipes_enabled` — enable swipe gestures, buttons always canonical (default: true)
- `todays_run_max_stops` — max stops per run (default: 12)
- `pass_reason_feedback_loop_enabled` — feed pass reasons into Quality Scoring Agent (default: true)

### 30.5 Learning loop integration

The Quality Scoring Agent reads aggregated `lead_pass_reasons` data when re-scoring opportunities:
- 5+ passes labeled `out_of_area` in last 30 days → suggest tightening location radius
- 5+ passes labeled `too_small` → suggest raising the minimum-deal-value filter in workspace_learning
- 5+ passes labeled `not_my_customer` → re-weight the ideal-customer-description embedding match
- 5+ passes labeled `bad_signal` for one signal type → de-prioritize that signal type for the workspace

These adjustments don't auto-apply. They surface as suggestions in the conversation agent: "I'm noticing you're passing on a lot of small jobs. Want me to filter to commercial-only?" The user accepts or rejects.

### 30.6 What does NOT ship in Phase 1

- Auto-send outreach on swipe right — never. Draft prepared, user sends manually.
- Voice-controlled triage ("pass," "save") — interesting but defer until Today's Stack is validated.
- Card animations beyond basic spring physics — keep it fast, fluid, not flashy.
- Tinder-style "rewind" — undo is fine via the toast notification, but no rewind metaphor.

### 30.7 Navigation placement

**Mobile bottom nav:**
```
Chat · Today · Leads · Map · Settings
```

`Today` tab opens Today's Stack when there are fresh leads. When stack is empty, shows "All clear — Fetchi is scanning for tomorrow's leads. Check back at 7am."

**Desktop sidebar:** Today's Stack appears as a sidebar item but is de-prioritized. Desktop users live in chat and the leads table. Mobile is where the swipe ritual happens.


---

## 31. SCOUT POLICY — COST LAYER SEPARATION AND MARGIN PROTECTION

The scout system is how Fetchi automatically scans public sources on behalf of a workspace. This section defines the policy. The card UI (Today's Stack, chat, leads list, map) is the **presentation layer**. The scout/search is the **cost layer**. These are separated by design.

### 31.1 The core mental model

**Customer-facing language: "lead cards delivered."**
**Internal language: "scan budget, scout runs, cost-per-delivered-lead."**

A user should never think "1 credit per SerpAPI search." They should think "I got 8 verified lead cards today." How those cards were produced — overnight auto-scout, midday scout, manual chat ask, refreshed from cache — is Fetchi's internal concern.

This separation matters because it lets Fetchi:
- Run multiple scans without burning user credits when nothing matches
- Cache and dedupe across the workspace's day without double-charging
- Adjust internal cost strategy (cheaper engines, batching, off-peak runs) without changing the customer's mental model
- Maintain trust: users never feel charged for "nothing"

### 31.2 Scout modes (user-controlled)

Every workspace has a scout schedule (`scout_schedules` table). Defaults at signup are set by tier; users change it anytime via Settings → Scouting.

**Customer-facing labels must stay calm. Do not show the word “aggressive” in customer UI.** Internally, admins may still use an `aggressive`/custom mode for high-frequency experiments, but the customer sees plain schedule language.

| Customer-facing label | Internal mode | What it does | Tier defaults |
|---|---|---|---|
| **Only when I ask** | `off` | No auto-scouting. User gets cards only when they ask in chat or use the map. | Optional fallback for any tier |
| **Once each morning** | `once_daily` | One scout run per day at 6am workspace-local time. | Default for Starter, Growth |
| **A few times per day** | `three_daily` | Morning, midday, late afternoon scouts. | Default for Pro and Scale |
| **Custom schedule** | `custom` / admin-only `aggressive` | User-defined schedule, always respecting hard daily caps and spend caps. | Available to Pro and Scale only |

Onboarding asks this directly:

> **How should Fetchi scout for you?**
> ○ Only when I ask
> ○ Once each morning
> ○ A few times per day
> ○ Custom schedule (Pro/Scale)
>
> *You can change this anytime in Settings → Scouting.*

### 31.3 Hard daily caps (margin protection)

Regardless of user setting, scout runs are hard-capped per day by tier in `system_settings`:

- Starter: max 1 scan/day
- Growth: max 3 scans/day
- Pro: max 5 scans/day
- Scale: max 6 scans/day (even high-volume plans have a wall)

Plus a global daily SerpAPI+LLM spend cap per workspace (default $10/day in `scout_max_cost_per_day_cents`). When the cap is hit, the scout pauses for the remainder of the day. This is non-negotiable cost protection.

**Implementation rule:** plan limits must be read from `system_settings` at runtime (`scout_max_scans_per_day_starter`, `scout_max_scans_per_day_growth`, `scout_max_scans_per_day_pro`, `scout_max_scans_per_day_scale`, `scout_max_cost_per_day_cents`, `scout_max_cards_per_run`). Do not hardcode tier caps in code.

### 31.3a Market coverage gate

Scheduled scouting is also gated by market coverage. Fetchi does **not** claim equal automatic coverage everywhere. Large cities are not automatically good markets; signal-dense counties, suburbs, storm corridors, and permit-rich metros are good markets. Coverage is measured by evidence density, not population size.

During onboarding, after the user chooses territory + vertical, Fetchi assigns a coverage rating from `market_coverage` or a lightweight coverage check:

| Coverage | Meaning | Scheduled scouting default | Coverage cap | User-facing copy |
|---|---|---|---:|---|
| **Strong** | Enough public signals to reliably produce profitable lead cards | Once each morning recommended | Uses plan cap | Fetchi has strong coverage in your area. Morning scouting is recommended. |
| **Moderate** | Some usable signal density, but lead volume may vary | Only when I ask or once daily | 1/day | Fetchi can scout here, but lead volume may vary. Start conservative. |
| **Limited** | Weak public data or expensive-to-search territory | Only when I ask | 0 scheduled | Coverage is limited here. Manual searches are still available. |
| **Unsupported** | Not enough data for reliable scouting yet | Manual/search waitlist only | 0 scheduled | Fetchi is not ready to auto-scout this market yet. |

The actual scheduled scout allowance is always:

```typescript
allowedDailyScans = min(
  tierDailyScanCapFromSystemSettings,
  coverageDailyScanCapFromMarketCoverageOrSettings,
  internalSpendCapRemaining
)
```

**Scheduled scout execution gate:** before any cron-driven scout runs, the app must check all of these in order:

1. User scout mode is not `off` and schedule is due.
2. Workspace has credits or is eligible to receive delivered cards.
3. Workspace tier cap from `system_settings` allows another scan today.
4. Market coverage status allows scheduled scouting for this vertical + territory.
5. Internal daily spend cap has not been reached.
6. Schedule is not paused by the user or by margin-protection logic.

If any check fails, do **not** run SerpAPI. Insert/update a skipped/paused audit event where useful and show a user-readable reason in Settings → Scouting. Manual chat searches remain allowed in limited/moderate markets within plan and spend limits; they still write `scout_runs` with `trigger = manual_chat`.

`market_coverage` is the admin-controlled coverage map for Phase 1. `/admin/coverage` lets Adam edit coverage by geography + vertical, recommended scout mode, coverage-specific max daily scans, supported signal types, and notes. Admins may override coverage restrictions for a workspace, but never bypass global emergency spend caps.

### 31.4 Lead credit consumption rules

**Lead credits are consumed only when a verified lead card is delivered, not per scan or per pass.** Setting: `scout_credit_consumed_on_delivery_only = true`.

This means:
- A scout run that finds 5 strong leads → 5 credits consumed
- A scout run that finds 0 strong leads → 0 credits consumed, scan logged for admin
- A user passing on a delivered lead → credit already consumed (lead was delivered)
- A user adding a delivered lead to Today's Run → no additional credit

For the "no good leads matched" case, surface a transparent message to the user:

> Fetchi checked 218 sources this morning. No strong leads matched your filters today.
>
> Try widening your radius or lowering the score threshold.
> *No lead credits used.*

This is the trust-building moment. Show the work, suggest the adjustment, don't burn a credit.

### 31.4a Scout run accounting and credit transaction algorithm

All scan entry points write a `scout_runs` row. This includes:
- `trigger = scheduled` for Auto Scout / Morning Scout cron runs
- `trigger = manual_chat` when the user asks Fetchi to find leads in chat
- `trigger = manual_map` when the user scans a map area or ZIP/radius
- `trigger = admin_test` when an admin tests a source or workspace from `/admin/scout`

The runner must follow this order:

1. **Start run:** insert `scout_runs` with `status = running`, trigger, workspace, and started timestamp before making SerpAPI or LLM calls.
2. **Search and score:** run search/provider logic and dedupe using the canonical `signals.signal_hash` and `opportunities.workspace_signal_unique` constraints.
3. **Empty run:** if zero verified lead cards survive dedupe + threshold, update `scout_runs` with `leads_delivered = 0`, `credit_consumed = false`, `empty_reason`, cost counters, and `status = no_results`. **Do not call `consumeOpportunityCredit()` on empty runs.**
4. **Delivery transaction:** for each newly delivered opportunity card, call `consumeOpportunityCredit(workspace_id)` exactly once inside the same transaction/operation that makes the opportunity visible to the user. If credit consumption fails, do not deliver that card.
5. **No double charge:** never consume an additional credit when the same opportunity is reviewed, passed, snoozed, added to Today’s Run, opened from chat, opened from map, or drafted for outreach. Delivery is the only charge point.
6. **Complete run:** set `leads_delivered` to the number of newly delivered cards and set `credit_consumed = leads_delivered > 0`. Use `leads_delivered` as the count; `credit_consumed` is the audit boolean.

This guarantees delivered leads consume credits once, empty runs consume none, and both manual and scheduled searches are visible in cost/margin analytics.

### 31.5 Pass-reason credit-back policy

The `scout_pass_reason_credit_back_policy` setting controls whether passes can credit back. Three options:

- **`never`** — passes never credit back, regardless of reason
- **`admin_only`** (default) — admin can manually credit back for genuine misses via `/admin/billing`
- **`auto_on_validated_reason`** — certain pass reasons (e.g. `wrong_contact` with strong signal of bad data) auto-credit-back; risky, off by default

Default is `admin_only` to prevent gaming. The abuse layer (Section 29.5 calibration) flags workspaces with pass rate exceeding `scout_pass_rate_anomaly_threshold_pct` (default 40%) for manual review — these may be users trying to farm credits by labeling everything bad.

### 31.6 Auto-pause conditions (margin protection)

Scout automatically pauses (with notification) when any of these fire:

1. **Out of credits** — `scout_pause_when_credits_zero`. Don't keep paying SerpAPI when the user can't receive leads anyway.
2. **Dormant workspace** — `scout_pause_when_inactive_days` (default 14). If they haven't opened the app in 2 weeks, stop scouting until they return.
3. **Cost-per-lead anomaly** — `scout_pause_when_cost_per_lead_exceeds_cents` (default $1.25 / 125 cents). If rolling 7-day cost-per-delivered-lead exceeds threshold, pause and message: "Your scout schedule isn't producing strong leads this week. Want to adjust your filters?"
4. **Consecutive empty runs** — `scout_pause_after_n_empty_runs` (default 5). Five empty runs in a row signals a misconfigured ICP; pause and prompt user to revisit signal preferences.

Every pause writes `paused_reason` and `paused_at` to `scout_schedules`. Pause reasons must have user-readable copy, not just internal enums.

| Internal status / reason | User-facing message |
|---|---|
| `user_paused` | Auto-scouting is paused. Fetchi will only look for leads when you ask. |
| `system_paused_low_credits` | You’ve used this month’s lead allowance. Auto-scouting is paused until you add leads or your plan resets. |
| `system_paused_low_yield` | Your scout schedule is not producing strong leads this week. Adjust your filters or resume when market activity picks up. |
| `system_paused_inactive` | Auto-scouting paused while your workspace is inactive. Resume anytime. |
| `budget_exceeded` | Today’s scout budget was reached. Fetchi will try again tomorrow unless you adjust your settings. |

The user can resume manually anytime, or fix the underlying issue and the schedule resumes automatically on next check. Admins can override from `/admin/scout` with **Force resume**, which sets `status = active`, clears `paused_reason`/`paused_at`, and logs an admin event. Force resume never bypasses the hard daily scan cap or hard spend cap.

### 31.7 Internal tracking (admin visibility)

Every scout run writes to `scout_runs` for cost accounting:

- `sources_checked` — how many sources the run touched
- `serp_api_calls_made` — actual SerpAPI requests
- `llm_tokens_used` — token consumption for scoring/enrichment
- `estimated_cost_cents` — best-effort spend estimate
- `signals_found` — raw signal count before dedup/threshold
- `duplicates_filtered` — caught by dedup hash
- `leads_delivered` — final count user sees
- `empty_reason` — `no_signals_found | all_duplicates | all_below_threshold | null`
- `credit_consumed` — whether this run consumed a delivered-lead credit (false on empty runs)

This data powers `/admin/costs` (Section 29.2) and `/admin/search-ops` (Section 29.1) so the operator can see cost-per-delivered-lead by tier, by workspace, by signal type, and over time.

### 31.8 The card format is universal

Regardless of how a lead was produced — auto-scout, manual chat scan, map drag, daily digest link — the card UI is the same. Same fields, same actions, same evidence flip. This is intentional:

> "Fetchi can scout automatically, or only when asked. Either way, the result is the same: evidence-backed lead cards the user can review, pass, save, or add to Today's Run."

So the card component (front + back + actions) appears in:
- Chat results when user asks "find me roofers in Plano"
- Today's Stack mobile swipe review
- My Leads list (when expanded)
- Map side panel (when a pin is selected)
- Daily digest email link target
- Lead detail's "related leads" section

One card design, multiple delivery contexts.

### 31.9 Admin screen — Scout Controls

Add `/admin/scout` to the admin console (referenced in Section 16):

- **Per-tier defaults table** — edit default mode, max scans/day, max cost/day for each pricing tier
- **Margin protection thresholds** — edit cost-per-lead pause threshold, empty-run pause count, abuse pass-rate threshold
- **Active schedules** — list of workspaces with current mode, status (active/paused), user-readable pause reason, last scan, scans today
- **Pause reasons breakdown** — how many workspaces are paused for each reason; lets you see if thresholds are too tight
- **Force resume** — admin override to resume a paused schedule
- **Test scout** — admin trigger a one-off test scout against any workspace, logged as `admin_test` trigger

Add `/admin/coverage` as the companion screen for coverage gating. It controls `market_coverage` rows and should show coverage status, recommended mode, coverage-specific caps, enabled signal types, latest coverage check, and notes by metro/city/county + vertical.

### 31.10 Scout implementation audit checklist

Before marking the scout system complete, verify these behaviors in code and screenshots/logs:

1. `scout_runs.credit_consumed` exists and is set to `false` for empty/no-result runs and `true` only after one or more verified lead cards were actually delivered.
2. Empty runs never call `consumeOpportunityCredit()`.
3. Delivered lead cards consume credits exactly once. Reviewing, passing, snoozing, adding to Today’s Run, opening from map/chat, or drafting outreach never consumes another credit.
4. Manual chat scans and scheduled scans both write `scout_runs` rows (`manual_chat` vs `scheduled` trigger).
5. Pause reasons show user-readable messages, not raw internal enums.
6. `/admin/scout` can force-resume or pause a schedule, but cannot bypass hard daily scan/spend caps.
7. Plan limits are read from `system_settings` at runtime. No hardcoded tier scan caps or cost caps in application logic.
8. Customer-facing scouting labels are calm: **Only when I ask**, **Once each morning**, **A few times per day**, **Custom schedule**. Never show “aggressive” on customer surfaces.
9. Scheduled scouts are coverage-gated. Strong markets may use plan caps; moderate markets default to conservative once-daily; limited/unsupported markets default to **Only when I ask**.
10. Manual chat searches still work in limited markets within plan/spend limits and write `scout_runs` with `trigger = manual_chat`.
11. `/admin/coverage` can update coverage status/recommended mode/caps, but admin override cannot bypass emergency spend caps.


## 32. SEARCH PROVIDER ARCHITECTURE — SERPAPI-NATIVE AT LAUNCH, PROVIDER-AGNOSTIC BY DESIGN

### 32.1 Core principle

Fetchi should not be vendor-locked to SerpAPI, but the launch search adapter must understand SerpAPI deeply.

Permanent product architecture:

```
Query Builder → SearchProvider interface → provider adapter → parsed signal → evidence-backed lead card
```

Launch implementation:

```
Query Builder → SearchProvider → SerpAPI adapter → parsed signal → opportunity
```

This means:
- The product is **search-provider agnostic** at the architecture level.
- Fetchi is **SerpAPI-native at launch** because SerpAPI is the default provider.
- SerpAPI-specific engine names, parameters, response parsing, pagination, rate limits, and errors live in the SerpAPI adapter and provider registry — not scattered through route handlers, agents, or UI code.

### 32.2 Build-time skill requirement

Before implementing `lib/search/SearchProvider.ts`, `lib/search/providers/serpapi.ts`, Query Builder, Signal Detection, scout execution, or the `search_signals` tool, the builder must install/read the SerpAPI web-search skill:

```bash
npx skills add serpapi/skills
```

If that command is unavailable in the build environment, copy/read the skill directly:

```bash
skills/serpapi-web-search/SKILL.md → .claude/skills/serpapi-web-search/SKILL.md
```

The purpose is to prevent guessed engine names and guessed result structures. The adapter must follow the skill's guidance for engine selection, parameters, pagination, error handling, and cheaper/faster `_light` variants.

### 32.3 Runtime provider adapter

Create a launch adapter at:

```
lib/search/providers/serpapi.ts
```

The SerpAPI adapter owns:
- request construction
- API key loading from `SERPAPI_API_KEY`
- default engine selection
- result parsing into Fetchi's normalized result shape
- pagination / `start` handling where supported
- retry behavior
- error mapping into friendly/internal errors
- estimated cost per request
- logging metadata into `scout_runs`, `agent_runs.metadata`, or Search Ops as appropriate

Engine defaults for SerpAPI at launch:

| Search purpose | Engine | Notes |
|---|---|---|
| General web / permits / local records | `google_light` | Prefer over full `google` for speed/cost |
| News / storm reports / event mentions | `google_news_light` | Prefer over full `google_news` |
| Local businesses / listings / places | `google_maps` | No light variant |
| Job-posting signals | `google_jobs` | No light variant |

Never call SerpAPI directly from Next.js route handlers, React components, agent code, or billing/scout logic. All runtime search calls must go through:

```
lib/search/SearchProvider.ts
```

### 32.4 Search Provider Registry admin

Add `/admin/search-providers` as a structured Search Ops admin screen backed by `search_providers`.

Fields:
- provider slug (`serpapi`)
- display name
- active/disabled status
- adapter path
- API key secret name
- skill/docs reference
- default web/news/maps/jobs engines
- enabled verticals
- enabled signal types
- estimated cost/search
- failover provider slug
- admin notes
- test provider button

This screen is where the operator sees and edits structured provider configuration.

### 32.5 Admin context box: allowed, but not source of truth

The Agent Registry already has `skills` and admin-editable agent configuration. It is fine for an admin panel to show a context/notes/skill reference box such as:

```
Use serpapi-web-search skill. Prefer google_light and google_news_light.
```

But this freeform text must not be the only thing controlling behavior. Core API behavior must come from:
1. `SearchProvider` interface
2. provider adapter code
3. `search_providers` structured fields
4. `query_strategies` templates
5. `system_settings` caps / budgets

Freeform provider notes are documentation and operator guidance, not an execution contract.

### 32.6 Query Builder rules

The Query Builder reads:
- active provider from `search_providers`
- query templates from `query_strategies`
- market coverage from `market_coverage`
- scout/budget caps from `system_settings`
- workspace profile from `service_profiles`

Every search execution must log:
- `workspace_id`
- provider slug
- engine
- query
- location / radius / territory input
- triggering mode (`scheduled`, `manual_chat`, `manual_map`, `admin_test`)
- `scout_run_id` if applicable
- result count
- parsed signal count
- duplicate count
- estimated cost
- error state

### 32.7 Future provider swaps

If a better search provider is added later, do not rewrite the product. Add:
1. a new provider adapter under `lib/search/providers/`
2. a new row in `search_providers`
3. provider-specific parser tests
4. engine mapping in Search Ops
5. a controlled rollout flag / percentage split

The rest of Fetchi — lead cards, evidence drawer, scout runs, Today’s Stack, Today’s Run, billing, and outcome learning — should remain unchanged.
