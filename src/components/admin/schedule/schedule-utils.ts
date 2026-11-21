export type AdminRole = 'admin' | 'operations' | 'pricing' | 'support'
export type DepartureStatus = 'draft' | 'published' | 'cancelled' | 'departed'
export type ProductCode = 'standard' | 'premium'

export type CalendarProduct = {
  code: ProductCode
  capacity: number
  blocked: number
  ticketPrice: number | null
  sold: number
  held: number
}

export type CalendarDeparture = {
  id: number
  version: number
  serviceDate: string
  status: DepartureStatus
  source: 'manual' | 'dsvn'
  /** Placeholder for a date DSVN has not opened yet (copied from the recent daily pattern). */
  projected?: boolean
  adminStatusOverride: boolean
  departureAt: string
  arrivalAt: string
  updatedAt: string
  trainId: number
  trainNumber: string
  departureTime: string
  arrivalTime: string
  arrivalDayOffset: number
  hasOrders: boolean
  products: CalendarProduct[]
  /** DSVN 4-berth compartment fares for the same date/train/segment ("giá cơ sở"). */
  dsvnFare?: DsvnFareSummary | null
}

export type DsvnFareSummary = {
  lowerMin: number | null
  lowerMax: number | null
  upperMin: number | null
  upperMax: number | null
  fetchedAt: string | null
}

export type DsvnFareRow = { seatCode: string; seatName: string; seatGroup: string; fare: number; fetchedAt: string }

/** Cheapest way to buy a whole 4-berth compartment from DSVN: 2 lower + 2 upper berths. */
export function dsvnCabinBase(fare: DsvnFareSummary | null | undefined) {
  if (!fare?.lowerMin || !fare.upperMin) return null
  const cabin = fare.lowerMin * 2 + fare.upperMin * 2
  return { cabin, perTicket: Math.round(cabin / TICKETS_PER_CABIN) }
}

/** Violette ticket price compared with the DSVN base per ticket. */
export function marginAgainstDsvn(ticketPrice: number | null | undefined, fare: DsvnFareSummary | null | undefined) {
  const base = dsvnCabinBase(fare)
  if (!base || !ticketPrice) return null
  const perTicket = ticketPrice - base.perTicket
  return { perTicket, perCabin: perTicket * TICKETS_PER_CABIN, percent: Math.round((perTicket / base.perTicket) * 100) }
}

export const DSVN_FARE_PAGE = 'https://giotaugiave.dsvn.vn/giave/thongnhat'

export type CalendarRoute = {
  id: number
  code: string
  from_station: { code: string; name_vi: string } | null
  to_station: { code: string; name_vi: string } | null
}

export type CalendarData = {
  routes: CalendarRoute[]
  routeId: number | null
  departures: CalendarDeparture[]
  viewer: { role: AdminRole; displayName: string }
  serverTime: string
  lastSync: {
    status: 'running' | 'succeeded' | 'partial' | 'failed'
    startedAt: string
    finishedAt: string | null
    error: string | null
  } | null
}

export type Permissions = { canOperate: boolean; canPrice: boolean }

export type UpdatePayload = {
  status?: 'draft' | 'published' | null
  standardTicketPriceVnd?: number | null
  standardCapacity?: number | null
  vip2TicketPriceVnd?: number | null
  vip2Capacity?: number | null
  reason?: string
}

export const VIETNAM_TZ = 'Asia/Ho_Chi_Minh'
export const TICKETS_PER_CABIN = 4
export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const
export const WEEKDAY_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'] as const

/**
 * What staff see. "draft" is split: a pause chosen by staff ("Tạm ngưng bán") versus a
 * departure the DSVN sync added that has no Violette price yet ("Chưa có giá"). The sync
 * itself never pauses a sale.
 */
export type DisplayStatus = DepartureStatus | 'unpriced'

