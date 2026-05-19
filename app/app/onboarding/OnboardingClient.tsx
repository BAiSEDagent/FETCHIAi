'use client'

import { useState, useTransition } from 'react'
import { saveOnboardingStep, completeOnboarding } from './actions'
import { errorMessage } from '@/lib/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight } from 'lucide-react'

type Vertical = 'roofing' | 'cleaning' | 'hvac' | 'landscaping' | 'events' | 'other'
type ScoutMode = 'off' | 'once_daily' | 'three_daily' | 'custom'

const VERTICALS: { id: Vertical; icon: string; name: string; desc: string }[] = [
  { id: 'roofing', icon: '🏠', name: 'Roofing', desc: 'Hail, permits, roof age' },
  { id: 'hvac', icon: '❄️', name: 'HVAC', desc: 'Heat waves, complaints' },
  { id: 'cleaning', icon: '✦', name: 'Cleaning', desc: 'New offices, hiring' },
  { id: 'landscaping', icon: '🌿', name: 'Landscaping', desc: 'Property listings, HOA' },
  { id: 'events', icon: '🎪', name: 'Event Services', desc: 'Rentals, weddings, staging' },
  { id: 'other', icon: '+', name: 'Other', desc: 'Tell us in one sentence' },
]

const SCOUT_MODES: { id: ScoutMode; label: string; desc: string }[] = [
  { id: 'off', label: 'Only when I ask', desc: "Fetchi waits. You drive every search from the chat." },
  { id: 'once_daily', label: 'Once each morning', desc: 'A fresh batch of leads in your inbox by 7am.' },
  { id: 'three_daily', label: 'A few times per day', desc: 'Morning, midday, and late afternoon scans.' },
  { id: 'custom', label: 'Custom schedule', desc: 'Set your own cadence later in Settings.' },
]

const STEP_TIME_ESTIMATE = ['about 2 minutes left', 'about 90 seconds left', 'about 60 seconds left', 'about 30 seconds left']

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
          if (!vertical) return setErr('Pick the closest match.')
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

  const stepTitle =
    step === 1
      ? 'What do you sell?'
      : step === 2
        ? 'Where do you work?'
        : step === 3
          ? "Who's your ideal customer?"
          : 'How often should Fetchi scout?'

  const stepSubtitle =
    step === 1
      ? 'Pick the closest match. You can refine later.'
      : step === 2
        ? 'We scout signals inside this radius.'
        : step === 3
          ? 'Two or three sentences are plenty — Fetchi uses this every time it scores a signal.'
          : 'Change this anytime in Settings.'

  return (
    <div className="min-h-screen bg-brand-parchment flex flex-col items-center justify-start lg:justify-center px-4 py-6 lg:py-12">
      <div className="w-full max-w-[520px]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span
              className="fetchi-avatar"
              style={{ width: 36, height: 36, fontSize: 16, lineHeight: 1 }}
              aria-hidden="true"
            >
              ツ
            </span>
            <span className="fetchi-wordmark text-[20px] text-brand-near-black">
              fetchi<span className="text-brand-green">.ai</span>
            </span>
          </div>
          <span className="text-[12px] text-brand-near-black/45 font-medium tabular-nums">
            Step {step} of 4
          </span>
        </div>

        <ProgressBars step={step} />

        <div className="mt-8 lg:mt-9">
          <h1 className="font-outfit text-[30px] lg:text-[34px] font-bold leading-[1.1] text-brand-near-black mb-3">
            {stepTitle}
          </h1>
          <p className="text-[15px] text-brand-near-black/60 mb-7 leading-relaxed">
            {stepSubtitle}
          </p>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {VERTICALS.map(v => {
                  const selected = vertical === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVertical(v.id)}
                      aria-pressed={selected}
                      className={`text-left rounded-2xl p-4 min-h-[112px] transition-all ${
                        selected
                          ? 'bg-brand-near-black text-white shadow-fetchi-card'
                          : 'bg-brand-cream text-brand-near-black shadow-fetchi-soft hover:-translate-y-px hover:shadow-fetchi-card'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] mb-3 ${
                          selected
                            ? 'bg-brand-near-black/40 text-brand-green'
                            : 'bg-brand-light text-brand-dark'
                        }`}
                        aria-hidden
                      >
                        {v.icon}
                      </div>
                      <div className="text-[15px] font-bold leading-tight">
                        {v.name}
                      </div>
                      <div
                        className={`text-[12.5px] mt-1 leading-snug ${
                          selected ? 'text-white/60' : 'text-brand-near-black/55'
                        }`}
                      >
                        {v.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div>
                <FieldLabel htmlFor="biz">Business name</FieldLabel>
                <Input
                  id="biz"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Johnson Roofing Co."
                  className="h-12 text-[15px]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-[1fr_120px] gap-3">
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
              <div>
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
              </div>
            </div>
          )}

          {step === 3 && (
            <Textarea
              value={ideal}
              onChange={e => setIdeal(e.target.value)}
              placeholder="Commercial property managers and HOA boards. Buildings 5,000–50,000 sq ft. Minimum job size $5,000."
              className="min-h-[160px] text-[15px] leading-relaxed"
            />
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3">
              {SCOUT_MODES.map(m => {
                const selected = scoutMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setScoutMode(m.id)}
                    aria-pressed={selected}
                    className={`text-left rounded-2xl p-4 transition-all min-h-[76px] ${
                      selected
                        ? 'bg-brand-near-black text-white shadow-fetchi-card'
                        : 'bg-brand-cream text-brand-near-black shadow-fetchi-soft hover:-translate-y-px hover:shadow-fetchi-card'
                    }`}
                  >
                    <div className="text-[15px] font-bold">{m.label}</div>
                    <div
                      className={`text-[13px] mt-1 leading-relaxed ${
                        selected ? 'text-white/65' : 'text-brand-near-black/55'
                      }`}
                    >
                      {m.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {err && (
            <p
              role="alert"
              className="text-[13px] text-brand-coral mt-5 bg-brand-coral/8 border border-brand-coral/20 rounded-xl px-3 py-2"
            >
              {err}
            </p>
          )}
        </div>

        <div className="mt-8 lg:mt-10 space-y-3">
          <Button
            onClick={next}
            disabled={pending}
            size="lg"
            className="w-full h-14 text-[16px] rounded-full"
          >
            {pending ? (
              'Saving…'
            ) : (
              <span className="inline-flex items-center gap-2">
                {step === 4 ? 'Start finding leads' : 'Continue'}
                <ArrowRight className="h-[18px] w-[18px]" />
              </span>
            )}
          </Button>

          <div className="text-center text-[12px] text-brand-near-black/45 font-medium">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="hover:text-brand-near-black mr-3 align-middle"
              >
                ← Back
              </button>
            ) : null}
            <span>
              Step {step} of 4 · {STEP_TIME_ESTIMATE[step - 1]}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressBars({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4].map(n => {
        const filled = n <= step
        return (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              filled ? 'bg-brand-green' : 'bg-brand-near-black/10'
            }`}
          />
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
