import { NextRequest, NextResponse } from 'next/server'
import { triggerBookingEmail, type BookingEmailData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = [
      'bookingRef',
      'customerName',
      'customerEmail',
      'customerPhone',
      'trainNumber',
      'fromStation',
      'toStation',
      'departureDate',
      'departureTime',
      'arrivalTime',
      'seatClass',
      'seatClassVi',
      'seatClassEn',
      'passengers',
      'isRoundTrip',
      'subtotal',
      'tax',
      'total',
      'locale',
    ]

    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate passengers array
    if (!Array.isArray(body.passengers) || body.passengers.length === 0) {
      return NextResponse.json(
        { error: 'At least one passenger is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const emailData: BookingEmailData = {
      bookingRef: body.bookingRef,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      trainNumber: body.trainNumber,
      fromStation: body.fromStation,
      toStation: body.toStation,
      departureDate: body.departureDate,
      departureTime: body.departureTime,
      arrivalTime: body.arrivalTime,
      seatClass: body.seatClass,
      seatClassVi: body.seatClassVi,
      seatClassEn: body.seatClassEn,
      passengers: body.passengers.map((p: { name: string; type: string }) => ({
        name: p.name,
        type: p.type === 'child' ? 'child' : 'adult',
      })),
      isRoundTrip: Boolean(body.isRoundTrip),
      returnDate: body.returnDate || undefined,
      returnTime: body.returnTime || undefined,
      subtotal: Number(body.subtotal),
      discount: Number(body.discount || 0),
      tax: Number(body.tax),
      total: Number(body.total),
      locale: body.locale === 'en' ? 'en' : 'vi',
    }

    const result = await triggerBookingEmail(emailData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('[API /booking/email]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
