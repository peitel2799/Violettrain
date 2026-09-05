/**
 * Admin Data Store
 * In-memory store with JSON file persistence.
 * Stores: schedules, bookings.
 * For production, replace with a real database (Supabase, PostgreSQL, etc.).
 */

import fs from 'fs'
import path from 'path'
import {
  TRAIN_DATABASE_SOURCE,
  TRAIN_ROUTES,
  getTrainStation,
  searchSchedules,
} from './train-database'

const DATA_DIR = path.join(process.cwd(), 'data')
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json')
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback
    const raw = fs.readFileSync(file, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: unknown) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminSchedule {
  id: string
  trainNumber: string
  routeId: string
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  duration?: string
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  cabinAvailability: Record<string, number>
  hasLanding: boolean
  hasRestaurant: boolean
  active: boolean
  notes?: string
}

export interface AdminBooking {
  id: string
  reference: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  routeId: string
  routeName: string
  cabinClassId: string
  cabinClassName: string
  departureDate: string
  departureTime: string
  trainNumber: string
  isRoundTrip: boolean
  returnDate?: string
  passengers: {
    type: 'adult' | 'child' | 'infant'
    fullName: string
    email: string
    phone: string
    dateOfBirth?: string
  }[]
  pricing: {
    subtotal: number
    tax: number
    total: number
  }
  payment: {
    method: string
    transactionId?: string
    paidAt?: string
  }
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  totalRevenue: number
  averageTicketPrice: number
  topRoutes: { routeId: string; routeName: string; count: number; revenue: number }[]
  recentBookings: AdminBooking[]
  bookingsByDay: { date: string; count: number; revenue: number }[]
  revenueByMonth: { month: string; revenue: number }[]
}

// ─── Schedules Store ─────────────────────────────────────────────────────────

export function getSchedules(): AdminSchedule[] {
  return readJson<AdminSchedule[]>(SCHEDULES_FILE, getDefaultSchedules())
}

export function setSchedules(schedules: AdminSchedule[]): void {
  writeJson(SCHEDULES_FILE, schedules)
}

export function getScheduleById(id: string): AdminSchedule | undefined {
  return getSchedules().find((s) => s.id === id)
}

export function upsertSchedule(schedule: AdminSchedule): AdminSchedule {
  const schedules = getSchedules()
  const idx = schedules.findIndex((s) => s.id === schedule.id)
  if (idx >= 0) {
    schedules[idx] = schedule
  } else {
    schedules.push(schedule)
  }
  setSchedules(schedules)
  return schedule
}

export function updateSeatAvailability(
  scheduleId: string,
  cabinClassId: string,
  delta: number
): AdminSchedule | null {
  const schedules = getSchedules()
  const schedule = schedules.find((s) => s.id === scheduleId)
  if (!schedule) return null

  const current = schedule.cabinAvailability[cabinClassId] ?? 0
  schedule.cabinAvailability[cabinClassId] = Math.max(0, current + delta)
  setSchedules(schedules)
  return schedule
}

// ─── Bookings Store ───────────────────────────────────────────────────────────

export function getBookings(): AdminBooking[] {
  return readJson<AdminBooking[]>(BOOKINGS_FILE, [])
}

export function setBookings(bookings: AdminBooking[]): void {
  writeJson(BOOKINGS_FILE, bookings)
}

export function getBookingByReference(ref: string): AdminBooking | undefined {
  return getBookings().find((b) => b.reference === ref)
}

export function createBooking(booking: AdminBooking): AdminBooking {
  const bookings = getBookings()
  if (!booking.id) booking.id = `BK-${Date.now()}`
  if (!booking.reference) booking.reference = `VT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  if (!booking.createdAt) booking.createdAt = new Date().toISOString()
  if (!booking.updatedAt) booking.updatedAt = new Date().toISOString()
  bookings.unshift(booking)
  setBookings(bookings)
  console.log(`\n🎫 [BOOKING CREATED] ${booking.reference} | Total: ${booking.pricing.total.toLocaleString()} VND | Passengers: ${booking.passengers.length}`)
  return booking
}

export function updateBookingStatus(
  ref: string,
  status: AdminBooking['status'],
  paymentStatus?: AdminBooking['paymentStatus']
): AdminBooking | null {
  const bookings = getBookings()
  const booking = bookings.find((b) => b.reference === ref)
  if (!booking) return null
  booking.status = status
  if (paymentStatus) booking.paymentStatus = paymentStatus
  booking.updatedAt = new Date().toISOString()
  setBookings(bookings)
  return booking
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function getDashboardStats(): DashboardStats {
  const bookings = getBookings()
  const confirmed = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed')
  const pending = bookings.filter((b) => b.status === 'pending')
  const cancelled = bookings.filter((b) => b.status === 'cancelled')
  const totalRevenue = confirmed.reduce((sum, b) => sum + b.pricing.total, 0)

  const routeMap = new Map<string, { routeName: string; count: number; revenue: number }>()
  for (const b of confirmed) {
    const existing = routeMap.get(b.routeId) ?? { routeName: b.routeName, count: 0, revenue: 0 }
    existing.count++
    existing.revenue += b.pricing.total
    routeMap.set(b.routeId, existing)
  }
  const topRoutes = Array.from(routeMap.entries())
    .map(([routeId, data]) => ({ routeId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const dayMap = new Map<string, { count: number; revenue: number }>()
  for (const b of confirmed) {
    const day = b.createdAt.split('T')[0]
    const existing = dayMap.get(day) ?? { count: 0, revenue: 0 }
    existing.count++
    existing.revenue += b.pricing.total
    dayMap.set(day, existing)
  }
  const bookingsByDay = Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  const monthMap = new Map<string, number>()
  for (const b of confirmed) {
    const month = b.createdAt.substring(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + b.pricing.total)
  }
  const revenueByMonth = Array.from(monthMap.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)

  return {
    totalBookings: bookings.length,
    confirmedBookings: confirmed.length,
    pendingBookings: pending.length,
    cancelledBookings: cancelled.length,
    totalRevenue,
    averageTicketPrice: confirmed.length > 0 ? totalRevenue / confirmed.length : 0,
    topRoutes,
    recentBookings: bookings.slice(0, 10),
    bookingsByDay,
    revenueByMonth,
  }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

function getDefaultSchedules(): AdminSchedule[] {
  return TRAIN_ROUTES.flatMap((route) => [
    [route.from, route.to],
    [route.to, route.from],
  ].flatMap(([from, to]) => {
    const fromStation = getTrainStation(from)
    const toStation = getTrainStation(to)
    if (!fromStation || !toStation) return []

    return searchSchedules(from, to, TRAIN_DATABASE_SOURCE.verifiedOn, 'vi').map((schedule) => ({
      id: schedule.scheduleId ?? `${schedule.trainNumber}-${fromStation.code}-${toStation.code}`,
      trainNumber: schedule.trainNumber,
      routeId: `${fromStation.code}-${toStation.code}`,
      fromStation: `Ga ${fromStation.nameVi}`,
      toStation: `Ga ${toStation.nameVi}`,
      departureTime: schedule.departureTime,
      arrivalTime: `${schedule.arrivalTime}${schedule.arrivalDayOffset ? ` (+${schedule.arrivalDayOffset})` : ''}`,
      duration: schedule.duration,
      days: schedule.departureDays as AdminSchedule['days'],
      cabinAvailability: { standard: 0, premium: 0 },
      hasLanding: true,
      hasRestaurant: false,
      active: true,
      notes: `DSVN timetable verified ${TRAIN_DATABASE_SOURCE.verifiedOn}; live seat inventory is not synchronized.`,
    }))
  }))
}
