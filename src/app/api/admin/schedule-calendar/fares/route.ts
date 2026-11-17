import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Full DSVN fare list (every seat type) for one departure, for the day panel. */
export async function GET(request: NextRequest) {
  const authorization = await requireAdminApi(['admin', 'operations', 'pricing', 'support'])
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status })

  const departureId = Number(request.nextUrl.searchParams.get('departureId'))
  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return NextResponse.json({ error: 'Chuyến không hợp lệ.' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('admin_departure_dsvn_fares', { p_departure_id: departureId })
  if (error) {
    console.error('[api/admin/schedule-calendar/fares]', error.message)
    return NextResponse.json({ error: 'Không tải được giá DSVN.' }, { status: 500 })
  }
  return NextResponse.json({ fares: Array.isArray(data) ? data : [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
