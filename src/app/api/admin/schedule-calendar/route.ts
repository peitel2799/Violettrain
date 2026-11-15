import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/admin-session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readJsonBody } from '@/lib/security/request'

export const dynamic = 'force-dynamic'

// Trains, timetables and departures all come from the DSVN sync. Staff only set
// what Violette sells: the fare, whether a departure is on sale, and how many cabins.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ.')
const ticketPrice = z.number().int().min(10_000, 'Giá 1 vé tối thiểu 10.000đ.').max(100_000_000, 'Giá 1 vé quá lớn.')
const departureRef = z.object({ id: z.number().int().positive(), version: z.number().int().positive().optional() })

const updateSchema = z.object({
  action: z.literal('update'),
  items: z.array(departureRef).min(1, 'Bạn chưa chọn chuyến nào.').max(500, 'Mỗi lần chỉ sửa được tối đa 500 chuyến.'),
  // Cancelling a train is DSVN's decision (the sync does it); staff can only pause or resume sales.
  status: z.enum(['draft', 'published']).nullish(),
  standardTicketPriceVnd: ticketPrice.nullish(),
  standardCapacity: z.number().int().min(0).max(100).nullish(),
  vip2TicketPriceVnd: ticketPrice.nullish(),
  vip2Capacity: z.number().int().min(0).max(1).nullish(),
  reason: z.string().trim().max(300).optional(),
})

type DatabaseError = { message: string; code?: string } | null

/** Our SQL functions raise VT4xx codes with staff-friendly Vietnamese messages. */
function errorResponse(error: DatabaseError, fallback: string) {
  const code = error?.code ?? ''
  if (code === 'VT400' || code === 'VT403' || code === 'VT409') {
    return NextResponse.json(
      { error: error?.message || fallback, conflict: code === 'VT409' },
      { status: Number(code.slice(2)) }
    )
  }
  if (code === '42501') {
    return NextResponse.json({ error: 'Tài khoản của bạn không có quyền thực hiện thao tác này.' }, { status: 403 })
  }
  if (code === 'PGRST202' || code === '42883') {
    return NextResponse.json(
      { error: 'Cơ sở dữ liệu chưa được cập nhật. Hãy chạy "npx supabase db push" rồi tải lại trang.' },
      { status: 503 }
    )
  }
  console.error('[api/admin/schedule-calendar]', error?.code, error?.message)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdminApi(['admin', 'operations', 'pricing', 'support'])
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status })

  const params = request.nextUrl.searchParams
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  if (!isoDate.safeParse(from).success || !isoDate.safeParse(to).success || to < from || to > addDays(from, 62)) {
    return NextResponse.json({ error: 'Khoảng ngày cần xem không hợp lệ.' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const routesResult = await supabase
    .from('routes')
    .select('id, code, active, from_station:stations!routes_from_station_id_fkey(code, name_vi), to_station:stations!routes_to_station_id_fkey(code, name_vi)')
    .eq('active', true)
    .order('code')
  if (routesResult.error) return errorResponse(routesResult.error, 'Không tải được danh sách tuyến.')

  const routes = routesResult.data ?? []
  const requestedRouteId = Number(params.get('routeId'))
  const routeId = routes.some((route) => route.id === requestedRouteId) ? requestedRouteId : routes[0]?.id

  let departures: unknown[] = []
  if (routeId) {
    const { data, error } = await supabase.rpc('admin_schedule_calendar', { p_route_id: routeId, p_from: from, p_to: to })
    if (error) return errorResponse(error, 'Không tải được lịch chạy.')
    departures = Array.isArray(data) ? data : []
  }

  // Latest DSVN timetable sync (readable by admin/operations; null for other roles).
  const { data: lastSync } = await supabase
    .from('schedule_sync_runs')
    .select('status, started_at, finished_at, error_summary')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(
    {
      routes,
      routeId: routeId ?? null,
      departures,
      viewer: { role: authorization.session.role, displayName: authorization.session.displayName },
      serverTime: new Date().toISOString(),
      lastSync: lastSync
        ? { status: lastSync.status, startedAt: lastSync.started_at, finishedAt: lastSync.finished_at, error: lastSync.error_summary }
        : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdminApi(['admin', 'operations', 'pricing'])
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status })

  const parsed = updateSchema.safeParse(await readJsonBody(request, 64 * 1024).catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
  }

  const body = parsed.data
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('admin_bulk_update_departures', {
    p_items: body.items,
    p_status: body.status ?? null,
    p_standard_ticket_price_vnd: body.standardTicketPriceVnd ?? null,
    p_standard_capacity: body.standardCapacity ?? null,
    p_vip2_ticket_price_vnd: body.vip2TicketPriceVnd ?? null,
    p_vip2_capacity: body.vip2Capacity ?? null,
    p_reason: body.reason || null,
  })
  if (error) return errorResponse(error, 'Không lưu được thay đổi. Vui lòng thử lại.')
  return NextResponse.json({ result: data })
}
