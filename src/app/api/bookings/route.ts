import { NextRequest, NextResponse } from 'next/server'
import { createBooking, getBookings } from '@/lib/admin-store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const routeId = searchParams.get('routeId')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const allBookings = getBookings()

  let filtered = allBookings

  if (status) {
    filtered = filtered.filter((b) => b.status === status)
  }

  if (routeId) {
    filtered = filtered.filter((b) => b.routeId === routeId)
  }

  // Sort by creation date descending
  filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = filtered.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return NextResponse.json({
    bookings: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const required = [
      'routeId',
      'cabinClassId',
      'departureDate',
      'trainNumber',
      'passengers',
      'pricing',
      'contact',
    ]

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const booking = createBooking({
      ...body,
      status: body.status || 'pending',
      paymentStatus: body.paymentStatus || 'pending',
    })

    return NextResponse.json({ success: true, booking }, { status: 201 })
  } catch (err) {
    console.error('[API /bookings POST]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create booking', details: message }, { status: 500 })
  }
}
