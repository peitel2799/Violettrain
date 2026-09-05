/**
 * POST /api/admin/test-email
 * Send a test email to verify SMTP configuration.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    const secure = process.env.SMTP_SECURE === 'true'

    if (!host) {
      return NextResponse.json(
        { error: 'SMTP not configured. Set SMTP_HOST in your environment variables.' },
        { status: 400 }
      )
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Violette Train'}" <${process.env.EMAIL_FROM || 'noreply@violettetrain.vn'}>`,
      to: testEmail,
      subject: '✅ Violette Train — Email Configuration Test',
      html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; padding: 0; background-color: #F3F4F6; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 0; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4C1D95, #6D28D9); padding: 32px 24px; text-align: center; }
    .brand { color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .brand span { color: #FCD34D; }
    .body { padding: 32px 24px; }
    .success-icon { width: 64px; height: 64px; background: #DCFCE7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    h2 { margin: 0 0 12px; font-size: 20px; color: #111827; }
    p { margin: 0 0 16px; color: #6B7280; font-size: 15px; line-height: 1.7; }
    .config-box { background: #F5F3FF; border-radius: 12px; padding: 16px; margin-top: 20px; }
    .config-box h4 { margin: 0 0 12px; font-size: 13px; color: #7C3AED; text-transform: uppercase; letter-spacing: 1px; }
    .config-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .config-label { color: #6B7280; }
    .config-value { color: #111827; font-weight: 600; font-family: monospace; }
    .footer { background: #4C1D95; padding: 20px 24px; text-align: center; color: rgba(255,255,255,0.7); font-size: 13px; }
    .footer-brand { color: #FCD34D; font-weight: bold; font-size: 15px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="brand">VIOLETTE <span>TRAIN</span></div>
      </div>
      <div class="body">
        <div class="success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2>Email Configuration Verified!</h2>
        <p>This is a test email from Violette Train. Your SMTP configuration is working correctly.</p>
        <p>If you received this email, booking confirmation emails will be delivered successfully to your customers.</p>
        <div class="config-box">
          <h4>SMTP Configuration</h4>
          <div class="config-row">
            <span class="config-label">Host</span>
            <span class="config-value">${host}</span>
          </div>
          <div class="config-row">
            <span class="config-label">Port</span>
            <span class="config-value">${port} (${secure ? 'SSL/TLS' : 'STARTTLS'})</span>
          </div>
          <div class="config-row">
            <span class="config-label">Auth User</span>
            <span class="config-value">${process.env.SMTP_USER || '(not set)'}</span>
          </div>
          <div class="config-row">
            <span class="config-label">From Address</span>
            <span class="config-value">${process.env.EMAIL_FROM || 'noreply@violettetrain.vn'}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <div class="footer-brand">VIOLETTE TRAIN</div>
        <p style="margin: 0;">📞 091 582 3667 / 0947 163 497 &nbsp;|&nbsp; ✉️ violettetrains@gmail.com</p>
      </div>
    </div>
  </div>
</body>
</html>
`,
      text: `Violette Train — Email Configuration Test

Your SMTP configuration is working correctly!

Host: ${host}
Port: ${port} (${secure ? 'SSL/TLS' : 'STARTTLS'})
Auth: ${process.env.SMTP_USER || '(not set)'}
From: ${process.env.EMAIL_FROM || 'noreply@violettetrain.vn'}

If you received this email, booking confirmation emails will be delivered successfully to your customers.

---
VIOLETTE TRAIN | 📞 091 582 3667 / 0947 163 497 | ✉️ violettetrains@gmail.com`,
    })

    return NextResponse.json({ success: true, message: `Test email sent to ${testEmail}` })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[API /admin/test-email]', errorMsg)

    if (errorMsg.includes('Invalid login')) {
      return NextResponse.json(
        { error: 'Authentication failed. Check SMTP_USER and SMTP_PASS credentials.' },
        { status: 401 }
      )
    }
    if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: `Connection failed. Check SMTP_HOST (${process.env.SMTP_HOST}) and SMTP_PORT.` },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: `Failed to send test email: ${errorMsg}` }, { status: 500 })
  }
}
