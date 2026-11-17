import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/admin-session'
import { getDsvnSyncConfiguration, runDsvnScheduleSync } from '@/lib/dsvn-sync'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const requestSchema = z.object({ days: z.coerce.number().int().min(1).max(31).optional() })

export async function GET() {
  const authorization = await requireAdminApi(['admin', 'operations'])
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('schedule_sync_runs')
    .select('id, status, trigger_type, window_start, window_end, requested_snapshots, completed_snapshots, fetched_departures, upserted_departures, cancelled_departures, draft_departures, fare_dates, fare_rows, projected_departures, dsvn_horizon, error_summary, started_at, finished_at')
    .eq('source', 'dsvn')
    .order('started_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    { config: getDsvnSyncConfiguration(), runs: data },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdminApi(['admin', 'operations'])
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Số ngày đồng bộ phải từ 1 đến 31.' }, { status: 400 })
  }

  try {
    const result = await runDsvnScheduleSync('manual', parsed.data.days)
    return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể đồng bộ lịch DSVN.' },
      { status: 500 }
    )
  }
}
