import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_BankCode, vnp_PayDate } = body

    console.log('\n💳 [VNPAY IPN]')
    console.log('  ResponseCode:', vnp_ResponseCode)
    console.log('  TxnRef:', vnp_TxnRef)
    console.log('---\n')

    // Verify secure hash if hash secret is configured
    const vnp_HashSecret = process.env.VNP_HASH_SECRET
    if (vnp_HashSecret && request.headers) {
      const allParams = { ...body }
      delete allParams['vnp_SecureHash']
      delete allParams['vnp_SecureHashType']

      const sortedKeys = Object.keys(allParams).sort()
      const queryParts = sortedKeys.map(
        (key) => `${key}=${encodeURIComponent(allParams[key] || '')}`
      )
      const queryString = queryParts.join('&')

      const hmac = crypto.createHmac('sha512', vnp_HashSecret)
      hmac.update(queryString)
      const computedHash = hmac.digest('hex')

      if (computedHash !== body.vnp_SecureHash) {
        console.error('[VNPAY IPN] Invalid signature')
        return NextResponse.json({ RspCode: '97', Message: 'Invalid signature' }, { status: 200 })
      }
    }

    if (vnp_ResponseCode === '00') {
      // Payment successful — update booking status here when database is ready
      console.log(`[VNPAY IPN] Payment SUCCESS for booking ${vnp_TxnRef}`)
      return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' })
    }

    return NextResponse.json({ RspCode: vnp_ResponseCode || '99', Message: 'Payment failed' })
  } catch (err) {
    console.error('[VNPAY IPN Error]', err)
    return NextResponse.json({ RspCode: '99', Message: 'System error' }, { status: 200 })
  }
}
