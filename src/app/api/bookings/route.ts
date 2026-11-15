import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/admin-store'
import { z } from 'zod'
import { CABIN_PRODUCTS, type CabinProductId } from '@/lib/cabin-products'
import {
  getTrainRoute,
  getTrainStation,
  isCabinProductAvailableOnTrain,
  searchSchedules,
} from '@/lib/train-database'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getManualPaymentConfig, getPaymentMode, manualPaymentInfo, sendOrderEmail } from '@/lib/booking-mail'
import { normalizeWhatsapp } from '@/lib/whatsapp'
import { enforceRateLimit, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { BodyTooLargeError, readJsonBody } from '@/lib/security/request'

/** Markup, links and control characters have no place in a name; they would only serve injection. */
const UNSAFE_TEXT = /[<>{}[\]\\`"]|[\u0000-\u001f\u007f]|https?:\/\/|www\./i
const PHONE = /^\+?[\d\s()-]{8,30}$/

const safeName = z.string().trim().min(2).max(120)
  .refine((value) => !UNSAFE_TEXT.test(value), 'Name contains characters that are not allowed')

const passengerSchema = z.object({
  type: z.enum(['adult', 'child']),
  fullName: safeName,
  email: z.string().trim().email().max(160),
  phone: z.string().trim().regex(PHONE),
  dateOfBirth: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
}).strip()

/** Messages raised by our own database functions; anything else stays internal. */
const PUBLIC_DATABASE_ERRORS = [
  /sold out/i,
  /unavailable/i,
  /expired/i,
  /already departed/i,
  /VIP2 is available only on SE19/i,
  /Return departure must/i,
  /Passenger count must be between/i,
  /Contact (email|phone) is required/i,
  /Unsupported (locale|cabin product)/i,
]

const BOOKING_LIMITS = [
  { name: 'booking-create-burst', limit: 8, windowMs: 10 * MINUTE },
  { name: 'booking-create-hourly', limit: 30, windowMs: HOUR },
]

const bookingRequestSchema = z.object({
  departureId: z.number().int().positive().optional(),
  returnDepartureId: z.number().int().positive().optional(),
  idempotencyKey: z.string().uuid().optional(),
  /** Language of the page the guest booked on; decides receipt/station names. */
  locale: z.enum(['vi', 'en']).optional(),
  routeId: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/i),
  cabinClassId: z.enum(['standard', 'premium']),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trainNumber: z.string().trim().min(2).max(10).regex(/^[A-Z0-9]+$/i),
  isRoundTrip: z.boolean().default(false),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passengers: z.array(passengerSchema).min(1).max(4),
  contact: z.object({
    email: z.string().trim().email().max(160),
    phone: z.string().trim().regex(PHONE),
    /** WhatsApp number of the lead guest (required while payments are handled manually). */
    whatsapp: z.string().trim().max(30).optional(),
  }),
}).superRefine((value, context) => {
  if (value.isRoundTrip && !value.returnDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['returnDate'],
      message: 'Return date is required for a round trip',
    })
  }
  if (value.isRoundTrip && value.departureId && !value.returnDepartureId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['returnDepartureId'],
      message: 'A dated return departure is required for a round trip',
    })
  }
})

export async function GET() {
  return NextResponse.json(
    { error: 'Booking collections are available only in the authenticated admin.' },
    { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, BOOKING_LIMITS, {
    message: 'Too many booking attempts. Please wait a few minutes and try again.',
  })
  if (limited) return limited

  try {
    const parsed = bookingRequestSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking request', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const body = parsed.data
    const useDatabase = process.env.BOOKING_DATA_SOURCE !== 'reference' && isSupabaseConfigured()

    if (useDatabase) {
      if (!body.departureId) {
        return NextResponse.json({ error: 'A published dated departure is required.' }, { status: 400 })
      }

      const manualMode = getPaymentMode() === 'manual_paypal'
      const whatsapp = normalizeWhatsapp(body.contact.whatsapp ?? '')
      if (manualMode && !whatsapp) {
        return NextResponse.json(
          { error: 'A valid WhatsApp number with country code is required.', issues: { whatsapp: ['invalid'] } },
          { status: 400 }
        )
      }

      const perContact = enforceRateLimit(request, [{ name: 'booking-create-contact', limit: 10, windowMs: HOUR }], {
        extraKey: body.contact.email,
        message: 'Too many booking attempts. Please wait a few minutes and try again.',
      })
      if (perContact) return perContact

      // Holds are created only through this rate-limited route: the RPC is no
      // longer executable with the public anon key (see the hardening migration).
      const supabase = createSupabaseServiceClient()
      const { data, error } = await supabase.rpc('create_booking_hold', {
        p_departure_id: body.departureId,
        p_return_departure_id: body.isRoundTrip ? body.returnDepartureId ?? null : null,
        p_product_code: body.cabinClassId,
        p_contact_email: body.contact.email,
        p_contact_phone: body.contact.phone,
        p_locale: body.locale ?? (request.headers.get('accept-language')?.toLowerCase().startsWith('en') ? 'en' : 'vi'),
        p_passengers: body.passengers,
        p_idempotency_key: body.idempotencyKey || crypto.randomUUID(),
      })

      if (error) {
        const soldOut = /sold out|unavailable|expired/i.test(error.message)
        const publicMessage = PUBLIC_DATABASE_ERRORS.some((pattern) => pattern.test(error.message))
        if (!publicMessage) console.error('[POST /api/bookings] create_booking_hold', error.message)
        return NextResponse.json(
          { error: publicMessage ? error.message : 'Unable to create the booking. Please try again.' },
          { status: soldOut ? 409 : publicMessage ? 400 : 503, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      if (manualMode) {
        // No online checkout yet: keep the cabin longer, then email PayPal transfer instructions.
        const booking = data as { reference: string; expiresAt: string; pricing: { total: number } }
        const service = createSupabaseServiceClient()
        const { data: prepared, error: prepareError } = await service.rpc('prepare_manual_payment_order', {
          p_reference: booking.reference,
          p_whatsapp: whatsapp,
          p_hold_minutes: getManualPaymentConfig().holdHours * 60,
        })
        if (prepareError) {
          console.error('[POST /api/bookings] prepare_manual_payment_order', prepareError.message)
          return NextResponse.json(
            { error: 'Unable to finalise the booking. Please try again.' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } }
          )
        }
        const expiresAt = String((prepared as { expiresAt?: string } | null)?.expiresAt ?? booking.expiresAt)
        const email = await sendOrderEmail(service, booking.reference, 'booking')
        if (email.error) console.error('[POST /api/bookings] booking email', booking.reference, email.error)

        return NextResponse.json(
          {
            success: true,
            booking: { ...booking, expiresAt, paymentMode: 'manual_paypal' },
            manualPayment: manualPaymentInfo(
              { total_vnd: booking.pricing.total, price_expires_at: expiresAt, contact_email: body.contact.email },
              email.sent || email.alreadySent
            ),
          },
          { status: 201, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      return NextResponse.json(
        { success: true, booking: data },
        { status: 201, headers: { 'Cache-Control': 'no-store' } }
      )
    }

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
    if (!isCabinProductAvailableOnTrain(schedule.trainNumber, cabinClassId)) {
      return NextResponse.json(
        { error: 'VIP 2 is only available on train SE19' },
        { status: 400 }
      )
    }
    const cabinPrice = schedule.availableSeats.find(
      (entry) => entry.seatClass === cabinClassId
    )?.price
    if (!cabinPrice) {
      return NextResponse.json({ error: 'No fare found for the selected cabin' }, { status: 400 })
    }

    const journeyCount = body.isRoundTrip ? 2 : 1
    // Every product is sold as one private cabin containing all four tickets.
    // Passenger count records who is travelling; it never reduces the cabin price.
    const subtotal = cabinPrice * journeyCount
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
      cabinClassName: `${cabin.nameVi} · Trọn cabin 4 vé`,
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
    if (err instanceof BodyTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 })
    }
    console.error('[API /bookings POST]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
