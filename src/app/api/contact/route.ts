import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { companyInbox, isEmailDeliveryConfigured, sendEmail } from '@/lib/email'
import { enforceRateLimit, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { BodyTooLargeError, escapeHtml, maskEmail, readJsonBody } from '@/lib/security/request'

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

/** Shown when the message cannot reach the company inbox, so the guest uses another channel. */
const NOT_DELIVERED =
  'Chưa gửi được tin nhắn. Vui lòng gọi/Zalo/WhatsApp 091 582 3667 hoặc email violettetrains@gmail.com. '
  + '/ Your message could not be sent. Please call or WhatsApp +84 91 582 3667 or email violettetrains@gmail.com.'

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
    const id = `CT-${crypto.randomUUID()}`
    const topic = subject || 'Khác'

    // Without SMTP the message would only be logged and lost; tell the guest instead.
    if (!isEmailDeliveryConfigured() && process.env.NODE_ENV === 'production') {
      console.error('[CONTACT FORM] SMTP is not configured; message not delivered', id)
      return NextResponse.json({ error: NOT_DELIVERED }, { status: 503 })
    }

    const sent = await sendEmail({
      to: companyInbox(),
      replyTo: email,
      subject: `[Liên hệ từ website] ${topic}`.slice(0, 200),
      text: [
        `Họ tên: ${name}`,
        `Email: ${email}`,
        `Điện thoại: ${phone || '—'}`,
        `Chủ đề: ${topic}`,
        '',
        message,
        '',
        `Mã: ${id}`,
      ].join('\n'),
      html: `
        <p><strong>Họ tên:</strong> ${escapeHtml(name)}<br>
        <strong>Email:</strong> ${escapeHtml(email)}<br>
        <strong>Điện thoại:</strong> ${escapeHtml(phone || '—')}<br>
        <strong>Chủ đề:</strong> ${escapeHtml(topic)}</p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        <p style="color:#888;font-size:12px">Mã: ${id} · Trả lời email này để phản hồi trực tiếp cho khách.</p>`,
    })

    // Logs only record that a message arrived, never the customer's details.
    console.log('[CONTACT FORM SUBMISSION]', id, maskEmail(email), sent.success ? 'delivered' : `failed: ${sent.error}`)
    if (!sent.success) return NextResponse.json({ error: NOT_DELIVERED }, { status: 502 })

    return NextResponse.json({ success: true, id, message: 'Contact form submitted successfully' })
  } catch (err) {
    if (err instanceof BodyTooLargeError) return NextResponse.json({ error: err.message }, { status: 413 })
    console.error('[API /contact]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: NOT_DELIVERED }, { status: 500 })
  }
}
