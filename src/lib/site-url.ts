/**
 * Public origin of the website (no trailing slash), for canonical links, the
 * sitemap and links inside emails.
 *
 * NEXT_PUBLIC_SITE_URL wins once a real domain is configured; otherwise the
 * Vercel production domain (always set by Vercel) is used, so links never point
 * at a domain that does not exist yet.
 */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  return 'https://violettrain.vercel.app'
}
