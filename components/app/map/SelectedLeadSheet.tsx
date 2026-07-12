'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  Navigation,
  Phone,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_PIN_CLASSES,
  formatLeadDate,
  formatMapMarketLabel,
  leadDirectionsHref,
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
  const marketLabel = lead ? formatMapMarketLabel(lead.market) : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-fetchi-theme-root
          data-cp25a-selected-lead-sheet
          data-cp25b-selected-lead-sheet
          className="theme-dark fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-[32px] border border-text/10 bg-bg px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 text-text shadow-2xl shadow-black/55 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[760px] lg:w-[440px] lg:rounded-[32px]"
        >
          <DialogPrimitive.Close className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-raised text-text/72 transition hover:bg-text/12 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55">
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close lead details</span>
          </DialogPrimitive.Close>
          <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-text/28" aria-hidden="true" />
          {lead && (
            <>
              <div className="mb-6 pr-12 text-left">
                <DialogPrimitive.Title className="font-outfit text-[34px] font-semibold leading-[1.02] text-text sm:text-[38px]">
                  {lead.businessName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Read-only saved lead details.
                </DialogPrimitive.Description>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[17px] font-medium leading-snug text-text/64">
                  {lead.category && <span>{lead.category}</span>}
                  {lead.category && marketLabel && <span aria-hidden="true">·</span>}
                  {marketLabel && <span>{marketLabel}</span>}
                </div>
                {lead.address && (
                  <p className="mt-3 flex items-start gap-2 text-[14px] leading-relaxed text-text/48">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{lead.address.trim()}</span>
                  </p>
                )}
              </div>

              <div data-cp25b-lead-action-grid className="grid grid-cols-2 gap-3">
                <ActionTile
                  icon={<Phone className="h-6 w-6" aria-hidden="true" />}
                  label={phoneHref ? 'Call' : 'No phone'}
                  href={phoneHref}
                  disabled={!phoneHref}
                />
                <ActionTile
                  icon={<Globe className="h-6 w-6" aria-hidden="true" />}
                  label={websiteHref ? 'Website' : 'No website'}
                  href={websiteHref}
                  disabled={!websiteHref}
                  external
                />
                <ActionTile
                  icon={<Navigation className="h-6 w-6" aria-hidden="true" />}
                  label={directionsHref ? 'Directions' : 'No directions'}
                  href={directionsHref}
                  disabled={!directionsHref}
                  external
                />
                <ActionTile
                  icon={<ExternalLink className="h-6 w-6" aria-hidden="true" />}
                  label="Open profile"
                  href={`/app/leads/${lead.id}`}
                  disabled={false}
                  internal
                />
              </div>

              <dl className="mt-6 divide-y divide-text/10 border-y border-text/10">
                <MetadataRow
                  label="Lifecycle"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          LIFECYCLE_PIN_CLASSES[lead.lifecycleStatus],
                        )}
                        aria-hidden="true"
                      />
                      {LIFECYCLE_LABELS[lead.lifecycleStatus]}
                    </span>
                  }
                />
                <MetadataRow label="Updated" value={formatLeadDate(lead.updatedAtIso)} />
                <MetadataRow label="Source" value={lead.source.trim() || 'Unknown'} />
              </dl>

              {lead.note && (
                <section className="mt-6" aria-labelledby="cp25b-lead-note-title">
                  <div className="flex items-center gap-2 text-text/78">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                    <h3 id="cp25b-lead-note-title" className="text-[14px] font-semibold">
                      Saved note
                    </h3>
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-text/58">{lead.note}</p>
                </section>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function MetadataRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-4 py-4 text-[14px] leading-relaxed">
      <dt className="text-text/42">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-text/82">{value}</dd>
    </div>
  )
}

function ActionTile({
  icon,
  label,
  href,
  disabled,
  external = false,
  internal = false,
}: {
  icon: ReactNode
  label: string
  href: string | null
  disabled: boolean
  external?: boolean
  internal?: boolean
}) {
  const className = cn(
    'inline-flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[20px] px-3 py-4 text-center text-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/55',
    disabled
      ? 'cursor-not-allowed bg-raised/35 text-text/35'
      : 'bg-raised text-text hover:bg-text/10 active:scale-[0.98]',
  )

  if (disabled || !href) {
    return (
      <span className={className} aria-disabled="true">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-text/8 text-current">{icon}</span>
        {label}
      </span>
    )
  }

  if (internal) {
    return (
      <Link href={href} className={className}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-text/8 text-current">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <a
      href={href}
      className={className}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-text/8 text-current">{icon}</span>
      {label}
    </a>
  )
}
