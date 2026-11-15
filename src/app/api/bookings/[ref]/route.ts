import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { enforceRateLimit, MINUTE } from '@/lib/security/rate-limit'

const tokenSchema = z.string().uuid()
const referenceSchema = z.string().trim().regex(/^VT-[A-Z0-9]{6,16}$/i)

const STATUS_LIMITS = [{ name: 'order-status', limit: 60, windowMs: 5 * MINUTE }]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  if (!isSupabaseConfigured() || process.env.BOOKING_DATA_SOURCE === 'reference') {
    return NextResponse.json({ error: 'Secure order status is unavailable.' }, { status: 503 })
  }

  const limited = enforceRateLimit(request, STATUS_LIMITS)
  if (limited) return limited

  const { ref } = await params
  const reference = referenceSchema.safeParse(ref)
  // The token travels in a header so it never lands in access logs or browser history.
  // The query parameter is still read for links created before this change.
  const token = tokenSchema.safeParse(
    request.headers.get('x-order-token') ?? request.nextUrl.searchParams.get('token')
  )
  if (!reference.success || !token.success) {
    return NextResponse.json({ error: 'A valid order verification token is required.' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.rpc('get_order_receipt', {
    p_reference: reference.data,
    p_verification_token: token.data,
  })

  if (error) {
    console.error('[GET /api/bookings/[ref]] get_order_receipt', error.message)
    return NextResponse.json({ error: 'Unable to load order status.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  return NextResponse.json({ order: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Public order status changes are not allowed.' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}
