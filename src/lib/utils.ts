import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { STATION_NAMES, STATION_CODES, REFUND_POLICY } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | undefined | null, locale = 'vi-VN'): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'vi-VN' ? 'VND' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, locale = 'vi-VN'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function generateBookingRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let ref = 'VT-'
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return ref
}

export function getDsvnStationCode(internalCode: string): string {
  const station = STATION_NAMES[internalCode]
  return station?.dsvnCode || ''
}

export function getInternalStationCode(dsvnCode: string): string {
  return STATION_CODES[dsvnCode.toUpperCase()] || ''
}

export function getLocaleDate(date: string | Date, locale: 'vi' | 'en' = 'vi'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function getDayName(date: string, locale: 'vi' | 'en' = 'vi'): string {
  const d = new Date(date)
  const days = locale === 'vi'
    ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[d.getDay()]
}

export function isPeakSeason(date: string): boolean {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  // Tet peak season roughly: Jan 21 - Feb 9
  if (month === 1 && day >= 21) return true
  if (month === 2 && day <= 9) return true
  // Summer peak: June 1 - Aug 31
  if (month >= 6 && month <= 8) return true
  return false
}

export function calcRefund(
  price: number,
  departureDate: string,
  refundPolicy: typeof REFUND_POLICY
): { feePercent: number; refundAmount: number; notes: string } {
  const peak = isPeakSeason(departureDate)
  const hoursUntilDeparture = Math.max(
    0,
    (new Date(departureDate).getTime() - Date.now()) / (1000 * 60 * 60)
  )

  if (peak) {
    if (hoursUntilDeparture >= 48) {
      return { feePercent: 30, refundAmount: Math.round(price * 0.7), notes: refundPolicy.peak[0].notesVi }
    }
    return { feePercent: 100, refundAmount: 0, notes: refundPolicy.peak[1].notesVi }
  }

  if (hoursUntilDeparture >= 24) {
    return { feePercent: 10, refundAmount: Math.round(price * 0.9), notes: refundPolicy.regular[0].notesVi }
  }
  if (hoursUntilDeparture >= 4) {
    return { feePercent: 20, refundAmount: Math.round(price * 0.8), notes: refundPolicy.regular[1].notesVi }
  }
  return { feePercent: 100, refundAmount: 0, notes: refundPolicy.regular[2].notesVi }
}
