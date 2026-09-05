import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { Booking, BookingStatus, AuditLogEntry } from '@/lib/booking-types'

const DATA_DIR = path.join(process.cwd(), 'data')
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json')

async function readBookings(): Promise<Booking[]> {
  try {
    if (!existsSync(BOOKINGS_FILE)) return []
    const content = await readFile(BOOKINGS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return [] }
}

async function writeBookings(bookings: Booking[]): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8')
}

function now() { return new Date().toISOString() }

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[.,\s]/g, '')) || 0
  return 0
}

// GET = list bookings
export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const sortField = searchParams.get('sortField') || 'departureDate'
    const sortDir = searchParams.get('sortDir') || 'desc'

    let bookings = await readBookings()

    // Filter
    if (status) bookings = bookings.filter((b) => b.status === status)
    if (dateFrom) bookings = bookings.filter((b) => b.departureDate >= dateFrom)
    if (dateTo) bookings = bookings.filter((b) => b.departureDate <= dateTo)
    if (search) {
      const q = search.toLowerCase()
      bookings = bookings.filter((b) =>
        b.companyName.toLowerCase().includes(q) ||
        b.trainNumber.toLowerCase().includes(q) ||
        b.route.toLowerCase().includes(q) ||
        b.notes.toLowerCase().includes(q) ||
        b.taxCode.toLowerCase().includes(q)
      )
    }

    // Sort
    bookings.sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortField] || '').toLowerCase()
      const bVal = String((b as unknown as Record<string, unknown>)[sortField] || '').toLowerCase()
      const cmp = aVal.localeCompare(bVal, 'vi')
      return sortDir === 'asc' ? cmp : -cmp
    })

    // Stats
    const totalAmount = bookings.reduce((s, b) => s + b.totalAmount, 0)
    const totalPaid = bookings.reduce((s, b) => s + b.paidAmount, 0)
    const totalDebt = totalAmount - totalPaid
    const byStatus: Record<BookingStatus, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    }
    bookings.forEach((b) => {
      byStatus[b.status].count++
      byStatus[b.status].amount += b.totalAmount
    })

    const total = bookings.length
    const start = (page - 1) * limit
    const items = bookings.slice(start, start + limit)

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: { totalAmount, totalPaid, totalDebt, byStatus },
    })
  } catch (error) {
    console.error('[API /admin/bookings GET]', error)
    return NextResponse.json({ error: 'Failed to read bookings' }, { status: 500 })
  }
}

// POST = create booking
export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const username = request.headers.get('X-Admin-User') || 'admin'

    const booking: Booking = {
      id: `booking_${Date.now()}`,
      companyName: String(body.companyName || ''),
      companyContact: String(body.companyContact || ''),
      companyPhone: String(body.companyPhone || ''),
      companyEmail: String(body.companyEmail || ''),
      taxCode: String(body.taxCode || ''),
      bookingDate: String(body.bookingDate || now().split('T')[0]),
      departureDate: String(body.departureDate || ''),
      trainNumber: String(body.trainNumber || ''),
      route: String(body.route || ''),
      carriage: String(body.carriage || ''),
      totalTickets: parseNum(body.totalTickets),
      unitPrice: parseNum(body.unitPrice),
      totalAmount: parseNum(body.totalAmount || body.totalTickets * body.unitPrice),
      paymentMethod: String(body.paymentMethod || 'CK'),
      paidAmount: parseNum(body.paidAmount),
      paidDate: body.paidDate || null,
      matchedTransactionIds: [],
      status: calcStatus(parseNum(body.paidAmount), parseNum(body.totalAmount)),
      notes: String(body.notes || ''),
      createdBy: username,
      createdAt: now(),
      updatedBy: username,
      updatedAt: now(),
      auditLog: [],
    }

    const bookings = await readBookings()
    bookings.unshift(booking)
    await writeBookings(bookings)

    return NextResponse.json({ item: booking }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/bookings POST]', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

function calcStatus(paid: number, total: number): BookingStatus {
  if (paid <= 0) return 'pending'
  if (paid >= total) return 'paid'
  return 'partial'
}
