import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { BodyTooLargeError, maskEmail, readJsonBody } from '@/lib/security/request'

const newsletterSchema = z.object({
  email: z.string().trim().email().max(160),
  locale: z.enum(['vi', 'en']).catch('vi').default('vi'),
})

const NEWSLETTER_LIMITS = [
  { name: 'newsletter-burst', limit: 5, windowMs: 10 * MINUTE },
  { name: 'newsletter-hourly', limit: 20, windowMs: HOUR },
]

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, NEWSLETTER_LIMITS)
  if (limited) return limited

  try {
    const body = await readJsonBody(request, 4 * 1024)
    const parsed = newsletterSchema.safeParse(body)
    if (!parsed.success) {
      const missing = !body || typeof body !== 'object' || !(body as { email?: unknown }).email
      return NextResponse.json({ error: missing ? 'Email is required' : 'Invalid email address' }, { status: 400 })
    }

    const subscriber = {
      id: `NL-${crypto.randomUUID()}`,
      email: parsed.data.email.toLowerCase(),
      locale: parsed.data.locale,
      subscribedAt: new Date().toISOString(),
      status: 'active' as const,
    }

    // Never write the full address to the host logs.
    console.log('[NEWSLETTER SUBSCRIPTION]', subscriber.id, maskEmail(subscriber.email), subscriber.locale)

    return NextResponse.json({
      success: true,
      message:
        subscriber.locale === 'en'
          ? 'Successfully subscribed to our newsletter!'
          : 'Đăng ký nhận tin thành công!',
    })
  } catch (err) {
    if (err instanceof BodyTooLargeError) return NextResponse.json({ error: err.message }, { status: 413 })
    console.error('[API /newsletter]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
