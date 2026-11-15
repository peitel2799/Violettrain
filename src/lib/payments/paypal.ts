import 'server-only'

/**
 * PayPal Orders v2 (redirect flow, intent CAPTURE).
 *
 * PayPal does not settle VND for standard merchant accounts, so the VND order
 * total is converted with a staff-configured rate (PAYPAL_VND_PER_USD) and the
 * exact foreign amount is stored on the payment attempt. A payment is confirmed
 * only from PayPal's server-to-server capture result or a signature-verified
 * webhook, never from browser query parameters.
 */

export type PaypalConfig = {
  clientId: string
  clientSecret: string
  apiBase: string
  webhookId: string | null
  currency: 'USD'
  vndPerUnit: number
  live: boolean
}

export type PaypalCapture = {
  id: string
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'FAILED' | string
  currency: string
  amountMinor: number
  customId: string | null
  orderId: string | null
}

const REQUEST_TIMEOUT_MS = 15_000

export function getPaypalConfig(): PaypalConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()
  const vndPerUnit = Number(process.env.PAYPAL_VND_PER_USD)
  if (!clientId || !clientSecret || !Number.isFinite(vndPerUnit) || vndPerUnit < 1000) return null

  const live = process.env.PAYPAL_ENV?.trim() === 'live'
  return {
    clientId,
    clientSecret,
    apiBase: process.env.PAYPAL_API_BASE?.trim() || (live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'),
    webhookId: process.env.PAYPAL_WEBHOOK_ID?.trim() || null,
    currency: 'USD',
    vndPerUnit,
    live,
  }
}

/** VND → USD cents, always rounded up so the merchant never receives less than the VND total at the configured rate. */
export function vndToMinorUnits(amountVnd: number, vndPerUnit: number) {
  return Math.ceil((amountVnd / vndPerUnit) * 100)
}

export function minorUnitsToValue(minor: number) {
  return (minor / 100).toFixed(2)
}

function valueToMinorUnits(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : NaN
}

let cachedToken: { key: string; value: string; expiresAt: number } | null = null

async function accessToken(config: PaypalConfig) {
  const key = `${config.apiBase}|${config.clientId}`
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.access_token) throw new Error(`PayPal authentication failed (${response.status}).`)
  cachedToken = { key, value: result.access_token, expiresAt: Date.now() + Number(result.expires_in || 300) * 1000 }
  return cachedToken.value
}

export class PaypalApiError extends Error {
  status: number
  issue: string | null
  constructor(status: number, issue: string | null, message: string) {
    super(message)
    this.status = status
    this.issue = issue
  }
}

async function paypalRequest<T>(config: PaypalConfig, path: string, init: { method: 'GET' | 'POST'; body?: unknown; requestId?: string }) {
  const token = await accessToken(config)
  const response = await fetch(`${config.apiBase}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.requestId ? { 'PayPal-Request-Id': init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const issue = result?.details?.[0]?.issue ?? result?.name ?? null
    throw new PaypalApiError(response.status, issue, `PayPal ${init.method} ${path.split('/').slice(0, 4).join('/')} failed (${response.status}${issue ? ` ${issue}` : ''}).`)
  }
  return result as T
}

type PaypalLink = { rel: string; href: string }
type PaypalOrder = {
  id: string
  status: string
  links?: PaypalLink[]
  purchase_units?: Array<{
    custom_id?: string
    payments?: { captures?: Array<{ id: string; status: string; amount?: { currency_code: string; value: string }; custom_id?: string }> }
  }>
}

export async function createPaypalOrder({
  config,
  merchantRequestId,
  reference,
  amountMinor,
  returnUrl,
  cancelUrl,
  locale,
}: {
  config: PaypalConfig
  merchantRequestId: string
  reference: string
  amountMinor: number
  returnUrl: string
  cancelUrl: string
  locale: 'vi' | 'en'
}) {
  // PayPal-Request-Id makes retries for the same attempt return the same PayPal order.
  const order = await paypalRequest<PaypalOrder>(config, '/v2/checkout/orders', {
    method: 'POST',
    requestId: `create-${merchantRequestId}`,
    body: {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: reference,
        custom_id: merchantRequestId,
        invoice_id: merchantRequestId,
        description: `Violette Train cabin booking ${reference}`.slice(0, 127),
        amount: { currency_code: config.currency, value: minorUnitsToValue(amountMinor) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Violette Train',
            locale: locale === 'vi' ? 'vi-VN' : 'en-US',
            landing_page: 'LOGIN',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    },
  })
  const approveUrl = order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href
  if (!order.id || !approveUrl) throw new Error('PayPal did not return an approval link.')
  return { id: order.id, approveUrl }
}

export function captureFromOrder(order: PaypalOrder): PaypalCapture | null {
  const unit = order.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  if (!capture) return null
  return {
    id: capture.id,
    status: capture.status,
    currency: capture.amount?.currency_code ?? '',
    amountMinor: valueToMinorUnits(capture.amount?.value),
    customId: capture.custom_id ?? unit?.custom_id ?? null,
    orderId: order.id,
  }
}

/** Captures an approved order. Safe to call twice: an already-captured order returns its existing capture. */
export async function capturePaypalOrder(config: PaypalConfig, orderId: string, merchantRequestId: string) {
  try {
    const order = await paypalRequest<PaypalOrder>(config, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      requestId: `capture-${merchantRequestId}`,
      body: {},
    })
    return { orderStatus: order.status, capture: captureFromOrder(order) }
  } catch (error) {
    if (error instanceof PaypalApiError && error.issue === 'ORDER_ALREADY_CAPTURED') {
      const order = await getPaypalOrder(config, orderId)
      return { orderStatus: order.status, capture: captureFromOrder(order) }
    }
    throw error
  }
}

export async function getPaypalOrder(config: PaypalConfig, orderId: string) {
  return paypalRequest<PaypalOrder>(config, `/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET' })
}

/** Verifies a webhook through PayPal's verify-webhook-signature API. */
export async function verifyPaypalWebhook(config: PaypalConfig, headers: Headers, event: unknown) {
  if (!config.webhookId) return false
  const header = (name: string) => headers.get(name) ?? ''
  if (!header('paypal-transmission-id') || !header('paypal-transmission-sig')) return false
  try {
    const result = await paypalRequest<{ verification_status?: string }>(config, '/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: {
        auth_algo: header('paypal-auth-algo'),
        cert_url: header('paypal-cert-url'),
        transmission_id: header('paypal-transmission-id'),
        transmission_sig: header('paypal-transmission-sig'),
        transmission_time: header('paypal-transmission-time'),
        webhook_id: config.webhookId,
        webhook_event: event,
      },
    })
    return result.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('[PayPal webhook verify]', error instanceof Error ? error.message : error)
    return false
  }
}
