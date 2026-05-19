import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export function getAdminUserIds(): string[] {
  const raw = process.env.FETCHI_ADMIN_USER_IDS ?? ''
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false
  return getAdminUserIds().includes(userId)
}

export type AdminContext = {
  userId: string
  email: string | null
  fullName: string | null
}

/**
 * Defense-in-depth gate for /admin routes. The middleware already requires
 * a logged-in Clerk user; this enforces the FETCHI_ADMIN_USER_IDS allowlist
 * and is safe to call from any server component or server action under /admin.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  if (!isAdminUserId(userId)) redirect('/app')

  const user = await currentUser()
  const primary = user?.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
  return {
    userId,
    email: primary?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null,
    fullName: user?.fullName ?? user?.firstName ?? null,
  }
}
