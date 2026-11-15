/**
 * Manual PayPal payment settings shared by the booking API, the confirmation
 * screen and the emails. Safe to import on the client: it only reads values
 * passed in, never environment variables.
 */

export type ManualPaymentInfo = {
  /** Deadline of the cabin hold (ISO). */
  deadline: string
  totalVnd: number
  /** Amount to send in USD, rounded up to the cent; null when no rate is configured. */
  usdAmount: number | null
  vndPerUsd: number | null
  /** PayPal.me link with the amount pre-filled, when a PayPal.me handle is configured. */
  paypalLink: string | null
  /** PayPal account (email) that receives the money. */
  paypalEmail: string | null
  companyWhatsapp: string | null
  emailSent: boolean
  contactEmail: string
}

export function usdForVnd(amountVnd: number, vndPerUsd: number | null) {
  if (!vndPerUsd || vndPerUsd < 1000) return null
  return Math.ceil((amountVnd / vndPerUsd) * 100) / 100
}

/** https://paypal.me/name -> https://paypal.me/name/338.47USD */
export function paypalMeWithAmount(paypalMeUrl: string | null, usdAmount: number | null) {
  if (!paypalMeUrl) return null
  const base = paypalMeUrl.replace(/\/+$/, '')
  return usdAmount ? `${base}/${usdAmount.toFixed(2)}USD` : base
}
