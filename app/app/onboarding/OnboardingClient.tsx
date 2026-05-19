'use client'

import { useState, useTransition } from 'react'
import { saveOnboardingStep, completeOnboarding } from './actions'
import { errorMessage } from '@/lib/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check } from 'lucide-react'

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
        <div className="relative mb-9">
          <div className="w-[88px] h-[88px] rounded-full bg-brand-green text-white flex items-center justify-center text-4xl font-semibold">
            ツ
          </div>
          <span className="absolute inset-0 rounded-full border-2 border-brand-green/40 animate-ping" />
        </div>
        <h2 className="font-outfit text-4xl mb-3 leading-tight">
          Finding leads <em className="not-italic text-brand-green">near you…</em>
        </h2>
        <p className="text-white/55 max-w-sm leading-relaxed text-[15px]">
          Fetchi is checking storm reports, permits, and listings in{' '}
          {city || 'your area'}.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-parchment flex flex-col items-center justify-start lg:justify-center px-4 py-8 lg:py-12">
      <div className="flex items-center gap-3 mb-7 lg:mb-8">
        <span
          className="fetchi-avatar"
          style={{ width: 40, height: 40, fontSize: 18, lineHeight: 1 }}
          aria-hidden="true"
        >
          ツ
        </span>
        <span className="fetchi-wordmark text-[24px] text-brand-near-black">
          Fetchi
        </span>
      </div>

      <div className="bg-brand-cream rounded-[20px] shadow-fetchi-card p-6 lg:p-9 max-w-[520px] w-full">
        <StepDots step={step} />

        {step === 1 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] font-semibold leading-tight text-brand-near-black mt-7 mb-2">
              What do you sell?
            </h1>
            <p className="text-[14.5px] text-brand-near-black/65 mb-6 leading-relaxed">
              We&apos;ll tune every signal scan to your service.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {VERTICALS.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVertical(v.id)}
                  aria-pressed={vertical === v.id}
                  className={`text-left rounded-xl p-3.5 min-h-[96px] transition-colors border ${
                    vertical === v.id
                      ? 'border-brand-green bg-brand-light'
                      : 'border-brand-near-black/10 bg-white hover:border-brand-green/50 hover:bg-brand-light/50'
                  }`}
                >
                  <div className="text-2xl mb-1.5">{v.icon}</div>
                  <div className="text-[14px] font-semibold text-brand-near-black">
                    {v.name}
                  </div>
                  <div className="text-[11.5px] text-brand-near-black/60 leading-snug mt-0.5">
                    {v.desc}
                  </div>
                </button>
              ))}
            </div>
            <FieldLabel htmlFor="biz">Business name</FieldLabel>
            <Input
              id="biz"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Johnson Roofing Co."
              className="h-12 text-[15px]"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] font-semibold leading-tight text-brand-near-black mt-7 mb-2">
              Where do you work?
            </h1>
            <p className="text-[14.5px] text-brand-near-black/65 mb-6 leading-relaxed">
              We scout signals inside this radius.
            </p>
            <div className="grid grid-cols-[1fr_120px] gap-3 mb-4">
              <div>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Dallas"
                  className="h-12 text-[15px]"
                />
              </div>
              <div>
                <FieldLabel htmlFor="state">State</FieldLabel>
                <Input
                  id="state"
                  value={stateCode}
                  onChange={e => setStateCode(e.target.value)}
                  placeholder="TX"
                  maxLength={4}
                  className="h-12 text-[15px] uppercase"
                />
              </div>
            </div>
            <FieldLabel>Service radius</FieldLabel>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="range"
                min={5}
                max={250}
                step={5}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="flex-1 accent-brand-green h-2"
                aria-label="Service radius in miles"
              />
              <span className="text-[14px] font-bold text-brand-dark bg-brand-light rounded-lg px-3 py-1.5 min-w-[72px] text-center tabular-nums">
                {radius} mi
              </span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] font-semibold leading-tight text-brand-near-black mt-7 mb-2">
              Who&apos;s your ideal customer?
            </h1>
            <p className="text-[14.5px] text-brand-near-black/65 mb-6 leading-relaxed">
              Two or three sentences are plenty — Fetchi uses this to score
              every signal.
            </p>
            <Textarea
              value={ideal}
              onChange={e => setIdeal(e.target.value)}
              placeholder="Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Minimum job size $5,000."
              className="min-h-[140px] text-[14.5px] leading-relaxed"
            />
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="font-outfit text-[26px] lg:text-[28px] font-semibold leading-tight text-brand-near-black mt-7 mb-2">
              How often should Fetchi scout?
            </h1>
            <p className="text-[14.5px] text-brand-near-black/65 mb-6 leading-relaxed">
              Change this anytime in Settings.
            </p>
            <div className="flex flex-col gap-2.5">
              {SCOUT_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setScoutMode(m.id)}
                  aria-pressed={scoutMode === m.id}
                  className={`text-left rounded-xl p-4 transition-colors min-h-[72px] border ${
                    scoutMode === m.id
                      ? 'border-brand-green bg-brand-light'
                      : 'border-brand-near-black/10 bg-white hover:border-brand-green/50 hover:bg-brand-light/50'
                  }`}
                >
                  <div className="text-[14px] font-semibold text-brand-near-black">
                    {m.label}
                  </div>
                  <div className="text-[12.5px] text-brand-near-black/60 mt-0.5 leading-relaxed">
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {err && (
          <p
            role="alert"
            className="text-[13px] text-brand-coral mt-4 bg-brand-coral/8 border border-brand-coral/20 rounded-xl px-3 py-2"
          >
            {err}
          </p>
        )}

        <Button
          onClick={next}
          disabled={pending}
          size="lg"
          className="w-full mt-6"
        >
          {pending ? 'Saving…' : step === 4 ? 'Start finding leads' : 'Continue'}
        </Button>

        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="block mx-auto mt-3 h-11 px-4 text-[13.5px] text-brand-near-black/60 hover:text-brand-near-black"
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map(n => {
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                done
                  ? 'bg-brand-green border-brand-green text-white'
                  : active
                  ? 'bg-brand-near-black border-brand-near-black text-white'
                  : 'bg-transparent border-brand-near-black/15 text-brand-near-black/40'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </div>
            {n < 4 && (
              <div
                className={`flex-1 h-[2px] rounded-full ${
                  done ? 'bg-brand-green' : 'bg-brand-near-black/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12.5px] font-semibold text-brand-near-black mb-1.5"
    >
      {children}
    </label>
  )
}
