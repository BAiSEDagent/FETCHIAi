import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, inArray, eq, count } from 'drizzle-orm'
import { db, opportunities } from '@/db'
import { requireWorkspaceContext } from '@/lib/workspace'
import { Sidebar } from '@/components/app/Sidebar'
import { MobileHeader } from '@/components/app/MobileHeader'
import { MobileBottomNav } from '@/components/app/MobileBottomNav'
import { CreditsWidget } from '@/components/app/CreditsWidget'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requireWorkspaceContext()

  const h = await headers()
  const pathname = h.get('x-pathname') ?? h.get('next-url') ?? ''
  const onOnboarding = pathname.includes('/app/onboarding')

  if (ctx.workspace.onboardingStep < 4 && !onOnboarding) {
    redirect('/app/onboarding')
  }

  const [{ value: leadsCount }] = await db
    .select({ value: count() })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.workspaceId, ctx.workspaceId),
        inArray(opportunities.status, ['saved', 'contacted', 'responded', 'won', 'lost']),
      ),
    )

  const credits = <CreditsWidget subscription={ctx.subscription} />

  if (onOnboarding) {
    return (
      <div className="theme-light min-h-screen bg-brand-parchment text-brand-near-black">{children}</div>
    )
  }

  return (
    <div className="theme-light min-h-screen bg-brand-parchment text-brand-near-black flex flex-col">
      <MobileHeader leadsCount={leadsCount} creditsSlot={credits} />
      <div className="flex flex-1 min-h-0">
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar leadsCount={leadsCount} creditsSlot={credits} />
        </div>
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
