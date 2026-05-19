import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/app/chat')

  return (
    <main className="min-h-screen bg-brand-parchment flex flex-col items-center justify-center px-5 py-12">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <span
            className="fetchi-avatar"
            style={{ width: 80, height: 80, fontSize: 40, lineHeight: 1 }}
            aria-hidden="true"
          >
            ツ
          </span>
        </div>

        <h1 className="fetchi-wordmark text-[44px] lg:text-[52px] leading-none text-brand-near-black">
          Fetchi
        </h1>
        <div className="text-[12px] font-bold uppercase tracking-[1.5px] text-brand-dark mt-3">
          Signal-based lead generation
        </div>

        <p className="text-[16px] text-brand-near-black/75 leading-relaxed mt-6 mx-auto max-w-sm">
          Tell ツ what your business sells. We&apos;ll find the buyers who need
          it this week — before your competition even sees them.
        </p>

        <div className="flex flex-col gap-3 mt-9">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-brand-near-black text-white font-semibold text-[15px] hover:bg-brand-green transition-colors"
          >
            Start your free trial
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center h-11 px-6 text-brand-near-black/70 hover:text-brand-near-black font-medium text-[14px]"
          >
            I already have an account
          </Link>
        </div>

        <div className="text-[12px] text-brand-near-black/45 mt-8">
          10 free leads. No card required.
        </div>
      </div>
    </main>
  )
}
