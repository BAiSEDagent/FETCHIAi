// db/seed.ts
// Phase 1 seed data — powers the entire product demo before live agents are built
// Run with: npx tsx db/seed.ts
// Safe to run multiple times — uses upsert pattern

import { db } from './index'
import {
  workspaceSettings, workspaceSubscriptions, workspaceLearning,
  serviceProfiles, signals, prospects, opportunities,
  contactRoutes, outreachPlays, prompts, searchProviders, queryStrategies,
  signalPreferences, notificationPreferences,
  pricingTiers, tierFeatures, systemSettings, emailTemplates,
  agentRegistry,
  promoCodes, affiliates, signupSources,
  leadPassReasons, todaysRunItems,
  scoutSchedules, marketCoverage,
} from './schema'

async function seed() {
  console.log('🌱 Seeding Fetchi database...')

  // ─── WORKSPACE ───────────────────────────────
  await db.insert(workspaceSettings).values({
    workspaceId:    'seed_workspace_01',
    ownerUserId:    'seed_user_01',
    businessName:   'Johnson Roofing Co.',
    isApproved:     true,
    onboardingStep: 4,
    referralCode:   'JOHNSON-A4F2',
    signupMethod:   'email',
  }).onConflictDoNothing()

  await db.insert(workspaceSubscriptions).values({
    workspaceId:             'seed_workspace_01',
    tier:                    'starter',
    billingInterval:         'monthly',
    selectedStripePriceId:   null,
    opportunitiesLimit:      40,
    opportunitiesUsed:       6,
    trialOpportunitiesLimit: 10,
    trialOpportunitiesUsed:  6,
    status:                  'active',
    paymentMethodOnFile:     true,
    trialEndsAt:             null,
    topupRateCents:          80,
  }).onConflictDoNothing()

  await db.insert(workspaceLearning).values({
    workspaceId:     'seed_workspace_01',
    learningContext: null,
    outcomesCounted: 0,
  }).onConflictDoNothing()

  await db.insert(serviceProfiles).values({
    id:                       '00000000-0000-0000-0000-000000000001',
    workspaceId:              'seed_workspace_01',
    vertical:                 'roofing',
    serviceDescription:       'Commercial and residential roofing — repairs, replacements, storm damage restoration. Licensed in Texas. Minimum job size $5,000.',
    locationCity:             'Dallas',
    locationState:            'TX',
    locationRadiusMiles:      50,
    idealCustomerDescription: 'Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Prefer ongoing service relationships. Decision maker is usually a facilities director or property manager.',
  }).onConflictDoNothing()

  await db.insert(signalPreferences).values({
    workspaceId:          'seed_workspace_01',
    permitsEnabled:       true,
    stormEnabled:         true,
    newListingsEnabled:   true,
    jobPostingsEnabled:   false,
    eventsEnabled:        false,
    minScoreThreshold:    70,
    excludedKeywords:     ['residential', 'single family', 'mobile home'],
  }).onConflictDoNothing()

  await db.insert(notificationPreferences).values({
    workspaceId:          'seed_workspace_01',
    dailyDigestEnabled:   true,
    dailyDigestTime:      '07:00',
    pushOnHighScore:      true,
    highScoreThreshold:   85,
    pushOnExpiringLeads:  true,
    weeklySummaryEnabled: false,
    limitWarningEnabled:  true,
    notificationEmail:    'adam@johnsonroofing.com',
  }).onConflictDoNothing()

  // ─── SCOUT SCHEDULE ──────────────────────────
  // Seeded workspace runs auto-scout once daily at 6am Central
  // (Card UI is the presentation layer; this controls the scan/cost layer)
  await db.insert(scoutSchedules).values({
    workspaceId:            'seed_workspace_01',
    mode:                   'once_daily',
    cronExpressions:        ['0 6 * * *'],
    timezone:               'America/Chicago',
    status:                 'active',
    pausedReason:           null,
    coverageStatus:         'strong',
    coverageCheckedAt:      new Date(),
    coverageMessage:        'Fetchi has strong roofing coverage in Dallas–Fort Worth. Once-each-morning scouting is recommended.',
    scansToday:             1,
    scansThisMonth:         18,
    lastScanAt:             new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    lastScanResultedInLead: true,
  }).onConflictDoNothing()

  // ─── MARKET COVERAGE ─────────────────────────
  // Coverage gates scheduled scouting. Manual chat searches remain allowed within plan limits.
  // Actual scheduled scan cap = min(plan cap, coverage cap, internal spend cap).
  await db.insert(marketCoverage).values([
    {
      country: 'US', state: 'TX', metro: 'Dallas–Fort Worth', city: 'Dallas', county: 'Dallas County',
      vertical: 'roofing', coverageStatus: 'strong', coverageScore: 92,
      recommendedScoutMode: 'once_daily', maxDailyScans: 3,
      supportedSignalTypes: ['storm_damage','building_permit','new_business_listing','job_posting'],
      enabledSignalTypes: ['storm_damage','building_permit','new_business_listing'],
      notes: 'Strong storm, permit, and commercial property signal density. Good launch market for roofing.',
      lastCoverageCheckAt: new Date(), isActive: true,
    },
    {
      country: 'US', state: 'TX', metro: 'Dallas–Fort Worth', city: 'Dallas', county: 'Dallas County',
      vertical: 'cleaning', coverageStatus: 'moderate', coverageScore: 68,
      recommendedScoutMode: 'once_daily', maxDailyScans: 1,
      supportedSignalTypes: ['new_business_listing','job_posting','building_permit'],
      enabledSignalTypes: ['new_business_listing','job_posting'],
      notes: 'Moderate commercial activity; scheduled scouting should stay conservative until yield improves.',
      lastCoverageCheckAt: new Date(), isActive: true,
    },
    {
      country: 'US', state: 'NM', metro: 'Santa Fe', city: 'Santa Fe', county: 'Santa Fe County',
      vertical: 'roofing', coverageStatus: 'limited', coverageScore: 42,
      recommendedScoutMode: 'off', maxDailyScans: 0,
      supportedSignalTypes: ['building_permit','new_business_listing'],
      enabledSignalTypes: ['building_permit'],
      notes: 'Lower signal density. Manual chat searches are allowed; scheduled scouting defaults to Only when I ask.',
      lastCoverageCheckAt: new Date(), isActive: true,
    },
  ]).onConflictDoNothing()

  // ─── SIGNALS ─────────────────────────────────

  const signalData = [
    {
      id:          '10000000-0000-0000-0000-000000000001',
      signalType:  'storm_damage',
      signalHash:  'hash_parkview_storm_20260409',
      whyRelevant: '1.8" hail stones reported across Irving/Las Colinas corridor on April 9th. Size range associated with significant flat roof membrane damage on commercial properties.',
      rawData:     { source: 'NWS', event: 'SEVERE_THUNDERSTORM', hail_size: '1.8in', area: 'Irving TX' },
      parsedData:  { hail_size_inches: 1.8, city: 'Irving', state: 'TX', date: '2026-04-09' },
      detectedAt:  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id:          '10000000-0000-0000-0000-000000000002',
      signalType:  'storm_damage',
      signalHash:  'hash_addison_storm_20260409',
      whyRelevant: 'Same hail event as Parkview. Addison area received comparable hail accumulation. Multiple building campus increases total opportunity value.',
      rawData:     { source: 'NWS', event: 'SEVERE_THUNDERSTORM', hail_size: '1.8in', area: 'Addison TX' },
      parsedData:  { hail_size_inches: 1.8, city: 'Addison', state: 'TX', date: '2026-04-09' },
      detectedAt:  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id:          '10000000-0000-0000-0000-000000000003',
      signalType:  'building_permit',
      signalHash:  'hash_frisco_permit_20260407',
      whyRelevant: 'Commercial building permit filed for 22,000 sq ft medical center. Roofing must be contracted before occupancy inspection — typically 60-90 days from permit filing.',
      rawData:     { source: 'city_permits', permit_type: 'commercial_new', sqft: 22000, address: '5500 Frisco Square Blvd' },
      parsedData:  { permit_type: 'commercial_new', sqft: 22000, city: 'Frisco', state: 'TX' },
      detectedAt:  new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id:          '10000000-0000-0000-0000-000000000004',
      signalType:  'building_permit',
      signalHash:  'hash_legacy_permit_20260401',
      whyRelevant: 'Roof replacement permit approved for existing commercial complex. Active permit means work is imminent — contractor has 6 months from approval date.',
      rawData:     { source: 'city_permits', permit_type: 'roof_replacement', address: '7401 Legacy Dr' },
      parsedData:  { permit_type: 'roof_replacement', city: 'Plano', state: 'TX' },
      detectedAt:  new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      id:          '10000000-0000-0000-0000-000000000005',
      signalType:  'new_business_listing',
      signalHash:  'hash_ndth_listing_20260411',
      whyRelevant: 'New Google Maps listing appeared this week. New tenants in new locations typically assess roof condition within 90 days of move-in — especially after recent hail events in the area.',
      rawData:     { source: 'google_maps', listing_date: '2026-04-11', place_id: 'abc123' },
      parsedData:  { city: 'Dallas', state: 'TX', business_type: 'tech_office' },
      detectedAt:  new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]

  for (const signal of signalData) {
    await db.insert(signals).values({
      ...signal,
      workspaceId: 'seed_workspace_01',
      status: 'valid',
    }).onConflictDoNothing()
  }

  // ─── PROSPECTS ───────────────────────────────

  const prospectData = [
    {
      id:               '20000000-0000-0000-0000-000000000001',
      businessName:     'Parkview Office Complex',
      address:          '7500 John Carpenter Fwy',
      city:             'Irving',
      state:            'TX',
      phone:            '(972) 555-0101',
      email:            'info@parkviewoffice.com',
      website:          'parkviewoffice.com',
      businessType:     'commercial_office',
      enrichmentStatus: 'complete',
    },
    {
      id:               '20000000-0000-0000-0000-000000000002',
      businessName:     'Addison Corporate Park',
      address:          '15301 Dallas Pkwy',
      city:             'Addison',
      state:            'TX',
      phone:            '(972) 555-0202',
      email:            'facilities@addisoncp.com',
      website:          'addisoncp.com',
      businessType:     'commercial_office',
      enrichmentStatus: 'complete',
    },
    {
      id:               '20000000-0000-0000-0000-000000000003',
      businessName:     'Frisco Medical Center',
      address:          '5500 Frisco Square Blvd',
      city:             'Frisco',
      state:            'TX',
      phone:            '(214) 555-0303',
      email:            'projects@friscomedical.com',
      website:          'friscomedical.com',
      businessType:     'medical_facility',
      enrichmentStatus: 'complete',
    },
    {
      id:               '20000000-0000-0000-0000-000000000004',
      businessName:     'Legacy Town Center',
      address:          '7401 Legacy Dr',
      city:             'Plano',
      state:            'TX',
      phone:            '(972) 555-0404',
      email:            'mgmt@legacytowncenter.com',
      website:          'legacytowncenter.com',
      businessType:     'commercial_retail',
      enrichmentStatus: 'complete',
    },
    {
      id:               '20000000-0000-0000-0000-000000000005',
      businessName:     'North Dallas Tech Hub',
      address:          '18111 Preston Rd',
      city:             'Dallas',
      state:            'TX',
      phone:            '(214) 555-0505',
      email:            null,
      website:          null,
      businessType:     'tech_office',
      enrichmentStatus: 'pending',
    },
  ]

  for (const prospect of prospectData) {
    await db.insert(prospects).values({
      ...prospect,
      workspaceId: 'seed_workspace_01',
    }).onConflictDoNothing()
  }

  // ─── CONTACT ROUTES ──────────────────────────

  const contactData = [
    { id: '30000000-0000-0000-0000-000000000001', prospectId: '20000000-0000-0000-0000-000000000001', contactName: 'Michael Torres', contactTitle: 'Property Manager', contactEmail: 'm.torres@parkviewoffice.com', confidence: 85 },
    { id: '30000000-0000-0000-0000-000000000002', prospectId: '20000000-0000-0000-0000-000000000001', contactName: 'Sandra Kim', contactTitle: 'Facilities Director', contactEmail: 's.kim@parkviewoffice.com', confidence: 65 },
    { id: '30000000-0000-0000-0000-000000000003', prospectId: '20000000-0000-0000-0000-000000000002', contactName: 'Jane Park', contactTitle: 'Facilities Director', contactEmail: 'j.park@addisoncp.com', confidence: 80 },
    { id: '30000000-0000-0000-0000-000000000004', prospectId: '20000000-0000-0000-0000-000000000003', contactName: 'Robert Chen', contactTitle: 'Project Manager', contactEmail: 'r.chen@friscomedical.com', confidence: 75 },
    { id: '30000000-0000-0000-0000-000000000005', prospectId: '20000000-0000-0000-0000-000000000004', contactName: 'Lisa Morgan', contactTitle: 'Property Manager', contactEmail: 'l.morgan@legacytowncenter.com', confidence: 90 },
  ]

  for (const contact of contactData) {
    await db.insert(contactRoutes).values({
      ...contact,
      workspaceId: 'seed_workspace_01',
      routeType:   'email',
      verified:    false,
    }).onConflictDoNothing()
  }

  // ─── OPPORTUNITIES ───────────────────────────

  const opportunityData = [
    {
      id:          '40000000-0000-0000-0000-000000000001',
      signalId:    '10000000-0000-0000-0000-000000000001',
      prospectId:  '20000000-0000-0000-0000-000000000001',
      score:       94,
      whyNow:      "Tuesday's hail event dropped 1.8\" stones across Irving/Las Colinas — the size range that causes significant flat roof membrane damage. This commercial complex has ~80,000 sq ft of roof. The 3-day window is ideal: insurance adjusters haven't been called yet, but the decision-maker knows something happened.",
      status:      'new',
    },
    {
      id:          '40000000-0000-0000-0000-000000000002',
      signalId:    '10000000-0000-0000-0000-000000000002',
      prospectId:  '20000000-0000-0000-0000-000000000002',
      score:       88,
      whyNow:      'Same hail cell as Parkview. Multiple buildings across this campus — potentially the largest opportunity in the area. Facilities director handles all vendor relationships across the complex.',
      status:      'new',
    },
    {
      id:          '40000000-0000-0000-0000-000000000003',
      signalId:    '10000000-0000-0000-0000-000000000003',
      prospectId:  '20000000-0000-0000-0000-000000000003',
      score:       76,
      whyNow:      'New construction permit filed 5 days ago for a 22,000 sq ft medical center. Roofing needs to be contracted before the occupancy inspection — typically 60-90 days from permit filing. Project manager is the right contact.',
      status:      'contacted',
    },
    {
      id:          '40000000-0000-0000-0000-000000000004',
      signalId:    '10000000-0000-0000-0000-000000000004',
      prospectId:  '20000000-0000-0000-0000-000000000004',
      score:       82,
      whyNow:      'Roof replacement permit approved for existing commercial retail complex. Active permit means work is imminent — contractor has 6 months from approval. Property manager confirmed budget is allocated.',
      status:      'won',
      outcomeNotes: 'Signed $48,000 contract for full roof replacement. Customer responded to hail inspection offer email within 2 hours.',
      outcomeValue: 4800000, // $48,000 in cents
    },
    {
      id:          '40000000-0000-0000-0000-000000000005',
      signalId:    '10000000-0000-0000-0000-000000000005',
      prospectId:  '20000000-0000-0000-0000-000000000005',
      score:       71,
      whyNow:      'New Google Maps listing appeared this week — new tenant moving into a building. New occupants typically assess roof condition within 90 days. Recent hail in the area creates additional urgency.',
      status:      'new',
    },
  ]

  for (const opp of opportunityData) {
    await db.insert(opportunities).values({
      ...opp,
      workspaceId: 'seed_workspace_01',
    }).onConflictDoNothing()
  }

  // ─── OUTREACH PLAYS ──────────────────────────

  await db.insert(outreachPlays).values([
    {
      id:             '50000000-0000-0000-0000-000000000001',
      workspaceId:    'seed_workspace_01',
      opportunityId:  '40000000-0000-0000-0000-000000000001',
      contactRouteId: '30000000-0000-0000-0000-000000000001',
      subjectLine:    'Free hail inspection — Parkview Office Complex',
      body:           "Hi Michael — I noticed Tuesday's hail event hit the Irving/Las Colinas corridor pretty hard. We're Johnson Roofing and have been doing commercial work in Dallas for 12 years.\n\nWe're offering free storm inspections this week for properties in the affected area. Worth 30 minutes to make sure you're covered before filing any insurance claims.\n\nAre you the right person to coordinate this, or is there someone else I should reach out to?",
      signalReference: '1.8\" hail event, Irving TX, April 9 2026',
      status:          'draft',
    },
    {
      id:             '50000000-0000-0000-0000-000000000002',
      workspaceId:    'seed_workspace_01',
      opportunityId:  '40000000-0000-0000-0000-000000000003',
      contactRouteId: '30000000-0000-0000-0000-000000000004',
      subjectLine:    'Roofing contractor for Frisco Medical Center build',
      body:           "Hi Robert — I saw the permit filing for the new medical center build on Frisco Square. We specialize in commercial roofing and have worked on several medical facilities in DFW.\n\nHappy to put together a quote early in your timeline — often saves headaches during the occupancy inspection process.\n\nWould a quick call this week work?",
      signalReference: 'Commercial permit filed 22,000 sqft, Frisco TX, April 7 2026',
      status:          'draft',
    },
  ]).onConflictDoNothing()

  // ─── PROMPTS ─────────────────────────────────
  // Seed v1 of all active prompts
  // These are starter prompts — refine with real prompt content in the admin panel at /admin/prompts

  const promptSeeds = [
    {
      name:              'conversation_system',
      version:           1,
      content:           `You are ツ, Fetchi's lead generation agent for local service businesses. You help contractors find and close commercial leads using public signals like storm damage, building permits, and new business listings.

Your tone: direct, practical, confident. You talk like a smart sales coach who knows the local market. You never use corporate jargon.

You help with: finding leads, writing outreach emails, researching prospects, explaining signals, and coaching on sales tactics.

You don't help with: anything unrelated to their business or sales. If asked, redirect warmly: "That's a bit outside what I'm built for — I'm best at finding you leads and helping you close them. Want me to [suggest relevant action]?"

Current workspace context: {workspace_context}
Learning context: {learning_context}`,
      modelTarget:       'claude-sonnet-4-6',
      isActive:          true,
      trafficPercentage: 100,
    },
    {
      name:              'signal_classification',
      version:           1,
      content:           `You are classifying whether a search result represents a genuine buying signal for a {vertical} business in {city}, {state}.

A genuine signal means: there is a real business or property that likely needs {vertical} services RIGHT NOW based on this result.

Result to classify:
{result}

Respond with JSON only:
{
  "is_signal": boolean,
  "confidence": 0-100,
  "signal_type": "storm_damage|building_permit|new_business_listing|job_posting|event|none",
  "business_name": "string or null",
  "address": "string or null",
  "why_relevant": "1-2 sentences or null"
}`,
      modelTarget:       'claude-haiku-4-5',
      isActive:          true,
      trafficPercentage: 100,
    },
    {
      name:              'why_now_generation',
      version:           1,
      content:           `Write a 2-3 sentence "why now" explanation for this lead.

Business: {business_name}
Signal type: {signal_type}
Signal detail: {signal_detail}
Service vertical: {vertical}

The explanation should:
- State specifically what happened and when
- Explain why this creates an immediate need for {vertical} services
- Identify the decision-making window (how long this opportunity is hot)

Write in plain English. No corporate speak. Be specific.`,
      modelTarget:       'claude-haiku-4-5',
      isActive:          true,
      trafficPercentage: 100,
    },
    {
      name:              'outreach_drafting',
      version:           1,
      content:           `Write a cold outreach email for a {vertical} contractor.

Prospect: {business_name}, {contact_name} ({contact_title})
Signal: {signal_detail}
Why now: {why_now}
Contractor: {contractor_name}, {contractor_description}

Rules:
- Subject line: specific, references the signal, max 60 chars
- Opening: reference the specific signal/event — don't be generic
- Body: 3 short paragraphs max. No fluff.
- CTA: one clear ask — a call, an inspection, a quote
- Tone: professional but human. Like a neighbor who happens to do roofing.
- Never: "I hope this email finds you well", "synergy", "leverage", buzzwords

Respond with JSON:
{
  "subject_line": "string",
  "body": "string (use \\n for line breaks)"
}`,
      modelTarget:       'claude-sonnet-4-6',
      isActive:          true,
      trafficPercentage: 100,
    },
    {
      name:              'opportunity_scoring',
      version:           1,
      content:           `Score this opportunity for a {vertical} contractor on a scale of 0-100.

Signal: {signal_detail}
Prospect: {prospect_detail}
Contractor profile: {contractor_profile}
Ideal customer: {ideal_customer}

Scoring factors:
- Signal recency (fresher = higher score)
- Signal severity/urgency (storm > permit > listing)
- Prospect fit with ideal customer description
- Estimated deal value potential
- Ease of contact / decision maker accessibility

Respond with JSON:
{
  "score": 0-100,
  "rationale": "1-2 sentences explaining the score"
}`,
      modelTarget:       'claude-haiku-4-5',
      isActive:          true,
      trafficPercentage: 100,
    },
    {
      name:              'enrichment',
      version:           1,
      content:           `Find contact information for the decision maker at this business.

Business: {business_name}
Address: {address}
Business type: {business_type}
Service vertical: {vertical}

For a {vertical} contractor, the ideal contact is usually:
- Commercial: facilities director, property manager, building manager
- Retail: store manager, regional facilities manager
- Medical/office: office manager, facilities coordinator

Search results:
{search_results}

Respond with JSON array (empty array if no contacts found):
[{
  "contact_name": "string",
  "contact_title": "string",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "confidence": 0-100,
  "source": "string"
}]`,
      modelTarget:       'claude-haiku-4-5',
      isActive:          true,
      trafficPercentage: 100,
    },
  ]

  for (const prompt of promptSeeds) {
    await db.insert(prompts).values(prompt).onConflictDoNothing()
  }

  // ─── SEARCH PROVIDERS ───────────────────────
  // Search architecture is provider-agnostic. SerpAPI is the default launch provider.
  await db.insert(searchProviders).values({
    slug:                 'serpapi',
    name:                 'SerpAPI',
    providerType:         'serpapi',
    isActive:             true,
    adapterPath:          'lib/search/providers/serpapi.ts',
    apiKeySecretName:     'SERPAPI_API_KEY',
    skillReference:       '.claude/skills/serpapi-web-search/SKILL.md',
    docsUrl:              'https://github.com/serpapi/skills/blob/master/skills/serpapi-web-search/SKILL.md',
    defaultWebEngine:     'google_light',
    defaultNewsEngine:    'google_news_light',
    defaultMapsEngine:    'google_maps',
    defaultJobsEngine:    'google_jobs',
    enabledVerticals:     ['roofing', 'cleaning', 'hvac', 'landscaping', 'plumbing', 'events', 'all'],
    enabledSignalTypes:   ['storm_damage', 'building_permit', 'new_business_listing', 'job_posting', 'event'],
    costEstimateCents:    1,
    failoverProviderSlug: null,
    adminNotes:           'Default launch search provider. Prefer _light engines when available. Do not call directly from routes; all runtime calls go through lib/search/SearchProvider and this provider adapter.',
  }).onConflictDoNothing()

  // ─── QUERY STRATEGIES ────────────────────────
  // Seed signal search strategies for roofing vertical
  // The Query Builder reads from this table — never hardcodes queries

  const strategies = [
    // Storm damage strategies
    { vertical: 'roofing', signalType: 'storm_damage', serpApiEngine: 'google_light', queryTemplate: 'hail storm damage {city} {state} commercial roof {month} {year}', priority: 1 },
    { vertical: 'roofing', signalType: 'storm_damage', serpApiEngine: 'google_news_light', queryTemplate: 'hail storm {city} {state} damage report', priority: 1 },
    // Permit strategies
    { vertical: 'roofing', signalType: 'building_permit', serpApiEngine: 'google_light', queryTemplate: '{city} {state} building permits commercial construction {month} {year}', priority: 1 },
    { vertical: 'roofing', signalType: 'building_permit', serpApiEngine: 'google_light', queryTemplate: 'site:{city_domain} building permit commercial roof', priority: 2 },
    // New listings strategies
    { vertical: 'roofing', signalType: 'new_business_listing', serpApiEngine: 'google_maps', queryTemplate: 'commercial office buildings {city} {state}', priority: 2 },
    // General strategies (all verticals)
    { vertical: 'all', signalType: 'new_business_listing', serpApiEngine: 'google_maps', queryTemplate: 'new business {city} {state} opened {month} {year}', priority: 3 },
    { vertical: 'all', signalType: 'job_posting', serpApiEngine: 'google_jobs', queryTemplate: 'facilities manager {city} {state}', priority: 3 },
    // Cleaning vertical
    { vertical: 'cleaning', signalType: 'new_business_listing', serpApiEngine: 'google_maps', queryTemplate: 'new office space {city} {state}', priority: 1 },
    { vertical: 'cleaning', signalType: 'building_permit', serpApiEngine: 'google_light', queryTemplate: '{city} {state} commercial tenant improvement permit {month} {year}', priority: 1 },
  ]

  for (const strategy of strategies) {
    await db.insert(queryStrategies).values({
      ...strategy,
      isActive: true,
    }).onConflictDoNothing()
  }


  // ─── PRICING TIERS ───────────────────────────
  // Editable from admin panel — code never hardcodes prices or limits
  const tiers = [
    {
      slug: 'starter', name: 'Starter',
      description: 'For owner-operators who want control — ask Fetchi when you want leads, with optional once-morning scouting.',
      monthlyPriceCents: 4900, annualPriceCents: 49000,
      opportunitiesLimit: 40,
      topupRateCentsMonthly: 80, topupRateCentsAnnual: 65,
      displayOrder: 1, isPopular: false, isActive: true,
      featuresBullets: [
        '40 delivered lead cards per month',
        'Only-when-I-ask scouting + optional once-morning scout',
        '1 territory and 1 user',
        'Basic evidence drawer and outreach draft',
        'Gmail/Outlook compose link',
      ],
    },
    {
      slug: 'growth', name: 'Growth',
      description: `Recommended for serious operators — morning scouting, Today's Stack, Today's Run, and outcome learning.`,
      monthlyPriceCents: 12900, annualPriceCents: 129000,
      opportunitiesLimit: 100,
      topupRateCentsMonthly: 70, topupRateCentsAnnual: 55,
      displayOrder: 2, isPopular: true, isActive: true,
      featuresBullets: [
        '100 delivered lead cards per month',
        'Once-each-morning scout included; up to 3/day within cap',
        `Today's Stack and Today's Run`,
        'Outcome learning + bad-lead review',
        'Gmail/Outlook draft integration and 3 team seats',
      ],
    },
    {
      slug: 'pro', name: 'Pro',
      description: 'For active sales teams that want frequent scouting, multiple territories, advanced filters, and integrations.',
      monthlyPriceCents: 29900, annualPriceCents: 299000,
      opportunitiesLimit: 300,
      topupRateCentsMonthly: 60, topupRateCentsAnnual: 45,
      displayOrder: 3, isPopular: false, isActive: true,
      featuresBullets: [
        '300 delivered lead cards per month',
        'A-few-times-per-day scouting, capped for margin protection',
        'Multiple territories and team seats',
        'Advanced filters, source controls, and priority scoring',
        'CRM/webhook integrations, export, and priority support',
      ],
    },
    {
      slug: 'scale', name: 'Scale',
      description: 'For multi-location operators, franchises, and agencies that need custom scouting with hard spend caps.',
      monthlyPriceCents: 69900, annualPriceCents: 699000,
      opportunitiesLimit: 750,
      topupRateCentsMonthly: 50, topupRateCentsAnnual: 40,
      displayOrder: 4, isPopular: false, isActive: true,
      featuresBullets: [
        '750 delivered lead cards per month',
        'Custom scout schedule within hard spend caps',
        'Multiple workspaces, locations, and more seats',
        'API/webhooks and admin controls',
        'White-glove onboarding and priority support',
      ],
    },
  ]
  for (const tier of tiers) {
    await db.insert(pricingTiers).values(tier).onConflictDoNothing()
  }

  // ─── TIER FEATURES ───────────────────────────
  // Which features unlock at each tier — editable from admin
  const tierFeatureMap = [
    // Starter
    { tierSlug: 'starter', featureKey: 'voice_input', isEnabled: false, usageCap: null },
    { tierSlug: 'starter', featureKey: 'map_tab', isEnabled: false, usageCap: null },
    { tierSlug: 'starter', featureKey: 'webhooks', isEnabled: false, usageCap: null },
    { tierSlug: 'starter', featureKey: 'api_access', isEnabled: false, usageCap: null },
    { tierSlug: 'starter', featureKey: 'priority_scanning', isEnabled: false, usageCap: null },
    { tierSlug: 'starter', featureKey: 'team_seats', isEnabled: false, usageCap: 1 },
    // Growth
    { tierSlug: 'growth', featureKey: 'voice_input', isEnabled: true, usageCap: null },
    { tierSlug: 'growth', featureKey: 'map_tab', isEnabled: true, usageCap: null },
    { tierSlug: 'growth', featureKey: 'webhooks', isEnabled: true, usageCap: 3 },
    { tierSlug: 'growth', featureKey: 'api_access', isEnabled: false, usageCap: null },
    { tierSlug: 'growth', featureKey: 'priority_scanning', isEnabled: false, usageCap: null },
    { tierSlug: 'growth', featureKey: 'team_seats', isEnabled: true, usageCap: 3 },
    // Pro
    { tierSlug: 'pro', featureKey: 'voice_input', isEnabled: true, usageCap: null },
    { tierSlug: 'pro', featureKey: 'map_tab', isEnabled: true, usageCap: null },
    { tierSlug: 'pro', featureKey: 'webhooks', isEnabled: true, usageCap: null },
    { tierSlug: 'pro', featureKey: 'api_access', isEnabled: true, usageCap: null },
    { tierSlug: 'pro', featureKey: 'priority_scanning', isEnabled: true, usageCap: null },
    { tierSlug: 'pro', featureKey: 'team_seats', isEnabled: true, usageCap: 10 },
    // Scale
    { tierSlug: 'scale', featureKey: 'voice_input', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'map_tab', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'webhooks', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'api_access', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'priority_scanning', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'team_seats', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'white_label_outreach', isEnabled: true, usageCap: null },
    { tierSlug: 'scale', featureKey: 'multi_territory', isEnabled: true, usageCap: 3 },
  ]
  for (const tf of tierFeatureMap) {
    await db.insert(tierFeatures).values(tf).onConflictDoNothing()
  }

  // ─── SYSTEM SETTINGS ─────────────────────────
  // Global tunables — editable from admin panel
  // Code reads at runtime, falls back to these defaults if key missing
  const settings = [
    // Trial config
    { key: 'trial_days', value: '7', valueType: 'number', category: 'trial', description: 'Length of free trial in days' },
    { key: 'trial_total_leads', value: '10', valueType: 'number', category: 'trial', description: 'Total leads included in free trial' },
    { key: 'trial_gate_threshold', value: '5', valueType: 'number', category: 'trial', description: 'Lead count at which card gate fires' },
    { key: 'trial_followup_email_hours', value: '24', valueType: 'number', category: 'trial', description: 'Hours after gate dismissal before follow-up email' },

    // Signal thresholds
    { key: 'default_min_score', value: '70', valueType: 'number', category: 'signals', description: 'Default minimum score to surface a lead (0-100)' },
    { key: 'high_score_threshold', value: '85', valueType: 'number', category: 'signals', description: 'Score at which high-score alerts fire' },
    { key: 'storm_urgency_window_days', value: '14', valueType: 'number', category: 'signals', description: 'Days a storm signal remains hot' },
    { key: 'permit_urgency_window_days', value: '90', valueType: 'number', category: 'signals', description: 'Days a permit signal remains actionable' },
    { key: 'signal_dedup_window_days', value: '7', valueType: 'number', category: 'signals', description: 'Dedup window — same signal within N days is duplicate' },
    { key: 'staleness_threshold_days', value: '30', valueType: 'number', category: 'signals', description: 'Days before an untouched opportunity is marked stale' },

    // Rate limits
    { key: 'signup_rate_limit_per_ip', value: '3', valueType: 'number', category: 'rate_limits', description: 'Max signups per IP per 24h' },
    { key: 'signup_rate_limit_window_hours', value: '24', valueType: 'number', category: 'rate_limits', description: 'Rolling window for signup rate limit' },
    { key: 'max_searches_per_day_starter', value: '500', valueType: 'number', category: 'rate_limits', description: 'Daily SerpAPI search cap — Starter tier' },
    { key: 'max_searches_per_day_growth', value: '1500', valueType: 'number', category: 'rate_limits', description: 'Daily SerpAPI search cap — Growth tier' },
    { key: 'max_searches_per_day_pro', value: '5000', valueType: 'number', category: 'rate_limits', description: 'Daily SerpAPI search cap — Pro tier' },
    { key: 'max_searches_per_day_scale', value: '20000', valueType: 'number', category: 'rate_limits', description: 'Daily SerpAPI search cap — Scale tier' },

    // Abuse thresholds
    { key: 'abuse_threshold_credits_per_hour', value: '20', valueType: 'number', category: 'abuse', description: 'Credits consumed per hour that triggers abuse flag' },
    { key: 'abuse_threshold_api_calls_per_minute', value: '100', valueType: 'number', category: 'abuse', description: 'API calls per minute that triggers abuse flag' },
    { key: 'abuse_disposable_email_action', value: 'block', valueType: 'string', category: 'abuse', description: 'Action on disposable email: block | flag | allow' },
    { key: 'abuse_duplicate_workspace_threshold', value: '2', valueType: 'number', category: 'abuse', description: 'N workspaces from same email domain triggers flag' },

    // Cron schedules (cron expression strings)
    { key: 'cron_signal_detection', value: '0 2 * * *', valueType: 'string', category: 'cron', description: 'Nightly signal detection — 2am UTC' },
    { key: 'cron_staleness_check', value: '0 3 * * 1', valueType: 'string', category: 'cron', description: 'Weekly staleness check — 3am Monday UTC' },
    { key: 'cron_daily_digest', value: '0 11 * * *', valueType: 'string', category: 'cron', description: 'Daily digest send — 11am UTC (7am ET)' },
    { key: 'cron_weather_fetch', value: '0 1 * * *', valueType: 'string', category: 'cron', description: 'Nightly NWS weather event fetch — 1am UTC' },
    { key: 'cron_quality_rescore', value: '0 4 * * *', valueType: 'string', category: 'cron', description: 'Nightly opportunity quality re-scoring — 4am UTC' },
    { key: 'cron_outcome_learning', value: '0 5 * * *', valueType: 'string', category: 'cron', description: 'Nightly outcome learning context refresh — 5am UTC' },

    // CAN-SPAM / compliance
    { key: 'unsubscribe_link_required', value: 'true', valueType: 'boolean', category: 'compliance', description: 'Append unsubscribe link to every email' },
    { key: 'physical_address_footer_required', value: 'true', valueType: 'boolean', category: 'compliance', description: 'Include physical address in every email footer' },

    // Referrals — viral mechanism rewards
    { key: 'referral_referrer_reward_type', value: 'free_month', valueType: 'string', category: 'referrals', description: 'What the referrer gets — free_month | credits | account_credit_cents' },
    { key: 'referral_referrer_reward_value', value: '1', valueType: 'number', category: 'referrals', description: 'Reward value — months, credits, or cents depending on type' },
    { key: 'referral_friend_reward_type', value: 'trial_extension_days', valueType: 'string', category: 'referrals', description: 'What the friend gets — trial_extension_days | credits' },
    { key: 'referral_friend_reward_value', value: '7', valueType: 'number', category: 'referrals', description: 'Extension days or bonus credits for the friend' },
    { key: 'referral_qualification_event', value: 'first_paid_invoice', valueType: 'string', category: 'referrals', description: 'When rewards trigger — first_paid_invoice | trial_started | first_lead_saved' },
    { key: 'referral_fraud_check_same_ip', value: 'true', valueType: 'boolean', category: 'referrals', description: 'Void referrals when referrer and friend share an IP' },

    // Affiliates — defaults applied to new affiliates unless overridden per-row
    { key: 'affiliate_default_commission_type', value: 'percent_first_year', valueType: 'string', category: 'affiliates', description: 'Default commission type for new affiliates' },
    { key: 'affiliate_default_commission_value', value: '30', valueType: 'number', category: 'affiliates', description: 'Default commission rate — percent or cents based on type' },
    { key: 'affiliate_default_attribution_window_days', value: '90', valueType: 'number', category: 'affiliates', description: 'Default cookie attribution window in days' },

    // Conversion tracking — UTM capture behavior
    { key: 'utm_capture_enabled', value: 'true', valueType: 'boolean', category: 'tracking', description: 'Capture UTM params at signup into signup_sources' },
    { key: 'utm_cookie_lifetime_days', value: '30', valueType: 'number', category: 'tracking', description: 'How long UTM params persist before signup' },

    // OAuth send-as
    { key: 'oauth_google_enabled', value: 'true', valueType: 'boolean', category: 'oauth', description: 'Enable Google Workspace OAuth for send-as' },
    { key: 'oauth_microsoft_enabled', value: 'true', valueType: 'boolean', category: 'oauth', description: 'Enable Microsoft 365 OAuth for send-as' },

    // Today's Stack — mobile swipe review mode
    { key: 'todays_stack_enabled', value: 'true', valueType: 'boolean', category: 'todays_stack', description: 'Enable Today\'s Stack mobile review mode' },
    { key: 'todays_stack_mobile_default_after_n_uses', value: '3', valueType: 'number', category: 'todays_stack', description: 'After N daily uses, surface "open to Today\'s Stack" as default mobile screen preference' },
    { key: 'todays_stack_cards_per_session_max', value: '15', valueType: 'number', category: 'todays_stack', description: 'Maximum cards surfaced in one Today\'s Stack session' },
    { key: 'todays_stack_session_target_seconds', value: '120', valueType: 'number', category: 'todays_stack', description: 'Target time to clear a full stack — used for progress UI' },
    { key: 'todays_stack_swipes_enabled', value: 'true', valueType: 'boolean', category: 'todays_stack', description: 'Enable swipe gestures (buttons are always canonical regardless)' },
    { key: 'todays_run_max_stops', value: '12', valueType: 'number', category: 'todays_stack', description: 'Maximum stops allowed in a single Today\'s Run' },
    { key: 'pass_reason_feedback_loop_enabled', value: 'true', valueType: 'boolean', category: 'todays_stack', description: 'Feed lead_pass_reasons into the Quality Scoring Agent for learning' },

    // Scout / Auto-Scout — automatic scouting policy and margin protection
    // The card UI is the presentation layer. The scout/search is the cost layer.
    // Customer thinks "lead cards delivered." Internally Fetchi tracks scan budget.
    { key: 'scout_default_mode_starter', value: 'once_daily', valueType: 'string', category: 'scout', description: 'Default scout mode for new Starter workspaces — internal values: off | once_daily | three_daily | custom. Customer labels: Only when I ask | Once each morning | A few times per day | Custom schedule' },
    { key: 'scout_default_mode_growth', value: 'once_daily', valueType: 'string', category: 'scout', description: 'Default scout mode for new Growth workspaces' },
    { key: 'scout_default_mode_pro', value: 'three_daily', valueType: 'string', category: 'scout', description: 'Default scout mode for new Pro workspaces' },
    { key: 'scout_default_mode_scale', value: 'three_daily', valueType: 'string', category: 'scout', description: 'Default scout mode for new Scale workspaces (admins may set custom schedules; do not show aggressive to customers)' },
    { key: 'scout_max_scans_per_day_starter', value: '1', valueType: 'number', category: 'scout', description: 'Hard daily cap on scout runs for Starter — prevents runaway cost' },
    { key: 'scout_max_scans_per_day_growth', value: '3', valueType: 'number', category: 'scout', description: 'Hard daily cap on scout runs for Growth' },
    { key: 'scout_max_scans_per_day_pro', value: '5', valueType: 'number', category: 'scout', description: 'Hard daily cap on scout runs for Pro' },
    { key: 'scout_max_scans_per_day_scale', value: '6', valueType: 'number', category: 'scout', description: 'Hard daily cap on scout runs for Scale — even high-volume plans have a cap' },
    { key: 'scout_max_cost_per_day_cents', value: '1000', valueType: 'number', category: 'scout', description: 'Hard daily SerpAPI+LLM spend cap per workspace ($10 default) — pauses scout if exceeded' },
    { key: 'scout_max_cards_per_run', value: '15', valueType: 'number', category: 'scout', description: 'Maximum lead cards delivered per scout run — controls per-run yield' },
    { key: 'scout_min_score_threshold', value: '70', valueType: 'number', category: 'scout', description: 'Minimum score (0-100) for a signal to become a delivered lead card' },
    { key: 'scout_credit_consumed_on_delivery_only', value: 'true', valueType: 'boolean', category: 'scout', description: 'Lead credits consumed only when verified lead cards are delivered, not per scan or pass' },
    { key: 'scout_empty_run_user_visible', value: 'true', valueType: 'boolean', category: 'scout', description: 'Show "Fetchi checked X sources, no strong leads matched" message when run is empty' },
    { key: 'scout_pause_when_credits_zero', value: 'true', valueType: 'boolean', category: 'scout', description: 'Auto-pause scout when workspace has 0 remaining lead credits' },
    { key: 'scout_pause_when_inactive_days', value: '14', valueType: 'number', category: 'scout', description: 'Auto-pause scout if workspace has not logged in for N days (saves cost on dormant accounts)' },
    { key: 'scout_pause_when_cost_per_lead_exceeds_cents', value: '125', valueType: 'number', category: 'scout', description: 'Auto-pause scout if rolling 7-day cost-per-delivered-lead exceeds threshold (default $1.25) — protects margin on weak ICPs' },
    { key: 'scout_pause_after_n_empty_runs', value: '5', valueType: 'number', category: 'scout', description: 'Auto-pause scout after N consecutive empty runs and notify user to adjust filters' },
    { key: 'scout_pass_reason_credit_back_policy', value: 'admin_only', valueType: 'string', category: 'scout', description: 'When to credit back a passed lead — never | admin_only | auto_on_validated_reason. Default: admin_only to prevent gaming.' },
    { key: 'scout_pass_rate_anomaly_threshold_pct', value: '40', valueType: 'number', category: 'scout', description: 'If workspace pass rate exceeds N%, flag for abuse review (potential credit-farming)' },

    // Market coverage gating — protects margins in weak-signal territories
    { key: 'coverage_gate_scheduled_scouts', value: 'true', valueType: 'boolean', category: 'coverage', description: 'Scheduled scouting must pass market coverage gate. Manual chat searches remain allowed within plan limits.' },
    { key: 'coverage_strong_max_daily_scouts', value: '-1', valueType: 'number', category: 'coverage', description: 'Strong coverage uses plan cap (-1 means no additional coverage cap beyond tier/spend rules)' },
    { key: 'coverage_moderate_max_daily_scouts', value: '1', valueType: 'number', category: 'coverage', description: 'Moderate coverage allows at most one scheduled scout per day unless admin overrides' },
    { key: 'coverage_limited_max_daily_scouts', value: '0', valueType: 'number', category: 'coverage', description: 'Limited coverage defaults scheduled scouting to Only when I ask' },
    { key: 'coverage_unsupported_max_daily_scouts', value: '0', valueType: 'number', category: 'coverage', description: 'Unsupported markets cannot run scheduled scouting; manual chat searches may show waitlist/limited messaging' },
    { key: 'coverage_check_max_lightweight_searches', value: '5', valueType: 'number', category: 'coverage', description: 'Maximum low-cost searches used during onboarding coverage check before enabling scheduled scouting' },
    { key: 'coverage_admin_override_allowed', value: 'true', valueType: 'boolean', category: 'coverage', description: 'Admins may override coverage restrictions but cannot bypass global emergency spend caps' },

  ]
  for (const setting of settings) {
    await db.insert(systemSettings).values(setting).onConflictDoNothing()
  }

  // ─── EMAIL TEMPLATES ─────────────────────────
  // Editable from admin panel — stubbed bodies, finalize copy in admin
  const templates = [
    {
      slug: 'daily_digest', name: 'Daily Digest',
      subject: 'Your Fetchi leads for {{date}}',
      bodyHtml: '<p>Hi {{first_name}},</p><p>Here are {{lead_count}} new opportunities from overnight scans:</p>{{lead_list_html}}<p><a href="{{app_url}}/app">Open Fetchi →</a></p>',
      bodyText: 'Hi {{first_name}},\n\nHere are {{lead_count}} new opportunities from overnight scans:\n\n{{lead_list_text}}\n\nOpen Fetchi: {{app_url}}/app',
      variables: ['first_name', 'date', 'lead_count', 'lead_list_html', 'lead_list_text', 'app_url'],
    },
    {
      slug: 'trial_gate_followup', name: 'Plan Required Follow-up (24h)',
      subject: 'Your plan is ready — start receiving opportunities',
      bodyHtml: '<p>Hi {{first_name}},</p><p>Your opportunities are waiting. Choose a plan to start receiving Fetchi lead cards.</p><p><a href="{{app_url}}/app">Choose a plan →</a></p>',
      bodyText: 'Hi {{first_name}},\n\nYour opportunities are waiting. Choose a plan to start receiving Fetchi lead cards.\n\nChoose a plan: {{app_url}}/app',
      variables: ['first_name', 'app_url'],
    },
    {
      slug: 'trial_expired', name: 'Plan Required',
      subject: 'Choose a plan to start receiving opportunities',
      bodyHtml: '<p>Hi {{first_name}},</p><p>Your Fetchi account is ready. Choose a plan to start receiving lead cards.</p><p><a href="{{app_url}}/app/expired">Choose a plan →</a></p>',
      bodyText: 'Hi {{first_name}},\n\nYour Fetchi account is ready. Choose a plan to start receiving lead cards.\n\nChoose a plan: {{app_url}}/app/expired',
      variables: ['first_name', 'app_url'],
    },
    {
      slug: 'trial_auto_upgraded', name: 'Plan Activated',
      subject: "You're now on Fetchi Starter",
      bodyHtml: '<p>Hi {{first_name}},</p><p>You\'re now on the Starter plan (${{amount}}/month). You have 40 delivered lead cards per month.</p><p><a href="{{app_url}}/app/settings/billing">Manage billing →</a></p>',
      bodyText: "Hi {{first_name}},\n\nYou're now on the Starter plan (${{amount}}/month). You have 40 delivered lead cards per month.\n\nManage billing: {{app_url}}/app/settings/billing",
      variables: ['first_name', 'amount', 'app_url'],
    },
    {
      slug: 'email_verification', name: 'Email Verification',
      subject: 'Verify your Fetchi email',
      bodyHtml: '<p>Click to verify your email: <a href="{{verification_url}}">Verify email →</a></p><p>This link expires in 24 hours.</p>',
      bodyText: 'Click to verify your email: {{verification_url}}\n\nThis link expires in 24 hours.',
      variables: ['verification_url'],
    },
    {
      slug: 'high_score_alert', name: 'High-Score Lead Alert',
      subject: '🎯 High-score lead: {{business_name}}',
      bodyHtml: '<p>Fetchi found a {{score}}/100 lead:</p><p><strong>{{business_name}}</strong><br>{{signal_description}}</p><p><a href="{{lead_url}}">View lead →</a></p>',
      bodyText: 'Fetchi found a {{score}}/100 lead:\n\n{{business_name}}\n{{signal_description}}\n\nView lead: {{lead_url}}',
      variables: ['business_name', 'score', 'signal_description', 'lead_url'],
    },
    {
      slug: 'expiring_leads_alert', name: 'Expiring Leads Alert',
      subject: '{{count}} leads expiring soon',
      bodyHtml: '<p>You have {{count}} saved leads that haven\'t been contacted and are expiring soon:</p>{{lead_list_html}}<p><a href="{{app_url}}/app/leads">Open My Leads →</a></p>',
      bodyText: 'You have {{count}} saved leads that haven\'t been contacted and are expiring soon:\n\n{{lead_list_text}}\n\nOpen My Leads: {{app_url}}/app/leads',
      variables: ['count', 'lead_list_html', 'lead_list_text', 'app_url'],
    },
    {
      slug: 'limit_warning_80', name: 'Usage Limit Warning (80%)',
      subject: "You've used 80% of your Fetchi leads",
      bodyHtml: '<p>Hi {{first_name}},</p><p>You\'ve used {{used}} of {{limit}} opportunities this month. Top up or upgrade before you hit the cap.</p><p><a href="{{app_url}}/app/settings/usage">Manage usage →</a></p>',
      bodyText: 'Hi {{first_name}},\n\nYou\'ve used {{used}} of {{limit}} opportunities this month. Top up or upgrade before you hit the cap.\n\nManage usage: {{app_url}}/app/settings/usage',
      variables: ['first_name', 'used', 'limit', 'app_url'],
    },
    {
      slug: 'onboarding_24h', name: 'Onboarding — 24 hours',
      subject: 'How are your first Fetchi leads looking?',
      bodyHtml: '<p>Hi {{first_name}},</p><p>You signed up 24 hours ago — by now you should have your first few leads. Need help interpreting them or drafting outreach?</p><p><a href="{{app_url}}/app">Open Fetchi →</a></p>',
      bodyText: 'Hi {{first_name}},\n\nYou signed up 24 hours ago — by now you should have your first few leads. Need help interpreting them or drafting outreach?\n\nOpen Fetchi: {{app_url}}/app',
      variables: ['first_name', 'app_url'],
    },
    {
      slug: 'onboarding_7d', name: 'Onboarding — 7 days',
      subject: 'Week 1 with Fetchi',
      bodyHtml: '<p>Hi {{first_name}},</p><p>You\'ve been with Fetchi for a week. Found {{leads_found}} leads so far. Reply to this email and tell me what\'s working and what isn\'t — I read every one. — Adam</p>',
      bodyText: 'Hi {{first_name}},\n\nYou\'ve been with Fetchi for a week. Found {{leads_found}} leads so far. Reply to this email and tell me what\'s working and what isn\'t — I read every one.\n\n— Adam',
      variables: ['first_name', 'leads_found'],
    },
  ]
  for (const tmpl of templates) {
    await db.insert(emailTemplates).values(tmpl).onConflictDoNothing()
  }

  // ─── PROMO CODES ─────────────────────────────
  // Sample codes — editable from admin at /admin/promo-codes
  // Codes with percent/dollar discounts get mirrored to Stripe coupons via API
  const promoCodeSeeds = [
    {
      code: 'LAUNCH50',
      description: 'Launch promo — 50% off first month, any tier',
      type: 'percent_off_first',
      value: 50,
      appliesToTiers: null,  // any tier
      maxRedemptions: 500,
      redemptionsSoFar: 0,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),  // 90 days
      isActive: true,
    },
    {
      code: 'ROOFER2026',
      description: 'Industry promo — 14-day trial extension for roofing contractors',
      type: 'trial_extension',
      value: 14,  // days
      appliesToTiers: null,
      maxRedemptions: null,
      redemptionsSoFar: 0,
      expiresAt: null,
      isActive: true,
    },
    {
      code: 'FRIEND',
      description: 'Generic friend referral fallback — adds 10 bonus opportunities',
      type: 'free_credits',
      value: 10,
      appliesToTiers: null,
      maxRedemptions: null,
      redemptionsSoFar: 0,
      expiresAt: null,
      isActive: true,
    },
  ]
  for (const code of promoCodeSeeds) {
    await db.insert(promoCodes).values(code).onConflictDoNothing()
  }

  // ─── AFFILIATES ──────────────────────────────
  // Sample affiliate for testing — populate real ones manually or via admin
  const affiliateSeeds = [
    {
      name: 'Sample Affiliate',
      email: 'sample@example.com',
      company: 'Example Marketing LLC',
      defaultReferralCode: 'SAMPLE',
      commissionType: 'percent_first_year',
      commissionValue: 30,  // 30% of first year revenue
      attributionWindowDays: 90,
      paymentMethod: null,  // set when affiliate ready to be paid
      taxFormType: 'none',
      status: 'active',
      notes: 'Seed test affiliate — replace with real affiliates via admin panel.',
    },
  ]
  for (const aff of affiliateSeeds) {
    await db.insert(affiliates).values(aff).onConflictDoNothing()
  }

  // ─── EMAIL TEMPLATES — additions for referrals ───
  // Add referral-specific templates to the existing pool
  const referralTemplates = [
    {
      slug: 'referral_friend_signed_up',
      name: 'Friend Signed Up — Referrer Notification',
      subject: '🎉 {{friend_name}} just signed up using your link',
      bodyHtml: '<p>Hi {{first_name}},</p><p>{{friend_name}} just signed up for Fetchi using your referral link. When they convert to a paid plan, you\'ll get your reward automatically.</p><p><a href="{{app_url}}/app/refer">See all your referrals →</a></p>',
      bodyText: 'Hi {{first_name}},\n\n{{friend_name}} just signed up for Fetchi using your referral link. When they convert to a paid plan, you\'ll get your reward automatically.\n\nSee all your referrals: {{app_url}}/app/refer',
      variables: ['first_name', 'friend_name', 'app_url'],
    },
    {
      slug: 'referral_reward_earned',
      name: 'Referral Reward Earned',
      subject: "You just earned a reward — {{reward_description}}",
      bodyHtml: '<p>Hi {{first_name}},</p><p>{{friend_name}} just upgraded to a paid plan. You\'ve earned: <strong>{{reward_description}}</strong>.</p><p>It\'s already applied to your account. Thanks for spreading the word.</p>',
      bodyText: 'Hi {{first_name}},\n\n{{friend_name}} just upgraded to a paid plan. You\'ve earned: {{reward_description}}.\n\nIt\'s already applied to your account. Thanks for spreading the word.',
      variables: ['first_name', 'friend_name', 'reward_description'],
    },
  ]
  for (const tmpl of referralTemplates) {
    await db.insert(emailTemplates).values(tmpl).onConflictDoNothing()
  }

  // ─── AGENT REGISTRY ──────────────────────────
  // Registers the 10 agents with their capabilities and patterns.
  // Provider and model are intentionally NOT set here.
  // Set them through the admin panel at /admin/agents after first deploy.

  const agentRegistryData = [
    {
      slug: 'conversation', name: 'ツ Conversation Agent',
      description: 'Real-time chat agent — the ツ interface users talk to. Synchronous, user-facing.',
      pattern: 'realtime', promptKey: 'conversation_system', isActive: true,
      maxTokens: 2048, temperature: '0.7', timeoutMs: 30000, retries: 2,
      skills: ['search_signals','get_my_leads','draft_outreach','save_lead','update_lead_status','get_lead_detail','log_out_of_scope'],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'signal_detection', name: 'Signal Detection Agent',
      description: 'Nightly batch scan for permits, storm damage, new listings, job postings. Runs across all workspaces.',
      pattern: 'background', promptKey: 'signal_classification', isActive: true,
      maxTokens: 1024, temperature: '0.1', timeoutMs: 60000, retries: 3, batchSize: 50,
      skills: ['search_provider','weather_events'],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'outreach', name: 'Outreach Drafting Agent',
      description: 'Generates personalized cold outreach emails. Output is read and sent by the contractor.',
      pattern: 'background', promptKey: 'outreach_drafting', isActive: true,
      maxTokens: 1024, temperature: '0.8', timeoutMs: 30000, retries: 2, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'deduplication', name: 'Deduplication Agent',
      description: 'Post-scan dedup using normalized hash matching. Deterministic structured task.',
      pattern: 'background', promptKey: 'deduplication', isActive: true,
      maxTokens: 512, temperature: '0.0', timeoutMs: 15000, retries: 3, batchSize: 100, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'staleness', name: 'Staleness Agent',
      description: 'Weekly check — marks signals older than threshold as stale.',
      pattern: 'background', promptKey: 'staleness_check', isActive: true,
      maxTokens: 256, temperature: '0.0', timeoutMs: 15000, retries: 2, batchSize: 200, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'enrichment', name: 'Enrichment Agent',
      description: 'Extracts contact info from SerpAPI results. Structured extraction — JSON in, JSON out.',
      pattern: 'background', promptKey: 'enrichment', isActive: true,
      maxTokens: 1024, temperature: '0.1', timeoutMs: 30000, retries: 3, batchSize: 20,
      skills: ['search_provider'],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'outcome_learning', name: 'Outcome Learning Agent',
      description: 'Analyzes win/loss patterns → builds learning context injected into other agents.',
      pattern: 'background', promptKey: 'outcome_learning', isActive: true,
      maxTokens: 2048, temperature: '0.3', timeoutMs: 45000, retries: 2, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'quality_scoring', name: 'Quality Scoring Agent',
      description: 'Nightly batch re-score of all open opportunities.',
      pattern: 'background', promptKey: 'opportunity_scoring', isActive: true,
      maxTokens: 512, temperature: '0.1', timeoutMs: 15000, retries: 3, batchSize: 100, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'onboarding', name: 'Onboarding Completion Agent',
      description: 'Sends 24h/48h/7d activation emails. Triggered by plan activation and onboarding events.',
      pattern: 'background', promptKey: 'onboarding_email', isActive: true,
      maxTokens: 1024, temperature: '0.7', timeoutMs: 30000, retries: 2, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
    {
      slug: 'notification', name: 'Notification Agent',
      description: 'Compiles daily digest and urgency routing for high-score leads and expiring leads.',
      pattern: 'background', promptKey: 'notification_digest', isActive: true,
      maxTokens: 1024, temperature: '0.3', timeoutMs: 30000, retries: 2, batchSize: 50, skills: [],
      provider: 'set-in-admin', model: 'set-in-admin', escalationProvider: null, escalationModel: null,
    },
  ]

  for (const agent of agentRegistryData) {
    await db.insert(agentRegistry).values(agent).onConflictDoNothing()
  }

  console.log('✅ Seed complete.')
  console.log('   Workspace: seed_workspace_01 (referral code: JOHNSON-A4F2)')
  console.log('   Opportunities: 5 (scores: 94, 88, 82, 76, 71)')
  console.log('   Statuses: 3 new, 1 contacted, 1 won')
  console.log('   Prompts: 6 active')
  console.log('   Search providers: 1 (SerpAPI launch adapter)')
  console.log('   Query strategies: 9')
  console.log('   Pricing tiers: 4 (Starter, Growth, Pro, Scale)')
  console.log('   Tier features: 27 feature mappings')
  console.log('   System settings: 47+ admin-tunable keys (includes Today\'s Stack config)')
  console.log('   Email templates: 12 (digest, gate, expiry, alerts, onboarding, referrals)')
  console.log('   Promo codes: 3 (LAUNCH50, ROOFER2026, FRIEND)')
  console.log('   Affiliates: 1 sample (replace via admin)')
  console.log('   Agent registry: 10 agents registered')
  console.log('   ⚠️  Set provider + model for each agent at /admin/agents')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
