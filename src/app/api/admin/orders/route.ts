import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/admin-session'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { sendOrderEmail } from '@/lib/booking-mail'
import { readJsonBody } from '@/lib/security/request'

const ORDER_STATUSES = [
  'awaiting_payment', 'payment_review', 'confirmed', 'completed',
  'expired', 'cancelled', 'refund_pending', 'refunded',
] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]
const ORDER_LIST_LIMIT = 200

function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain) return '***'
  return `${name.slice(0, 2)}***@${domain}`
}

function maskPhone(phone: string) {
  return phone.length > 4 ? `${'*'.repeat(Math.min(6, phone.length - 4))}${phone.slice(-4)}` : '****'
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdminApi(['admin', 'operations', 'pricing', 'support'])
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  // Staff who follow up with guests see the full WhatsApp number; pricing staff do not.
  const canContact = ['admin', 'operations', 'support'].includes(authorization.session.role)

  // One status or a comma-separated group ("awaiting_payment,payment_review"); unknown values are ignored.
  const statuses = (request.nextUrl.searchParams.get('status') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is OrderStatus => ORDER_STATUSES.includes(value as OrderStatus))
  // Characters with a meaning in PostgREST filter syntax are dropped from the free-text search.
  const search = (request.nextUrl.searchParams.get('search') ?? '').replace(/[%_,()"'\\*:]/g, ' ').trim().slice(0, 80)
  const serviceClient = createSupabaseServiceClient()
  const { error: expiryError } = await serviceClient.rpc('expire_booking_holds', { p_batch_size: 200 })
  if (expiryError) console.error('[GET /api/admin/orders] Failed to expire stale holds:', expiryError.message)

  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('orders')
    .select(`
      id, public_reference, status, payment_status, contact_email, contact_phone, contact_whatsapp, locale,
      payment_channel, booking_email_sent_at, payment_email_sent_at, cancellation_reason,
      subtotal_vnd, tax_vnd, total_vnd, price_expires_at, confirmed_at, created_at, updated_at,
      legs:order_legs(leg_number, train_number, from_station_name_vi, to_station_name_vi, departure_at, product_name_vi),
      payments(provider, status, provider_transaction_id, provider_result_code, created_at),
      passengers(passenger_number, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(ORDER_LIST_LIMIT)

  if (statuses.length) query = query.in('status', statuses)
  if (search) {
    const filters = [
      `public_reference.ilike.%${search}%`,
      `contact_email.ilike.%${search}%`,
      `contact_phone.ilike.%${search}%`,
      `contact_whatsapp.ilike.%${search}%`,
    ]
    // Guest names live on passengers; staff without access to them (pricing) get no matches here.
    if (canContact) {
      const { data: byName, error: nameError } = await supabase
        .from('passengers')
        .select('order_id')
        .ilike('full_name', `%${search}%`)
        .limit(100)
      if (nameError) console.error('[GET /api/admin/orders] Name search failed:', nameError.message)
      const orderIds = [...new Set((byName ?? []).map((row) => row.order_id as string))]
      if (orderIds.length) filters.push(`id.in.(${orderIds.join(',')})`)
    }
    query = query.or(filters.join(','))
  }

  // Badge on the "Cần xử lý" tab: orders staff still have to act on, whatever tab is open.
  const pendingCount = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['awaiting_payment', 'payment_review'])

  const [{ data, error }, { count: actionCount, error: countError }] = await Promise.all([query, pendingCount])
  if (error) {
    console.error('[GET /api/admin/orders]', error.code, error.message)
    return NextResponse.json({ error: 'Không tải được danh sách đơn. Vui lòng thử lại.' }, { status: 500 })
  }
  if (countError) console.error('[GET /api/admin/orders] Count failed:', countError.message)

  return NextResponse.json({
    viewer: { role: authorization.session.role },
    actionCount: actionCount ?? null,
    limited: (data?.length ?? 0) >= ORDER_LIST_LIMIT,
    orders: (data || []).map(({ passengers, ...order }) => {
      const guests = [...(passengers ?? [])].sort((a, b) => a.passenger_number - b.passenger_number)
      return {
        ...order,
        lead_guest: canContact ? guests[0]?.full_name ?? null : null,
        guest_count: guests.length,
        contact_email: canContact ? order.contact_email : maskEmail(order.contact_email),
        contact_phone: maskPhone(order.contact_phone),
        contact_whatsapp: order.contact_whatsapp ? (canContact ? order.contact_whatsapp : maskPhone(order.contact_whatsapp)) : null,
      }
    }),
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

const reference = z.string().trim().regex(/^VT-[A-Z0-9]{12}$/, 'Mã đơn không hợp lệ.')
const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('confirm-payment'),
    reference,
    paypalReference: z.string().trim().max(80).optional(),
    note: z.string().trim().max(300).optional(),
  }),
  z.object({ action: z.literal('cancel'), reference, reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal('resend-email'), reference }),
])

function databaseError(error: { message: string; code?: string }) {
  if (error.code === 'VT400' || error.code === 'VT403' || error.code === 'VT409') {
    return NextResponse.json({ error: error.message }, { status: Number(error.code.slice(2)) })
  }
  if (error.code === 'PGRST202' || error.code === '42883') {
    return NextResponse.json({ error: 'Cơ sở dữ liệu chưa được cập nhật. Hãy chạy "npx supabase db push".' }, { status: 503 })
  }
  console.error('[POST /api/admin/orders]', error.code, error.message)
  return NextResponse.json({ error: 'Không thực hiện được thao tác. Vui lòng thử lại.' }, { status: 500 })
}

/** Staff actions for manually paid (PayPal transfer) orders. */
export async function POST(request: NextRequest) {
  const parsed = actionSchema.safeParse(await readJsonBody(request, 4 * 1024).catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 })
  }
  const body = parsed.data
  const authorization = await requireAdminApi(body.action === 'resend-email' ? ['admin', 'operations', 'support'] : ['admin', 'operations'])
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status })

  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  if (body.action === 'confirm-payment') {
    const { error } = await supabase.rpc('admin_confirm_manual_payment', {
      p_reference: body.reference,
      p_paypal_reference: body.paypalReference || null,
      p_note: body.note || null,
    })
    if (error) return databaseError(error)
    const email = await sendOrderEmail(service, body.reference, 'payment')
    return NextResponse.json({
      message: email.sent
        ? 'Đã xác nhận thanh toán và gửi email xác nhận cho khách.'
        : `Đã xác nhận thanh toán. Chưa gửi được email cho khách${email.error ? ` (${email.error})` : ''} — có thể bấm "Gửi lại email".`,
      emailSent: email.sent,
    })
  }

  if (body.action === 'cancel') {
    const { error } = await supabase.rpc('admin_cancel_unpaid_order', { p_reference: body.reference, p_reason: body.reason || null })
    if (error) return databaseError(error)
    return NextResponse.json({ message: 'Đã hủy đơn và mở bán lại cabin.' })
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('status, payment_status')
    .eq('public_reference', body.reference)
    .maybeSingle()
  if (orderError) return databaseError(orderError)
  if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 })
  const kind = order.status === 'confirmed' && order.payment_status === 'paid' ? 'payment' : 'booking'
  const email = await sendOrderEmail(service, body.reference, kind, true)
  if (!email.sent) {
    return NextResponse.json({ error: `Không gửi được email${email.error ? `: ${email.error}` : ''}.` }, { status: 502 })
  }
  return NextResponse.json({ message: kind === 'payment' ? 'Đã gửi lại email xác nhận thanh toán.' : 'Đã gửi lại email hướng dẫn chuyển khoản PayPal.' })
}
