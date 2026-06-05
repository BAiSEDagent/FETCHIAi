# SaaS and AI Chat Starter Pattern Notes

Status: Research reference only.

Purpose: Capture useful patterns from Convex SaaS and Convex AI Chat starter projects without changing Fetchi's source-of-truth stack or architecture.

## Decision

Fetchi is **not migrating to Convex**.

These starters are useful as product and implementation references, but they are not a replacement for Fetchi's current architecture:

- Next.js 14 App Router
- TypeScript
- Tailwind + shadcn/ui
- Clerk
- Stripe
- Resend
- Drizzle ORM
- Postgres
- Provider-abstracted agents
- SerpApi through `SearchProvider`
- Firecrawl through evidence/enrichment provider contracts

Do not introduce Convex, TanStack Router, Convex Auth, or Convex Actions into Fetchi unless a future checkpoint explicitly approves a stack migration. That is not approved now.

## References reviewed

- `get-convex/convex-saas`
- `get-convex/convex-saas/docs`
- `waynesutton/nextjsaichatconvextemplate`
- Uploaded reference: `Convex TanStack SaaS Starter.pdf`
- Uploaded reference: `Next.js + Convex AI Chat Starter v.0.1.pdf`

## Useful patterns from Convex SaaS Starter

The Convex SaaS starter is useful as a reference for common SaaS surface area, especially:

- Landing page structure
- Onboarding flow shape
- Dashboard page organization
- Admin page organization
- Stripe subscription and customer-portal UX patterns
- Resend / React Email organization
- Theme toggles and user settings references
- Responsive layout polish
- File-upload UX references
- General docs and starter-project organization

These are product and UI/reference patterns only. Fetchi should not copy the backend stack.

## Useful patterns from Next.js + Convex AI Chat Starter

The AI chat starter is useful as a reference for how an AI-facing product can keep chat responsive while work happens asynchronously.

Reusable Fetchi patterns:

- Persisted chat sessions
- Persisted message history
- Background AI response generation
- Model preference management
- Message archival
- Clear-chat affordance
- Responsive chat input with autosizing textarea
- Toast/status feedback while work is running
- Separation between chat UI state and longer-running agent work

Fetchi should implement these ideas inside the existing app stack rather than adopting Convex Actions.

## Fetchi translation

For Fetchi, the core lesson is not Convex itself. The useful lesson is durable, observable agent work.

Fetchi should eventually support:

- `agent_runs`
- `provider_runs`
- `search_tasks`
- `evidence_records`
- `source_documents`
- persisted chat threads
- persisted chat messages
- staged job status updates
- replayable provider runs
- model/provider choice through existing agent registry patterns

This supports the Fetchi product laws:

- No lead without evidence
- No score without reason
- No explanation without action

## Guardrails

Do not use these starters to justify:

- migrating from Postgres/Drizzle to Convex
- replacing Clerk auth
- replacing Next.js App Router with TanStack Router
- adding a second backend source of truth
- bypassing provider abstraction
- hardcoding model/provider choices into chat components
- mixing chat UI work with provider/search/agent implementation
- touching billing, auth, schema, admin, settings, or routes without explicit checkpoint scope

## Build classification

- Build now: No runtime adoption.
- Next/reference: Use as pattern input for async agent run UX and SaaS surface organization.
- Later: Consider only after Fetchi's evidence-backed lead supply lanes and provider contracts are proven.
- Reject now: Convex stack migration.

## Recommended next use

When Fetchi scopes chat or agent-run UX, use this note to inform a dedicated prompt around:

- persisted chat threads
- visible agent run status
- evidence packet progress states
- model/provider preference display in admin
- async job feedback without blocking the UI

This should remain separate from current provider-contract and lead-supply work unless Adam explicitly moves something out of scope.