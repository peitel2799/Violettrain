/**
 * WhatsApp numbers are stored in E.164 form: "+" + country code + number.
 * Guests may type spaces, dots, dashes or brackets; "00" is read as "+", and a
 * leading single "0" is read as a Vietnamese number (+84), the most common case.
 */
export function normalizeWhatsapp(input: string): string | null {
  let value = input.trim().replace(/[\s.\-()]/g, '')
  if (!value) return null
  if (value.startsWith('00')) value = `+${value.slice(2)}`
  else if (/^0\d/.test(value)) value = `+84${value.slice(1)}`
  // Bare digits without "+" are ambiguous (84… vs a local number), so they are rejected.
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null
}

/** Link that opens a WhatsApp chat with the number. */
export function whatsappLink(e164: string, message?: string) {
  const digits = e164.replace(/\D/g, '')
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

/** "+84912345678" -> "+84 912 345 678" for display. */
export function formatWhatsapp(e164: string) {
  const match = e164.match(/^\+(84)(\d{3})(\d{3})(\d+)$/)
  if (match) return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`
  return e164
}
