import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-brand-parchment">
      <div className="flex items-center gap-3 mb-8">
        <span
          className="fetchi-avatar"
          style={{ width: 40, height: 40, fontSize: 18, lineHeight: 1 }}
          aria-hidden="true"
        >
          ツ
        </span>
        <span className="fetchi-wordmark text-2xl text-brand-near-black">Fetchi</span>
      </div>
      <p className="text-sm text-brand-near-black/70 mb-4 max-w-sm text-center">
        Use a real work email. Disposable inboxes are blocked.
      </p>
      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/app/onboarding"
        fallbackRedirectUrl="/app/onboarding"
      />
    </main>
  )
}
