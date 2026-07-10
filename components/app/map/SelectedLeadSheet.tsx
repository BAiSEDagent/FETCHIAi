'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  Navigation,
  Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_PIN_CLASSES,
  formatLeadDate,
  hasLeadPhone,
  leadDirectionsHref,
  leadInitials,
  leadWebsiteHref,
  type MappableSavedLead,
} from './map-helpers'

type Props = {
  lead: MappableSavedLead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SelectedLeadSheet({ lead, open, onOpenChange }: Props) {
  const websiteHref = lead ? leadWebsiteHref(lead) : null
  const directionsHref = lead ? leadDirectionsHref(lead) : null
  const phoneHref = lead?.phone?.trim() ? `tel:${lead.phone.trim()}` : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-fetchi-theme-root
        data-cp25a-selected-lead-sheet
        className="theme-dark max-h-[86dvh] overflow-y-auto rounded-t-[28px] border-0 bg-bg px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-5 text-text shadow-2xl shadow-black/45 lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[760px] lg:w-[440px] lg:rounded-[28px]"
      >
        <div className="mx-auto mb-8 h-1.5 w-14 rounded-full bg-text/28" aria-hidden="true" />
        {lead && (
          <>
            <SheetHeader className="mb-7 text-left">
              <div
                className={cn(
                  'mb-6 grid h-20 w-20 place-items-center rounded-full border-[5px] border-text/12 text-[24px] font-black shadow-xl shadow-black/35',
                  LIFECYCLE_PIN_CLASSES[lead.lifecycleStatus],
                )}
                aria-hidden="true"
              >
                {leadInitials(lead)}
              </div>
              <SheetTitle className="font-outfit text-[38px] font-semibold leading-none text-text">
                {lead.businessName}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Read-only saved lead details.
              </SheetDescription>
              <div className="mt-4 space-y-1.5 text-[18px] font-medium leading-snug text-text/55">
                {lead.category && <p>{lead.category}</p>}
                {lead.market && <p>{lead.market}</p>}
                {lead.address && <p>{lead.address}</p>}
              </div>
            </SheetHeader>

            <div className="space-y-4">
              <InfoRow
                icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
                title="Lifecycle"
                value={LIFECYCLE_LABELS[lead.lifecycleStatus]}
              />
              <InfoRow
                icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
                title="Updated"
                value={formatLeadDate(lead.updatedAtIso)}
              />
              {lead.note && (
                <InfoRow
                  icon={<FileText className="h-6 w-6" aria-hidden="true" />}
                  title="Note"
                  value={lead.note}
                />
              )}
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3">
              <ActionRow
                icon={<Phone className="h-5 w-5" aria-hidden="true" />}
                label={hasLeadPhone(lead) ? 'Call' : 'No phone'}
                href={phoneHref}
                disabled={!phoneHref}
              />
              <ActionRow
                icon={<Globe className="h-5 w-5" aria-hidden="true" />}
                label={websiteHref ? 'Website' : 'No website'}
                href={websiteHref}
                disabled={!websiteHref}
                external
              />
              <ActionRow
                icon={<Navigation className="h-5 w-5" aria-hidden="true" />}
                label={directionsHref ? 'Directions' : 'No directions'}
                href={directionsHref}
                disabled={!directionsHref}
                external
              />
            </div>

            <Link
              href={`/app/leads/${lead.id}`}
              className="mt-7 inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-text px-5 text-[16px] font-semibold text-bg transition hover:bg-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55"
            >
              Open profile
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: ReactNode
  title: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-3 rounded-[18px] bg-raised/55 p-4">
      <div className="pt-0.5 text-text/82">{icon}</div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-text">{title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-text/62">{value}</p>
      </div>
    </div>
  )
}

function ActionRow({
  icon,
  label,
  href,
  disabled,
  external = false,
}: {
  icon: ReactNode
  label: string
  href: string | null
  disabled: boolean
  external?: boolean
}) {
  const className = cn(
    'inline-flex min-h-[52px] items-center gap-3 rounded-[17px] px-4 text-[16px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55',
    disabled
      ? 'cursor-not-allowed bg-raised/35 text-text/35'
      : 'bg-raised text-text hover:bg-text/10',
  )

  if (disabled || !href) {
    return (
      <span className={className} aria-disabled="true">
        <span className="text-current">{icon}</span>
        {label}
      </span>
    )
  }

  return (
    <a
      href={href}
      className={className}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <span className="text-current">{icon}</span>
      {label}
    </a>
  )
}
