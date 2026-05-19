'use client'

import { useState, useTransition } from 'react'
import { saveOnboardingStep, completeOnboarding } from './actions'
import { errorMessage } from '@/lib/enums'

type Vertical = 'roofing' | 'cleaning' | 'hvac' | 'landscaping' | 'events' | 'other'
type ScoutMode = 'off' | 'once_daily' | 'three_daily' | 'custom'

const VERTICALS: { id: Vertical; icon: string; name: string; desc: string }[] = [
  { id: 'roofing', icon: '🏠', name: 'Roofing', desc: 'Storm damage, replacements, repairs' },
  { id: 'cleaning', icon: '🧼', name: 'Commercial Cleaning', desc: 'Offices, retail, post-construction' },
  { id: 'hvac', icon: '❄️', name: 'HVAC', desc: 'Installs, repair, service contracts' },
  { id: 'landscaping', icon: '🌿', name: 'Landscaping', desc: 'Commercial grounds & maintenance' },
  { id: 'events', icon: '🎪', name: 'Event Services', desc: 'Rentals, staging, weddings' },
  { id: 'other', icon: '🛠️', name: 'Something else', desc: 'Tell us in the next step' },
]

const SCOUT_MODES: { id: ScoutMode; label: string; desc: string }[] = [
  { id: 'off', label: 'Only when I ask', desc: "Fetchi waits. You drive every search from the chat." },
  { id: 'once_daily', label: 'Once each morning', desc: 'A fresh batch of leads in your inbox by 7am.' },
  { id: 'three_daily', label: 'A few times per day', desc: 'Morning, midday, and late afternoon scans.' },
  { id: 'custom', label: 'Custom schedule', desc: 'Set your own cadence later in Settings.' },
]

type Props = {
  initial: {
    vertical: Vertical | null
    businessName: string | null
    locationCity: string | null
    locationState: string | null
    locationRadiusMiles: number | null
    idealCustomerDescription: string | null
    scoutMode: ScoutMode | null
    step: number
  }
}

