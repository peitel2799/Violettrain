import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const resultCode = searchParams.get('resultCode')
  const transId = searchParams.get('transId')
  const orderId = searchParams.get('orderId')
  const message = searchParams.get('message')

  console.log('\n💳 [MOMO RETURN]')
  console.log('  ResultCode:', resultCode)
  console.log('  TransId:', transId)
  console.log('  OrderId:', orderId)
  console.log('  Message:', message)
  console.log('---\n')

  const isSuccess = resultCode === '0'
  const locale = searchParams.get('locale') || 'vi'

  const params = new URLSearchParams({
    ref: orderId || '',
    status: isSuccess ? 'success' : 'failed',
    method: 'momo',
    message: message || (isSuccess ? 'Success' : 'Payment failed'),
  })

  redirect(`/${locale}/booking?${params.toString()}`)
}
