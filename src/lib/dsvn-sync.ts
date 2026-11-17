import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { addDays, runDsvnSync, vietnamToday, type DsvnSyncResult } from '@/lib/dsvn-sync-core'

export type { DsvnSyncResult }

const DSVN_PORTAL_URL = 'https://giotaugiave.dsvn.vn/'
/** Vercel route handlers stop at maxDuration (300 s); leave room to close the browser and save. */
const SERVERLESS_BUDGET_MS = 240_000

function defaultDays() {
  return Math.min(Math.max(Number(process.env.DSVN_SYNC_DAYS) || 30, 1), 31)
}

export function getDsvnSyncConfiguration() {
  return {
    configured: true,
    sourceUrl: DSVN_PORTAL_URL,
    method: 'browser-crawl' as const,
    defaultDays: defaultDays(),
    timezone: 'Asia/Ho_Chi_Minh',
  }
}

/**
 * Nightly / admin-triggered sync: timetable for the next `days` days, then DSVN
 * fares for the stalest of those dates while time remains. Dates further out
 * (up to June 2027 and beyond) are filled by `npm run dsvn:sync`.
 */
export async function runDsvnScheduleSync(trigger: 'cron' | 'manual', requestedDays?: number): Promise<DsvnSyncResult> {
  const days = Math.min(Math.max(requestedDays ?? defaultDays(), 1), 31)
  const from = vietnamToday()
  return runDsvnSync({
    supabase: createSupabaseServiceClient(),
    trigger,
    from,
    until: addDays(from, days - 1),
    budgetMs: SERVERLESS_BUDGET_MS,
  })
}
