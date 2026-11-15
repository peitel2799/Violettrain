import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export interface VnpayConfig {
  tmnCode: string
  hashSecret: string
  paymentUrl: string
}

function encodeParameters(parameters: Record<string, string>) {
  const search = new URLSearchParams()
  Object.keys(parameters).sort().forEach((key) => search.set(key, parameters[key]))
  return search.toString()
}

function formatVietnamTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}${value('month')}${value('day')}${value('hour')}${value('minute')}${value('second')}`
}

/** International Visa/Mastercard/JCB must be enabled in the VNPay merchant contract first. */
export function vnpayInternationalCardsEnabled() {
  return process.env.VNPAY_INTERNATIONAL_CARDS?.trim() === 'true'
}

export function getVnpayConfig(): VnpayConfig | null {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim()
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim()
  if (!tmnCode || !hashSecret) return null

  return {
    tmnCode,
    hashSecret,
    paymentUrl: process.env.VNPAY_PAYMENT_URL?.trim()
      || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  }
}

export function createVnpayPaymentUrl({
  config,
  merchantRequestId,
  amountVnd,
  returnUrl,
  ipAddress,
  locale,
  expiresAt,
  bankCode,
}: {
  config: VnpayConfig
  merchantRequestId: string
  amountVnd: number
  returnUrl: string
  ipAddress: string
  locale: 'vi' | 'en'
  expiresAt: Date
  /** VNBANK (domestic), VNPAYQR or INTCARD (international cards); omit to let the customer choose on VNPay. */
  bankCode?: 'VNBANK' | 'VNPAYQR' | 'INTCARD'
}) {
  const parameters: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(amountVnd * 100),
    vnp_CreateDate: formatVietnamTime(new Date()),
    vnp_CurrCode: 'VND',
    vnp_ExpireDate: formatVietnamTime(expiresAt),
    vnp_IpAddr: ipAddress || '127.0.0.1',
    vnp_Locale: locale === 'en' ? 'en' : 'vn',
    vnp_OrderInfo: `Thanh toan don hang ${merchantRequestId}`,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: merchantRequestId,
  }
  if (bankCode) parameters.vnp_BankCode = bankCode
  const signedData = encodeParameters(parameters)
  const signature = createHmac('sha512', config.hashSecret).update(signedData, 'utf8').digest('hex')
  return `${config.paymentUrl}?${signedData}&vnp_SecureHash=${signature}`
}

export function verifyVnpayParameters(
  searchParams: URLSearchParams,
  hashSecret: string
): { valid: boolean; parameters: Record<string, string> } {
  const parameters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') parameters[key] = value
  })
  const received = searchParams.get('vnp_SecureHash')?.toLowerCase() || ''
  const expected = createHmac('sha512', hashSecret)
    .update(encodeParameters(parameters), 'utf8')
    .digest('hex')
  const valid = received.length === expected.length
    && timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  return { valid, parameters }
}
