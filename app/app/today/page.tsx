import { requireWorkspaceContext } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  await requireWorkspaceContext()
  return (
    <div className="px-4 lg:px-7 py-5 lg:py-7">
      <div className="bg-white border border-brand-near-black/10 rounded-2xl p-8 lg:p-12 text-center max-w-2xl">
        <div className="text-3xl mb-3">☀️</div>
        <h1 className="font-outfit text-2xl text-brand-near-black mb-2">
          Today&apos;s Run
        </h1>
        <p className="text-sm text-brand-near-black/65 leading-relaxed max-w-md mx-auto">
          The route planner and swipe stack land alongside live scouting in
          Checkpoint 6. For now, browse leads on the My Leads tab.
        </p>
      </div>
    </div>
  )
}
