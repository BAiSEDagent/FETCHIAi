'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search, ArrowUpDown, X, ArrowLeft } from 'lucide-react'
import { LeadCard, type LeadCardSignalType, type FallbackState } from '@/components/app/LeadCard'
import { cn } from '@/lib/utils'

export type LeadRow = {
  id: string
  href: string
  businessName: string
  signalLabel: string
  signalToken: string | null
  signalType: LeadCardSignalType
  score: number
  whyNow: string | null
  status: string
  location: string | null
  ageLabel: string | null
  createdAtMs: number
  contactName: string | null
  contactConfidence: number | null
  verticalFitLabel?: string | null
  freshnessLabel?: string | null
  fallbackState?: FallbackState | null
}

type SortKey = 'score' | 'freshness' | 'recent' | 'name'

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'saved', label: 'Saved' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'responded', label: 'Responded' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'expired', label: 'Expired' },
]

const SORT_OPTIONS: Array<{ key: SortKey; title: string; sub: string }> = [
  { key: 'score', title: 'Score (high to low)', sub: 'Recommended' },
  { key: 'freshness', title: 'Freshness', sub: 'Newest signal first' },
  { key: 'recent', title: 'Recently added', sub: 'When Fetchi found it' },
  { key: 'name', title: 'Business name', sub: 'A → Z' },
]

const EMPTY_STATE_COPY: Record<string, { title: string; body: string }> = {
  new: {
    title: 'No new leads',
    body: 'Fresh signals will appear here as Fetchi scouts the next run.',
  },
  saved: {
    title: 'Nothing saved yet',
    body: 'Save a lead from any card and it will land here for later.',
  },
  contacted: {
    title: 'No contacted leads',
    body: 'When you send outreach, the lead moves here automatically.',
  },
  responded: {
    title: 'No replies yet',
    body: 'Once a prospect responds, the conversation surfaces here.',
  },
  won: {
    title: 'No wins logged',
    body: 'Mark a lead Won when you book the job — Fetchi learns from it.',
  },
  lost: {
    title: 'Nothing lost yet',
    body: 'When a lead doesn\u2019t close, mark it Lost. Fetchi uses that to stop surfacing similar ones.',
  },
  skipped: {
    title: 'No skipped leads',
    body: 'Skipped leads land here so you can revisit them later.',
  },
  expired: {
    title: 'No expired leads',
    body: 'Leads time-box automatically when the signal goes stale.',
  },
}

type Props = {
  leads: LeadRow[]
  newTodayCount: number
  todaysRunCount: number
  isDemoData?: boolean
}

