import { NextRequest, NextResponse } from 'next/server'
import { getBookings, updateBookingStatus } from '@/lib/admin-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params
  const allBookings = getBookings()
  const booking = allBookings.find((b) => b.reference === ref || b.id === ref)

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  return NextResponse.json({ booking })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params
    const body = await request.json()

    const allBookings = getBookings()
    const booking = allBookings.find((b) => b.reference === ref || b.id === ref)

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const updated = updateBookingStatus(ref, body.status, body.paymentStatus)

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking: updated })
  } catch (err) {
    console.error('[API /bookings/[ref] PATCH]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update booking', details: message }, { status: 500 })
  }
}
