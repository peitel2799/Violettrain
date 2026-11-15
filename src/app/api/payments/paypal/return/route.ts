import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getPaypalConfig } from '@/lib/payments/paypal'
import { captureAndSettle, findPaypalPayment } from '@/lib/payments/paypal-settlement'

export const dynamic = 'force-dynamic'

/**
 * PayPal redirects the buyer here after approval (?token=<PayPal order id>).
 * The query string is not trusted: the server captures the order through the
 * PayPal API and settles from that response. Replays are idempotent.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'vi'
  const orderId = request.nextUrl.searchParams.get('token')?.trim() ?? ''
  const statusUrl = new URL(`/${locale}/booking/status`, request.url)
  const config = getPaypalConfig()

  if (!config || !/^[A-Z0-9-]{6,64}$/i.test(orderId)) {
    statusUrl.searchParams.set('return', 'invalid')
    return NextResponse.redirect(statusUrl)
  }

  const supabase = createSupabaseServiceClient()
  const payment = await findPaypalPayment(supabase, { checkoutId: orderId })
  if (!payment) {
    statusUrl.searchParams.set('return', 'invalid')
    return NextResponse.redirect(statusUrl)
  }

  try {
    const result = await captureAndSettle(supabase, config, payment, orderId)
    if (result.reference) statusUrl.searchParams.set('reference', result.reference)
    statusUrl.searchParams.set('return', result.outcome === 'failed' ? 'failed' : 'verified')
  } catch (error) {
    // The webhook (CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED) retries settlement.
    console.error('[PayPal return]', error instanceof Error ? error.message : error)
    const order = Array.isArray(payment.order) ? payment.order[0] : payment.order
    if (order?.public_reference) statusUrl.searchParams.set('reference', order.public_reference)
    statusUrl.searchParams.set('return', 'pending')
  }
  return NextResponse.redirect(statusUrl)
}
