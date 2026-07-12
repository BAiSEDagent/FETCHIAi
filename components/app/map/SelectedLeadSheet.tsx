'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ExternalLink,
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
  const titleSizeClass =
    (lead?.businessName.trim().length ?? 0) > 52
      ? 'text-[24px] leading-[1.12]'
      : (lead?.businessName.trim().length ?? 0) > 34
        ? 'text-[27px] leading-[1.1]'
        : 'text-[31px] leading-[1.06]'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/25 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-fetchi-theme-root
          data-cp25a-selected-lead-sheet
          data-cp25b-selected-lead-sheet
          data-cp25b1-selected-lead-sheet
          className="theme-dark fixed inset-x-0 bottom-0 z-50 max-h-[78dvh] overflow-y-auto rounded-t-[30px] border border-b-0 border-text/10 bg-bg px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 text-text shadow-2xl shadow-black/50 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:px-5 lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[720px] lg:w-[430px] lg:rounded-[30px] lg:border-b"
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-raised/75 text-text/65 transition hover:bg-text/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/50">
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="sr-only">Close lead details</span>
          </DialogPrimitive.Close>
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-text/25" aria-hidden="true" />
          {lead && (
            <>
              <div className="mb-5 pr-11 text-left">
                <DialogPrimitive.Title
                  className={cn(
                    'break-words font-outfit font-semibold text-text',
                    titleSizeClass,
                  )}
                >
                  {lead.businessName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Read-only saved lead details.
                </DialogPrimitive.Description>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-medium leading-snug text-text/65">
                  {lead.category && <span>{lead.category}</span>}
                  {lead.category && marketLabel && <span aria-hidden="true">·</span>}
                  {marketLabel && <span>{marketLabel}</span>}
                </div>
                {lead.address && (
                  <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-relaxed text-text/50">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{lead.address.trim()}</span>
                  </p>
                )}
              </div>

              <div data-cp25b-lead-action-grid className="grid grid-cols-4 gap-2">
                <ActionTile
                  icon={<Phone className="h-5 w-5" aria-hidden="true" />}
                  label={phoneHref ? 'Call' : 'No phone'}
                  href={phoneHref}
                  disabled={!phoneHref}
                />
                <ActionTile
                  icon={<Globe className="h-5 w-5" aria-hidden="true" />}
                  label={websiteHref ? 'Website' : 'No website'}
                  href={websiteHref}
                  disabled={!websiteHref}
                  external
                />
                <ActionTile
                  icon={<Navigation className="h-5 w-5" aria-hidden="true" />}
                  label={directionsHref ? 'Directions' : 'No directions'}
                  href={directionsHref}
                  disabled={!directionsHref}
                  external
                />
                <ActionTile
                  icon={<ExternalLink className="h-5 w-5" aria-hidden="true" />}
                  label="Profile"
                  ariaLabel="Open profile"
                  href={`/app/leads/${lead.id}`}
                  disabled={false}
                  internal
                />
              </div>

              <dl className="mt-5 divide-y divide-text/10 border-y border-text/10">
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
    <div className="grid grid-cols-[78px_1fr] gap-3 py-3 text-[13px] leading-relaxed">
      <dt className="text-text/45">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-text/80">{value}</dd>
    </div>
  )
}

function ActionTile({
  icon,
  label,
  ariaLabel,
  href,
  disabled,
  external = false,
  internal = false,
}: {
  icon: ReactNode
  label: string
  ariaLabel?: string
  href: string | null
  disabled: boolean
  external?: boolean
  internal?: boolean
}) {
  const className = cn(
    'inline-flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[18px] px-1 py-3 text-center text-[11.5px] font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/50',
    disabled
      ? 'cursor-not-allowed bg-raised/35 text-text/35'
      : 'bg-raised text-text hover:bg-text/10 active:scale-[0.98]',
  )

  if (disabled || !href) {
    return (
      <span className={className} aria-label={ariaLabel} aria-disabled="true">
        <span className="grid h-8 w-8 place-items-center text-current">{icon}</span>
        {label}
      </span>
    )
  }

  if (internal) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        <span className="grid h-8 w-8 place-items-center text-current">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <span className="grid h-8 w-8 place-items-center text-current">{icon}</span>
      {label}
    </a>
  )
}
