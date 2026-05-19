'use client'

import { useState, useTransition } from 'react'
import { saveBusinessProfile } from './actions'

import { errorMessage } from '@/lib/enums'

type Initial = {
  businessName: string
  vertical: 'roofing' | 'cleaning' | 'hvac' | 'landscaping' | 'events' | 'other'
  serviceDescription: string
  locationCity: string
  locationState: string
  locationRadiusMiles: number
  idealCustomerDescription: string
}

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
    <form onSubmit={submit} className="divide-y divide-brand-near-black/6">
      <section className="px-5 lg:px-7 py-5 lg:py-6">
        <div className="text-[13px] font-semibold text-brand-near-black mb-1">
          Business details
        </div>
        <div className="text-[12px] text-brand-near-black/55 mb-4">
          The basics Fetchi uses to know who you are.
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-brand-near-black block mb-1.5">
              Business name
            </span>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] focus:border-brand-green outline-none min-h-[44px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-brand-near-black block mb-1.5">
              Service vertical
            </span>
            <select
              value={vertical}
              onChange={e => setVertical(e.target.value as Initial['vertical'])}
              className="w-full px-3.5 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] focus:border-brand-green outline-none bg-white min-h-[44px]"
            >
              <option value="roofing">Roofing</option>
              <option value="cleaning">Commercial Cleaning</option>
              <option value="hvac">HVAC</option>
              <option value="landscaping">Landscaping</option>
              <option value="events">Event Services</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label className="block mt-4">
          <span className="text-[12px] font-semibold text-brand-near-black block mb-1.5">
            Service description
          </span>
          <textarea
            value={serviceDescription}
            onChange={e => setServiceDescription(e.target.value)}
            rows={3}
            placeholder="Commercial and residential roofing — repairs, replacements, storm damage restoration."
            className="w-full px-3.5 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] focus:border-brand-green outline-none resize-y"
          />
        </label>
      </section>

      <section className="px-5 lg:px-7 py-5 lg:py-6">
        <div className="text-[13px] font-semibold text-brand-near-black mb-1">
          Service area
        </div>
        <div className="text-[12px] text-brand-near-black/55 mb-4">
          Fetchi scouts signals inside this radius.
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-brand-near-black block mb-1.5">
              City
            </span>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] focus:border-brand-green outline-none min-h-[44px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-brand-near-black block mb-1.5">
              State
            </span>
            <input
              value={stateCode}
              onChange={e => setStateCode(e.target.value)}
              maxLength={4}
              required
              className="w-full px-3.5 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] uppercase focus:border-brand-green outline-none min-h-[44px]"
            />
          </label>
        </div>
        <label className="block mt-4">
          <span className="text-[12px] font-semibold text-brand-near-black block mb-1.5">
            Service radius
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={250}
              step={5}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="flex-1 accent-brand-green"
            />
            <span className="text-sm font-semibold text-brand-green bg-brand-light rounded-md px-3 py-1 min-w-[64px] text-center">
              {radius} mi
            </span>
          </div>
        </label>
      </section>

      <section className="px-5 lg:px-7 py-5 lg:py-6">
        <div className="text-[13px] font-semibold text-brand-near-black mb-1">
          Ideal customer
        </div>
        <div className="text-[12px] text-brand-near-black/55 mb-4">
          Fetchi reads this every time it scores a signal.
        </div>
        <textarea
          value={ideal}
          onChange={e => setIdeal(e.target.value)}
          rows={4}
          placeholder="Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Minimum job size $5,000."
          className="w-full px-3.5 py-2.5 border-[1.5px] border-brand-near-black/12 rounded-lg text-[13px] focus:border-brand-green outline-none resize-y"
        />
      </section>

      <div className="px-5 lg:px-7 py-4 lg:py-5 flex items-center justify-between gap-3 bg-white/40">
        <div className="text-[12px] text-brand-near-black/55">
          {msg ? <span className="text-brand-green">{msg}</span> : err ? <span className="text-brand-coral">{err}</span> : 'Changes apply on the next scout run.'}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 bg-brand-near-black text-white rounded-lg text-[13px] font-semibold hover:bg-brand-green transition-colors disabled:opacity-60 min-h-[44px]"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
