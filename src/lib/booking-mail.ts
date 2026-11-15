import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { paypalMeWithAmount, usdForVnd, type ManualPaymentInfo } from '@/lib/manual-payment'
import { formatWhatsapp, whatsappLink } from '@/lib/whatsapp'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** "manual_paypal" (default): guests pay by PayPal transfer after an email. "online": web checkout (VNPay/PayPal API). */
export function getPaymentMode(): 'manual_paypal' | 'online' {
  return process.env.PAYMENT_MODE?.trim() === 'online' ? 'online' : 'manual_paypal'
}

export function getManualPaymentConfig() {
  const rate = Number(process.env.PAYPAL_VND_PER_USD)
  const holdHours = Number(process.env.MANUAL_PAYMENT_HOLD_HOURS)
  const paypalMe = process.env.PAYPAL_ME_URL?.trim() || null
  return {
    paypalEmail: process.env.PAYPAL_RECEIVER_EMAIL?.trim() || null,
    paypalMeUrl: paypalMe && /^https:\/\/(www\.)?(paypal\.me|paypal\.com\/paypalme)\/[A-Za-z0-9._-]+\/?$/.test(paypalMe) ? paypalMe : null,
    vndPerUsd: Number.isFinite(rate) && rate >= 1000 ? rate : null,
    holdHours: Number.isFinite(holdHours) && holdHours > 0 ? Math.min(Math.max(holdHours, 1), 48) : 24,
    companyWhatsapp: process.env.COMPANY_WHATSAPP?.trim() || null,
    /** Staff inbox that receives a hidden copy of every booking email. */
    staffEmail: process.env.BOOKING_NOTIFY_EMAIL?.trim() || process.env.EMAIL_REPLY_TO?.trim() || null,
  }
}

// ---------------------------------------------------------------------------
// Order data used by the emails
// ---------------------------------------------------------------------------

type OrderForEmail = {
  id: string
  public_reference: string
  contact_email: string
  contact_whatsapp: string | null
  locale: 'vi' | 'en'
  subtotal_vnd: number
  tax_vnd: number
  total_vnd: number
  price_expires_at: string
  booking_email_sent_at: string | null
  payment_email_sent_at: string | null
  legs: Array<{
    leg_number: number
    train_number: string
    from_station_name_vi: string
    from_station_name_en: string
    to_station_name_vi: string
    to_station_name_en: string
    departure_at: string
    arrival_at: string
    product_name_vi: string
    product_name_en: string
    ticket_price_vnd: number
    cabin_price_vnd: number
  }>
  passengers: Array<{ passenger_number: number; full_name: string; passenger_type: 'adult' | 'child' }>
}

const ORDER_COLUMNS = `
  id, public_reference, contact_email, contact_whatsapp, locale, subtotal_vnd, tax_vnd, total_vnd,
  price_expires_at, booking_email_sent_at, payment_email_sent_at,
  legs:order_legs(leg_number, train_number, from_station_name_vi, from_station_name_en, to_station_name_vi,
    to_station_name_en, departure_at, arrival_at, product_name_vi, product_name_en, ticket_price_vnd, cabin_price_vnd),
  passengers(passenger_number, full_name, passenger_type)
`

async function loadOrder(supabase: SupabaseClient, reference: string) {
  const { data, error } = await supabase.from('orders').select(ORDER_COLUMNS).eq('public_reference', reference).maybeSingle()
  if (error) throw new Error(`Cannot load order ${reference}: ${error.message}`)
  if (!data) return null
  const order = data as unknown as OrderForEmail
  order.legs = [...(order.legs ?? [])].sort((a, b) => a.leg_number - b.leg_number)
  order.passengers = [...(order.passengers ?? [])].sort((a, b) => a.passenger_number - b.passenger_number)
  return order
}

