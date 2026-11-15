import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Routes whose timetable is read from DSVN. Read-only: stations, trains and
 * departures come from the DSVN sync (see ./dsvn-sync), staff never edit them.
 */
export async function GET() {
  const authorization = await requireAdminApi(['admin', 'operations', 'pricing', 'support'])
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('routes')
    .select('id, code, active, from_station:stations!routes_from_station_id_fkey(code, name_vi), to_station:stations!routes_to_station_id_fkey(code, name_vi)')
    .order('code')

  if (error) {
    console.error('[GET /api/admin/operations]', error.code, error.message)
    return NextResponse.json({ error: 'Không thể tải danh sách tuyến.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      routes: data ?? [],
      viewer: { role: authorization.session.role, displayName: authorization.session.displayName },
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
