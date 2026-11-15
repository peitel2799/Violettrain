import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// The DSVN timetable sync launches the serverless Chromium shipped in
// @sparticuz/chromium/bin. Its brotli archives are loaded at runtime, so file
// tracing cannot see them; include them explicitly for the routes that crawl.
const chromiumBinaries = ['./node_modules/@sparticuz/chromium/bin/**']

const isDev = process.env.NODE_ENV !== 'production'

const remoteImageHosts = [
  'https://images.unsplash.com',
  'https://plus.unsplash.com',
  'https://source.unsplash.com',
  'https://picsum.photos',
  'https://*.picsum.photos',
  'https://*.googleapis.com',
  'https://*.ggpht.com',
]

// Content Security Policy. Card details are entered only on the PayPal/VNPay
// hosted pages (reached by a full-page redirect), so this site never needs to
// load payment scripts or frames. Next.js hydration uses inline scripts, which
// is why script-src keeps 'unsafe-inline'; connect-src/img-src/form-action stay
// locked to this site so injected code cannot ship customer data elsewhere.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${remoteImageHosts.join(' ')}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "media-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // HTTPS only for two years, including subdomains (no effect on plain-HTTP localhost).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Clickjacking: no site may frame the booking or payment pages.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Never leak booking references or tokens in the Referer sent to other sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

// Responses that can contain customer, order or payment data must never be cached.
const privateNoStore = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/admin/:path*', headers: privateNoStore },
      { source: '/api/bookings/:path*', headers: privateNoStore },
      { source: '/api/bookings', headers: privateNoStore },
      { source: '/api/payments/:path*', headers: privateNoStore },
      { source: '/api/booking/:path*', headers: privateNoStore },
      {
        source: '/admin/:path*',
        headers: [...privateNoStore, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  outputFileTracingIncludes: {
    '/api/cron/dsvn-sync': chromiumBinaries,
    '/api/admin/operations/dsvn-sync': chromiumBinaries,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: '*.googleapis.com' },
      { protocol: 'https', hostname: '*.ggpht.com' },
    ],
  },
}

export default withNextIntl(nextConfig)
