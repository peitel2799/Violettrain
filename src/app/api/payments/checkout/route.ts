import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { createVnpayPaymentUrl, getVnpayConfig, vnpayInternationalCardsEnabled } from '@/lib/payments/vnpay'
import { createPaypalOrder, getPaypalConfig, vndToMinorUnits } from '@/lib/payments/paypal'
import { enforceRateLimit, getClientIp, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { BodyTooLargeError, getPublicOrigin, readJsonBody } from '@/lib/security/request'

// Opening a checkout is cheap for an attacker and costly for us (provider API
// calls, card-testing through the hosted page), so it is rate limited per IP
// and per order.
const CHECKOUT_LIMITS = [
  { name: 'checkout-burst', limit: 10, windowMs: 5 * MINUTE },
  { name: 'checkout-hourly', limit: 40, windowMs: HOUR },
]

const checkoutSchema = z.object({
  reference: z.string().trim().regex(/^VT-[A-Z0-9]{12}$/),
  verificationToken: z.string().uuid(),
  provider: z.enum(['fake', 'vnpay', 'paypal']),
  /** VNPay only: "intcard" opens the international card form directly. */
  method: z.enum(['default', 'intcard']).default('default'),
  locale: z.enum(['vi', 'en']).default('vi'),
})

type PaymentAttempt = {
  merchantRequestId: string
  providerCheckoutId: string | null
  providerAmountMinor: number | null
}

function errorMessage(locale: 'vi' | 'en', vi: string, en: string) {
  return locale === 'vi' ? vi : en
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, CHECKOUT_LIMITS)
  if (limited) return limited

  let body: unknown
  try {
    body = await readJsonBody(request, 4 * 1024)
  } catch (error) {
    if (error instanceof BodyTooLargeError) return NextResponse.json({ error: error.message }, { status: 413 })
    throw error
  }
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 })
  }
  const { locale, provider } = parsed.data

  const perOrder = enforceRateLimit(request, [{ name: 'checkout-order', limit: 15, windowMs: HOUR }], {
    extraKey: parsed.data.reference,
  })
  if (perOrder) return perOrder

  try {
    const supabase = createSupabaseServiceClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, public_reference, verification_token, status, total_vnd, price_expires_at')
      .eq('public_reference', parsed.data.reference)
      .eq('verification_token', parsed.data.verificationToken)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: errorMessage(locale, 'Không tìm thấy đơn hàng.', 'Order not found.') }, { status: 404 })
    }
    if (order.status !== 'awaiting_payment') {
      return NextResponse.json({ error: errorMessage(locale, 'Đơn này không còn chờ thanh toán.', 'This order is not awaiting payment.') }, { status: 409 })
    }
    const expiresAt = new Date(order.price_expires_at)
    if (expiresAt.getTime() <= Date.now()) {
      await supabase.rpc('expire_booking_holds', { p_batch_size: 100 })
      return NextResponse.json({ error: errorMessage(locale, 'Đã hết thời gian giữ cabin. Vui lòng tìm chuyến lại.', 'The cabin hold has expired. Please search again.') }, { status: 409 })
    }

    const fakeEnabled = process.env.NODE_ENV !== 'production' && process.env.PAYMENT_FAKE_ENABLED === 'true'
    if (provider === 'fake' && !fakeEnabled) {
      return NextResponse.json({ error: 'Local payment simulation is disabled.' }, { status: 403 })
    }
    const vnpayConfig = provider === 'vnpay' ? getVnpayConfig() : null
    if (provider === 'vnpay' && !vnpayConfig) {
      return NextResponse.json({ error: errorMessage(locale, 'Cổng VNPay chưa được cấu hình.', 'VNPay is not configured.') }, { status: 503 })
    }
    if (provider === 'vnpay' && parsed.data.method === 'intcard' && !vnpayInternationalCardsEnabled()) {
      return NextResponse.json({ error: errorMessage(locale, 'Thanh toán thẻ quốc tế chưa được bật.', 'International card payment is not enabled.') }, { status: 503 })
    }
    const paypalConfig = provider === 'paypal' ? getPaypalConfig() : null
    if (provider === 'paypal' && !paypalConfig) {
      return NextResponse.json({ error: errorMessage(locale, 'PayPal chưa được cấu hình.', 'PayPal is not configured.') }, { status: 503 })
    }

    const merchantRequestId = `${order.public_reference.replaceAll('-', '')}${Date.now()}`
    const { data: attemptData, error: paymentError } = await supabase.rpc('create_payment_attempt', {
      p_order_reference: order.public_reference,
      p_provider: provider,
      p_merchant_request_id: merchantRequestId,
      p_checkout_expires_at: expiresAt.toISOString(),
    })
    if (paymentError) throw paymentError
    const attempt = attemptData as PaymentAttempt
    const activeMerchantRequestId = String(attempt?.merchantRequestId || merchantRequestId)
    const origin = getPublicOrigin(request)

    if (provider === 'fake') {
      const checkoutUrl = new URL('/api/payments/fake/complete', origin)
      checkoutUrl.searchParams.set('payment', activeMerchantRequestId)
      checkoutUrl.searchParams.set('reference', order.public_reference)
      checkoutUrl.searchParams.set('token', parsed.data.verificationToken)
      checkoutUrl.searchParams.set('locale', locale)
      return NextResponse.json({ provider: 'fake', redirectUrl: checkoutUrl.toString() })
    }

    if (provider === 'paypal') {
      const config = paypalConfig!
      // Reuse the amount fixed for this attempt so a rate change never alters an open checkout.
      const amountMinor = attempt.providerAmountMinor ?? vndToMinorUnits(Number(order.total_vnd), config.vndPerUnit)
      const paypalOrder = await createPaypalOrder({
        config,
        merchantRequestId: activeMerchantRequestId,
        reference: order.public_reference,
        amountMinor,
        returnUrl: `${origin}/api/payments/paypal/return?locale=${locale}`,
        cancelUrl: `${origin}/api/payments/paypal/cancel?locale=${locale}`,
        locale,
      })
      const { error: attachError } = await supabase.rpc('attach_payment_checkout', {
        p_provider: 'paypal',
        p_merchant_request_id: activeMerchantRequestId,
        p_checkout_id: paypalOrder.id,
        p_currency: config.currency,
        p_amount_minor: amountMinor,
        p_fx_vnd_per_unit: config.vndPerUnit,
      })
      if (attachError) throw attachError
      return NextResponse.json({ provider: 'paypal', redirectUrl: paypalOrder.approveUrl, amountMinor, currency: config.currency })
    }

    const config = vnpayConfig!
    const clientIp = getClientIp(request)
    const redirectUrl = createVnpayPaymentUrl({
      config,
      merchantRequestId: activeMerchantRequestId,
      amountVnd: Number(order.total_vnd),
      returnUrl: `${origin}/api/payments/vnpay/return?locale=${locale}`,
      ipAddress: clientIp === 'unknown' ? '127.0.0.1' : clientIp,
      locale,
      expiresAt,
      bankCode: parsed.data.method === 'intcard' ? 'INTCARD' : undefined,
    })

    return NextResponse.json({ provider: 'vnpay', redirectUrl })
  } catch (error) {
    console.error('[POST /api/payments/checkout]', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: errorMessage(locale, 'Không mở được cổng thanh toán. Vui lòng thử lại hoặc chọn phương thức khác.', 'Unable to start checkout. Please try again or choose another method.') },
      { status: 500 }
    )
  }
}
