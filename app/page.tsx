import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/app/chat')

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-5 py-12">
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

        <h1 className="fetchi-wordmark text-[44px] lg:text-[52px] leading-none text-text">
          Fetchi
        </h1>
        {/* Marketing italic kicker — one of the five sanctioned coral places. */}
        <div className="kicker-serif text-[15px] lg:text-[16px] italic text-coral mt-3">
          Signal-based lead generation.
        </div>

        <p className="text-[16px] text-text/75 leading-relaxed mt-6 mx-auto max-w-sm">
          Tell ツ what your business sells. We&apos;ll find the buyers who need
          it this week — before your competition even sees them.
        </p>

        <div className="flex flex-col gap-3 mt-9">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-coral text-white font-semibold text-[15px] hover:bg-coralDeep transition-colors"
          >
            Start your free trial
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center h-11 px-6 text-text/70 hover:text-text font-medium text-[14px]"
          >
            I already have an account
          </Link>
        </div>

        <div className="text-[12px] text-text/45 mt-8">
          10 free leads. No card required.
        </div>
      </div>
    </main>
  )
}
