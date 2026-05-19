import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'

export default async function VerifyEmailPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const primary = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
  if (primary && primary.verification?.status === 'verified') {
    redirect('/app/chat')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-brand-parchment">
      <div className="max-w-md w-full bg-white border-2 border-brand-near-black rounded-2xl p-8 text-center shadow-[4px_4px_0_#2D2B2A]">
        <span
          className="fetchi-avatar mx-auto"
          style={{ width: 56, height: 56, fontSize: 24, lineHeight: 1 }}
          aria-hidden="true"
        >
          ツ
        </span>
        <h1 className="font-outfit text-2xl text-brand-near-black mt-6">
          Confirm your email
        </h1>
        <p className="text-sm text-brand-near-black/70 mt-3 leading-relaxed">
          We sent a verification link to{' '}
          <span className="font-semibold text-brand-near-black">
            {primary?.emailAddress ?? 'your inbox'}
          </span>
          . Open it on this device to unlock Fetchi.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <Link
            href="/app/chat"
            className="min-h-[44px] inline-flex items-center justify-center px-6 rounded-xl bg-brand-near-black text-white font-semibold hover:bg-brand-green transition-colors"
          >
            I&apos;ve verified — continue
          </Link>
          <SignOutButton redirectUrl="/sign-in">
            <button className="text-sm text-brand-near-black/60 hover:text-brand-near-black">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  )
}
