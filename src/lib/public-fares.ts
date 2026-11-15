import 'server-only'

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase/config'
import type { CabinProductId } from '@/lib/cabin-products'

/** Cheapest/highest one-ticket fare currently on sale, per route ("HNO-HUE") and product. */
export type LiveFareRange = { min: number; max: number }
export type LiveFares = {
  byRoute: Record<string, Partial<Record<CabinProductId, LiveFareRange>>>
  lowest: Partial<Record<CabinProductId, number>>
}

type OverviewRow = {
  product_code: CabinProductId
  from_station_code: string
  to_station_code: string
  min_ticket_price_vnd: number
  max_ticket_price_vnd: number
}

const loadLiveFares = unstable_cache(
  async (): Promise<LiveFares | null> => {
    const { url, anonKey } = getSupabaseConfig()
    const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await supabase.rpc('public_fare_overview', { p_days: 90 })
    if (error) {
      console.error('[public-fares]', error.message)
      return null
    }

    const rows = (data ?? []) as OverviewRow[]
    if (!rows.length) return null

    const fares: LiveFares = { byRoute: {}, lowest: {} }
    for (const row of rows) {
      const key = `${row.from_station_code}-${row.to_station_code}`.toUpperCase()
      const min = Number(row.min_ticket_price_vnd)
      const max = Number(row.max_ticket_price_vnd)
      fares.byRoute[key] = { ...fares.byRoute[key], [row.product_code]: { min, max } }
      fares.lowest[row.product_code] = Math.min(fares.lowest[row.product_code] ?? Infinity, min)
    }
    return fares
  },
  ['public-fare-overview'],
  // Staff price edits reach marketing sections within five minutes; booking search is always live.
  { revalidate: 300 }
)

/** Returns null when Supabase is not the booking source or nothing is on sale; callers fall back to reference fares. */
export async function getLiveFares(): Promise<LiveFares | null> {
  if (process.env.BOOKING_DATA_SOURCE === 'reference' || !isSupabaseConfigured()) return null
  try {
    return await loadLiveFares()
  } catch (error) {
    console.error('[public-fares]', error instanceof Error ? error.message : error)
    return null
  }
}