export function manualPaymentInfo(order: { total_vnd: number; price_expires_at: string; contact_email: string }, emailSent: boolean): ManualPaymentInfo {
  const config = getManualPaymentConfig()
  const usdAmount = usdForVnd(Number(order.total_vnd), config.vndPerUsd)
  return {
    deadline: order.price_expires_at,
    totalVnd: Number(order.total_vnd),
    usdAmount,
    vndPerUsd: config.vndPerUsd,
    paypalLink: paypalMeWithAmount(config.paypalMeUrl, usdAmount),
    paypalEmail: config.paypalEmail,
    companyWhatsapp: config.companyWhatsapp,
    emailSent,
    contactEmail: order.contact_email,
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}

function vnd(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`
}

function dateTime(iso: string, locale: 'vi' | 'en') {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const BRAND = { ink: '#2b1538', gold: '#b8862b', soft: '#f6f0f7', line: '#e6dde8', muted: '#6f6674' }

function layout(title: string, body: string, footer: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4f1f6;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${BRAND.ink};padding:24px 28px;color:#ffffff">
  <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold">Violette Train</div>
  <div style="margin-top:4px;font-size:13px;color:#e7d7a8">${escapeHtml(title)}</div>
</td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:18px 28px;background:${BRAND.soft};font-size:12px;line-height:18px;color:${BRAND.muted}">${footer}</td></tr>
</table></td></tr></table></body></html>`
}

function tripRows(order: OrderForEmail, isVi: boolean) {
  return order.legs.map((leg) => {
    const from = isVi ? leg.from_station_name_vi : leg.from_station_name_en
    const to = isVi ? leg.to_station_name_vi : leg.to_station_name_en
    const product = isVi ? leg.product_name_vi : leg.product_name_en
    const label = order.legs.length > 1 ? (leg.leg_number === 1 ? (isVi ? 'Chiều đi' : 'Outbound') : (isVi ? 'Chiều về' : 'Return')) : (isVi ? 'Chuyến tàu' : 'Train')
    return `<tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;line-height:21px">
      <div style="font-size:12px;color:${BRAND.muted}">${label}</div>
      <strong>${escapeHtml(leg.train_number)} · ${escapeHtml(from)} → ${escapeHtml(to)}</strong><br>
      ${isVi ? 'Khởi hành' : 'Departs'}: ${dateTime(leg.departure_at, order.locale)}<br>
      ${isVi ? 'Đến nơi' : 'Arrives'}: ${dateTime(leg.arrival_at, order.locale)}<br>
      ${escapeHtml(product)} · ${isVi ? '1 cabin (4 vé)' : '1 cabin (4 tickets)'} · ${vnd(Number(leg.cabin_price_vnd))}
    </td></tr>`
  }).join('')
}

function passengersText(order: OrderForEmail, isVi: boolean) {
  return order.passengers.map((p) => `${escapeHtml(p.full_name)}${p.passenger_type === 'child' ? (isVi ? ' (trẻ em)' : ' (child)') : ''}`).join(', ')
}

function contactFooter(isVi: boolean, companyWhatsapp: string | null) {
  const reply = isVi ? 'Bạn có thể trả lời trực tiếp email này nếu cần hỗ trợ.' : 'You can reply to this email if you need help.'
  const wa = companyWhatsapp
    ? ` ${isVi ? 'Hoặc nhắn WhatsApp' : 'Or message us on WhatsApp'}: <a href="${whatsappLink(companyWhatsapp)}" style="color:${BRAND.ink}">${escapeHtml(formatWhatsapp(companyWhatsapp))}</a>.`
    : ''
  return `${reply}${wa}<br>Violette Train · ${isVi ? 'Email tự động từ hệ thống đặt vé' : 'Automatic email from our booking system'}`
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0070ba;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:999px">${escapeHtml(label)}</a>`
}

// ---------------------------------------------------------------------------
// Email 1: booking received + PayPal transfer instructions
// ---------------------------------------------------------------------------

export function buildBookingReceivedEmail(order: OrderForEmail) {
  const isVi = order.locale === 'vi'
  const info = manualPaymentInfo(order, true)
  const ref = order.public_reference
  const lead = order.passengers[0]?.full_name ?? (isVi ? 'quý khách' : 'there')
  const deadline = dateTime(info.deadline, order.locale)
  const usd = info.usdAmount != null ? `${info.usdAmount.toFixed(2)} USD` : null

  const subject = isVi
    ? `Violette Train · Đã giữ cabin ${ref} – vui lòng chuyển khoản PayPal trước ${deadline}`
    : `Violette Train · Cabin held ${ref} – please pay via PayPal by ${deadline}`

  const paySteps = isVi
    ? [
        usd ? `Gửi <strong>${usd}</strong> qua PayPal${info.paypalEmail ? ` tới tài khoản <strong>${escapeHtml(info.paypalEmail)}</strong>` : ''}.` : 'Nhân viên sẽ nhắn số tiền cần chuyển qua WhatsApp cho bạn.',
        `Ghi mã đặt chỗ <strong>${ref}</strong> trong phần ghi chú (note) của PayPal.`,
        `Hoàn tất trước <strong>${deadline}</strong> (giờ Việt Nam). Sau thời hạn này cabin có thể được mở bán lại.`,
        'Khi nhận được tiền, chúng tôi sẽ gửi email xác nhận và liên hệ qua WhatsApp.',
      ]
    : [
        usd ? `Send <strong>${usd}</strong> via PayPal${info.paypalEmail ? ` to <strong>${escapeHtml(info.paypalEmail)}</strong>` : ''}.` : 'Our team will message you the amount to send on WhatsApp.',
        `Put your booking reference <strong>${ref}</strong> in the PayPal note.`,
        `Complete the payment before <strong>${deadline}</strong> (Vietnam time). After that the cabin may be released.`,
        'Once we receive the money we will email your confirmation and contact you on WhatsApp.',
      ]

  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:23px">${isVi ? 'Xin chào' : 'Hello'} ${escapeHtml(lead)},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:23px">${isVi
      ? 'Cảm ơn bạn đã đặt vé Violette Train. Chúng tôi <strong>đang giữ cabin</strong> cho bạn và sẽ xác nhận ngay khi nhận được thanh toán PayPal.'
      : 'Thank you for booking with Violette Train. Your cabin is <strong>on hold</strong> and will be confirmed as soon as we receive your PayPal payment.'}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};border-radius:12px;margin-bottom:18px"><tr><td style="padding:16px 18px">
      <div style="font-size:12px;color:${BRAND.muted}">${isVi ? 'Mã đặt chỗ' : 'Booking reference'}</div>
      <div style="font-size:24px;font-weight:bold;letter-spacing:1px">${ref}</div>
      <div style="margin-top:8px;font-size:13px;color:${BRAND.muted}">${isVi ? 'Giữ cabin đến' : 'Cabin held until'}: <strong style="color:${BRAND.ink}">${deadline}</strong></div>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tripRows(order, isVi)}</table>
    <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:${BRAND.muted}">${isVi ? 'Hành khách' : 'Passengers'}: ${passengersText(order, isVi)}${order.contact_whatsapp ? `<br>WhatsApp: ${escapeHtml(formatWhatsapp(order.contact_whatsapp))}` : ''}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid ${BRAND.line}">
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.muted}">${isVi ? 'Tiền cabin' : 'Cabin fare'}</td><td align="right" style="font-size:14px">${vnd(Number(order.subtotal_vnd))}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:${BRAND.muted}">${isVi ? 'Thuế (VAT)' : 'Tax (VAT)'}</td><td align="right" style="font-size:14px">${vnd(Number(order.tax_vnd))}</td></tr>
      <tr><td style="padding:10px 0;font-size:16px;font-weight:bold;border-top:1px solid ${BRAND.line}">${isVi ? 'Tổng cộng' : 'Total'}</td><td align="right" style="font-size:18px;font-weight:bold;color:${BRAND.gold};border-top:1px solid ${BRAND.line}">${vnd(Number(order.total_vnd))}</td></tr>
      ${usd ? `<tr><td style="padding:4px 0;font-size:14px;font-weight:bold">${isVi ? 'Số tiền chuyển PayPal' : 'Amount to send by PayPal'}</td><td align="right" style="font-size:18px;font-weight:bold;color:#0070ba">${usd}</td></tr>
      <tr><td colspan="2" style="font-size:12px;color:${BRAND.muted}">${isVi ? 'Tỷ giá' : 'Rate'}: 1 USD = ${vnd(info.vndPerUsd!)}</td></tr>` : ''}
    </table>

    <h2 style="margin:22px 0 10px;font-size:17px">${isVi ? 'Cách thanh toán qua PayPal' : 'How to pay with PayPal'}</h2>
    <ol style="margin:0 0 18px;padding-left:20px;font-size:14px;line-height:22px">${paySteps.map((step) => `<li style="margin-bottom:6px">${step}</li>`).join('')}</ol>
    ${info.paypalLink ? `<p style="margin:0 0 20px">${button(info.paypalLink, isVi ? `Thanh toán ${usd ?? ''} qua PayPal` : `Pay ${usd ?? ''} with PayPal`)}</p>` : ''}
    <p style="margin:0;font-size:13px;line-height:20px;color:${BRAND.muted}">${isVi
      ? 'Lưu ý: chọn hình thức thanh toán cho hàng hóa/dịch vụ (Goods and services) để giao dịch của bạn được PayPal bảo vệ.'
      : 'Tip: choose “Goods and services” in PayPal so your payment is covered by PayPal Purchase Protection.'}</p>`

  const text = [
    `${isVi ? 'Xin chào' : 'Hello'} ${lead},`,
    isVi ? 'Chúng tôi đang giữ cabin cho bạn.' : 'Your cabin is on hold.',
    `${isVi ? 'Mã đặt chỗ' : 'Reference'}: ${ref}`,
    `${isVi ? 'Giữ cabin đến' : 'Held until'}: ${deadline}`,
    ...order.legs.map((leg) => `${leg.train_number} ${isVi ? leg.from_station_name_vi : leg.from_station_name_en} -> ${isVi ? leg.to_station_name_vi : leg.to_station_name_en}, ${dateTime(leg.departure_at, order.locale)}`),
    `${isVi ? 'Tổng cộng' : 'Total'}: ${vnd(Number(order.total_vnd))}${usd ? ` (${usd} PayPal)` : ''}`,
    '',
    ...paySteps.map((step, index) => `${index + 1}. ${step.replace(/<[^>]+>/g, '')}`),
    info.paypalLink ? `PayPal: ${info.paypalLink}` : '',
    info.companyWhatsapp ? `WhatsApp: ${formatWhatsapp(info.companyWhatsapp)}` : '',
  ].filter(Boolean).join('\n')

  return { subject, html: layout(isVi ? 'Xác nhận giữ cabin' : 'Cabin hold confirmation', body, contactFooter(isVi, info.companyWhatsapp)), text }
}

// ---------------------------------------------------------------------------
// Email 2: payment received, booking confirmed
// ---------------------------------------------------------------------------

export function buildPaymentConfirmedEmail(order: OrderForEmail) {
  const isVi = order.locale === 'vi'
  const config = getManualPaymentConfig()
  const ref = order.public_reference
  const lead = order.passengers[0]?.full_name ?? (isVi ? 'quý khách' : 'there')
  const subject = isVi
    ? `Violette Train · Đã nhận thanh toán – đặt chỗ ${ref} đã được xác nhận`
    : `Violette Train · Payment received – booking ${ref} is confirmed`

  const body = `
    <p style="margin:0 0 14px;font-size:15px;line-height:23px">${isVi ? 'Xin chào' : 'Hello'} ${escapeHtml(lead)},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:23px">${isVi
      ? 'Chúng tôi đã nhận được thanh toán của bạn. <strong>Cabin của bạn đã được xác nhận.</strong>'
      : 'We have received your payment. <strong>Your cabin is confirmed.</strong>'}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:12px;margin-bottom:18px"><tr><td style="padding:16px 18px">
      <div style="font-size:12px;color:#047857">${isVi ? 'Mã đặt chỗ đã xác nhận' : 'Confirmed booking'}</div>
      <div style="font-size:24px;font-weight:bold;letter-spacing:1px;color:#065f46">${ref}</div>
    </td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tripRows(order, isVi)}</table>
    <p style="margin:12px 0 18px;font-size:13px;line-height:20px;color:${BRAND.muted}">${isVi ? 'Hành khách' : 'Passengers'}: ${passengersText(order, isVi)}</p>
    <p style="margin:0 0 8px;font-size:15px"><strong>${isVi ? 'Đã thanh toán' : 'Paid'}: ${vnd(Number(order.total_vnd))}</strong></p>
    <p style="margin:0;font-size:14px;line-height:22px">${isVi
      ? 'Nhân viên Violette Train sẽ liên hệ với bạn qua WhatsApp trước ngày khởi hành để hướng dẫn lên tàu. Vui lòng mang theo giấy tờ tùy thân của từng hành khách.'
      : 'Our team will contact you on WhatsApp before departure with boarding details. Please bring an ID or passport for every passenger.'}</p>`

  const text = [
    `${isVi ? 'Xin chào' : 'Hello'} ${lead},`,
    isVi ? 'Chúng tôi đã nhận thanh toán. Cabin đã được xác nhận.' : 'Payment received. Your cabin is confirmed.',
    `${isVi ? 'Mã đặt chỗ' : 'Reference'}: ${ref}`,
    ...order.legs.map((leg) => `${leg.train_number} ${isVi ? leg.from_station_name_vi : leg.from_station_name_en} -> ${isVi ? leg.to_station_name_vi : leg.to_station_name_en}, ${dateTime(leg.departure_at, order.locale)}`),
    `${isVi ? 'Đã thanh toán' : 'Paid'}: ${vnd(Number(order.total_vnd))}`,
  ].join('\n')

  return { subject, html: layout(isVi ? 'Xác nhận đặt chỗ' : 'Booking confirmed', body, contactFooter(isVi, config.companyWhatsapp)), text }
}

// ---------------------------------------------------------------------------
// Sending (each email goes out once unless staff resend it)
// ---------------------------------------------------------------------------

type Kind = 'booking' | 'payment'
const SENT_COLUMN: Record<Kind, 'booking_email_sent_at' | 'payment_email_sent_at'> = {
  booking: 'booking_email_sent_at',
  payment: 'payment_email_sent_at',
}

export type EmailOutcome = { sent: boolean; alreadySent: boolean; error?: string }

/**
 * Atomically claims the "sent" flag, sends, and releases the flag if delivery
 * fails so the email can be retried. `force` is used by staff "resend".
 */
export async function sendOrderEmail(supabase: SupabaseClient, reference: string, kind: Kind, force = false): Promise<EmailOutcome> {
  const column = SENT_COLUMN[kind]
  let claim = supabase.from('orders').update({ [column]: new Date().toISOString() }).eq('public_reference', reference)
  if (!force) claim = claim.is(column, null)
  const { data: claimed, error: claimError } = await claim.select('id')
  if (claimError) return { sent: false, alreadySent: false, error: claimError.message }
  if (!claimed?.length) return { sent: false, alreadySent: true }

  try {
    const order = await loadOrder(supabase, reference)
    if (!order) throw new Error('Order not found')
    const message = kind === 'booking' ? buildBookingReceivedEmail(order) : buildPaymentConfirmedEmail(order)
    const result = await sendEmail({
      to: order.contact_email,
      toName: order.passengers[0]?.full_name,
      bcc: getManualPaymentConfig().staffEmail,
      ...message,
    })
    if (!result.success) throw new Error(result.error || 'SMTP error')
    return { sent: true, alreadySent: false }
  } catch (error) {
    await supabase.from('orders').update({ [column]: null }).eq('public_reference', reference)
    return { sent: false, alreadySent: false, error: error instanceof Error ? error.message : String(error) }
  }
}
