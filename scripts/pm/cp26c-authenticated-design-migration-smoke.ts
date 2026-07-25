/**
 * CP26C - authenticated Brand System v5 migration smoke proof.
 *
 * Static and DB-free. This file is intentionally extended task-by-task as
 * authenticated customer surfaces migrate. Task 1 locks the route/file fence,
 * authenticated-only token activation, shell geometry, semantic ownership,
 * focus/selection contracts, and protected-scope invariants.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function lines(value: string): string[] {
  return value ? value.split('\n').filter(Boolean) : []
}

function changedFiles(): string[] {
  return Array.from(new Set([
    ...lines(git('diff', '--name-only', 'origin/main..HEAD')),
    ...lines(git('diff', '--name-only')),
    ...lines(git('diff', '--name-only', '--cached')),
    ...lines(git('ls-files', '--others', '--exclude-standard')),
  ])).sort()
}

function routeFiles(ref?: string): string[] {
  const paths = ref
    ? lines(git('ls-tree', '-r', '--name-only', ref))
    : lines(git('ls-files', 'app'))

  return paths
    .filter(path => path.startsWith('app/') && (path.endsWith('/page.tsx') || path.endsWith('/route.tsx')))
    .sort()
}

function approvedFence(plan: string): Set<string> {
  const section = plan.split('## Approved CP26C file fence')[1]?.split('\n---')[0] ?? ''
  const paths = Array.from(section.matchAll(/^- `([^`]+)`$/gm), match => match[1])
  assert(paths.length > 0, 'Approved CP26C file fence could not be read from the plan')
  return new Set(paths)
}

async function main() {
  const coverageIndicatorPath = 'components/fetchi-ui/CoverageIndicator.tsx'
  const signalBarsPath = 'components/fetchi-ui/SignalBars.tsx'
  const sourceAttributionPath = 'components/fetchi-ui/SourceAttribution.tsx'
  const statusGlyphPath = 'components/fetchi-ui/StatusGlyph.tsx'
  assert(existsSync(coverageIndicatorPath), 'The reusable CoverageIndicator primitive is missing')
  assert(existsSync(signalBarsPath), 'The reusable SignalBars primitive is missing')
  assert(existsSync(sourceAttributionPath), 'The reusable SourceAttribution primitive is missing')
  assert(existsSync(statusGlyphPath), 'The reusable StatusGlyph primitive is missing')
  const statusGlyphSource = source(statusGlyphPath)

  const [{ CoverageIndicator }, { SignalBars }, { SourceAttribution }, { StatusGlyph }] = await Promise.all([
    import('../../components/fetchi-ui/CoverageIndicator'),
    import('../../components/fetchi-ui/SignalBars'),
    import('../../components/fetchi-ui/SourceAttribution'),
    import('../../components/fetchi-ui/StatusGlyph'),
  ])

  const partialCoverageMarkup = renderToStaticMarkup(createElement(CoverageIndicator, {
    phoneAvailable: true,
    websiteAvailable: false,
    addressAvailable: true,
  }))
  const coverageLabels = [
    'Phone available',
    'Website unavailable',
    'Address available',
  ]
  const coverageLabelIndexes = coverageLabels.map(label =>
    partialCoverageMarkup.indexOf(`aria-label="${label}"`),
  )
  assert(
    coverageLabelIndexes.every(index => index >= 0) &&
      coverageLabelIndexes.every((index, position) =>
        position === 0 || coverageLabelIndexes[position - 1] < index),
    'CoverageIndicator must announce phone, website, and address availability in that order',
  )
  assert.equal(
    (partialCoverageMarkup.match(/role="img"/g) ?? []).length,
    3,
    'CoverageIndicator must expose each labelled coverage state as an accessible image',
  )
  assert.equal(
    (partialCoverageMarkup.match(/data-fetchi-coverage-strike="true"/g) ?? []).length,
    1,
    'CoverageIndicator must render one visible strike for the one missing field',
  )
  assert(
    partialCoverageMarkup.includes('data-fetchi-coverage-state="available"') &&
      partialCoverageMarkup.includes('data-fetchi-coverage-state="unavailable"'),
    'CoverageIndicator must expose distinct present and missing states',
  )
  assert(
    !partialCoverageMarkup.includes('rounded-full') &&
      !partialCoverageMarkup.includes('lifecycle'),
    'CoverageIndicator icons must not become circular or lifecycle-colored controls',
  )
  const coverageCases = [
    {
      label: 'phone unavailable only',
      props: { phoneAvailable: false, websiteAvailable: true, addressAvailable: true },
      unavailable: 1,
    },
    {
      label: 'website unavailable only',
      props: { phoneAvailable: true, websiteAvailable: false, addressAvailable: true },
      unavailable: 1,
    },
    {
      label: 'address unavailable only',
      props: { phoneAvailable: true, websiteAvailable: true, addressAvailable: false },
      unavailable: 1,
    },
    {
      label: 'phone and website unavailable',
      props: { phoneAvailable: false, websiteAvailable: false, addressAvailable: true },
      unavailable: 2,
    },
    {
      label: 'website and address unavailable',
      props: { phoneAvailable: true, websiteAvailable: false, addressAvailable: false },
      unavailable: 2,
    },
    {
      label: 'all unavailable',
      props: { phoneAvailable: false, websiteAvailable: false, addressAvailable: false },
      unavailable: 3,
    },
    {
      label: 'all available',
      props: { phoneAvailable: true, websiteAvailable: true, addressAvailable: true },
      unavailable: 0,
    },
  ] as const
  const coverageCaseMarkup = coverageCases.map(({ label, props, unavailable }) => ({
    label,
    markup: renderToStaticMarkup(createElement(CoverageIndicator, props)),
    unavailable,
  }))
  for (const { label, markup, unavailable } of coverageCaseMarkup) {
    assert.equal(
      (markup.match(/data-fetchi-coverage-strike="true"/g) ?? []).length,
      unavailable,
      `CoverageIndicator strike count changed for ${label}`,
    )
  }
  const unavailableCoverageMarkup = coverageCaseMarkup.find(
    ({ label }) => label === 'all unavailable',
  )?.markup ?? ''
  assert.equal(
    (unavailableCoverageMarkup.match(/data-fetchi-coverage-item=/g) ?? []).length,
    3,
    'CoverageIndicator must retain three separate item footprints',
  )
  assert.equal(
    (unavailableCoverageMarkup.match(/data-fetchi-coverage-strike-angle="-45"/g) ?? []).length,
    3,
    'Every missing coverage item must use the same exact 45-degree strike',
  )
  assert.equal(
    (unavailableCoverageMarkup.match(/viewBox="0 0 15 15"/g) ?? []).length,
    3,
    'Every missing strike must be contained inside its own 15px icon footprint',
  )
  assert.equal(
    (unavailableCoverageMarkup.match(/x1="2" y1="13" x2="13" y2="2"/g) ?? []).length,
    3,
    'Every missing strike must use identical contained endpoints',
  )
  assert.equal(
    (unavailableCoverageMarkup.match(/stroke-width="1.5"/g) ?? []).length,
    3,
    'Every missing strike must use the canonical 1.5px hairline',
  )
  assert.equal(
    (
      unavailableCoverageMarkup.match(
        /stroke="currentColor" stroke-linecap="round" stroke-width="1.5" x1="2"/g,
      ) ?? []
    ).length,
    3,
    'Every missing strike must use matching rounded endpoints',
  )
  assert(
    !unavailableCoverageMarkup.includes('left-[-2px]') &&
      !unavailableCoverageMarkup.includes('w-5') &&
      !unavailableCoverageMarkup.includes('rotate-45'),
    'CoverageIndicator strikes must not depend on oversized or negatively offset CSS transforms',
  )

  const signalBarsMarkup = Object.fromEntries(
    (['unchecked', 'none', 'weak', 'moderate', 'strong', 'time-sensitive'] as const).map(
      level => [
        level,
        renderToStaticMarkup(createElement(SignalBars, { level, size: 16 })),
      ],
    ),
  )
  for (const [level, markup] of Object.entries(signalBarsMarkup)) {
    assert(
      markup.includes(`data-fetchi-signal-level="${level}"`) &&
        markup.includes('role="img"') &&
        markup.includes('viewBox="0 0 16 16"'),
      `SignalBars ${level} must expose its semantic level and accessible SVG geometry`,
    )
  }
  assert(
    signalBarsMarkup.unchecked.includes('aria-label="Signal not checked"') &&
      signalBarsMarkup.unchecked.includes('data-fetchi-signal-unchecked-bar=') &&
      signalBarsMarkup.unchecked.includes('stroke-dasharray=') &&
      !signalBarsMarkup.unchecked.includes('data-fetchi-signal-none-dot=') &&
      !/green|amber|blue|lifecycle|evidence/i.test(signalBarsMarkup.unchecked),
    'Unchecked SignalBars must use a neutral dashed three-bar outline with the exact honest label',
  )
  assert.equal(
    (signalBarsMarkup.unchecked.match(/data-fetchi-signal-unchecked-bar=/g) ?? []).length,
    3,
    'Unchecked SignalBars must retain the compact three-bar signal shape',
  )
  assert(
    signalBarsMarkup.none.includes('aria-label="No signal"') &&
      signalBarsMarkup.none.includes('data-fetchi-signal-none-dot=') &&
      !signalBarsMarkup.none.includes('data-fetchi-signal-unchecked-bar='),
    'Completed-analysis No signal must remain visually distinct from unchecked',
  )
  assert(
    signalBarsMarkup.weak.includes('aria-label="Weak"') &&
      signalBarsMarkup.moderate.includes('aria-label="Moderate"') &&
      signalBarsMarkup.strong.includes('aria-label="Strong"') &&
      signalBarsMarkup['time-sensitive'].includes('aria-label="Time-sensitive"'),
    'SignalBars must retain accessible labels for the complete approved state family',
  )
  assert(
    signalBarsMarkup.strong.includes('text-fetchiAccent') &&
      !/57CE95|green|semanticGreen|lifecycleWon/i.test(signalBarsMarkup.strong),
    'Strong SignalBars must use the canonical indigo interaction accent and never the green success treatment',
  )

  const sourceAttributionMarkup = renderToStaticMarkup(createElement(SourceAttribution, {
    source: 'Google Maps',
    variant: 'inline',
  }))
  assert(
    sourceAttributionMarkup.includes('data-fetchi-source-attribution="inline"') &&
      sourceAttributionMarkup.includes('>source</span>') &&
      sourceAttributionMarkup.includes('>Google Maps</span>'),
    'SourceAttribution must render the approved inline source Google Maps grammar',
  )
  assert(
    sourceAttributionMarkup.includes('truncate') &&
      !sourceAttributionMarkup.includes('<svg') &&
      !sourceAttributionMarkup.includes('lucide-') &&
      !sourceAttributionMarkup.includes('>via</span>') &&
      !sourceAttributionMarkup.includes('>SOURCE</span>') &&
      !sourceAttributionMarkup.includes('Source ·') &&
      !sourceAttributionMarkup.includes('rounded-full'),
    'Dense source attribution must stay icon-free, quiet, and truncatable',
  )
  const permitSourceAttributionMarkup = renderToStaticMarkup(createElement(SourceAttribution, {
    source: 'Permits',
  }))
  assert(
    permitSourceAttributionMarkup.includes('lucide-file-text'),
    'SourceAttribution must retain the canonical permits source icon mapping',
  )

  const statusGlyphMarkup = Object.fromEntries(
    (['new', 'reviewing', 'saved', 'contacted', 'won', 'lost'] as const).map((state) => [
      state,
      renderToStaticMarkup(createElement(StatusGlyph, { state, size: 40 })),
    ]),
  )
  assert(
    Object.values(statusGlyphMarkup).every((markup) =>
      markup.includes('data-fetchi-status-outer-diameter="40"') &&
      markup.includes('viewBox="0 0 40 40"')
    ),
    'Every StatusGlyph state must share an explicit 40px outer coordinate system',
  )
  assert(
    statusGlyphMarkup.new.includes('data-fetchi-status-glyph="new"') &&
      statusGlyphMarkup.new.includes('data-fetchi-status-outer-ring="new"') &&
      statusGlyphMarkup.new.includes('r="18"') &&
      statusGlyphMarkup.new.includes('stroke-width="4"') &&
      statusGlyphMarkup.new.includes('fill="none"') &&
      !statusGlyphMarkup.new.includes('data-fetchi-status-center'),
    'New StatusGlyph must use an explicit 4px neutral hollow ring with a transparent center',
  )
  assert(
    statusGlyphMarkup.reviewing.includes('data-fetchi-status-glyph="reviewing"') &&
      statusGlyphMarkup.reviewing.includes('data-fetchi-status-outer-ring="reviewing"') &&
      statusGlyphMarkup.reviewing.includes('r="18"') &&
      statusGlyphMarkup.reviewing.includes('stroke-width="4"') &&
      statusGlyphMarkup.reviewing.includes('stroke-dasharray="5 9.137"') &&
      statusGlyphMarkup.reviewing.includes('stroke-linecap="round"') &&
      statusGlyphMarkup.reviewing.includes('fill="none"') &&
      !statusGlyphMarkup.reviewing.includes('data-fetchi-status-center'),
    'Reviewing StatusGlyph must use the same explicit 4px ring with evenly spaced rounded dashes',
  )
  assert(
    statusGlyphMarkup.saved.includes('data-fetchi-status-glyph="saved"') &&
      statusGlyphMarkup.saved.includes('data-fetchi-status-outer-ring="saved"') &&
      statusGlyphMarkup.saved.includes('stroke-width="4"') &&
      statusGlyphMarkup.saved.includes('data-fetchi-status-center-dot="saved"') &&
      statusGlyphMarkup.saved.includes('r="7.2"') &&
      statusGlyphMarkup.saved.includes('fill="currentColor"'),
    'Saved StatusGlyph must use a 4px amber ring and a solid 14.4px center dot',
  )
  assert(
    statusGlyphMarkup.contacted.includes('data-fetchi-status-glyph="contacted"') &&
      statusGlyphMarkup.contacted.includes('data-fetchi-status-outer-ring="contacted"') &&
      statusGlyphMarkup.contacted.includes('stroke-width="4"') &&
      statusGlyphMarkup.contacted.includes('data-fetchi-status-center-disc="contacted"') &&
      statusGlyphMarkup.contacted.includes('r="10.4"') &&
      statusGlyphMarkup.contacted.includes('fill="currentColor"') &&
      !statusGlyphMarkup.contacted.includes('data-fetchi-status-inner-ring') &&
      !statusGlyphMarkup.contacted.includes('fill="none" data-fetchi-status-center'),
    'Contacted StatusGlyph must use a 4px blue ring and a solid 20.8px center disc without a hole',
  )
  assert(
    statusGlyphMarkup.won.includes('data-fetchi-status-glyph="won"') &&
      statusGlyphMarkup.won.includes('data-fetchi-status-terminal-fill="won"') &&
      statusGlyphMarkup.won.includes('r="20"') &&
      statusGlyphMarkup.won.includes('data-fetchi-status-terminal-mark="check"') &&
      !statusGlyphMarkup.won.includes('lucide-check'),
    'Won StatusGlyph must use the full 40px outer bounds with a compact centered dark check',
  )
  assert(
    statusGlyphMarkup.lost.includes('data-fetchi-status-glyph="lost"') &&
      statusGlyphMarkup.lost.includes('data-fetchi-status-terminal-fill="lost"') &&
      statusGlyphMarkup.lost.includes('r="20"') &&
      statusGlyphMarkup.lost.includes('data-fetchi-status-terminal-mark="x"') &&
      !statusGlyphMarkup.lost.includes('lucide-x'),
    'Lost StatusGlyph must use the full 40px outer bounds with a compact centered dark x',
  )
  assert(
    !Object.values(statusGlyphMarkup).some((markup) =>
      markup.includes('lucide-') ||
      markup.includes('data-fetchi-status-center-icon') ||
      markup.includes('data-fetchi-status-inner-ring')
    ),
    'StatusGlyph must use literal lifecycle geometry without Lucide, bookmark, phone, or hollow-center substitutions',
  )

  const plan = source('docs/superpowers/plans/2026-07-22-cp26c-authenticated-design-migration.md')
  const globals = source('app/globals.css')
  const tailwind = source('tailwind.config.ts')
  const layout = source('app/app/layout.tsx')
  const sidebar = source('components/app/Sidebar.tsx')
  const mobileHeader = source('components/app/MobileHeader.tsx')
  const mobileNav = source('components/app/MobileBottomNav.tsx')
  const mobileScreenHeader = source('components/app/MobileScreenHeader.tsx')
  const avatar = source('components/app/FetchiAvatar.tsx')
  const loadingState = source('components/app/LoadingState.tsx')
  const signOutControl = source('components/app/SignOutControl.tsx')
  const sweep = source('app/app/sweep/SweepClient.tsx')
  const myLeads = source('components/app/MyLeadsView.tsx')
  const leadActionSheetPath = 'components/app/LeadActionSheet.tsx'
  assert(existsSync(leadActionSheetPath), 'The focused My Leads LeadActionSheet presentation is missing')
  const leadActionSheet = source(leadActionSheetPath)
  const leadCard = source('components/app/LeadCard.tsx')
  const glyphTile = source('components/app/GlyphTile.tsx')
  const leadDetail = source('app/app/leads/[id]/page.tsx')
  const outcomeForm = source('app/app/leads/[id]/OutcomeForm.tsx')
  const chatClient = source('app/app/chat/ChatClient.tsx')
  const chatBubble = source('components/app/ChatBubble.tsx')
  const mapFilterSheet = source('components/app/map/MapFilterSheet.tsx')
  const mapLeadRail = source('components/app/map/MapLeadRail.tsx')
  const mapRailFilterPopover = source('components/app/map/MapRailFilterPopover.tsx')
  const mapShell = source('components/app/map/MapShell.tsx')
  const mapTopBar = source('components/app/map/MapTopBar.tsx')
  const selectedLeadSheet = source('components/app/map/SelectedLeadSheet.tsx')
  const afterAddConfirmation = source('components/app/today/AfterAddConfirmation.tsx')
  const evidenceCardBack = source('components/app/today/EvidenceCardBack.tsx')
  const passReasonPanel = source('components/app/today/PassReasonPanel.tsx')
  const runCompletion = source('components/app/today/RunCompletion.tsx')
  const runProgress = source('components/app/today/RunProgress.tsx')
  const todayRunCard = source('components/app/today/TodayRunCard.tsx')
  const todayRunDeck = source('components/app/today/TodayRunDeck.tsx')
  const todayRunPage = source('components/app/today/TodayRunPage.tsx')
  const settingsHome = source('app/app/settings/page.tsx')
  const profilePage = source('app/app/settings/profile/page.tsx')
  const profileForm = source('app/app/settings/profile/ProfileForm.tsx')
  const signalPreferences = source('app/app/settings/signals/page.tsx')
  const notifications = source('app/app/settings/notifications/page.tsx')
  const billing = source('app/app/settings/billing/page.tsx')
  const usage = source('app/app/settings/usage/page.tsx')
  const sectionCard = source('components/app/SectionCard.tsx')
  const settingsGroup = source('components/app/SettingsGroup.tsx')
  const shellSources = [
    sidebar,
    mobileHeader,
    mobileNav,
    mobileScreenHeader,
    source('components/app/CreditsWidget.tsx'),
    source('components/app/SectionCard.tsx'),
    source('components/app/SettingsGroup.tsx'),
    source('components/app/EmptyState.tsx'),
    source('components/app/ErrorState.tsx'),
    loadingState,
    signOutControl,
  ].join('\n')

  const baseRoutes = routeFiles('origin/main')
  const currentRoutes = routeFiles()
  assert.equal(baseRoutes.length, 23, 'The approved base route inventory must remain 23')
  assert.deepEqual(currentRoutes, baseRoutes, 'Authenticated migration must not add, remove, or rename routes')

  assert(layout.includes('data-fetchi-brand-system="v5"'), 'Authenticated root must declare the v5 brand-system contract')
  assert(layout.includes('fetchi-app'), 'Authenticated root must opt into the dedicated v5 class')
  const onboardingBranch = layout.split('if (onOnboarding)')[1]?.split('\n  return (')[0] ?? ''
  assert(onboardingBranch.includes('theme-light') && !onboardingBranch.includes('fetchi-app'), 'Onboarding must remain outside the authenticated v5 class')

  for (const contract of [
    '.fetchi-app[data-fetchi-theme-root].theme-dark',
    '.fetchi-app[data-fetchi-theme-root].theme-light',
    '--bg: 8 9 10',
    '--surface: 15 16 17',
    '--raised: 20 21 22',
    '--text: 247 248 248',
    '--text2: 138 143 152',
    '--textMuted: 98 102 109',
    '--blue: 76 141 246',
    '--ok: 63 183 126',
    '--warn: 224 166 75',
    '--bad: 235 92 87',
    '--fetchi-bg: #FBFBFC',
    '--fetchi-surface: #FFFFFF',
  ]) {
    assert(globals.includes(contract), `Missing authenticated v5 token contract: ${contract}`)
  }
  assert(globals.includes('font-family: var(--font-inter)'), 'Authenticated product typography must use Inter')
  assert(!/html, body[\s\S]{0,220}font-family:\s*var\(--font-inter\)/.test(globals), 'Inter activation must not leak into public/root typography')
  assert(tailwind.includes("fetchiAccent: 'rgb(var(--fetchi-accent-rgb) / <alpha-value>)'"), 'Tailwind must expose the v5 interaction accent')

  assert(sidebar.includes('w-[224px]'), 'Desktop sidebar must use the 224px v5 contract')
  assert(mobileHeader.includes('h-12'), 'Authenticated mobile topbar must use the 48px v5 contract')
  assert(mobileHeader.includes('min-h-[44px]') && /min-[hw]-\[44px\]/.test(mobileNav), 'Mobile shell controls must preserve a 44px touch target')
  assert(sidebar.includes('bg-fetchiAccent') && sidebar.includes('text-fetchiAccent'), 'Active desktop navigation must use indigo')
  assert(mobileNav.includes('bg-fetchiAccent') && mobileNav.includes('text-fetchiAccent'), 'Active mobile navigation must use indigo')

  assert(globals.includes('.fetchi-focus-ring:focus-visible'), 'Authenticated focus helper is missing')
  assert(globals.includes('var(--fetchi-focus-ring)'), 'Focus helper must use the v5 indigo ring')
  assert(globals.includes('.fetchi-selected-row'), 'Selected-row helper is missing')
  assert(globals.includes('border-left: 2px solid var(--fetchi-accent)'), 'Selected rows must retain the 2px indigo accent bar')
  assert(globals.includes('background: var(--fetchi-accent-tint)'), 'Selected rows must use the approved indigo tint')

  assert(avatar.includes('<FetchiMark tone="dark"'), 'Avatar must use the authentic coral-on-dark Fetchi mark')
  assert(!/\bcoral\b/i.test(shellSources), 'Coral must not own authenticated shell interactions or semantic states')
  assert(shellSources.includes('bg-bad') && tailwind.includes("semanticGreen: 'rgb(var(--ok) / <alpha-value>)'"), 'Red error and green success semantics must remain distinct')
  assert(tailwind.includes("evidence: 'rgb(var(--blue) / <alpha-value>)'"), 'Evidence blue must remain a distinct Tailwind role')
  assert(tailwind.includes("lifecycleSaved: 'rgb(var(--life-saved) / <alpha-value>)'"), 'Lifecycle colors must retain explicit carrier roles')

  // Task 2: Fetch, My Leads, shared lead presentation, and opportunity detail.
  assert(myLeads.includes('data-fetchi-my-leads-v5'), 'My Leads must declare its v5 mailbox surface')
  assert(myLeads.includes('data-fetchi-search-control'), 'My Leads must expose the v5 search-control contract')
  assert(myLeads.includes('data-fetchi-export-control'), 'My Leads must expose the v5 export-control contract')
  assert(leadActionSheet.includes('data-fetchi-action-sheet-v5'), 'My Leads must expose the v5 action-sheet contract')
  assert(
    myLeads.includes("import { LeadActionSheet } from '@/components/app/LeadActionSheet'") &&
      myLeads.includes('<LeadActionSheet'),
    'My Leads must render the focused reusable LeadActionSheet without changing its existing behavior wiring',
  )
  assert(
    leadActionSheet.includes("from '@/components/fetchi-ui/StatusGlyph'") &&
      leadActionSheet.includes("import { CoverageIndicator } from '@/components/fetchi-ui/CoverageIndicator'") &&
      leadActionSheet.includes("from '@/components/fetchi-ui/SignalBars'") &&
      leadActionSheet.includes("import { SourceAttribution } from '@/components/fetchi-ui/SourceAttribution'"),
    'LeadActionSheet must compose the frozen production lifecycle, coverage, signal, and source primitives',
  )
  assert(
    leadActionSheet.includes('data-fetchi-action-sheet-header') &&
      leadActionSheet.includes('data-fetchi-action-sheet-drag-handle') &&
      leadActionSheet.includes('size={40}') &&
      leadActionSheet.includes('displayedSignal.evidenceDate') &&
      leadActionSheet.includes('displayedSignal.whyNow') &&
      leadActionSheet.includes('row.sourceUrl') &&
      leadActionSheet.includes('Signal not checked') &&
      leadActionSheet.includes('level={displayedSignal.level}'),
    'LeadActionSheet must use a native bottom-sheet handle, lifecycle glyph header, and dated source-linked time-sensitive evidence gate',
  )
  const actionLifecycleSelector =
    leadActionSheet.split('data-fetchi-action-sheet-lifecycle-selector')[1]?.slice(0, 4200) ?? ''
  const actionSignalRegion =
    leadActionSheet.split('data-fetchi-action-sheet-signal-summary')[1]?.slice(0, 4200) ?? ''
  assert(
    leadActionSheet.indexOf('data-fetchi-action-sheet-lifecycle-selector') <
      leadActionSheet.indexOf('data-fetchi-action-sheet-signal-summary') &&
      actionLifecycleSelector.includes('role="radiogroup"') &&
      actionLifecycleSelector.includes('role="radio"') &&
      actionLifecycleSelector.includes('aria-checked={isSelected}') &&
      actionLifecycleSelector.includes('if (isSelected) return') &&
      leadActionSheet.includes("actionLabel: 'Saved'") &&
      leadActionSheet.includes("actionLabel: 'Contacted'") &&
      leadActionSheet.includes("actionLabel: 'Won'") &&
      leadActionSheet.includes("actionLabel: 'Dismiss'"),
    'LeadActionSheet must place a complete four-state segmented lifecycle selector directly after the header',
  )
  assert(
    leadActionSheet.includes(
      'Saved from Fetch. This lead has not been checked for fresh buying signals yet.',
    ) &&
      !leadActionSheet.includes('No fresh signal yet') &&
      !leadActionSheet.includes('Fetchi found nothing'),
    'LeadActionSheet unchecked signal copy must truthfully state that analysis has not run',
  )
  const actionTruthRow = leadActionSheet.split('data-fetchi-action-sheet-truth-row')[1]?.slice(0, 1800) ?? ''
  assert(
    actionTruthRow.indexOf('<CoverageIndicator') >= 0 &&
      !actionTruthRow.includes('<SignalBars') &&
      actionTruthRow.indexOf('<SourceAttribution') > actionTruthRow.indexOf('<CoverageIndicator'),
    'LeadActionSheet provenance row must preserve coverage then source without repeating SignalBars',
  )
  assert(
    leadActionSheet.includes('row.sourceUrl ? (') &&
      leadActionSheet.includes('href={row.sourceUrl}') &&
      leadActionSheet.includes('data-fetchi-source-link'),
    'LeadActionSheet must link source attribution only when a persisted source URL exists',
  )
  for (const route of ['Call', 'Email', 'Website', 'Directions']) {
    assert(leadActionSheet.includes(route), `LeadActionSheet is missing the truthful ${route} route`)
  }
  for (const forbidden of ['No phone', 'No website', 'No address', 'Source:', 'Saved {displayDate', 'Website:']) {
    assert(!leadActionSheet.includes(forbidden), `LeadActionSheet must not retain duplicate or disabled metadata: ${forbidden}`)
  }
  assert(
    leadActionSheet.includes('data-fetchi-action-sheet-contact-routes') &&
      leadActionSheet.includes('data-fetchi-action-sheet-utilities') &&
      !leadActionSheet.includes('data-fetchi-action-sheet-lifecycle"'),
    'LeadActionSheet must keep contact routes and utilities separate and remove the old bottom lifecycle action group',
  )
  assert(
    leadActionSheet.includes('onOpenAutoFocus') &&
      !leadActionSheet.includes('detailLine(row) || row.source'),
    'LeadActionSheet must prevent default tile focus and must not duplicate source attribution in the header',
  )
  assert(
    leadActionSheet.includes("actionLabel: 'Contacted'") &&
      leadActionSheet.includes("actionLabel: 'Won'") &&
      leadActionSheet.includes("actionLabel: 'Dismiss'") &&
      !leadActionSheet.includes("actionLabel: 'Mark as"),
    'LeadActionSheet lifecycle labels must be compact while accessible names preserve mutation intent',
  )
  assert(
    !leadActionSheet.includes('bg-lifecycleSaved/10') &&
      !leadActionSheet.includes('bg-lifecycleContacted/10') &&
      !leadActionSheet.includes('bg-lifecycleWon/10') &&
      !leadActionSheet.includes('bg-lifecycleLost/10'),
    'LeadActionSheet lifecycle containers must stay neutral; lifecycle color belongs only to glyphs',
  )
  assert(myLeads.includes('text-[22px]') && !myLeads.includes('text-[32px]'), 'My Leads mobile title must use the compact reference hierarchy')
  assert(myLeads.includes('leadCountLabel') && myLeads.includes('updatedLabel'), 'My Leads subtitle must remain grounded in saved-lead count and persisted update age')
  assert(!myLeads.includes('opportunities') && !myLeads.includes('new today'), 'My Leads must not relabel saved leads as opportunities or invent new-today truth')
  assert(myLeads.includes('placeholder="Search saved leads"'), 'My Leads search copy must match the reference')
  assert(myLeads.includes('data-fetchi-filter-utility') && myLeads.includes('data-fetchi-export-utility'), 'My Leads must expose square filter and export utilities')
  assert(myLeads.includes('h-11 w-11') && myLeads.includes('ArrowDownToLine'), 'My Leads reference utilities must remain 44px square and preserve export')
  assert(!myLeads.includes('ArrowUpDown') && !myLeads.includes('SortMode'), 'My Leads must not invent sorting behavior')
  assert(myLeads.includes("type FilterKey = 'all' | 'saved' | 'contacted' | 'won' | 'lost'"), 'My Leads must expose only persisted lifecycle filters')
  assert(!myLeads.includes("key: 'new'"), 'My Leads must not invent a New lifecycle filter')
  assert(myLeads.includes("key: 'lost'") && myLeads.includes("label: 'Lost'"), 'My Leads must label the combined lost/dismissed persisted state as Lost')
  assert(myLeads.includes('data-fetchi-separated-filter-tabs'), 'My Leads lifecycle filters must use separated labeled tabs')
  assert(myLeads.includes('data-fetchi-filter-fit-v5'), 'My Leads must declare the five-filter responsive fit contract')
  const filterFitSource = myLeads.split('data-fetchi-filter-fit-v5')[1]?.slice(0, 2600) ?? ''
  const filterControlSource = filterFitSource.split('{LIFECYCLE_FILTERS.map')[1]?.split('</button>')[0] ?? ''
  assert(filterFitSource.includes('gridTemplateColumns') && filterFitSource.includes('0.78fr 1fr 1.45fr 0.82fr 0.85fr') && filterFitSource.includes('w-full'), 'My Leads must keep five bounded tracks while allocating enough width to Contacted')
  assert(filterFitSource.includes('gap-1.5'), 'My Leads filter pills must keep the approved 6px gap')
  assert(filterControlSource.includes('data-fetchi-filter-hit-target') && filterControlSource.includes('h-11') && filterControlSource.includes('min-h-[44px]'), 'My Leads filters must preserve a separate 44px interactive target')
  assert(filterControlSource.includes('data-fetchi-filter-visible-pill') && filterControlSource.includes('h-8') && filterControlSource.includes('rounded-[8px]'), 'My Leads visible filter pills must be exactly 32px tall with an 8px radius')
  assert(filterControlSource.includes('text-[13px]') && filterControlSource.includes('font-medium'), 'My Leads visible filter labels must use canonical 13px medium Inter')
  assert(filterControlSource.includes('px-1') && !filterControlSource.includes('py-'), 'My Leads visible filter pills must use restrained horizontal padding and no vertical padding')
  assert(filterControlSource.includes('group-focus-visible:[box-shadow:var(--fetchi-focus-ring)]'), 'My Leads visible filter pills must retain the canonical focus-visible treatment')
  assert(filterControlSource.includes('min-w-0'), 'My Leads filter controls must be allowed to shrink inside their bounded columns')
  assert(!filterFitSource.includes('overflow-x-auto') && !filterFitSource.includes('min-w-max') && !filterFitSource.includes('shrink-0'), 'My Leads filters must not depend on horizontal scrolling or unshrinkable pills')
  assert(filterFitSource.includes('whitespace-nowrap') && !filterFitSource.includes('flex-col') && !filterFitSource.includes('sm:flex-row'), 'My Leads filter labels must remain on one line at every supported width')
  assert(myLeads.includes('data-fetchi-filter-label'), 'Every My Leads filter tab must visibly retain its label')
  assert(!myLeads.includes('data-fetchi-filter-count'), 'My Leads filter counts must not be rendered visually')
  assert(filterFitSource.includes('aria-label={filterAccessibleLabel(filter, count)}'), 'My Leads filter counts must remain available through the accessible name')
  assert(myLeads.includes("return `All leads, ${count}`"), 'All filter must expose its truthful count in the accessible name')
  assert(myLeads.includes("return `Lost and dismissed leads, ${count}`"), 'Lost filter must expose the combined lost/dismissed count in the accessible name')
  assert(myLeads.includes("return `${filter.label} leads, ${count}`"), 'Persisted lifecycle filters must expose truthful counts in their accessible names')
  assert(filterFitSource.includes('ACTIVE_FILTER_CLASS') && !filterFitSource.includes('filter.activeClass'), 'Every active My Leads filter must use the shared indigo selection treatment')
  assert(myLeads.includes('shadow-[0_1px_2px_rgba(0,0,0,0.30),0_8px_20px_-10px_rgba(94,106,210,0.50)]'), 'The active My Leads filter must use only the restrained canonical CTA shadow')
  assert(!filterFitSource.includes('shadow-[0_12px_28px'), 'My Leads filter pills must not use the old elevated glow')
  assert(!myLeads.includes('-space-x-5') && !myLeads.includes('data-cp24b-overlap-filter-rail'), 'My Leads must not retain the overlapping icon-pill rail')
  assert(myLeads.includes('data-fetchi-lifecycle-glyph'), 'My Leads rows must use lifecycle ring glyphs instead of filled initial avatars')
  const lifecycleGlyphWrapper = myLeads.split('data-fetchi-lifecycle-glyph')[0]?.slice(-700) ?? ''
  assert(
    lifecycleGlyphWrapper.includes('role="img"') &&
      lifecycleGlyphWrapper.includes('aria-label={statusLabel(row.lifecycleStatus)}'),
    'My Leads lifecycle glyph wrapper must expose the truthful lifecycle label through explicit image semantics',
  )
  const dismissedStatusMeta = myLeads.split('dismissed: {')[1]?.split('},')[0] ?? ''
  assert(
    dismissedStatusMeta.includes("label: 'Dismissed'") &&
      myLeads.includes("state={row.lifecycleStatus === 'dismissed' ? 'lost' : row.lifecycleStatus}"),
    'Dismissed rows must retain a truthful accessible label while reusing the Lost visual grammar',
  )
  assert(
    myLeads.includes("import { StatusGlyph } from '@/components/fetchi-ui/StatusGlyph'") &&
      myLeads.includes('<StatusGlyph') &&
      !myLeads.includes('const StatusGlyph = meta.glyphIcon'),
    'My Leads must consume the reusable six-state StatusGlyph without hardcoded local lifecycle geometry',
  )
  assert(
    myLeads.includes("import { CoverageIndicator } from '@/components/fetchi-ui/CoverageIndicator'") &&
      myLeads.includes("import { SourceAttribution } from '@/components/fetchi-ui/SourceAttribution'"),
    'My Leads must consume the reusable Source and Coverage primitives',
  )
  assert(myLeads.includes('function hasAddress('), 'My Leads address coverage must check the persisted address field directly')
  const denseRowMetadata = myLeads.split('data-fetchi-dense-row')[1]?.split('data-fetchi-row-metadata')[0] ?? ''
  const coverageIndex = denseRowMetadata.indexOf('<CoverageIndicator')
  const signalIndex = denseRowMetadata.indexOf('<SignalBars')
  const sourceIndex = denseRowMetadata.indexOf('<SourceAttribution')
  assert(
    coverageIndex >= 0 && signalIndex > coverageIndex && sourceIndex > signalIndex,
    'My Leads dense metadata must keep coverage, unchecked signal, and source as separate ordered channels',
  )
  for (const fieldMapping of [
    'phoneAvailable={hasPhone(row)}',
    'websiteAvailable={hasWebsite(row)}',
    'addressAvailable={hasAddress(row)}',
    'source={row.source}',
  ]) {
    assert(denseRowMetadata.includes(fieldMapping), `My Leads dense metadata lost its truthful field mapping: ${fieldMapping}`)
  }
  assert(
    denseRowMetadata.includes('level="unchecked"') &&
      denseRowMetadata.includes('data-fetchi-dense-signal-state') &&
      denseRowMetadata.includes('className="min-w-0 flex-1"') &&
      denseRowMetadata.includes('variant="inline"'),
    'My Leads must show only unchecked signal and allow the icon-free source to truncate last',
  )
  assert(
    !denseRowMetadata.includes('level="none"') &&
      !denseRowMetadata.includes('level="weak"') &&
      !denseRowMetadata.includes('level="moderate"') &&
      !denseRowMetadata.includes('level="strong"') &&
      !denseRowMetadata.includes('level="time-sensitive"') &&
      !denseRowMetadata.includes('No signal') &&
      !denseRowMetadata.includes('playbook'),
    'Current saved rows must not invent completed signal analysis, urgency, badges, or playbook labels',
  )
  assert(
    !myLeads.includes('function SourceChip(') &&
      !myLeads.includes('data-fetchi-source-chip') &&
      !myLeads.includes('Source ·') &&
      !myLeads.includes('detail || row.source'),
    'My Leads must remove the legacy local Source pill and avoid duplicating source as row detail',
  )
  assert(myLeads.includes('data-fetchi-row-metadata'), 'My Leads rows must expose compact right-aligned update metadata')
  assert(
    myLeads.includes('const SYSTEM_COVERAGE_NOTES = new Set([') &&
      [
        'no website',
        'website unavailable',
        'no phone',
        'phone unavailable',
        'no address',
        'address unavailable',
        'no location',
        'location unavailable',
      ].every((note) => myLeads.includes(`'${note}'`)),
    'My Leads must enumerate the exact generated missing-coverage notes suppressed from dense rows',
  )
  assert(
    myLeads.includes('const denseNote = denseRowNote(row.note)') &&
      myLeads.includes('{denseNote && (') &&
      myLeads.includes('{denseNote}'),
    'My Leads dense rows must render only notes that survive generated-coverage suppression',
  )
  assert(
    myLeads.includes("setNoteDrafts((current) => ({ ...current, [row.id]: denseRowNote(row.note) ?? '' }))") &&
      leadActionSheet.includes("noteDraft === (displayNote ?? '')"),
    'My Leads must preserve stored-note editing and real user notes in the action sheet',
  )
  assert(myLeads.includes('data-fetchi-dense-row') && myLeads.includes('min-h-[96px]') && myLeads.includes('rounded-lg py-3'), 'My Leads must retain dense 96px rows with quiet divider rhythm')
  assert(!myLeads.includes('data-fetchi-score-unavailable') && !myLeads.includes('BarChart3'), 'My Leads must not render score or signal placeholders without source fields')
  assert(!myLeads.includes('data-cp23c-icon-status-strip'), 'My Leads rows must not retain the old phone, website, and location icon strip')
  assert(myLeads.includes('min-h-[44px]') && myLeads.includes('fetchi-focus-ring'), 'My Leads rows and controls must be touch-safe and use the indigo focus ring')
  assert(myLeads.includes("activeLeadId === row.id && 'fetchi-selected-row'"), 'The active My Leads row must use the selected-row contract')
  const mailboxRowIndex = myLeads.indexOf('data-fetchi-dense-row')
  assert.notEqual(mailboxRowIndex, -1, 'My Leads dense row could not be isolated')
  const mailboxRowSource = myLeads.slice(mailboxRowIndex, mailboxRowIndex + 5200)
  const rowActionStart = mailboxRowSource.indexOf('<button')
  const rowActionEnd = mailboxRowSource.indexOf('</button>')
  const rowNavigationStart = mailboxRowSource.indexOf('<OpenLeadLink')
  assert(!myLeads.includes('role="button"') && !myLeads.includes('tabIndex={0}'), 'My Leads rows must not use focusable div button semantics')
  assert(rowActionStart >= 0 && rowActionEnd > rowActionStart && rowNavigationStart > rowActionEnd, 'My Leads row action and business navigation must be non-nested native siblings')
  assert(mailboxRowSource.includes('data-fetchi-row-action') && mailboxRowSource.includes('type="button"') && mailboxRowSource.includes('onClick={() => setActiveLeadId(row.id)}'), 'My Leads row activation must use a native button and preserve action-sheet opening')
  assert(mailboxRowSource.includes('aria-expanded={activeLeadId === row.id}') && mailboxRowSource.includes('aria-controls={`fetchi-lead-action-sheet-${row.id}`}'), 'My Leads row action must expose current open state and its action-sheet association')
  assert(leadActionSheet.includes('id={row ? `fetchi-lead-action-sheet-${row.id}` : undefined}'), 'My Leads action sheet must expose the row association target')
  assert(myLeads.includes('aria-label="Search saved leads"') && leadActionSheet.includes('aria-label={`Note for ${row.businessName}`}'), 'My Leads search and note controls must have explicit accessible labels')
  const mailboxChevronIndex = myLeads.indexOf('group-hover:translate-x-0.5')
  assert.notEqual(mailboxChevronIndex, -1, 'My Leads row chevron affordance must remain present')
  const mailboxChevronSource = myLeads.slice(Math.max(0, mailboxChevronIndex - 250), mailboxChevronIndex + 250)
  assert(mailboxChevronSource.includes('motion-reduce:transform-none') && mailboxChevronSource.includes('motion-reduce:transition-none'), 'My Leads row chevron motion must stop when reduced motion is requested')
  assert(myLeads.includes("type MailboxNoticeTone = 'success' | 'error'"), 'My Leads must model success and mutation-error notices separately')
  assert(myLeads.includes("message.tone === 'error' ? 'alert' : 'status'"), 'My Leads mutation errors must announce as alerts while successes use status semantics')
  assert(myLeads.includes('AlertCircle') && myLeads.includes('text-semanticRed'), 'My Leads mutation errors must render a real red error glyph')
  for (const lifecycleClass of ['text-lifecycleSaved', 'text-lifecycleContacted', 'text-lifecycleWon', 'text-lifecycleLost']) {
    assert(
      myLeads.includes(lifecycleClass) && statusGlyphSource.includes(lifecycleClass),
      `My Leads is missing lifecycle carrier ownership: ${lifecycleClass}`,
    )
  }
  const forbiddenWarmMailboxHex = [
    '#0B0D0C', '#F7F3E8', '#B8B0A2', '#7E786D', '#5E574E',
    '#2A2F2B', '#171A18', '#1C201D', '#20241F', '#2EE08C',
    '#FFCC00', '#38B6F5', '#EF5A4E',
  ]
  for (const hex of forbiddenWarmMailboxHex) {
    assert(!myLeads.includes(hex), `My Leads must not retain the CP23 warm palette: ${hex}`)
  }

  assert(sweep.includes('bg-fetchiAccent') && sweep.includes('accent-fetchiAccent'), 'Fetch primary actions and selection controls must use indigo')
  assert(
    sweep.includes('font-fetchi text-h1 font-semibold') &&
      !sweep.includes('font-fetchi text-[30px] font-semibold'),
    'Fetch must use the canonical compact authenticated v5 H1',
  )
  assert(sweep.includes("selected && 'fetchi-selected-row'"), 'Fetch selected rows must use the indigo selected-row contract')
  assert.equal((sweep.match(/data-fetchi-sweep-checkbox-target/g) ?? []).length, 2, 'Fetch result and select-all checkboxes must each expose a 44px target')
  assert(sweep.includes('inline-flex min-h-[44px] min-w-[44px]'), 'Fetch checkbox target contract must be at least 44px square')
  assert(sweep.includes('text-evidence'), 'Fetch source and website links must use evidence blue')
  assert(!/bg-(?:coral|ok)\s+text-(?:bg|white)/.test(sweep), 'Fetch neutral primary actions must not use coral or success green')
  assert(leadCard.includes('bg-fetchiAccent') && leadCard.includes('focus-visible:ring-fetchiAccent'), 'Lead cards must use indigo for primary actions and focus')
  const respondedTone = leadCard.split("case 'responded':")[1]?.split("case '")[0] ?? ''
  assert(respondedTone.includes('text-text2') && !respondedTone.includes('semanticGreen'), 'Responded must use a neutral lifecycle carrier, reserving green for won/success')
  assert(!/bg-coral|text-coral|border-coral/.test(leadCard), 'Lead cards must not assign coral to product UI')
  assert(!/\bcoral\b/.test(glyphTile), 'Shared glyph tiles must not expose a coral product tone')
  assert(leadDetail.includes('text-evidence') && leadDetail.includes('focus-visible:ring-fetchiAccent'), 'Lead detail must separate evidence links from indigo focus')
  assert(
    leadDetail.includes('className="font-fetchi text-h1 text-text mt-6 px-2">{businessName}</h1>') &&
      !leadDetail.includes('text-h1 lg:text-[32px] text-text mt-6 px-2">{businessName}</h1>'),
    'Lead-detail business name must remain the canonical compact authenticated v5 H1 at every viewport',
  )
  assert(!/text-coral|bg-coral|border-coral/.test(leadDetail), 'Lead detail must not assign coral to product UI')
  assert(outcomeForm.includes("'bg-fetchiAccent text-white border-fetchiAccent'"), 'Neutral outcome selection must use indigo')
  assert(outcomeForm.includes("'bg-lifecycleWon text-[#08090A] border-lifecycleWon'"), 'Won outcome must use near-black text on lifecycle green for normal-text AA contrast')
  assert(outcomeForm.includes("'bg-bad/12 text-bad border-bad/25'"), 'Lost outcome must retain destructive red ownership')
  assert(outcomeForm.includes('focus-visible:ring-fetchiAccent'), 'Outcome controls must expose the indigo focus state')
  for (const { file, marker, label } of [
    { file: leadDetail, marker: 'href={`https://${prospect.website}`}', label: 'Opportunity website' },
    { file: leadDetail, marker: '<Button size="sm" variant="secondary"', label: 'Outreach draft edit' },
    { file: leadDetail, marker: 'href={`tel:${savedLead.phone}`}', label: 'Saved-lead phone' },
    { file: leadDetail, marker: 'href={savedLeadWebsiteHref(savedLead.website!)}', label: 'Saved-lead website' },
    { file: sweep, marker: 'href={`tel:${lead.phone}`}', label: 'Sweep result phone' },
  ]) {
    const targetIndex = file.indexOf(marker)
    assert.notEqual(targetIndex, -1, `${label} target must remain present`)
    const openingTagStart = file.lastIndexOf('<', targetIndex)
    const openingTagEnd = file.indexOf('>', targetIndex)
    assert(openingTagStart >= 0 && openingTagEnd > targetIndex, `${label} opening tag could not be isolated`)
    const openingTag = file.slice(openingTagStart, openingTagEnd + 1)
    assert(openingTag.includes('min-h-[44px]'), `${label} must preserve a 44px hit area on its own opening tag`)
  }
  assert.equal((leadCard.match(/hover:-translate-y-px/g) ?? []).length, 2, 'Lead cards must retain both hover-lift affordances')
  assert.equal((leadCard.match(/motion-reduce:transform-none/g) ?? []).length, 2, 'Both LeadCard hover lifts must stop under reduced motion')

  for (const preservedHook of [
    'exportSavedLeadsCsv(visibleRows)',
    'exportSavedLeadsJson(visibleRows)',
    'updateSavedLeadStatus({',
    'updateSavedLeadNote({',
    'undoStatusChange(undoToast)',
  ]) {
    assert(myLeads.includes(preservedHook), `My Leads behavior hook changed or disappeared: ${preservedHook}`)
  }
  for (const preservedHook of [
    'runSweep({ service, icp, market })',
    'enrichSweep({ leads, maxScrapes: 50 })',
    'saveSweepLeads({',
    'exportSweepCsv(leads)',
    'exportSweepJson(leads)',
  ]) {
    assert(sweep.includes(preservedHook), `Fetch behavior hook changed or disappeared: ${preservedHook}`)
  }
  for (const preservedHook of [
    'updateLeadOutcome({',
    'opportunityId,',
    'outcomeNotes: buildPayload(notes)',
  ]) {
    assert(outcomeForm.includes(preservedHook), `Outcome mutation payload contract changed or disappeared: ${preservedHook}`)
  }

  // Task 3: Chat and Map presentation with behavior-bearing hooks held stable.
  assert(chatClient.includes('data-fetchi-chat-v5'), 'Chat must declare its v5 surface contract')
  assert(chatClient.includes('data-fetchi-chat-composer-v5'), 'Chat must declare its v5 composer contract')
  assert(
    chatClient.includes('placeholder="Ask Fetchi something…"') &&
      !chatClient.includes('Ask ツ something…'),
    'Chat composer placeholder must use plain Fetchi product copy without improvised glyphs',
  )
  assert(
    chatClient.includes('font-fetchi text-h1 tracking-[-0.02em] text-text') &&
      !chatClient.includes('text-h1 tracking-[-0.02em] text-text lg:text-[32px]'),
    'Chat must keep the canonical compact authenticated v5 H1 at every viewport',
  )
  assert(chatClient.includes('bg-fetchiAccent') && chatClient.includes('focus-within:border-fetchiAccent'), 'Chat send and composer focus must use indigo')
  assert(chatClient.includes('<FetchiAvatar size={36}'), 'Chat header must retain the authentic Fetchi avatar')
  assert(chatBubble.includes('data-fetchi-chat-bubble-v5'), 'Chat bubbles must declare the v5 message-surface contract')
  assert(chatBubble.includes('bg-fetchiOverlay') && chatBubble.includes('bg-[var(--fetchi-accent-subtle)]'), 'Chat bubbles must use v5 overlay and indigo-tinted user surfaces')
  assert(!/\bcoral\b/i.test(`${chatClient}\n${chatBubble}`), 'Coral must not own Chat product interactions')
  for (const preservedHook of [
    'const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)',
    'const text = input.trim()',
    'if (!text || pending) return',
    'setMessages(prev => [...prev, userMsg])',
    'const res = await sendChatMessage(text)',
    "if (e.key === 'Enter' && !e.shiftKey)",
  ]) {
    assert(chatClient.includes(preservedHook), `Chat submission contract changed or disappeared: ${preservedHook}`)
  }
  assert(chatClient.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches"), 'Chat auto-scroll must inspect the reduced-motion preference')
  assert(chatClient.includes("behavior: reduceMotion ? 'auto' : 'smooth'"), 'Chat auto-scroll must avoid smooth motion when reduction is requested')

  const mapPresentation = [
    mapFilterSheet,
    mapLeadRail,
    mapRailFilterPopover,
    mapShell,
    mapTopBar,
    selectedLeadSheet,
  ].join('\n')
  const chatAndMapPresentation = `${chatClient}\n${chatBubble}\n${mapPresentation}`
  assert(!/\bfont-outfit\b/.test(chatAndMapPresentation), 'Authenticated Chat and Map surfaces must use Inter without explicit Outfit overrides')
  assert(chatAndMapPresentation.includes('font-fetchi'), 'Authenticated Chat and Map surfaces must explicitly retain the Inter utility contract')
  assert(mapShell.includes('data-fetchi-map-v5'), 'Map shell must declare its v5 chrome contract')
  const mapFallbackSource = mapShell.split('function CenteredState')[1] ?? ''
  assert(
    mapFallbackSource.includes('max-w-[420px] rounded-xl border') &&
      !mapFallbackSource.includes('max-w-[420px] rounded-2xl border'),
    'Shared centered map fallbacks must use the canonical 12px card radius',
  )
  assert(
    mapFallbackSource.includes('font-fetchi text-h1 font-semibold') &&
      !mapFallbackSource.includes('font-fetchi text-[30px] font-semibold'),
    'Shared centered map fallbacks must use the canonical compact authenticated v5 H1',
  )
  assert(mapLeadRail.includes("selected && 'fetchi-selected-row'"), 'Selected map rail rows must use the indigo tint and 2px accent-bar contract')
  assert(!mapLeadRail.includes("selected ? 'bg-ok/"), 'Selected map rail rows must not use success green as selection')
  assert(mapLeadRail.includes('text-evidence') && selectedLeadSheet.includes('text-evidence'), 'Map evidence actions must retain evidence-blue ownership')
  assert(mapTopBar.includes('bg-fetchiAccent') && mapFilterSheet.includes('bg-fetchiAccent') && mapRailFilterPopover.includes('bg-fetchiAccent'), 'Map active and apply controls must use indigo')
  assert(mapPresentation.includes('focus-visible:ring-fetchiAccent'), 'Map controls must expose indigo focus rings')
  assert(!/\bcoral\b/i.test(mapPresentation), 'Coral must not own Map product interactions')
  assert(!/text-\[(?:10\.5|11|11\.5)px\][^'"`]*text-textMuted/.test(mapLeadRail) && mapLeadRail.includes('text-text2'), 'Map rail normal text must use the AA-capable secondary text token on the v5 near-black surface')
  for (const { file, marker, label } of [
    { file: mapLeadRail, marker: 'data-fetchi-map-rail-search-clear-target', label: 'Map rail search clear' },
    { file: mapLeadRail, marker: 'data-fetchi-map-rail-filter-target', label: 'Map rail filter trigger' },
    { file: mapTopBar, marker: 'data-fetchi-map-mobile-search-clear-target', label: 'Mobile map search clear' },
  ]) {
    const markerIndex = file.indexOf(marker)
    assert.notEqual(markerIndex, -1, `${label} must expose its touch-target contract`)
    const controlSource = file.slice(markerIndex, markerIndex + 700)
    assert(/\bh-11\b/.test(controlSource) && /\bw-11\b/.test(controlSource), `${label} must provide a 44px by 44px interactive target`)
  }
  assert.equal((mapLeadRail.match(/onClick=\{\(\) => onQueryChange\(''\)\}/g) ?? []).length, 1, 'Map rail search-clear handler must remain exact')
  assert(mapLeadRail.includes('onClick={() => onFiltersOpenChange(!filtersOpen)}'), 'Map rail filter-trigger handler must remain exact')
  assert.equal((mapTopBar.match(/onClick=\{\(\) => onQueryChange\(''\)\}/g) ?? []).length, 1, 'Mobile map search-clear handler must remain exact')
  assert(mapTopBar.includes('onClick={onOpenFilters}'), 'Mobile map filter-trigger handler must remain exact')
  for (const lifecycleClass of ['LIFECYCLE_PIN_CLASSES', 'LIFECYCLE_LABELS']) {
    assert(mapLeadRail.includes(lifecycleClass) && selectedLeadSheet.includes(lifecycleClass), `Map lifecycle carrier contract changed or disappeared: ${lifecycleClass}`)
  }
  for (const preservedHook of [
    'const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)',
    'filterSavedLeadsForMap(mappableLeads, filters, query)',
    '<MapCanvas',
    'selectedLeadId={selectedLeadId}',
    'onSelectLead={setSelectedLeadId}',
    'onReady={() => {',
    'onError={setMapFailureReason}',
    'fitKey={fitKey}',
    "window.matchMedia('(min-width: 1024px)')",
  ]) {
    assert(mapShell.includes(preservedHook), `Map behavior contract changed or disappeared: ${preservedHook}`)
  }

  const authenticatedSheetFiles = lines(git(
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    'app/app',
    'components/app',
  ))
    .filter(path => path.endsWith('.tsx') && !path.startsWith('app/app/onboarding/'))
    .filter(path => source(path).includes('<SheetContent'))
    .sort()
  assert.deepEqual(authenticatedSheetFiles, [
    'components/app/LeadActionSheet.tsx',
    'components/app/MobileHeader.tsx',
    'components/app/map/MapFilterSheet.tsx',
  ], 'Authenticated SheetContent inventory changed; reduced-motion coverage must be reviewed')
  for (const path of authenticatedSheetFiles) {
    assert(source(path).includes('data-fetchi-reduced-motion-sheet'), `${path} must mark its SheetContent for scoped reduced-motion handling`)
  }
  const reducedMotionStyles = globals.split('@media (prefers-reduced-motion: reduce)')[1] ?? ''
  assert(reducedMotionStyles.includes('[data-fetchi-reduced-motion-sheet]'), 'Authenticated SheetContent must have a scoped reduced-motion rule')
  assert(reducedMotionStyles.includes(':has(+ [data-fetchi-reduced-motion-sheet])'), 'Authenticated Sheet overlay siblings must have a scoped reduced-motion rule')
  assert(reducedMotionStyles.includes('animation: none !important'), 'Authenticated Sheet content and overlays must suppress inherited animations')

  // Task 4: Today's Run presentation with queue, gesture, keyboard, and outcome
  // behavior held stable.
  const todayPresentation = [
    afterAddConfirmation,
    evidenceCardBack,
    passReasonPanel,
    runCompletion,
    runProgress,
    todayRunCard,
    todayRunDeck,
    todayRunPage,
  ].join('\n')
  assert(todayRunPage.includes('data-fetchi-today-v5'), "Today's Run must declare its v5 surface contract")
  assert(todayRunCard.includes('data-fetchi-today-card-v5'), "Today's Run card must declare its v5 card contract")
  assert(evidenceCardBack.includes('data-fetchi-evidence-card-v5'), 'Evidence card back must declare its v5 surface contract')
  assert(passReasonPanel.includes('data-fetchi-pass-panel-v5'), 'Pass-reason state must declare its v5 surface contract')
  assert(todayPresentation.includes('rounded-xl border border-text/10 bg-raised'), "Today's Run cards must use v5 12px radii, quiet hairlines, and cool raised surfaces")
  assert(todayPresentation.includes('bg-fetchiAccent') && runProgress.includes("i < reviewed ? 'bg-fetchiAccent'"), 'Neutral Today interactions and progress must use indigo')
  assert(todayPresentation.includes('focus-visible:ring-fetchiAccent'), "Today's Run controls must expose indigo focus-visible geometry")
  assert(todayPresentation.includes('bg-evidence') && todayPresentation.includes('text-evidence'), 'Evidence and verification must retain evidence-blue ownership')
  assert(todayPresentation.includes('bg-semanticGreen') && todayPresentation.includes('bg-semanticRed'), 'Saved success and pass/destructive contexts must use distinct green and red semantics')
  assert(passReasonPanel.includes('bg-semanticRed px-4 text-[14px] font-semibold text-[#08090A]'), 'Pass submission must use near-black text on semantic red for normal-text AA contrast')
  assert(evidenceCardBack.includes("ev.kind === 'permit'") && evidenceCardBack.includes('bg-parch'), 'Parchment must be confined to formal permit evidence records')
  assert(todayRunCard.includes('CloudLightning') && todayRunCard.includes('Building2') && todayRunCard.includes('FileCheck2'), 'Evidence categories must use real Lucide glyphs')
  assert(evidenceCardBack.includes('CloudLightning') && evidenceCardBack.includes('Building2') && evidenceCardBack.includes('FileCheck2'), 'Evidence-card glyphs must use real Lucide components')
  assert(!todayPresentation.includes('KIND_GLYPH'), "Today's Run must not use text glyphs for evidence icons")
  assert(!/font-outfit|bg-white|bg-coral|text-coral|border-coral/.test(todayPresentation), "Today's Run must not retain legacy typography, white slabs, or coral product UI")
  assert(!/\bbg-ok\b|\btext-ok\b/.test(todayPresentation), "Today's Run must use explicit semantic green ownership rather than the legacy ok alias")
  assert(todayPresentation.includes('min-h-[44px]'), "Today's Run interactive controls must preserve 44px touch targets")
  assert(
    runCompletion.includes('font-fetchi text-h1 font-semibold') &&
      !runCompletion.includes('text-[26px] font-semibold leading-tight tracking-[-0.02em] lg:text-[30px]'),
    'Run completion must use the canonical compact authenticated v5 heading',
  )
  const openLeadLinkIndex = todayRunCard.indexOf('href={`/app/leads/${card.opportunityId}`}')
  assert.notEqual(openLeadLinkIndex, -1, "Today's Run Open lead navigation must remain present")
  const openLeadLinkSource = todayRunCard.slice(openLeadLinkIndex, openLeadLinkIndex + 900)
  assert(openLeadLinkSource.includes('text-fetchiAccent'), "Today's Run Open lead navigation must use indigo, not evidence blue")
  assert(openLeadLinkSource.includes('hover:text-[var(--fetchi-accent-hover)]') && openLeadLinkSource.includes('active:text-[var(--fetchi-accent-press)]'), "Today's Run Open lead navigation must expose the approved indigo hover and press states")
  assert(openLeadLinkSource.includes('focus-visible:ring-fetchiAccent'), "Today's Run Open lead navigation must retain its indigo focus ring")
  for (const { file, label } of [
    { file: afterAddConfirmation, label: 'After-add confirmation' },
    { file: passReasonPanel, label: 'Pass-reason panel' },
    { file: runCompletion, label: 'Run completion' },
  ]) {
    const panelRootIndex = file.indexOf('data-fetchi-flat-panel-v5')
    assert.notEqual(panelRootIndex, -1, `${label} must declare the flat v5 panel contract`)
    const panelRootSource = file.slice(panelRootIndex, panelRootIndex + 500)
    assert(panelRootSource.includes('rounded-xl border border-text/10 bg-raised'), `${label} must use the v5 raised surface and quiet hairline`)
    assert(!panelRootSource.includes('shadow-'), `${label} must remain flat at rest without a drop shadow`)
  }
  for (const label of [
    'Undo unavailable',
    'Stop run',
    'Next lead',
    'Submit & pass',
    'Back to chat',
    'See My Leads',
    'Open lead',
    'Swipe left to pass · right to add',
  ]) {
    assert(todayPresentation.includes(label), `Today action/control label changed or disappeared: ${label}`)
  }
  for (const preservedHook of [
    "status: 'saved'",
    "status: 'skipped'",
    "if (e.key === 'ArrowLeft')",
    "else if (e.key === 'ArrowRight')",
    "else if (e.key === 'Enter' && current && !isDemo)",
    "else if (e.key === 'Escape')",
    'setPointerCapture?.(e.pointerId)',
    'if (Math.abs(dx) < SWIPE_COMMIT_PX)',
    'onPointerDown={onPointerDown}',
    'onPointerMove={onPointerMove}',
    'onPointerUp={onPointerUp}',
    'onPointerCancel={onPointerUp}',
  ]) {
    assert(todayRunPage.includes(preservedHook), `Today queue/control behavior changed or disappeared: ${preservedHook}`)
  }

  // Task 5: customer Settings presentation with profile payload, preference
  // displays, billing truth branches, usage math, and links held stable.
  const settingsPresentation = [
    settingsHome,
    profilePage,
    profileForm,
    signalPreferences,
    notifications,
    billing,
    usage,
    sectionCard,
    settingsGroup,
  ].join('\n')
  assert(settingsHome.includes('data-fetchi-settings-v5'), 'Settings home must declare its v5 surface contract')
  assert(settingsHome.includes('data-fetchi-settings-row-v5'), 'Navigable Settings rows must declare the v5 selectable-row contract')
  assert(settingsHome.includes('hover:bg-fetchiOverlayHover') && settingsHome.includes('focus-visible:ring-fetchiAccent'), 'Settings links must expose quiet hover and indigo focus states')
  const settingsPlanLink = settingsHome.split('data-fetchi-settings-plan-link-v5')[1]?.slice(0, 500) ?? ''
  assert(settingsPlanLink.includes('min-h-[44px]') && !settingsPlanLink.includes('sm:min-h-[28px]'), 'Compact Settings links must preserve the 44px mobile-shell touch target through the lg breakpoint')
  const mobileShellTargets = `${settingsHome}\n${profileForm}\n${usage}\n${signOutControl}`
  for (const forbiddenResponsiveShrink of ['sm:h-10', 'sm:min-h-10', 'sm:min-h-[28px]']) {
    assert(!mobileShellTargets.includes(forbiddenResponsiveShrink), `Mobile-shell controls must not shrink below 44px before lg: ${forbiddenResponsiveShrink}`)
  }
  assert(signOutControl.includes('min-h-[44px]') && !signOutControl.includes('min-h-[24px]'), 'The mobile drawer sign-out control must preserve a 44px target')
  assert(sectionCard.includes("density?: 'default' | 'compact'") && sectionCard.includes("density = 'default'"), 'SectionCard must keep an explicit default geometry and opt-in compact density')
  for (const unchangedDefaultGeometry of [
    'px-5 lg:px-6 pt-5 lg:pt-6 pb-3',
    'text-[11px] font-bold uppercase tracking-[1px] text-text/45 mb-1.5',
    'font-fetchi text-h3 tracking-[-0.02em] text-text',
    'px-5 lg:px-6 pb-5 lg:pb-6',
  ]) {
    assert(sectionCard.includes(unchangedDefaultGeometry), `SectionCard default geometry changed or disappeared: ${unchangedDefaultGeometry}`)
  }
  assert(sectionCard.includes('data-fetchi-section-card-v5') && sectionCard.includes('rounded-xl'), 'Settings cards must use the v5 12px card contract')
  assert(settingsGroup.includes('data-fetchi-settings-group-v5') && settingsGroup.includes('data-fetchi-settings-row-v5'), 'Shared Settings grouping and rows must expose their v5 contracts')
  assert(settingsGroup.includes("mode?: 'form' | 'rows'") && settingsGroup.includes("mode = 'form'"), 'SettingsGroup must expose explicit form and row-list composition modes')
  assert(settingsGroup.includes("bodyClassName={mode === 'rows' ? 'space-y-0' : 'space-y-4'}"), 'SettingsGroup row-list mode must remove form spacing so dividers remain contiguous')
  assert(settingsGroup.includes('density="compact"'), 'SettingsGroup must opt into compact SectionCard geometry without changing shared defaults')
  assert(settingsGroup.includes('border-t border-text/10 first:border-t-0'), 'Settings rows must use quiet dividers instead of nested cards')
  assert.equal((notifications.match(/mode="rows"/g) ?? []).length, 2, 'Both notification row groups must use contiguous row-list mode')
  assert.equal((billing.match(/mode="rows"/g) ?? []).length, 1, 'The billing row group must use contiguous row-list mode')
  assert.equal((profileForm.match(/mode="rows"/g) ?? []).length, 0, 'Business Profile form groups must retain form spacing')
  assert.equal((billing.match(/<SectionCard\s+density="compact"/g) ?? []).length, 3, 'Direct billing cards must opt into compact Settings geometry')
  assert.equal((usage.match(/<SectionCard\s+density="compact"/g) ?? []).length, 8, 'Direct usage cards must opt into compact Settings geometry')

  assert(profilePage.includes('data-fetchi-profile-v5'), 'Business Profile must declare its v5 surface contract')
  assert(profileForm.includes("import { FetchiButton } from '@/components/fetchi-ui/button'"), 'Business Profile must use the namespaced v5 button')
  assert(profileForm.includes("import { FetchiInput } from '@/components/fetchi-ui/input'"), 'Business Profile must use the namespaced v5 input')
  assert(profileForm.includes("import { FetchiTextarea } from '@/components/fetchi-ui/textarea'"), 'Business Profile must use the namespaced v5 textarea')
  assert(profileForm.includes('data-fetchi-select-v5') && profileForm.includes('accent-fetchiAccent'), 'Business Profile native select and range controls must use indigo interaction states')
  assert(profileForm.includes('text-semanticGreen') && profileForm.includes('text-semanticRed'), 'Business Profile must keep success and error feedback semantically distinct')
  const profileFeedback = profileForm.split('data-fetchi-profile-feedback-v5')[1]?.slice(0, 500) ?? ''
  assert(profileFeedback.includes("role={err ? 'alert' : 'status'}"), 'Business Profile errors must use assertive alert semantics while success uses polite status semantics')
  assert(!profileFeedback.includes('aria-live'), 'Business Profile feedback must rely on the alert/status implicit live-region behavior without overriding errors to polite')
  for (const labelAndControl of [
    'label="Business name" htmlFor="biz"',
    'id="biz"',
    'label="Service vertical" htmlFor="vertical"',
    'id="vertical"',
    'label="City" htmlFor="city"',
    'id="city"',
    'label="State" htmlFor="state"',
    'id="state"',
  ]) {
    assert(profileForm.includes(labelAndControl), `Business Profile native label/control wiring changed or disappeared: ${labelAndControl}`)
  }
  for (const preservedHook of [
    'await saveBusinessProfile({',
    'businessName,',
    'vertical,',
    'serviceDescription,',
    'locationCity: city,',
    'locationState: stateCode,',
    'locationRadiusMiles: radius,',
    'idealCustomerDescription: ideal,',
    'website: website.trim() || null,',
  ]) {
    assert(profileForm.includes(preservedHook), `Business Profile mutation payload changed or disappeared: ${preservedHook}`)
  }

  assert(signalPreferences.includes('data-fetchi-signal-settings-readonly-v5'), 'Signal sensitivity must visibly identify the current read-only settings')
  assert(signalPreferences.includes('Current workspace settings') && signalPreferences.includes('Read-only'), 'Signal sensitivity must include explicit current/read-only language')
  assert(signalPreferences.includes("selected && 'fetchi-selected-row'"), 'Selected signal sensitivity must retain the indigo tint and 2px bar')
  assert(signalPreferences.includes('data-fetchi-settings-state-v5'), 'Signal watch states must use a non-control status treatment')
  assert(!/role="(?:radio|radiogroup|switch)"|aria-checked=/.test(signalPreferences), 'Read-only signal settings must not expose actionable radio or switch semantics')
  assert(notifications.includes('data-fetchi-notifications-v5') && notifications.includes('data-fetchi-settings-state-v5'), 'Notifications must expose a static read-only state contract')
  assert(!/role="switch"|aria-checked=/.test(notifications), 'Read-only notification states must not expose actionable switch semantics')
  for (const notificationLabel of ['Daily digest', 'Lead alerts', 'Lead reminders', 'Weekly summary', 'Usage limit warnings', 'Digest delivery time']) {
    assert(notifications.includes(notificationLabel), `Notification content changed or disappeared: ${notificationLabel}`)
  }

  assert(billing.includes('data-fetchi-billing-v5'), 'Plan & Billing must declare its v5 truth-state surface')
  assert(billing.includes('text-semanticGreen') && billing.includes('text-semanticAmber'), 'Billing must use green success and amber warning ownership')
  assert(usage.includes('data-fetchi-usage-v5'), 'Usage must declare its v5 truth-state surface')
  assert(usage.includes("atLimit ? 'bg-semanticAmber' : 'bg-fetchiAccent'"), 'Usage meter must reserve amber for limits and use indigo for neutral progress')
  assert(usage.includes("import { fetchiButtonVariants } from '@/components/fetchi-ui/button'"), 'Usage CTAs must use the namespaced indigo button contract')
  for (const truthHook of [
    'if (!sub)',
    "if (status === 'past_due')",
    "if (status === 'active')",
    "if (limit === null || limit === undefined)",
    'const remaining = Math.max(cap - used, 0)',
    'const atLimit = remaining === 0',
    'const resetAt = formatDate(sub.opportunitiesResetAt)',
  ]) {
    assert(billing.includes(truthHook) || usage.includes(truthHook), `Billing/usage truth branch changed or disappeared: ${truthHook}`)
  }
  for (const truthfulCopy of [
    'Choose a capped plan to start receiving opportunities.',
    'Fetchi does not offer free trials or unlimited plans.',
    'Custom limit pending',
    'Reset date pending',
  ]) {
    assert(settingsPresentation.includes(truthfulCopy), `Billing/usage truth copy changed or disappeared: ${truthfulCopy}`)
  }
  for (const settingsHref of [
    '/app/settings/profile',
    '/app/settings/signals',
    '/app/settings/notifications',
    '/app/settings/billing',
    '/app/settings/usage',
  ]) {
    assert(settingsPresentation.includes(settingsHref), `Settings link changed or disappeared: ${settingsHref}`)
  }
  assert(!/font-outfit|rounded-2xl|shadow-fetchi|focus[^\n]*blue|accent-ok|text-coral|bg-coral/.test(settingsPresentation), 'Settings must not retain legacy typography, oversized cards, shadows, evidence-blue focus, green interactions, or coral product UI')
  assert(!/\bbg-ok\b|\btext-ok\b/.test(settingsPresentation), 'Settings must use explicit semantic roles rather than the legacy ok alias')

  const animatedAuthenticatedSources = [
    ['SweepClient', sweep],
    ['MyLeadsView', myLeads],
    ['ChatBubble', chatBubble],
    ['MapLeadRail', mapLeadRail],
    ['SelectedLeadSheet', selectedLeadSheet],
    ['LoadingState', loadingState],
  ] as const
  for (const [label, file] of animatedAuthenticatedSources) {
    const unguardedAnimationLines = file
      .split('\n')
      .filter(line => /animate-(?:spin|bounce|in|out)/.test(line) && !line.includes('motion-reduce:animate-none'))
    assert.deepEqual(unguardedAnimationLines, [], `${label} animations must expose a reduced-motion fallback`)
  }
  assert(chatBubble.includes('role="status"') && chatBubble.includes('aria-live="polite"') && chatBubble.includes('Fetchi is typing'), 'Chat pending feedback must expose a polite text status')

  const allowed = approvedFence(plan)
  allowed.add(signalBarsPath)
  allowed.add(leadActionSheetPath)
  const changed = changedFiles()
  const outsideFence = changed.filter(path => !allowed.has(path))
  assert.deepEqual(outsideFence, [], `Changed files escaped the CP26C fence: ${outsideFence.join(', ')}`)

  const protectedPatterns = [
    /^(?:db\/|drizzle\.config\.ts$)/,
    /^(?:lib\/runtime\/|lib\/providers\/)/,
    /^(?:app\/api\/|middleware\.ts$)/,
    /(?:^|\/)actions\.ts$/,
    /^(?:package\.json|package-lock\.json)$/,
    /^(?:components\/ui\/)/,
    /^(?:replit\.md|FETCHI_CLAUDE_CODE_BRIEF\.md)$/,
    /^(?:app\/app\/onboarding\/|app\/admin\/)/,
  ]
  const protectedChanges = changed.filter(path => protectedPatterns.some(pattern => pattern.test(path)))
  assert.deepEqual(protectedChanges, [], `Protected paths changed: ${protectedChanges.join(', ')}`)

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp26c_authenticated_design_migration_task_5',
    routeCount: currentRoutes.length,
    routesChanged: false,
    authenticatedOnlyV5: true,
    exactDarkAndLightAliases: true,
    interScopedToAuthenticatedProduct: true,
    shellGeometryLocked: true,
    touchTargetsLocked: true,
    indigoInteractionOwnership: true,
    semanticAndLifecycleRolesDistinct: true,
    coralBrandOnly: true,
    fetchAndLeadSurfacesV5: true,
    lifecycleAndEvidenceOwnershipLocked: true,
    signalNotCheckedTruthful: true,
    mailboxBehaviorHooksPreserved: true,
    chatAndMapSurfacesV5: true,
    chatSubmissionHooksPreserved: true,
    mapBehaviorHooksPreserved: true,
    todayRunSurfacesV5: true,
    todayRunBehaviorHooksPreserved: true,
    settingsSurfacesV5: true,
    settingsProfilePayloadPreserved: true,
    settingsBillingAndUsageTruthPreserved: true,
    changedFilesAllowedOnly: true,
    protectedPathsUnchanged: true,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
