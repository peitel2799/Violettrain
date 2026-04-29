/**
 * GET /api/admin/bookings
 * Query params: ?status=confirmed&limit=50&offset=0
 *
 * GET /api/admin/bookings?ref=XXX
 * Get a specific booking by reference.
 *
 * PATCH /api/admin/bookings
 * Body: { reference, status, paymentStatus }
 * Update booking status.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getBookings,
  getBookingByReference,
  updateBookingStatus,
  createBooking,
  type AdminBooking,
} from '@/lib/admin-store'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')
    const status = searchParams.get('status')
    const routeId = searchParams.get('routeId')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    if (ref) {
      const booking = getBookingByReference(ref)
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      return NextResponse.json({ booking })
    }

    let bookings = getBookings()
    if (status) {
      bookings = bookings.filter((b) => b.status === status)
    }
    if (routeId) {
      bookings = bookings.filter((b) => b.routeId === routeId)
    }

    const total = bookings.length
    const paginated = bookings.slice(offset, offset + limit)

    return NextResponse.json({ bookings: paginated, total, limit, offset })
  } catch (error) {
    console.error('[API /admin/bookings GET]', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const body = await request.json()
    const booking = body as AdminBooking

    if (!booking.reference || !booking.routeId || !booking.cabinClassId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existing = getBookingByReference(booking.reference)
    if (existing) {
      return NextResponse.json({ error: 'Booking already exists' }, { status: 409 })
    }

    const created = createBooking(booking)
    return NextResponse.json({ booking: created }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/bookings POST]', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const body = await request.json()
    const { reference, status, paymentStatus } = body

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const updated = updateBookingStatus(reference, status, paymentStatus)
    if (!updated) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ booking: updated })
  } catch (error) {
    console.error('[API /admin/bookings PATCH]', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
