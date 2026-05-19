import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10 lg:py-16 bg-brand-parchment">
      <Link
        href="/"
        className="flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity"
      >
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
      </Link>

      <div className="text-center mb-6 max-w-sm">
        <h1 className="font-outfit text-[24px] font-semibold text-brand-near-black">
          Start your free trial
        </h1>
        <p className="text-[14px] text-brand-near-black/65 mt-1.5">
          10 free leads. No card required. Use a real work email — disposable
          inboxes are blocked.
        </p>
      </div>

      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/app/onboarding"
        fallbackRedirectUrl="/app/onboarding"
      />
    </main>
  )
}