export const STATUS_META: Record<DisplayStatus, { label: string; dot: string; chip: string; text: string }> = {
  published: { label: 'Đang bán', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', text: 'text-emerald-700' },
  draft: { label: 'Tạm ngưng bán', dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-800 ring-amber-200', text: 'text-amber-700' },
  unpriced: { label: 'Chưa có giá', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-800 ring-sky-200', text: 'text-sky-700' },
  cancelled: { label: 'DSVN hủy chuyến', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-800 ring-rose-200', text: 'text-rose-700' },
  departed: { label: 'Đã chạy', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 ring-slate-200', text: 'text-slate-500' },
}

const moneyFormatter = new Intl.NumberFormat('vi-VN')

export function formatMoney(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return `${moneyFormatter.format(amount)}đ`
}

/** Compact price for small calendar cells, e.g. 2.000.000 → "2tr", 1.950.000 → "1,95tr". */
export function formatMoneyShort(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return '—'
  if (amount >= 1_000_000) {
    const millions = Math.round((amount / 1_000_000) * 100) / 100
    return `${millions.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}tr`
  }
  return `${Math.round(amount / 1000).toLocaleString('vi-VN')}k`
}

/** Today's date (YYYY-MM-DD) in Vietnam, regardless of the browser time zone. */
export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(date: string) {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

export function monthKey(date: string) {
  return date.slice(0, 7)
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const value = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return value.toISOString().slice(0, 7)
}

export function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return `Tháng ${monthNumber}/${year}`
}

/** Calendar grid (Monday-first) covering the whole month, 5–6 weeks. */
export function monthGrid(month: string) {
  const first = `${month}-01`
  const start = addDays(first, -weekdayIndex(first))
  const nextMonthFirst = `${shiftMonth(month, 1)}-01`
  const lastOfMonth = addDays(nextMonthFirst, -1)
  const end = addDays(lastOfMonth, 6 - weekdayIndex(lastOfMonth))
  const days: string[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return { start, end, days }
}

export function formatDayMonth(date: string) {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

export function formatFullDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${WEEKDAY_LONG[weekdayIndex(date)]}, ${day}/${month}/${year}`
}

export function arrivalDayText(offset: number) {
  if (offset <= 0) return 'cùng ngày'
  if (offset === 1) return 'hôm sau'
  return `sau ${offset} ngày`
}

export function productOf(departure: CalendarDeparture, code: ProductCode) {
  return departure.products.find((product) => product.code === code)
}

export function remainingCabins(product: CalendarProduct | undefined) {
  if (!product) return 0
  return Math.max(product.capacity - product.blocked - product.sold - product.held, 0)
}

export function isDeparted(departure: CalendarDeparture, now = Date.now()) {
  return departure.status === 'departed' || Date.parse(departure.departureAt) <= now
}

export function displayStatus(departure: CalendarDeparture, now = Date.now()): DisplayStatus {
  if (isDeparted(departure, now) && departure.status !== 'cancelled') return 'departed'
  if (departure.status === 'draft' && !departure.adminStatusOverride) return 'unpriced'
  return departure.status
}

export function isSoldOut(departure: CalendarDeparture) {
  const standard = productOf(departure, 'standard')
  return departure.status === 'published' && Boolean(standard) && standard!.capacity > 0 && remainingCabins(standard) === 0
}

export function permissionsFor(role: AdminRole | undefined): Permissions {
  return {
    canOperate: role === 'admin' || role === 'operations',
    canPrice: role === 'admin' || role === 'operations' || role === 'pricing',
  }
}

export function routeLabel(route: CalendarRoute | undefined) {
  if (!route) return ''
  return `${route.from_station?.name_vi ?? '?'} → ${route.to_station?.name_vi ?? '?'}`
}

/** Most common fares in the loaded data, used as one-tap suggestions. */
export function suggestedPrices(departures: CalendarDeparture[], code: ProductCode = 'standard', limit = 4) {
  const counts = new Map<number, number>()
  for (const departure of departures) {
    const price = productOf(departure, code)?.ticketPrice
    if (price) counts.set(price, (counts.get(price) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, limit).map(([price]) => price).sort((a, b) => a - b)
}

export class ApiError extends Error {
  conflict: boolean
  constructor(message: string, conflict = false) {
    super(message)
    this.conflict = conflict
  }
}

export async function postSchedule<T = Record<string, number>>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/admin/schedule-calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (response.status === 401) {
    window.location.assign('/admin/login')
    throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(result.error || 'Không lưu được. Vui lòng thử lại.', Boolean(result.conflict))
  return result.result as T
}
