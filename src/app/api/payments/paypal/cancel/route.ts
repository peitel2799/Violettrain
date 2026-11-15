import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { findPaypalPayment } from '@/lib/payments/paypal-settlement'

export const dynamic = 'force-dynamic'

/** The buyer left PayPal without paying. The cabin hold stays, so they can pick another method. */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'vi'
  const orderId = request.nextUrl.searchParams.get('token')?.trim() ?? ''
  const statusUrl = new URL(`/${locale}/booking/status`, request.url)
  statusUrl.searchParams.set('return', 'cancelled')

  if (/^[A-Z0-9-]{6,64}$/i.test(orderId)) {
    const payment = await findPaypalPayment(createSupabaseServiceClient(), { checkoutId: orderId })
    const order = Array.isArray(payment?.order) ? payment?.order[0] : payment?.order
    if (order?.public_reference) statusUrl.searchParams.set('reference', order.public_reference)
  }
  return NextResponse.redirect(statusUrl)
}
