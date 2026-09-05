/**
 * Email Service for Violette Train
 * Handles sending booking confirmation and notification emails via SMTP.
 *
 * Uses nodemailer with support for:
 * - Gmail (with App Password)
 * - SMTP services (Mailtrap, SendGrid, AWS SES, custom SMTP)
 *
 * In production, set SMTP credentials via environment variables.
 * For development, emails are logged to console if SMTP is not configured.
 */

import nodemailer, { Transporter } from 'nodemailer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingEmailData {
  bookingRef: string
  customerName: string
  customerEmail: string
  customerPhone: string
  trainNumber: string
  fromStation: string
  toStation: string
  departureDate: string
  departureTime: string
  arrivalTime: string
  seatClass: string
  seatClassVi: string
  seatClassEn: string
  passengers: Array<{
    name: string
    type: 'adult' | 'child'
  }>
  isRoundTrip: boolean
  returnDate?: string
  returnTime?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  locale: 'vi' | 'en'
}

// ---------------------------------------------------------------------------
// Transporter (singleton)
// ---------------------------------------------------------------------------

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = process.env.SMTP_SECURE === 'true'

  if (host) {
    // Real SMTP configured
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    // Dev mode: use console transport (logs to terminal)
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    })
  }

  return transporter
}

// ---------------------------------------------------------------------------
// Email Addresses
// ---------------------------------------------------------------------------

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@violettetrain.vn'
const FROM_NAME = 'Violette Train'
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'info@violettetrain.vn'

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDateDisplay(dateStr: string, locale: 'vi' | 'en'): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (locale === 'vi') {
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ---------------------------------------------------------------------------
// Booking Confirmation Email (HTML)
// ---------------------------------------------------------------------------

function buildBookingConfirmationHTML(data: BookingEmailData): string {
  const isVi = data.locale === 'vi'

  const passengersHTML = data.passengers
    .map(
      (p, i) => `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
          ${i + 1}
        </td>
        <td style="padding: 8px 12px; border: 1px solid #E5E7EB; font-size: 14px; font-weight: 500; color: #111827;">
          ${p.name}
        </td>
        <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
          ${p.type === 'child' ? (isVi ? 'Trẻ em' : 'Child') : (isVi ? 'Người lớn' : 'Adult')}
        </td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="${isVi ? 'vi' : 'en'}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${isVi ? 'Xác nhận đặt vé Violette Train' : 'Violette Train Booking Confirmation'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #F3F4F6; font-family: 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { width: 100%; background-color: #F3F4F6; padding: 24px 0; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .email-header { background: linear-gradient(135deg, #4C1D95, #6D28D9); padding: 32px 24px; text-align: center; }
    .email-header .brand { color: #FFFFFF; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .email-header .brand span { color: #FCD34D; }
    .email-header .subtitle { color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 4px; }
    .email-body { padding: 24px; }
    .ref-badge { background-color: #F5F3FF; border: 2px solid #7C3AED; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .ref-badge .label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #7C3AED; margin-bottom: 6px; }
    .ref-badge .code { font-size: 28px; font-weight: bold; color: #4C1D95; letter-spacing: 4px; }
    .greeting { font-size: 16px; color: #111827; margin-bottom: 20px; font-weight: 600; }
    .info-card { background-color: #FAFAFA; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 20px; }
    .info-card-header { background-color: #F5F3FF; padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7C3AED; }
    .info-card-body { padding: 4px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6B7280; }
    .info-value { font-weight: 600; color: #111827; text-align: right; }
    .total-row { background-color: #FCD34D; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 15px; font-weight: 700; color: #4C1D95; }
    .total-value { font-size: 22px; font-weight: bold; color: #4C1D95; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7C3AED; margin-bottom: 8px; }
    table.passengers { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB; }
    table.passengers th { background-color: #F5F3FF; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #7C3AED; border-bottom: 1px solid #E5E7EB; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #FCD34D, #F59E0B); color: #4C1D95; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none; margin: 16px 0; }
    .email-footer { background-color: #4C1D95; padding: 24px; text-align: center; color: rgba(255,255,255,0.7); font-size: 13px; }
    .email-footer .footer-brand { color: #FCD34D; font-size: 16px; font-weight: bold; margin-bottom: 8px; }
    .email-footer a { color: rgba(255,255,255,0.8); text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 16px; }
      .ref-badge .code { font-size: 22px; }
      .info-row { flex-direction: column; gap: 2px; }
      .info-value { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">

      <!-- Header -->
      <div class="email-header">
        <div class="brand">VIOLETTE <span>TRAIN</span></div>
        <div class="subtitle">${isVi ? 'Hành trình đáng nhớ | Luxury Rail Journey' : 'Luxury Rail Journey | Hành trình đáng nhớ'}</div>
      </div>

      <!-- Body -->
      <div class="email-body">

        <!-- Reference Badge -->
        <div class="ref-badge">
          <div class="label">${isVi ? 'Mã đặt chỗ' : 'Booking Reference'}</div>
          <div class="code">${data.bookingRef}</div>
        </div>

        <!-- Greeting -->
        <p class="greeting">
          ${isVi
            ? `Chào ${data.customerName},<br>Cảm ơn bạn đã đặt vé cùng Violette Train!`
            : `Dear ${data.customerName},<br>Thank you for booking with Violette Train!`}
        </p>
        <p style="color: #6B7280; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
          ${isVi
            ? 'Dưới đây là thông tin chi tiết chuyến đi của bạn. Vui lòng giữ email này làm bằng chứng đặt vé.'
            : 'Below are the details of your trip. Please keep this email as your booking confirmation.'}
        </p>

        <!-- Trip Details -->
        <div class="section-title">${isVi ? 'Thông tin chuyến tàu' : 'Trip Details'}</div>
        <div class="info-card">
          <div class="info-card-body">
            <div class="info-row">
              <span class="info-label">${isVi ? 'Tuyến đường' : 'Route'}</span>
              <span class="info-value">${data.fromStation} → ${data.toStation}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isVi ? 'Chuyến tàu' : 'Train'}</span>
              <span class="info-value">${data.trainNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isVi ? 'Ngày khởi hành' : 'Departure Date'}</span>
              <span class="info-value">${formatDateDisplay(data.departureDate, data.locale)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isVi ? 'Giờ khởi hành' : 'Departure Time'}</span>
              <span class="info-value">${data.departureTime}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isVi ? 'Giờ đến' : 'Arrival Time'}</span>
              <span class="info-value">${data.arrivalTime}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isVi ? 'Hạng phòng' : 'Room Class'}</span>
              <span class="info-value">${isVi ? data.seatClassVi : data.seatClassEn}</span>
            </div>
            ${data.isRoundTrip && data.returnDate ? `
            <div class="info-row" style="background-color: #FEF3C7;">
              <span class="info-label">${isVi ? 'Khứ hồi - Ngày về' : 'Round Trip - Return Date'}</span>
              <span class="info-value">${formatDateDisplay(data.returnDate, data.locale)}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Passengers -->
        <div class="section-title">${isVi ? 'Hành khách' : 'Passengers'}</div>
        <table class="passengers">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>${isVi ? 'Họ tên' : 'Full Name'}</th>
              <th style="width: 100px;">${isVi ? 'Loại' : 'Type'}</th>
            </tr>
          </thead>
          <tbody>
            ${passengersHTML}
          </tbody>
        </table>

        <!-- Pricing Summary -->
        <div class="section-title">${isVi ? 'Thông tin giá vé' : 'Pricing Information'}</div>
        <div class="info-card">
          <div class="info-card-body">
            <div class="info-row">
              <span class="info-label">${isVi ? 'Tạm tính' : 'Subtotal'}</span>
              <span class="info-value">${formatVND(data.subtotal)}</span>
            </div>
            ${data.discount > 0 ? `
            <div class="info-row" style="color: #059669;">
              <span class="info-label">${isVi ? 'Giảm giá' : 'Discount'}</span>
              <span class="info-value">-${formatVND(data.discount)}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">${isVi ? 'Thuế (VAT 10%)' : 'Tax (VAT 10%)'}</span>
              <span class="info-value">${formatVND(data.tax)}</span>
            </div>
            <div class="total-row">
              <span class="total-label">${isVi ? 'Tổng cộng' : 'Total Amount'}</span>
              <span class="total-value">${formatVND(data.total)}</span>
            </div>
          </div>
        </div>

        <!-- Admin Contact Notice -->
        <div style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <p style="font-size: 13px; font-weight: 700; color: #C2410C; margin: 0 0 8px 0;">
            📞 ${isVi ? 'Nhân viên sẽ liên hệ bạn sớm nhất' : 'Staff Will Contact You Soon'}
          </p>
          <p style="margin: 0; color: #7C2D12; font-size: 13px; line-height: 1.7;">
            ${isVi
              ? 'Nhân viên Violette Train sẽ liên hệ bạn qua email hoặc điện thoại trong vòng 24 giờ để xác nhận yêu cầu đặt vé. Vui lòng giữ email này làm bằng chứng đặt chỗ.'
              : 'Violette Train staff will contact you via email or phone within 24 hours to confirm your booking request. Please keep this email as your booking reference.'}
          </p>
        </div>

        <p style="text-align: center;">
          <a href="https://violettetrain.vn" class="cta-button">
            🌸 ${isVi ? 'Truy cập website Violette Train' : 'Visit Violette Train Website'}
          </a>
        </p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <div class="footer-brand">VIOLETTE TRAIN</div>
        <p style="margin: 4px 0;">
          📞 091 582 3667 / 0947 163 497 &nbsp;|&nbsp;
          ✉️ <a href="mailto:violettetrains@gmail.com" style="color: rgba(255,255,255,0.8);">violettetrains@gmail.com</a>
        </p>
        <p style="margin: 8px 0 0 0; opacity: 0.6; font-size: 12px;">
          © ${new Date().getFullYear()} Violette Train. ${isVi ? 'Tất cả quyền được bảo lưu.' : 'All rights reserved.'}
        </p>
      </div>

    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Plain text version (fallback)
// ---------------------------------------------------------------------------

function buildBookingConfirmationText(data: BookingEmailData): string {
  const isVi = data.locale === 'vi'

  const lines = [
    isVi ? 'VIOLETTE TRAIN - XAC NHAN DAT VE' : 'VIOLETTE TRAIN - BOOKING CONFIRMATION',
    '=' .repeat(40),
    '',
    isVi ? `Ma dat cho: ${data.bookingRef}` : `Booking Ref: ${data.bookingRef}`,
    '',
    isVi ? `Chao ${data.customerName},` : `Dear ${data.customerName},`,
    isVi
      ? 'Cam on ban da dat ve cung Violette Train!'
      : 'Thank you for booking with Violette Train!',
    '',
    isVi ? '--- THONG TIN CHUYEN TAU ---' : '--- TRIP DETAILS ---',
    isVi ? 'Tuyen duong:' : 'Route:', `${data.fromStation} -> ${data.toStation}`,
    isVi ? 'Chuyen tau:' : 'Train:', `${data.trainNumber}`,
    isVi ? 'Ngay khoi hanh:' : 'Departure Date:', formatDateDisplay(data.departureDate, data.locale),
    isVi ? 'Gio khoi hanh:' : 'Departure Time:', data.departureTime,
    isVi ? 'Gio den:' : 'Arrival Time:', data.arrivalTime,
    isVi ? 'Hang phong:' : 'Room Class:', isVi ? data.seatClassVi : data.seatClassEn,
    '',
    isVi ? '--- HANH KHACH ---' : '--- PASSENGERS ---',
    ...data.passengers.map((p, i) =>
      `${i + 1}. ${p.name} (${p.type === 'child' ? (isVi ? 'Tre em' : 'Child') : (isVi ? 'Nguoi lon' : 'Adult')})`
    ),
    '',
    isVi ? '--- GIA VE ---' : '--- PRICING ---',
    isVi ? 'Tam tinh:' : 'Subtotal:', formatVND(data.subtotal),
    data.discount > 0 ? `${isVi ? 'Giam gia:' : 'Discount:'} -${formatVND(data.discount)}` : '',
    isVi ? 'Thue (VAT 10%):' : 'Tax (VAT 10%):', formatVND(data.tax),
    isVi ? 'Tong cong:' : 'Total Amount:', formatVND(data.total),
    '',
    isVi ? 'NHAN VIEN SE LIEN HE BAN TRONG 24H' : 'STAFF WILL CONTACT YOU WITHIN 24H',
    isVi
      ? 'Nhan vien Violette Train se lien he qua email hoac dien thoai trong vong 24 gio de xac nhan yeu cau dat ve.'
      : 'Violette Train staff will contact you via email or phone within 24 hours to confirm your booking request.',
    '',
    isVi ? '--- LIEN HE HO TRO ---' : '--- SUPPORT ---',
    'Hotline: 091 582 3667 / 0947 163 497',
    'Email: violettetrains@gmail.com',
    'Website: https://violettetrain.vn',
  ].filter(Boolean)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  previewUrl?: string  // Only for dev/console transport
}

/**
 * Send a booking confirmation email.
 */
export async function sendBookingConfirmationEmail(
  data: BookingEmailData
): Promise<SendEmailResult> {
  const transport = getTransporter()
  const html = buildBookingConfirmationHTML(data)
  const text = buildBookingConfirmationText(data)

  const subject =
    data.locale === 'vi'
      ? `Xác nhận đặt vé Violette Train — ${data.bookingRef}`
      : `Violette Train Booking Confirmation — ${data.bookingRef}`

  const isDev = !process.env.SMTP_HOST

  try {
    const info = await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: `"${data.customerName}" <${data.customerEmail}>`,
      replyTo: REPLY_TO,
      subject,
      text,
      html,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Violette Train Booking System',
        'List-Unsubscribe': `<mailto:unsubscribe@violettetrain.vn?subject=Unsubscribe>`,
      },
    })

    if (isDev) {
      // nodemailer's jsonTransport returns JSON with previewUrl
      const parsed = JSON.parse(info.message as string)
      console.log('\n📧 [EMAIL - DEV MODE]')
      console.log('   To:', data.customerEmail)
      console.log('   Subject:', subject)
      console.log('   Preview URL:', parsed.previewUrl || 'N/A')
      console.log('   Message ID:', info.messageId)
      console.log('   Full response:', parsed)
      console.log('   HTML length:', html.length, 'chars')
      console.log('   ---\n')
      return { success: true, previewUrl: parsed.previewUrl, messageId: info.messageId }
    }

    console.log(`\n📧 [EMAIL SENT] To: ${data.customerEmail} | Ref: ${data.bookingRef} | ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`\n❌ [EMAIL FAILED] To: ${data.customerEmail} | Ref: ${data.bookingRef} | Error: ${errorMsg}`)
    return { success: false, error: errorMsg }
  }
}

/**
 * Send a booking confirmation email using the API route (for server action / API context).
 * This wraps sendBookingConfirmationEmail for use in API routes.
 */
export async function triggerBookingEmail(
  data: BookingEmailData
): Promise<SendEmailResult> {
  return sendBookingConfirmationEmail(data)
}
