'use client'

import { useState, useTransition } from 'react'
import { saveBusinessProfile } from './actions'
import { errorMessage } from '@/lib/enums'
import { SettingsGroup } from '@/components/app/SettingsGroup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Initial = {
  businessName: string
  vertical: 'roofing' | 'cleaning' | 'hvac' | 'landscaping' | 'events' | 'other'
  serviceDescription: string
  locationCity: string
  locationState: string
  locationRadiusMiles: number
  idealCustomerDescription: string
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
        })
        setMsg('Saved.')
      } catch (e: unknown) {
        setErr(errorMessage(e, "Couldn't save — check the fields and try again."))
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3 lg:space-y-4">
      <SettingsGroup
        title="Business details"
        description="The basics Fetchi uses to know who you are."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <Field label="Business name" htmlFor="biz">
            <Input
              id="biz"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
            />
          </Field>
          <Field label="Service vertical" htmlFor="vertical">
            <select
              id="vertical"
              value={vertical}
              onChange={e => setVertical(e.target.value as Initial['vertical'])}
              className="flex h-11 w-full rounded-xl border border-text/10 bg-raised px-3.5 text-[14px] text-text focus:border-blue focus:ring-2 focus:ring-blue/30 focus:outline-none"
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
          <Textarea
            id="desc"
            value={serviceDescription}
            onChange={e => setServiceDescription(e.target.value)}
            rows={3}
            placeholder="Commercial and residential roofing — repairs, replacements, storm damage restoration."
          />
        </Field>
      </SettingsGroup>

      <SettingsGroup
        title="Service area"
        description="Fetchi scouts signals inside this radius."
      >
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="City" htmlFor="city">
            <Input
              id="city"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
          </Field>
          <Field label="State" htmlFor="state">
            <Input
              id="state"
              value={stateCode}
              onChange={e => setStateCode(e.target.value)}
              maxLength={4}
              required
              className="uppercase"
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
              className="flex-1 accent-coral h-2"
              aria-label="Service radius in miles"
            />
            <span className="text-[14px] font-bold text-text2 bg-ok/15 rounded-lg px-3 py-1.5 min-w-[72px] text-center tabular-nums">
              {radius} mi
            </span>
          </div>
        </Field>
      </SettingsGroup>

      <SettingsGroup
        title="Ideal customer"
        description="Fetchi reads this every time it scores a signal."
      >
        <Textarea
          value={ideal}
          onChange={e => setIdeal(e.target.value)}
          rows={4}
          placeholder="Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Minimum job size $5,000."
        />
      </SettingsGroup>

      <div className="rounded-2xl bg-surface shadow-fetchi-soft px-5 py-4 lg:px-6 lg:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-[13px] text-text/60">
          {msg ? (
            <span className="text-ok font-semibold">{msg}</span>
          ) : err ? (
            <span className="text-coral font-semibold">{err}</span>
          ) : (
            'Changes apply on the next scout run.'
          )}
        </div>
        <Button type="submit" disabled={pending} size="lg" className="sm:w-auto w-full">
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
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
