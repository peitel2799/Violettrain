import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { capturePaypalOrder, type PaypalCapture, type PaypalConfig } from './paypal'

type PaypalPaymentRow = {
  merchant_request_id: string
  requested_amount_vnd: number
  provider_currency: string | null
  provider_amount_minor: number | null
  fx_vnd_per_unit: number | null
  order: { public_reference: string } | Array<{ public_reference: string }> | null
}

export type SettlementResult = {
  reference: string | null
  outcome: 'confirmed' | 'pending' | 'failed' | 'review' | 'duplicate' | 'unknown'
}

const PAYMENT_COLUMNS = 'merchant_request_id, requested_amount_vnd, provider_currency, provider_amount_minor, fx_vnd_per_unit, order:orders(public_reference)'

function referenceOf(row: PaypalPaymentRow | null) {
  const order = Array.isArray(row?.order) ? row?.order[0] : row?.order
  return order?.public_reference ?? null
}

export async function findPaypalPayment(supabase: SupabaseClient, by: { checkoutId?: string | null; merchantRequestId?: string | null }) {
  let query = supabase.from('payments').select(PAYMENT_COLUMNS).eq('provider', 'paypal')
  if (by.merchantRequestId) query = query.eq('merchant_request_id', by.merchantRequestId)
  else if (by.checkoutId) query = query.eq('provider_checkout_id', by.checkoutId)
  else return null
  const { data } = await query.maybeSingle()
  return (data as PaypalPaymentRow | null) ?? null
}

/**
 * Applies a PayPal capture result to the order through the shared, idempotent
 * payment state machine. The event id is derived from the capture id and status,
 * so the return redirect and the webhook for the same capture apply only once.
 */
export async function settlePaypalCapture(supabase: SupabaseClient, payment: PaypalPaymentRow, capture: PaypalCapture): Promise<SettlementResult> {
  const reference = referenceOf(payment)
  if (capture.status === 'PENDING') return { reference, outcome: 'pending' }

  const success = capture.status === 'COMPLETED'
  const amountMatches = capture.currency === payment.provider_currency
    && Number.isFinite(capture.amountMinor)
    && capture.amountMinor === Number(payment.provider_amount_minor)
  // A matching foreign amount is reported as the exact VND total; anything else
  // is converted back so the state machine routes it to manual review.
  const reportedVnd = !success || amountMatches
    ? Number(payment.requested_amount_vnd)
    : Math.max(Math.round((capture.amountMinor / 100) * Number(payment.fx_vnd_per_unit || 0)), 0)

  const { data, error } = await supabase.rpc('apply_verified_payment_event', {
    p_provider: 'paypal',
    p_merchant_request_id: payment.merchant_request_id,
    p_provider_event_id: `capture:${capture.id}:${capture.status}`,
    p_provider_transaction_id: capture.id,
    p_reported_amount_vnd: reportedVnd,
    p_result_code: capture.status,
    p_success: success,
    p_redacted_payload: {
      orderId: capture.orderId,
      captureStatus: capture.status,
      currency: capture.currency,
      amountMinor: capture.amountMinor,
    },
  })
  if (error) throw new Error(`apply_verified_payment_event failed: ${error.message}`)

  const result = String((data as { result?: string } | null)?.result ?? '')
  // 'already_processed' (a replay) falls through to 'unknown': the status page reads the stored truth.
  if (result === 'confirmed' || result === 'already_confirmed') return { reference, outcome: 'confirmed' }
  if (result === 'payment_failed') return { reference, outcome: 'failed' }
  if (result === 'duplicate_payment_review') return { reference, outcome: 'duplicate' }
  if (result.endsWith('_review')) return { reference, outcome: 'review' }
  return { reference, outcome: 'unknown' }
}

/** Captures an approved PayPal order (idempotent) and settles it. */
export async function captureAndSettle(supabase: SupabaseClient, config: PaypalConfig, payment: PaypalPaymentRow, orderId: string) {
  const { capture } = await capturePaypalOrder(config, orderId, payment.merchant_request_id)
  if (!capture) return { reference: referenceOf(payment), outcome: 'pending' as const }
  return settlePaypalCapture(supabase, payment, capture)
}
