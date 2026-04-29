import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, amount, bookingRef, customerInfo } = body

    if (!bookingId || !amount || !bookingRef) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, amount, bookingRef' },
        { status: 400 }
      )
    }

    const vnp_TmnCode = process.env.VNP_TMN_CODE
    const vnp_HashSecret = process.env.VNP_HASH_SECRET
    const vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    const vnp_ReturnUrl = process.env.VNP_RETURN_URL || 'http://localhost:3456/api/payments/vnpay/return'

    if (!vnp_TmnCode || !vnp_HashSecret) {
      // Return a demo URL for development
      const demoUrl = `${vnp_ReturnUrl}?vnp_ResponseCode=00&vnp_TxnRef=${bookingRef}&vnp_Amount=${amount}&vnp_BankCode=NCB&vnp_PayDate=${new Date().toISOString().replace(/[-:T]/g, '').split('.')[0]}`
      return NextResponse.json({
        paymentUrl: demoUrl,
        transactionId: `DEMO-${Date.now()}`,
        mode: 'demo',
      })
    }

    // Build VNPay payment URL
    const vnp_Version = '2.1.0'
    const vnp_Command = 'pay'
    const vnp_CurrCode = 'VND'
    const vnp_Locale = customerInfo?.locale === 'en' ? 'en' : 'vn'
    const vnp_OrderType = 'other'
    const vnp_Amount = Math.round(Number(amount)) * 100 // VNPay uses cents
    const vnp_TxnRef = bookingRef
    const vnp_CreateDate = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .split('.')[0]
    const vnp_IpAddr =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    const params: Record<string, string> = {
      vnp_Version,
      vnp_Command,
      vnp_TmnCode,
      vnp_Locale,
      vnp_CurrCode,
      vnp_OrderType,
      vnp_Amount: String(vnp_Amount),
      vnp_TxnRef,
      vnp_CreateDate,
      vnp_IpAddr,
      vnp_ReturnUrl,
    }

    if (customerInfo?.name) params['vnp_OrderInfo'] = `Violette Train - ${bookingRef} - ${customerInfo.name}`
    if (customerInfo?.email) params['vnp_CustomerInfo'] = customerInfo.email

    // Sort params and build query string
    const sortedKeys = Object.keys(params).sort()
    const queryParts = sortedKeys.map((key) => `${key}=${encodeURIComponent(params[key])}`)
    const queryString = queryParts.join('&')

    // Generate HMAC SHA512 signature
    const hmac = crypto.createHmac('sha512', vnp_HashSecret)
    hmac.update(queryString)
    const vnp_SecureHash = hmac.digest('hex')

    const paymentUrl = `${vnp_Url}?${queryString}&vnp_SecureHash=${vnp_SecureHash}`

    console.log(`\n💳 [VNPAY] Payment initiated for ${bookingRef} | Amount: ${amount} VND`)

    return NextResponse.json({
      paymentUrl,
      transactionId: `VNP-${vnp_TxnRef}-${Date.now()}`,
      mode: 'production',
    })
  } catch (err) {
    console.error('[API /payments/vnpay]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Payment initiation failed', details: message }, { status: 500 })
  }
}
