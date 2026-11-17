import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { companyInbox, isEmailDeliveryConfigured, sendEmail } from '@/lib/email'
import { BodyTooLargeError, escapeHtml, maskEmail, readJsonBody } from '@/lib/security/request'

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

    // There is no subscriber database yet: each sign-up is emailed to the company
    // inbox so it is not lost. Without SMTP in production, report the failure.
    if (!isEmailDeliveryConfigured() && process.env.NODE_ENV === 'production') {
      console.error('[NEWSLETTER] SMTP is not configured; sign-up not recorded', subscriber.id)
      return NextResponse.json({ error: 'Newsletter sign-up is temporarily unavailable' }, { status: 503 })
    }
    const sent = await sendEmail({
      to: companyInbox(),
      replyTo: subscriber.email,
      subject: `[Đăng ký nhận tin] Khách mới (${subscriber.locale})`,
      text: `Email: ${subscriber.email}
Ngôn ngữ: ${subscriber.locale}
Thời điểm: ${subscriber.subscribedAt}
Mã: ${subscriber.id}`,
      html: `<p>Khách đăng ký nhận tin trên website.</p><p><strong>Email:</strong> ${escapeHtml(subscriber.email)}<br><strong>Ngôn ngữ:</strong> ${subscriber.locale}<br><strong>Thời điểm:</strong> ${subscriber.subscribedAt}</p>`,
    })

    // Never write the full address to the host logs.
    console.log('[NEWSLETTER SUBSCRIPTION]', subscriber.id, maskEmail(subscriber.email), subscriber.locale, sent.success ? 'delivered' : 'failed')
    if (!sent.success) return NextResponse.json({ error: 'Newsletter sign-up failed' }, { status: 502 })

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
