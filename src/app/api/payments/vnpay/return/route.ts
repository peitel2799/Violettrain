import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const vnp_ResponseCode = searchParams.get('vnp_ResponseCode')
  const vnp_TxnRef = searchParams.get('vnp_TxnRef')
  const vnp_Amount = searchParams.get('vnp_Amount')
  const vnp_BankCode = searchParams.get('vnp_BankCode')
  const vnp_PayDate = searchParams.get('vnp_PayDate')

  console.log('\n💳 [VNPAY RETURN]')
  console.log('  ResponseCode:', vnp_ResponseCode)
  console.log('  TxnRef:', vnp_TxnRef)
  console.log('  Amount:', vnp_Amount)
  console.log('  BankCode:', vnp_BankCode)
  console.log('  PayDate:', vnp_PayDate)
  console.log('---\n')

  const isSuccess = vnp_ResponseCode === '00'

  const params = new URLSearchParams({
    ref: vnp_TxnRef || '',
    status: isSuccess ? 'success' : 'failed',
    method: 'vnpay',
  })

  if (isSuccess) {
    params.set('message', 'Payment successful')
  } else {
    params.set('message', vnp_ResponseCode || 'Payment failed')
  }

  // Decode locale from return URL or default to vi
  const locale = searchParams.get('locale') || 'vi'

  redirect(`/${locale}/booking?${params.toString()}`)
}
