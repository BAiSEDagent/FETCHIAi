import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
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
      <SignIn
        signUpUrl="/sign-up"
        forceRedirectUrl="/app/chat"
        fallbackRedirectUrl="/app/chat"
      />
    </main>
  )
}
