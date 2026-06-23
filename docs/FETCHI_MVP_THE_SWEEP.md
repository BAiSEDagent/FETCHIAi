# Fetchi MVP — The Sweep

**Supersedes** the cautious `FETCHI_CP-MVP-1_BRIEF.md`. Build this, in bold strokes.

## What it is
The user types **what they sell** and **who they want**. Fetchi unleashes an agent that sweeps the web — Google, Maps, business listings, news, social — and hands back a **big list of real, contactable businesses**. It feels like magic because it did the work.

## The feel
Abundance and power. Wide, fast, a satisfying pile of leads with names, websites, phones, and emails where found. Show the sweep — sources hit, how many scanned, how many found. **No apologies, no caveats, no confidence labels, no gates, no "data gaps" section.** Volume first.

## Inputs (onboarding — dead simple)
- What you sell / your service
- Who you want (ICP)
- The **market to target** — any city, state, metro, or nationwide. Just a field. (Fetchi is national; this is the only role "location" plays.)

## The engine (invisible to the user)
- **SerpApi = breadth.** Google **Maps/Local** (business name, phone, website, address), Google **Web**, Google **News** for hooks. A wide net across the target market.
- **Firecrawl = depth.** Scrape each business's site for **email / owner** and a one-line hook.
- The proven **conductor** runs it: dedupe, run many in **parallel**, stream results in as they land.
- **Quiet cleanliness only:** drop literal broken/garbage records so the user never emails field-salad. That's the whole quality bar. No visible labels, no demote lanes, no proof-bar ceremony surfaced to anyone.

## Output
A big, browsable, **exportable (CSV/JSON)** list of contactable businesses. Each row: business · website · phone · email/owner when found · a hook. That's a lead list you can start cold-emailing from.

## Why this, not entity-resolution-on-TDLR
Maps and web listings carry **clean business identity + contact natively** — they don't have TDLR's contaminated-name problem. That gap was a *permit-source* artifact. Changing sources routes around it. This is the faster path to leads you can actually email.

## Build in bold strokes (not timid slices)
1. **SerpApi sweep → big contactable list on screen + export.** Maps alone returns phone + website, so this is usable immediately, for any market the user types.
2. **Firecrawl enrichment** — email/owner + hooks layered on, run in parallel and streamed.

Then optional bonus depth (only where it adds, not as a gate): News/social hooks; state-specific sources like TDLR become a *bonus layer* when the chosen market is Texas — never the spine.

## Location
A search field. The user targets any market. Don't build "location" into the product as anything more than the market parameter. Don't anchor on any one place.