export function OnboardingClient({ initial }: Props) {
  const [pending, startTransition] = useTransition()
  const [showFinding, setShowFinding] = useState(false)
  const [step, setStep] = useState(Math.min(initial.step + 1, 4) || 1)

  const [vertical, setVertical] = useState<Vertical | null>(initial.vertical)
  const [businessName, setBusinessName] = useState(initial.businessName ?? '')
  const [city, setCity] = useState(initial.locationCity ?? '')
  const [stateCode, setStateCode] = useState(initial.locationState ?? '')
  const [radius, setRadius] = useState(initial.locationRadiusMiles ?? 50)
  const [ideal, setIdeal] = useState(initial.idealCustomerDescription ?? '')
  const [scoutMode, setScoutMode] = useState<ScoutMode | null>(initial.scoutMode ?? 'once_daily')
  const [err, setErr] = useState<string | null>(null)

  const dots = [1, 2, 3, 4].map(n => {
    const cls =
      n < step ? 'bg-brand-green text-white' : n === step ? 'bg-brand-near-black text-white' : 'bg-brand-near-black/10 text-brand-near-black/40'
    return (
      <div key={n} className="flex items-center gap-2 flex-1">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${cls}`}>
          {n < step ? '✓' : n}
        </div>
        {n < 4 && (
          <div
            className={`flex-1 h-0.5 ${n < step ? 'bg-brand-green' : 'bg-brand-near-black/10'}`}
          />
        )}
      </div>
    )
  })

  function next() {
    setErr(null)
    startTransition(async () => {
      try {
        if (step === 1) {
          if (!vertical) return setErr('Pick a service vertical.')
          if (!businessName.trim()) return setErr("What's your business name?")
          await saveOnboardingStep({ vertical, businessName: businessName.trim() })
          setStep(2)
        } else if (step === 2) {
          if (!city.trim() || !stateCode.trim())
            return setErr('Add the city and state you serve.')
          await saveOnboardingStep({
            locationCity: city.trim(),
            locationState: stateCode.trim().toUpperCase(),
            locationRadiusMiles: radius,
          })
          setStep(3)
        } else if (step === 3) {
          if (!ideal.trim()) return setErr('A short description helps us score signals better.')
          await saveOnboardingStep({ idealCustomerDescription: ideal.trim() })
          setStep(4)
        } else if (step === 4) {
          if (!scoutMode) return setErr('Pick how often Fetchi should scout.')
          await saveOnboardingStep({ scoutMode })
          setShowFinding(true)
          // `completeOnboarding` performs a server-side redirect to /app/chat,
          // so no client `router.push` is needed (and chaining one would
          // race the server response).
          setTimeout(() => {
            void completeOnboarding()
          }, 2400)
        }
      } catch (e: unknown) {
        setErr(errorMessage(e, 'Something went wrong — try again.'))
      }
    })
  }

  function back() {
    if (step > 1) setStep(step - 1)
  }

  if (showFinding) {
    return (
      <div className="min-h-screen bg-brand-near-black text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-8">
          <div className="w-[72px] h-[72px] rounded-full bg-brand-green text-white flex items-center justify-center text-3xl font-semibold">
            ツ
          </div>
          <span className="absolute inset-0 rounded-full border-[1.5px] border-brand-green/30 animate-ping" />
        </div>
        <h2 className="font-outfit text-4xl mb-2">
          Finding leads <em className="not-italic text-brand-green">near you…</em>
        </h2>
        <p className="text-white/45 max-w-sm leading-relaxed">
          Fetchi is checking storm reports, permits, and listings in {city || 'your area'}.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-parchment flex flex-col items-center justify-center px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <span
          className="fetchi-avatar"
          style={{ width: 36, height: 36, fontSize: 16, lineHeight: 1 }}
          aria-hidden="true"
        >
          ツ
        </span>
        <span className="fetchi-wordmark text-[22px] text-brand-near-black">Fetchi</span>
      </div>

      <div className="bg-white border-2 border-brand-near-black rounded-2xl p-6 lg:p-10 max-w-[520px] w-full shadow-[4px_4px_0_#2D2B2A]">
        <div className="flex items-center gap-2 mb-7">{dots}</div>

        {step === 1 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] leading-tight text-brand-near-black mb-2">
              What do you sell?
            </h1>
            <p className="text-sm text-brand-near-black/65 mb-6 leading-relaxed">
              We&apos;ll tune every signal scan to your service.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {VERTICALS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVertical(v.id)}
                  className={`text-left border-2 rounded-xl p-3.5 min-h-[88px] transition-colors ${
                    vertical === v.id
                      ? 'border-brand-green bg-brand-light'
                      : 'border-brand-near-black/12 hover:border-brand-green hover:bg-brand-light'
                  }`}
                >
                  <div className="text-2xl mb-1">{v.icon}</div>
                  <div className="text-sm font-semibold text-brand-near-black">{v.name}</div>
                  <div className="text-[11px] text-brand-near-black/55 leading-snug">
                    {v.desc}
                  </div>
                </button>
              ))}
            </div>
            <label className="block text-[12px] font-semibold text-brand-near-black mb-1.5">
              Business name
            </label>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Johnson Roofing Co."
              className="w-full px-3.5 py-3 border-2 border-brand-near-black/15 rounded-xl text-[15px] focus:border-brand-green outline-none min-h-[44px]"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] leading-tight text-brand-near-black mb-2">
              Where do you work?
            </h1>
            <p className="text-sm text-brand-near-black/65 mb-6 leading-relaxed">
              We scout signals inside this radius.
            </p>
            <div className="grid grid-cols-[1fr_120px] gap-3 mb-4">
              <div>
                <label className="block text-[12px] font-semibold text-brand-near-black mb-1.5">
                  City
                </label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Dallas"
                  className="w-full px-3.5 py-3 border-2 border-brand-near-black/15 rounded-xl text-[15px] focus:border-brand-green outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-brand-near-black mb-1.5">
                  State
                </label>
                <input
                  value={stateCode}
                  onChange={e => setStateCode(e.target.value)}
                  placeholder="TX"
                  maxLength={4}
                  className="w-full px-3.5 py-3 border-2 border-brand-near-black/15 rounded-xl text-[15px] focus:border-brand-green outline-none uppercase min-h-[44px]"
                />
              </div>
            </div>
            <label className="block text-[12px] font-semibold text-brand-near-black mb-1.5">
              Service radius
            </label>
            <div className="flex items-center gap-3 mb-2">
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
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] leading-tight text-brand-near-black mb-2">
              Who&apos;s your ideal customer?
            </h1>
            <p className="text-sm text-brand-near-black/65 mb-6 leading-relaxed">
              Two or three sentences are plenty — Fetchi uses this to score every signal.
            </p>
            <textarea
              value={ideal}
              onChange={e => setIdeal(e.target.value)}
              placeholder="Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Minimum job size $5,000."
              className="w-full px-3.5 py-3 border-2 border-brand-near-black/15 rounded-xl text-[14px] focus:border-brand-green outline-none h-32 leading-relaxed resize-y"
            />
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] leading-tight text-brand-near-black mb-2">
              How often should Fetchi scout?
            </h1>
            <p className="text-sm text-brand-near-black/65 mb-6 leading-relaxed">
              Change this anytime in Settings → Scouting.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {SCOUT_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setScoutMode(m.id)}
                  className={`text-left border-2 rounded-xl p-4 transition-colors min-h-[64px] ${
                    scoutMode === m.id
                      ? 'border-brand-green bg-brand-light'
                      : 'border-brand-near-black/12 hover:border-brand-green hover:bg-brand-light'
                  }`}
                >
                  <div className="text-sm font-semibold text-brand-near-black">{m.label}</div>
                  <div className="text-[12px] text-brand-near-black/60 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {err && <p className="text-sm text-brand-coral mb-3">{err}</p>}

        <button
          onClick={next}
          disabled={pending}
          className="w-full mt-2 py-3.5 bg-brand-near-black text-white rounded-xl font-semibold text-[15px] hover:bg-brand-green transition-colors disabled:opacity-60 min-h-[48px]"
        >
          {pending ? 'Saving…' : step === 4 ? 'Start finding leads' : 'Continue'}
        </button>

        {step > 1 && (
          <button
            onClick={back}
            className="block mx-auto mt-3 text-[13px] text-brand-near-black/55 hover:text-brand-near-black"
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}
