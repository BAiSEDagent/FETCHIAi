'use client'

import { useState, useTransition } from 'react'
import { saveBusinessProfile } from './actions'
import { errorMessage } from '@/lib/enums'
import { SettingsGroup } from '@/components/app/SettingsGroup'
import { FetchiButton } from '@/components/fetchi-ui/button'
import { FetchiInput } from '@/components/fetchi-ui/input'
import { FetchiTextarea } from '@/components/fetchi-ui/textarea'

type Initial = {
  businessName: string
  vertical: 'roofing' | 'cleaning' | 'hvac' | 'landscaping' | 'events' | 'other'
  serviceDescription: string
  locationCity: string
  locationState: string
  locationRadiusMiles: number
  idealCustomerDescription: string
  website: string
}

const VERTICALS: { id: Initial['vertical']; label: string }[] = [
  { id: 'roofing', label: 'Roofing' },
  { id: 'cleaning', label: 'Commercial Cleaning' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'landscaping', label: 'Landscaping' },
  { id: 'events', label: 'Event Services' },
  { id: 'other', label: 'Other' },
]

export function ProfileForm({ initial }: { initial: Initial }) {
  const [businessName, setBusinessName] = useState(initial.businessName)
  const [vertical, setVertical] = useState(initial.vertical)
  const [serviceDescription, setServiceDescription] = useState(initial.serviceDescription)
  const [city, setCity] = useState(initial.locationCity)
  const [stateCode, setStateCode] = useState(initial.locationState)
  const [radius, setRadius] = useState(initial.locationRadiusMiles)
  const [ideal, setIdeal] = useState(initial.idealCustomerDescription)
  const [website, setWebsite] = useState(initial.website)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      try {
        await saveBusinessProfile({
          businessName,
          vertical,
          serviceDescription,
          locationCity: city,
          locationState: stateCode,
          locationRadiusMiles: radius,
          idealCustomerDescription: ideal,
          website: website.trim() || null,
        })
        setMsg('Saved.')
      } catch (e: unknown) {
        setErr(errorMessage(e, "Couldn't save — check the fields and try again."))
      }
    })
  }

  return (
    <form data-fetchi-profile-form-v5 onSubmit={submit} className="space-y-3 lg:space-y-4">
      <SettingsGroup
        title="Business details"
        description="The basics Fetchi uses to know who you are."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <Field label="Business name" htmlFor="biz">
            <FetchiInput
              id="biz"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              controlSize="lg"
              className="h-11"
            />
          </Field>
          <Field label="Service vertical" htmlFor="vertical">
            <select
              id="vertical"
              data-fetchi-select-v5
              value={vertical}
              onChange={e => setVertical(e.target.value as Initial['vertical'])}
              className="fetchi-focus-ring flex h-11 w-full rounded-lg border border-[var(--fetchi-border)] bg-fetchiOverlay px-3.5 font-fetchi text-[14px] text-text transition-colors hover:border-[var(--fetchi-border-strong)] focus-visible:border-[var(--fetchi-accent-border)] focus-visible:outline-none"
            >
              {VERTICALS.map(v => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Service description" htmlFor="desc">
          <FetchiTextarea
            id="desc"
            value={serviceDescription}
            onChange={e => setServiceDescription(e.target.value)}
            rows={3}
            controlSize="md"
            placeholder="Commercial and residential roofing — repairs, replacements, storm damage restoration."
          />
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              Website
              <span className="text-text/45 font-normal">(optional)</span>
            </span>
          }
          htmlFor="website"
        >
          <FetchiInput
            id="website"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="example.com"
            controlSize="lg"
            className="h-11"
          />
          <p className="text-[12px] text-text/50 mt-1.5 leading-snug">
            If you have one, Fetchi reads it for extra context when scoring
            signals.
          </p>
        </Field>
      </SettingsGroup>

      <SettingsGroup
        title="Service area"
        description="Fetch uses this radius for lead searches."
      >
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="City" htmlFor="city">
            <FetchiInput
              id="city"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              controlSize="lg"
              className="h-11"
            />
          </Field>
          <Field label="State" htmlFor="state">
            <FetchiInput
              id="state"
              value={stateCode}
              onChange={e => setStateCode(e.target.value)}
              maxLength={4}
              required
              controlSize="lg"
              className="h-11 uppercase"
            />
          </Field>
        </div>
        <Field label="Service radius">
          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={5}
              max={250}
              step={5}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="min-h-[44px] flex-1 accent-fetchiAccent"
              aria-label="Service radius in miles"
            />
            <span className="min-w-[72px] rounded-lg border border-[var(--fetchi-accent-border)] bg-[var(--fetchi-accent-tint)] px-3 py-1.5 text-center text-[14px] font-semibold tabular-nums text-text">
              {radius} mi
            </span>
          </div>
        </Field>
      </SettingsGroup>

      <SettingsGroup
        title="Ideal customer"
        description="Fetchi reads this every time it scores a signal."
      >
        <FetchiTextarea
          value={ideal}
          onChange={e => setIdeal(e.target.value)}
          rows={4}
          controlSize="lg"
          aria-label="Ideal customer description"
          placeholder="Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Minimum job size $5,000."
        />
      </SettingsGroup>

      <div data-fetchi-profile-save-v5 className="flex flex-col gap-3 rounded-xl border border-[var(--fetchi-border-subtle)] bg-[var(--fetchi-surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
        <div data-fetchi-profile-feedback-v5 role={err ? 'alert' : 'status'} className="text-[13px] text-text/60">
          {msg ? (
            <span className="font-semibold text-semanticGreen">{msg}</span>
          ) : err ? (
            <span className="font-semibold text-semanticRed">{err}</span>
          ) : (
            'Changes apply the next time you fetch leads.'
          )}
        </div>
        <FetchiButton type="submit" disabled={pending} size="lg" className="h-11 w-full sm:w-auto">
          {pending ? 'Saving…' : 'Save changes'}
        </FetchiButton>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="text-[12.5px] font-semibold text-text block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}
