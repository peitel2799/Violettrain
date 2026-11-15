import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getVnpayConfig, verifyVnpayParameters } from '@/lib/payments/vnpay'

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'vi'
  const config = getVnpayConfig()
  const verified = config
    ? verifyVnpayParameters(request.nextUrl.searchParams, config.hashSecret)
    : { valid: false, parameters: {} as Record<string, string> }
  let reference = ''

  if (verified.valid && verified.parameters.vnp_TxnRef) {
    const supabase = createSupabaseServiceClient()
    const { data: payment } = await supabase
      .from('payments')
      .select('order:orders(public_reference)')
      .eq('provider', 'vnpay')
      .eq('merchant_request_id', verified.parameters.vnp_TxnRef)
      .single()
    const order = Array.isArray(payment?.order) ? payment.order[0] : payment?.order
    reference = (order as { public_reference?: string } | null)?.public_reference || ''
  }

  const statusUrl = new URL(`/${locale}/booking/status`, request.url)
  if (reference) statusUrl.searchParams.set('reference', reference)
  statusUrl.searchParams.set('return', verified.valid ? 'verified' : 'invalid')
  return NextResponse.redirect(statusUrl)
}
