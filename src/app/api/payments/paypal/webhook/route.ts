import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getPaypalConfig, verifyPaypalWebhook, type PaypalCapture } from '@/lib/payments/paypal'
import { captureAndSettle, findPaypalPayment, settlePaypalCapture } from '@/lib/payments/paypal-settlement'
import { enforceRateLimit, MINUTE } from '@/lib/security/rate-limit'
import { readJsonBody } from '@/lib/security/request'

export const dynamic = 'force-dynamic'

type WebhookEvent = {
  id?: string
  event_type?: string
  resource?: {
    id?: string
    status?: string
    custom_id?: string
    amount?: { currency_code?: string; value?: string }
    supplementary_data?: { related_ids?: { order_id?: string } }
  }
}

const CAPTURE_EVENTS = ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED']

/**
 * Server-to-server safety net for buyers who close the browser after approving:
 * - CHECKOUT.ORDER.APPROVED -> capture the order, then settle.
 * - PAYMENT.CAPTURE.*       -> settle the reported capture.
 * Every event is signature-verified through PayPal before anything changes.
 */
export async function POST(request: NextRequest) {
  const config = getPaypalConfig()
  if (!config?.webhookId) return NextResponse.json({ error: 'PayPal webhook is not configured.' }, { status: 503 })

  // Each unverified delivery costs a PayPal API call, so floods are cut off early.
  const limited = enforceRateLimit(request, [{ name: 'paypal-webhook', limit: 120, windowMs: MINUTE }])
  if (limited) return limited

  let event: WebhookEvent | null
  try {
    event = (await readJsonBody(request, 256 * 1024)) as WebhookEvent | null
  } catch {
    return NextResponse.json({ error: 'Event too large.' }, { status: 413 })
  }
  if (!event?.event_type || !event.resource) return NextResponse.json({ error: 'Invalid event.' }, { status: 400 })
  if (!(await verifyPaypalWebhook(config, request.headers, event))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  const resource = event.resource

  try {
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED' && resource.id) {
      const payment = await findPaypalPayment(supabase, { checkoutId: resource.id })
      if (payment) await captureAndSettle(supabase, config, payment, resource.id)
    } else if (CAPTURE_EVENTS.includes(event.event_type) && resource.id) {
      const orderId = resource.supplementary_data?.related_ids?.order_id ?? null
      const payment = await findPaypalPayment(supabase, { merchantRequestId: resource.custom_id ?? null, checkoutId: orderId })
      if (payment) {
        const capture: PaypalCapture = {
          id: resource.id,
          status: event.event_type === 'PAYMENT.CAPTURE.COMPLETED' ? 'COMPLETED' : 'DECLINED',
          currency: resource.amount?.currency_code ?? '',
          amountMinor: Math.round(Number(resource.amount?.value) * 100),
          customId: resource.custom_id ?? null,
          orderId,
        }
        await settlePaypalCapture(supabase, payment, capture)
      }
    } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED' || event.event_type === 'PAYMENT.CAPTURE.REVERSED') {
      // Refunds and chargebacks are handled by staff for now; log for reconciliation.
      console.warn('[PayPal webhook]', event.event_type, resource.id, resource.custom_id)
    }
  } catch (error) {
    console.error('[PayPal webhook]', event.event_type, error instanceof Error ? error.message : error)
    // A non-2xx response makes PayPal retry the delivery later.
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
