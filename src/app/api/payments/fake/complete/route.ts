import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

const querySchema = z.object({
  payment: z.string().min(8).max(120),
  reference: z.string().regex(/^VT-[A-Z0-9]{12}$/),
  token: z.string().uuid(),
  locale: z.enum(['vi', 'en']).default('vi'),
})

export async function GET(request: NextRequest) {
  const fakeEnabled = process.env.NODE_ENV !== 'production' && process.env.PAYMENT_FAKE_ENABLED === 'true'
  if (!fakeEnabled) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid simulation request.' }, { status: 400 })

  const supabase = createSupabaseServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, total_vnd')
    .eq('public_reference', parsed.data.reference)
    .eq('verification_token', parsed.data.token)
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  const { error } = await supabase.rpc('apply_verified_payment_event', {
    p_provider: 'fake',
    p_merchant_request_id: parsed.data.payment,
    p_provider_event_id: `fake-${parsed.data.payment}`,
    p_provider_transaction_id: `SIM-${Date.now()}`,
    p_reported_amount_vnd: Number(order.total_vnd),
    p_result_code: '00',
    p_success: true,
    p_redacted_payload: { simulator: true },
  })
  if (error) {
    console.error('[GET /api/payments/fake/complete]', error.message)
  }

  const statusUrl = new URL(`/${parsed.data.locale}/booking/status`, request.url)
  statusUrl.searchParams.set('reference', parsed.data.reference)
  return NextResponse.redirect(statusUrl)
}
