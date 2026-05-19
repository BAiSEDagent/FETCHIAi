import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/app/chat')

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex items-center justify-center">
          <span
            className="fetchi-avatar"
            style={{ width: 88, height: 88, fontSize: 44, lineHeight: 1 }}
            aria-hidden="true"
          >
            ツ
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="fetchi-wordmark text-5xl text-brand-near-black">Fetchi</h1>
          <p className="text-sm uppercase tracking-widest text-brand-dark font-semibold">
            Signal-based lead generation
          </p>
        </div>
        <p className="text-lg text-brand-near-black/80 leading-relaxed">
          Tell us what your business sells — we&apos;ll find the buyers who need
          it this week.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-brand-near-black text-white font-semibold hover:bg-brand-green transition-colors"
          >
            Start your trial
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl border-2 border-brand-near-black/15 bg-white text-brand-near-black font-semibold hover:border-brand-near-black transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
