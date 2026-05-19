import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/blocked',
  '/verify-email',
  '/api/clerk/webhook',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

function adminAllowlist(): string[] {
  return (process.env.FETCHI_ADMIN_USER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
  // Early /admin allowlist rejection — defense in depth alongside the
  // requireAdmin() check inside app/admin/layout.tsx and every admin server
  // action. FETCHI_ADMIN_USER_IDS is a comma-separated list of Clerk user IDs.
  if (isAdminRoute(req)) {
    const { userId } = await auth()
    if (!userId || !adminAllowlist().includes(userId)) {
      return NextResponse.redirect(new URL('/app', req.url))
    }
  }
  // Forward the current pathname as a REQUEST header so server components
  // (e.g. /app layout's onboarding redirect) can read it via `headers()`.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', req.nextUrl.pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
