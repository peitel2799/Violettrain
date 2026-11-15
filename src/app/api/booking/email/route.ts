import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { triggerBookingEmail, type BookingEmailData } from '@/lib/email'
import { requireAdminApi } from '@/lib/admin-session'
import { BodyTooLargeError, readJsonBody } from '@/lib/security/request'

/**
 * Legacy confirmation-email sender. It accepts free-form booking details, so it
 * is restricted to signed-in staff: left public it would let anyone send
 * Violette-branded emails (for example fake payment instructions) to any address.
 * Customer emails for real orders are sent from the order data in booking-mail.ts.
 */

const text = (max: number) => z.string().trim().min(1).max(max)

const emailSchema = z.object({
  bookingRef: z.string().trim().regex(/^VT-[A-Z0-9]{6,16}$/i),
  customerName: text(120),
  customerEmail: z.string().trim().email().max(160),
  customerPhone: text(30),
  trainNumber: text(10),
  fromStation: text(80),
  toStation: text(80),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureTime: text(10),
  arrivalTime: text(10),
  seatClass: text(40),
  seatClassVi: text(80),
  seatClassEn: text(80),
  passengers: z.array(z.object({ name: text(120), type: z.enum(['adult', 'child']).catch('adult') })).min(1).max(4),
  isRoundTrip: z.boolean(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  returnTime: z.string().trim().max(10).optional(),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  locale: z.enum(['vi', 'en']).catch('vi'),
})

export async function POST(request: NextRequest) {
  const authorization = await requireAdminApi(['admin', 'operations', 'support'])
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  }

  try {
    const parsed = emailSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email request', issues: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const emailData: BookingEmailData = parsed.data
    const result = await triggerBookingEmail(emailData)

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    }
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  } catch (err) {
    if (err instanceof BodyTooLargeError) return NextResponse.json({ error: err.message }, { status: 413 })
    console.error('[API /booking/email]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
