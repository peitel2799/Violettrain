import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getVnpayConfig, verifyVnpayParameters } from '@/lib/payments/vnpay'

function response(RspCode: string, Message: string) {
  return NextResponse.json({ RspCode, Message }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  const config = getVnpayConfig()
  if (!config) return response('99', 'Merchant is not configured')

  const verified = verifyVnpayParameters(request.nextUrl.searchParams, config.hashSecret)
  if (!verified.valid) return response('97', 'Invalid signature')

  const merchantRequestId = verified.parameters.vnp_TxnRef
  const amountVnd = Number(verified.parameters.vnp_Amount || 0) / 100
  if (!merchantRequestId) return response('01', 'Order not found')
  if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) return response('04', 'Invalid amount')

  const supabase = createSupabaseServiceClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('id, requested_amount_vnd')
    .eq('provider', 'vnpay')
    .eq('merchant_request_id', merchantRequestId)
    .single()
  if (!payment) return response('01', 'Order not found')
  if (Number(payment.requested_amount_vnd) !== amountVnd) return response('04', 'Invalid amount')

  const success = verified.parameters.vnp_ResponseCode === '00'
    && verified.parameters.vnp_TransactionStatus === '00'
  const eventSeed = [
    merchantRequestId,
    verified.parameters.vnp_TransactionNo || '',
    verified.parameters.vnp_PayDate || '',
    verified.parameters.vnp_ResponseCode || '',
  ].join(':')
  const eventId = createHash('sha256').update(eventSeed).digest('hex')
  const { error } = await supabase.rpc('apply_verified_payment_event', {
    p_provider: 'vnpay',
    p_merchant_request_id: merchantRequestId,
    p_provider_event_id: eventId,
    p_provider_transaction_id: verified.parameters.vnp_TransactionNo || '',
    p_reported_amount_vnd: amountVnd,
    p_result_code: verified.parameters.vnp_ResponseCode || '99',
    p_success: success,
    p_redacted_payload: {
      bankCode: verified.parameters.vnp_BankCode || null,
      cardType: verified.parameters.vnp_CardType || null,
      payDate: verified.parameters.vnp_PayDate || null,
      transactionStatus: verified.parameters.vnp_TransactionStatus || null,
    },
  })
  if (error) {
    console.error('[VNPay IPN]', error.message)
    return response('99', 'Processing error')
  }
  return response('00', 'Confirm Success')
}
