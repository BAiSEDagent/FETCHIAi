import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getDemoLeads } from '@/lib/demo/leads'
import { Sidebar } from '@/components/app/Sidebar'
import { MobileBottomNav } from '@/components/app/MobileBottomNav'
import { MobileHeader } from '@/components/app/MobileHeader'
import { CreditChipServer } from '@/components/app/CreditChipServer'
import { getOnboardingStatus } from '@/lib/actions/onboarding'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in')
  }

  const status = await getOnboardingStatus()
  const onOnboarding = status.currentPath === '/app/onboarding'
  if (!status.hasCompletedOnboarding && !onOnboarding) {
    redirect('/app/onboarding')
  }
  const leadsCount = getDemoLeads().length
  const credits = <CreditChipServer />

  if (onOnboarding) {
    return (
      <div className="theme-light min-h-screen bg-bg text-text">{children}</div>
    )
  }

  return (
    <div data-fetchi-theme-root className="theme-dark min-h-screen bg-bg text-text flex flex-col">
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
