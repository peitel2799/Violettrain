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

    const partnerCode = process.env.MOMO_PARTNER_CODE
    const accessKey = process.env.MOMO_ACCESS_KEY
    const secretKey = process.env.MOMO_SECRET_KEY
    const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create'
    const returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:3456/api/payments/momo/return'

    if (!partnerCode || !accessKey || !secretKey) {
      // Return a demo response for development
      const demoPayUrl = `${returnUrl}?resultCode=0&message=Success&bookingRef=${bookingRef}`
      return NextResponse.json({
        payUrl: demoPayUrl,
        deeplink: demoPayUrl,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(demoPayUrl)}`,
        transactionId: `DEMO-MOMO-${Date.now()}`,
        mode: 'demo',
      })
    }

    const requestId = `${Date.now()}`
    const orderId = bookingRef
    const orderInfo = `Violette Train - ${bookingRef}`
    const redirectUrl = returnUrl
    const ipnUrl = process.env.MOMO_NOTIFY_URL || returnUrl

    const rawData = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=captureWallet`,
    ].join('&')

    const signature = crypto.createHmac('sha256', secretKey).update(rawData).digest('hex')

    const momoPayload = {
      partnerCode,
      partnerName: 'Violette Train',
      storeId: 'VioletteTrain',
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: customerInfo?.locale === 'en' ? 'en' : 'vi',
      requestType: 'captureWallet',
      extraData: '',
      signature,
    }

    const momoRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momoPayload),
    })

    const momoData = await momoRes.json()

    if (momoData.resultCode === 0) {
      console.log(`\n💳 [MOMO] Payment initiated for ${bookingRef} | Amount: ${amount} VND`)
      return NextResponse.json({
        payUrl: momoData.payUrl,
        deeplink: momoData.deeplink,
        qrCodeUrl: momoData.qrCodeUrl,
        transactionId: `MOMO-${orderId}-${Date.now()}`,
        mode: 'production',
      })
    }

    console.error(`[MOMO] Error:`, momoData)
    return NextResponse.json(
      { error: 'MoMo payment initiation failed', details: momoData.message || momoData.resultMessage },
      { status: 400 }
    )
  } catch (err) {
    console.error('[API /payments/momo]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Payment initiation failed', details: message }, { status: 500 })
  }
}
