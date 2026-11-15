import { NextResponse } from 'next/server'
import { getVnpayConfig, vnpayInternationalCardsEnabled } from '@/lib/payments/vnpay'
import { getPaypalConfig } from '@/lib/payments/paypal'

export const dynamic = 'force-dynamic'

/** Payment methods the checkout may offer. Contains no secrets. */
export async function GET() {
  const vnpay = Boolean(getVnpayConfig())
  const paypal = getPaypalConfig()
  return NextResponse.json(
    {
      vnpay,
      vnpayInternationalCards: vnpay && vnpayInternationalCardsEnabled(),
      paypal: paypal ? { currency: paypal.currency, vndPerUnit: paypal.vndPerUnit, sandbox: !paypal.live } : null,
      fake: process.env.NODE_ENV !== 'production' && process.env.PAYMENT_FAKE_ENABLED === 'true',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
