import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Server-to-server callbacks: they carry no browser Origin and are
 * authenticated by their own signature or secret instead.
 */
const ORIGIN_CHECK_EXEMPT = ['/api/payments/paypal/webhook', '/api/payments/vnpay/ipn', '/api/cron/']

function allowedHosts(request: NextRequest) {
  const hosts = new Set<string>([request.nextUrl.host])
  const host = request.headers.get('host')
  if (host) hosts.add(host)
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (forwardedHost) hosts.add(forwardedHost)
  for (const value of [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.ALLOWED_ORIGINS ?? '').split(',')]) {
    try {
      if (value?.trim()) hosts.add(new URL(value.trim()).host)
    } catch {
      // Ignore malformed entries.
    }
  }
  return hosts
}

/**
 * CSRF guard for state-changing API calls: a browser always sends Origin (or
 * Sec-Fetch-Site) on cross-site requests, so anything coming from another
 * website is refused before it reaches a route handler.
 */
function isCrossSiteRequest(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== 'null') {
    try {
      return !allowedHosts(request).has(new URL(origin).host)
    } catch {
      return true
    }
  }
  if (origin === 'null') return true
  const fetchSite = request.headers.get('sec-fetch-site')
  return fetchSite === 'cross-site' || fetchSite === 'same-site'
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    if (
      UNSAFE_METHODS.has(request.method)
      && !ORIGIN_CHECK_EXEMPT.some((prefix) => pathname.startsWith(prefix))
      && isCrossSiteRequest(request)
    ) {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 })
    }
    return NextResponse.next()
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/', '/(vi|en)/:path*', '/api/:path*'],
}
