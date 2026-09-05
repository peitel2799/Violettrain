import { NextRequest, NextResponse } from 'next/server'
import { createBooking, getBookings } from '@/lib/admin-store'
import { z } from 'zod'
import { CABIN_PRODUCTS, type CabinProductId } from '@/lib/cabin-products'
import {
  getTrainRoute,
  getTrainStation,
  searchSchedules,
} from '@/lib/train-database'

const passengerSchema = z.object({
  type: z.enum(['adult', 'child']),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(30),
  dateOfBirth: z.string().optional(),
})

const bookingRequestSchema = z.object({
  routeId: z.string().trim().min(3),
  cabinClassId: z.enum(['standard', 'premium']),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trainNumber: z.string().trim().min(2).max(10),
  isRoundTrip: z.boolean().default(false),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passengers: z.array(passengerSchema).min(1).max(4),
  contact: z.object({
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(8).max(30),
  }),
}).superRefine((value, context) => {
  if (value.isRoundTrip && !value.returnDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['returnDate'],
      message: 'Return date is required for a round trip',
    })
  }
})

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
    const parsed = bookingRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking request', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const body = parsed.data
    const [from, to, ...extraRouteParts] = body.routeId.toLowerCase().split('-')
    const route = extraRouteParts.length === 0 ? getTrainRoute(from, to) : undefined
    const fromStation = from ? getTrainStation(from) : undefined
    const toStation = to ? getTrainStation(to) : undefined
    if (!route || !fromStation || !toStation) {
      return NextResponse.json({ error: 'Unsupported booking route' }, { status: 400 })
    }

    const schedule = searchSchedules(from, to, body.departureDate, 'vi')
      .find((entry) => entry.trainNumber === body.trainNumber.toUpperCase())
    if (!schedule) {
      return NextResponse.json(
        { error: 'The selected train is not available for this route and date' },
        { status: 400 }
      )
    }

    const cabinClassId = body.cabinClassId as CabinProductId
    const cabin = CABIN_PRODUCTS[cabinClassId]
    const unitPrice = schedule.availableSeats.find(
      (entry) => entry.seatClass === cabinClassId
    )?.price
    if (!unitPrice) {
      return NextResponse.json({ error: 'No fare found for the selected cabin' }, { status: 400 })
    }

    const journeyCount = body.isRoundTrip ? 2 : 1
    const subtotal = unitPrice * body.passengers.length * journeyCount
    const tax = Math.round(subtotal * 0.1)
    const now = new Date().toISOString()
    const reference = `VT-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

    const booking = createBooking({
      id: `BK-${crypto.randomUUID()}`,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      routeId: `${from}-${to}`,
      routeName: `${fromStation.nameVi} → ${toStation.nameVi}`,
      cabinClassId,
      cabinClassName: cabin.nameVi,
      departureDate: body.departureDate,
      departureTime: schedule.departureTime,
      trainNumber: schedule.trainNumber,
      isRoundTrip: body.isRoundTrip,
      returnDate: body.returnDate,
      passengers: body.passengers,
      pricing: { subtotal, tax, total: subtotal + tax },
      payment: { method: '' },
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, booking }, { status: 201 })
  } catch (err) {
    console.error('[API /bookings POST]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create booking', details: message }, { status: 500 })
  }
}
