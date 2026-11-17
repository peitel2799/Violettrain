import { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { BLOG_POSTS } from '@/lib/constants'
import { POLICY_PATHS } from '@/lib/policies'
import { siteUrl } from '@/lib/site-url'

type Entry = { path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }

const PAGES: Entry[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/booking', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/cabins', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/news', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  ...Object.values(POLICY_PATHS).map((path) => ({ path, changeFrequency: 'monthly' as const, priority: 0.3 })),
]

/** Every page exists once per locale; all URLs carry the /vi or /en prefix (localePrefix: 'always'). */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl()
  const entries: Entry[] = [
    ...PAGES,
    ...BLOG_POSTS.map((post) => ({ path: `/blog/${post.slug}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ]

  return entries.flatMap((entry) =>
    routing.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${entry.path}`,
      lastModified: new Date(),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((other) => [other, `${baseUrl}/${other}${entry.path}`])),
      },
    }))
  )
}
