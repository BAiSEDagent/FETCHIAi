import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'

export default function BlockedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-brand-parchment">
      <div className="max-w-md w-full bg-brand-cream rounded-[20px] shadow-fetchi-card p-7 lg:p-9 text-center">
        <span
          className="fetchi-avatar mx-auto"
          style={{ width: 56, height: 56, fontSize: 24, lineHeight: 1 }}
          aria-hidden="true"
        >
          ツ
        </span>
        <h1 className="font-outfit text-[24px] font-semibold text-brand-near-black mt-7">
          That email won&apos;t work for Fetchi
        </h1>
        <p className="text-[14px] text-brand-near-black/70 mt-3 leading-relaxed">
          We block disposable inboxes to keep the lead-gen network clean. Please
          sign up with your work email instead.
        </p>
        <div className="flex flex-col gap-3 mt-7">
          <SignOutButton redirectUrl="/sign-up">
            <button className="h-12 px-6 rounded-xl bg-brand-near-black text-white font-semibold text-[15px] hover:bg-brand-green transition-colors w-full">
              Use a different email
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="h-11 inline-flex items-center justify-center text-[13px] text-brand-near-black/60 hover:text-brand-near-black"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
