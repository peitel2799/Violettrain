/**
 * Violette Train Schedule Data — SERVER-ONLY
 * This file imports 'fs' and 'path' and must only be used in Server Components / API Routes.
 *
 * For client-safe schedule data (stations, routes, search, pricing),
 * import from '@/lib/dsvn-client' instead.
 */

import fs from 'fs'
import path from 'path'

// Re-export everything from the client-safe module
export {
  STATIONS,
  ROUTES,
  ROUTE_CODE_TO_KEY,
  getAllStations,
  type Station,
  type RouteInfo,
  searchSchedules,
  getAllSchedulesForRoute,
  getRoutePricing,
  type RoutePricing,
  FALLBACK_NEWS,
  type NewsItem,
} from './dsvn-client'

import type { NewsItem } from './dsvn-client'
import { FALLBACK_NEWS } from './dsvn-client'

// ---------------------------------------------------------------------------
// Server-only: News data from file system
// ---------------------------------------------------------------------------

const NEWS_FILE = path.join(process.cwd(), 'data', 'news.json')

export async function fetchNews(limit = 10): Promise<NewsItem[]> {
  try {
    if (fs.existsSync(NEWS_FILE)) {
      const raw = fs.readFileSync(NEWS_FILE, 'utf-8')
      const all: NewsItem[] = JSON.parse(raw)
      const sorted = all.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      return sorted.slice(0, limit)
    }
  } catch {
    // fall through to fallback
  }
  return FALLBACK_NEWS.slice(0, limit)
}
