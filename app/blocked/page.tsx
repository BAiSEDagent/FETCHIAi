import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'

export default function BlockedPage() {
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
          That email won&apos;t work for Fetchi
        </h1>
        <p className="text-sm text-brand-near-black/70 mt-3 leading-relaxed">
          We block disposable inboxes to keep the lead-gen network clean. Please
          sign up with your work email instead.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <SignOutButton redirectUrl="/sign-up">
            <button className="min-h-[44px] px-6 rounded-xl bg-brand-near-black text-white font-semibold hover:bg-brand-green transition-colors">
              Use a different email
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="text-sm text-brand-near-black/60 hover:text-brand-near-black"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
