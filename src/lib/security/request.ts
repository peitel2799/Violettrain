import 'server-only'

import type { NextRequest } from 'next/server'

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large.')
  }
}

/**
 * Reads a JSON body while refusing oversized payloads, so a single request
 * cannot exhaust memory. Returns null for malformed JSON.
 */
export async function readJsonBody(request: NextRequest | Request, maxBytes = 32 * 1024): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new BodyTooLargeError()

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new BodyTooLargeError()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Origin used to build payment return URLs. When PAYMENT_RETURN_ORIGIN is set
 * (recommended in production, e.g. https://violettetrain.com) it is used
 * instead of the Host header, so a spoofed host can never send buyers back to
 * another site after paying.
 */
export function getPublicOrigin(request: NextRequest | Request) {
  const configured = process.env.PAYMENT_RETURN_ORIGIN?.trim()
  if (configured) {
    try {
      const url = new URL(configured)
      if (url.protocol === 'https:' || url.hostname === 'localhost') return url.origin
    } catch {
      console.error('[security] PAYMENT_RETURN_ORIGIN is not a valid URL; using the request origin.')
    }
  }
  return new URL(request.url).origin
}

/** Masks an email for logs: "nguyen.van.a@gmail.com" -> "ng***@gmail.com". */
export function maskEmail(email: string) {
  const [name = '', domain = ''] = String(email).split('@')
  return `${name.slice(0, 2)}***@${domain || '?'}`
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
