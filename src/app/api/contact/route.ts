import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { BodyTooLargeError, maskEmail, readJsonBody } from '@/lib/security/request'

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(30).regex(/^[\d\s+()-]*$/).optional().or(z.literal('')),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(5000),
})

const CONTACT_LIMITS = [
  { name: 'contact-burst', limit: 5, windowMs: 10 * MINUTE },
  { name: 'contact-hourly', limit: 20, windowMs: HOUR },
]

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, CONTACT_LIMITS)
  if (limited) return limited

  try {
    const parsed = contactSchema.safeParse(await readJsonBody(request, 16 * 1024))
    if (!parsed.success) {
      const field = Object.keys(parsed.error.flatten().fieldErrors)[0]
      const message = field === 'email'
        ? 'Invalid email address'
        : field === 'message'
          ? 'Message must be between 10 and 5000 characters'
          : field === 'phone'
            ? 'Invalid phone number'
            : 'Name, email, and message are required'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { name, email, phone, subject, message } = parsed.data
    const contactRecord = {
      id: `CT-${crypto.randomUUID()}`,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      subject: subject || 'General',
      message,
      createdAt: new Date().toISOString(),
      status: 'new' as const,
    }

    // Logs are kept by the host and readable by every project member, so they
    // only record that a message arrived, never the customer's details.
    console.log('[CONTACT FORM SUBMISSION]', contactRecord.id, maskEmail(contactRecord.email), contactRecord.createdAt)

    return NextResponse.json({
      success: true,
      id: contactRecord.id,
      message: 'Contact form submitted successfully',
    })
  } catch (err) {
    if (err instanceof BodyTooLargeError) return NextResponse.json({ error: err.message }, { status: 413 })
    console.error('[API /contact]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