export function MyLeadsView({
  leads,
  newTodayCount,
  todaysRunCount,
  isDemoData = false,
}: Props) {
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('score')
  const [sortOpen, setSortOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const sortTitleId = useId()
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null)
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!sortOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeSort()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sortOpen])

  function closeSort() {
    setSortOpen(false)
    requestAnimationFrame(() => sortTriggerRef.current?.focus())
  }

  function closeMobileSearch() {
    setMobileSearch(false)
    setSearch('')
    requestAnimationFrame(() => searchTriggerRef.current?.focus())
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: leads.length }
    for (const tab of STATUS_TABS) if (tab.key !== 'all') map[tab.key] = 0
    for (const lead of leads) {
      map[lead.status] = (map[lead.status] ?? 0) + 1
    }
    return map
  }, [leads])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let next = leads.filter(lead => {
      if (activeStatus !== 'all' && lead.status !== activeStatus) return false
      if (!q) return true
      return (
        lead.businessName.toLowerCase().includes(q) ||
        (lead.location ?? '').toLowerCase().includes(q) ||
        lead.signalLabel.toLowerCase().includes(q) ||
        (lead.whyNow ?? '').toLowerCase().includes(q)
      )
    })
    next = [...next].sort((a, b) => {
      switch (sort) {
        case 'score':
          return b.score - a.score || b.createdAtMs - a.createdAtMs
        case 'freshness':
        case 'recent':
          return b.createdAtMs - a.createdAtMs
        case 'name':
          return a.businessName.localeCompare(b.businessName)
      }
    })
    return next
  }, [leads, activeStatus, search, sort])

  const showingSearchResults = mobileSearch && search.trim().length > 0
  const opportunityCount = leads.length
  const headerSubtitle =
    opportunityCount === 0
      ? 'No opportunities yet'
      : `${opportunityCount} opportunit${opportunityCount === 1 ? 'y' : 'ies'} · ${newTodayCount} new today`

  // ─── Mobile search takeover ──────────────────────────────────────────────
  if (mobileSearch) {
    return (
      <div className="lg:hidden flex flex-col min-h-[calc(100dvh-0px)]">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={closeMobileSearch}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-text/[0.06]"
            aria-label="Close search"
          >
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-full bg-surface border border-text/10 px-4 h-10">
            <Search className="h-4 w-4 text-text/45" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  closeMobileSearch()
                }
              }}
              placeholder="Search leads"
              aria-label="Search leads"
              className="flex-1 bg-transparent outline-none text-[14px] text-text placeholder:text-text/40"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                <X className="h-4 w-4 text-text/45" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={closeMobileSearch}
            className="text-[13px] font-semibold text-text/70 hover:text-text px-1"
          >
            Cancel
          </button>
        </div>

        <div className="px-4 pb-6 flex flex-col gap-3">
          {showingSearchResults && (
            <div className="text-[12px] text-text/55">
              {filtered.length} result{filtered.length === 1 ? '' : 's'} matching{' '}
              <span className="font-semibold text-text/75">
                &ldquo;{search.trim()}&rdquo;
              </span>
            </div>
          )}
          {filtered.map(lead => (
            <LeadCard
              key={lead.id}
              href={lead.href}
              businessName={lead.businessName}
              signalLabel={lead.signalLabel}
              signalToken={lead.signalToken}
              signalType={lead.signalType}
              score={lead.score}
              whyNow={lead.whyNow}
              status={lead.status}
              location={lead.location}
              ageLabel={lead.ageLabel}
              contactName={lead.contactName}
              contactConfidence={lead.contactConfidence}
              verticalFitLabel={lead.verticalFitLabel}
              freshnessLabel={lead.freshnessLabel}
              fallbackState={lead.fallbackState}
              variant="list"
            />
          ))}
          {showingSearchResults && filtered.length === 0 && (
            <div className="rounded-2xl bg-surface p-6 text-center mt-4">
              <div className="text-[14px] font-semibold text-text">No matches</div>
              <div className="text-[12.5px] text-text/60 mt-1">
                Try a different business name, city, or signal.
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {isDemoData && (
        <div className="mx-4 lg:mx-7 mt-3 rounded-xl bg-mustard/10 border border-mustard/30 text-mustard text-[12px] px-3 py-2">
          Development preview — showing sample leads because this workspace
          has no opportunities yet. Real data appears here automatically.
        </div>
      )}

      {/* Header */}
      <div className="px-4 lg:px-7 pt-5 lg:pt-8 pb-4 lg:pb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-outfit text-[28px] lg:text-[34px] font-extrabold text-text leading-tight">
            My Leads
          </h1>
          <div className="mt-1 text-[12.5px] lg:text-[13.5px] text-text/55">
            {headerSubtitle}
          </div>
        </div>
        {/* Desktop search + sort */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-surface border border-text/10 px-3.5 h-10 w-[280px]">
            <Search className="h-4 w-4 text-text/45" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads"
              className="flex-1 bg-transparent outline-none text-[13.5px] text-text placeholder:text-text/40"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                <X className="h-4 w-4 text-text/45" />
              </button>
            )}
          </div>
          <SortControl sort={sort} onChange={setSort} open={sortOpen} setOpen={setSortOpen} />
        </div>
        {/* Mobile icons */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            ref={searchTriggerRef}
            type="button"
            onClick={() => setMobileSearch(true)}
            className="h-10 w-10 rounded-full bg-surface border border-text/8 flex items-center justify-center text-text/70 hover:bg-raised hover:text-text transition-colors active:scale-95"
            aria-label="Search leads"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            ref={sortTriggerRef}
            type="button"
            onClick={() => setSortOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sortOpen}
            className="h-10 w-10 rounded-full bg-surface border border-text/8 flex items-center justify-center text-text/70 hover:bg-raised hover:text-text transition-colors active:scale-95"
            aria-label="Sort leads"
          >
            <ArrowUpDown className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Today's Run CTA — neutral raised surface with coral mono digit (v2.1 spec) */}
      {todaysRunCount > 0 && (
        <div className="px-4 lg:px-7 mb-4">
          <Link
            href="/app/today"
            className="group flex items-center gap-3 rounded-2xl bg-raised text-text p-3.5 lg:p-4 border border-text/8 hover:bg-surface transition-colors"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-coral/15 text-coral font-outfit text-[18px] font-extrabold flex items-center justify-center tabular-nums">
              {todaysRunCount}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] lg:text-[14px] font-bold leading-tight">
                Today&rsquo;s Run · {todaysRunCount} leads queued
              </div>
              <div className="text-[12px] text-text/60 mt-0.5">
                Review today&rsquo;s best opportunities
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text/55 group-hover:text-text transition-colors flex-shrink-0" />
          </Link>
        </div>
      )}

      {/* Chip row */}
      <div className="relative px-4 lg:px-7 mb-4 -mx-1 lg:mx-0">
        <div
          className="flex items-center gap-2 overflow-x-auto pl-1 pr-6 lg:px-1 lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {STATUS_TABS.map(tab => {
            const count = counts[tab.key] ?? 0
            const active = activeStatus === tab.key
            const dim = !active && count === 0 && tab.key !== 'all'
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatus(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                  active
                    ? 'bg-text text-bg'
                    : dim
                      ? 'bg-surface/60 text-text/40 hover:text-text/60'
                      : 'bg-surface text-text/70 hover:text-text border border-text/8',
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[11px] tabular-nums',
                    active ? 'text-bg/70' : 'text-text/45',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <div
          aria-hidden
          className="lg:hidden pointer-events-none absolute top-0 bottom-0 right-0 w-10 bg-gradient-to-l from-bg via-bg/85 to-transparent"
        />
      </div>

      {/* Card list */}
      <div className="px-4 lg:px-7 pb-24 lg:pb-10">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                href={lead.href}
                businessName={lead.businessName}
                signalLabel={lead.signalLabel}
                signalToken={lead.signalToken}
                signalType={lead.signalType}
                score={lead.score}
                whyNow={lead.whyNow}
                status={lead.status}
                location={lead.location}
                ageLabel={lead.ageLabel}
                contactName={lead.contactName}
                contactConfidence={lead.contactConfidence}
                verticalFitLabel={lead.verticalFitLabel}
                freshnessLabel={lead.freshnessLabel}
                fallbackState={lead.fallbackState}
                variant="list"
              />
            ))}
          </div>
        ) : (
          <EmptyFilterState
            statusKey={activeStatus}
            hasSearch={Boolean(search.trim())}
            onReset={() => {
              setActiveStatus('all')
              setSearch('')
            }}
          />
        )}
      </div>

      {/* Mobile sort sheet */}
      {sortOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close sort"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSort}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={sortTitleId}
            className="absolute inset-x-0 bottom-0 bg-surface rounded-t-3xl pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] px-5 shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.5)]"
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-text/20 mb-4" />
            <div className="flex items-center justify-between mb-3">
              <h3 id={sortTitleId} className="font-outfit text-[18px] font-bold text-text">
                Sort leads
              </h3>
              <button
                type="button"
                onClick={() => setSort('score')}
                className="text-[13px] font-semibold text-text/70 hover:text-text"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-col">
              {SORT_OPTIONS.map(option => {
                const selected = option.key === sort
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSort(option.key)}
                    className={cn(
                      'flex items-start gap-3 py-3 text-left rounded-xl px-3 -mx-3 transition-colors',
                      selected ? 'bg-raised' : 'hover:bg-raised/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        selected ? 'border-ok' : 'border-text/25',
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-ok" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-text">
                        {option.title}
                      </div>
                      <div className="text-[12px] text-text/55">{option.sub}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              autoFocus
              onClick={closeSort}
              className="mt-4 w-full h-12 rounded-full bg-coral text-white text-[14px] font-bold hover:bg-coralDeep transition-colors"
            >
              Apply sort
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SortControl({
  sort,
  onChange,
  open,
  setOpen,
}: {
  sort: SortKey
  onChange: (key: SortKey) => void
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const current = SORT_OPTIONS.find(o => o.key === sort) ?? SORT_OPTIONS[0]
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-10 rounded-full bg-surface border border-text/10 px-4 text-[13px] font-semibold text-text hover:bg-raised transition-colors"
      >
        <ArrowUpDown className="h-4 w-4 text-text/55" />
        <span className="text-text/55">Sort:</span>
        <span>{current.title}</span>
      </button>
      {open && (
        <>
          <button
            aria-label="Close sort"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-20 w-[280px] rounded-2xl bg-surface border border-text/8 shadow-[0_12px_36px_-12px_rgba(0,0,0,0.5)] p-2">
            {SORT_OPTIONS.map(option => {
              const selected = option.key === sort
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    selected ? 'bg-raised' : 'hover:bg-raised/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      selected ? 'border-ok' : 'border-text/25',
                    )}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text">
                      {option.title}
                    </div>
                    <div className="text-[11.5px] text-text/55">{option.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyFilterState({
  statusKey,
  hasSearch,
  onReset,
}: {
  statusKey: string
  hasSearch: boolean
  onReset: () => void
}) {
  const copy =
    EMPTY_STATE_COPY[statusKey] ??
    (hasSearch
      ? {
          title: 'No matches',
          body: 'Try a different business name, city, or signal — or clear the search.',
        }
      : {
          title: 'Nothing here yet',
          body: 'Fetchi will surface leads in this view as soon as they match.',
        })

  return (
    <div className="rounded-2xl bg-surface p-8 lg:p-10 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-text/[0.06] flex items-center justify-center text-text/40 text-[18px] font-bold">
        —
      </div>
      <h3 className="mt-4 font-outfit text-[18px] lg:text-[20px] font-bold text-text">
        {copy.title}
      </h3>
      <p className="mt-1.5 max-w-[32ch] text-[13px] text-text/60 leading-relaxed">
        {copy.body}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral text-white text-[13px] font-semibold hover:bg-coralDeep transition-colors lg:hidden"
      >
        Browse All <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 hidden lg:inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral text-white text-[13px] font-semibold hover:bg-coralDeep transition-colors"
      >
        Browse All Leads <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
