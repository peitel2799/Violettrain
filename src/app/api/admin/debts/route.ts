import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { Booking, DebtSummary, DebtBooking } from '@/lib/booking-types'

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json')

async function readBookings(): Promise<Booking[]> {
  if (!existsSync(BOOKINGS_FILE)) return []
  try { return JSON.parse(await readFile(BOOKINGS_FILE, 'utf-8')) } catch { return [] }
}

// GET = debt summary by company
export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const showPaid = searchParams.get('showPaid') === 'true'

    let bookings = await readBookings()

    if (dateFrom) bookings = bookings.filter((b) => b.departureDate >= dateFrom)
    if (dateTo) bookings = bookings.filter((b) => b.departureDate <= dateTo)
    if (!showPaid) bookings = bookings.filter((b) => b.status !== 'paid' && b.status !== 'cancelled')

    // Group by company
    const companyMap = new Map<string, Booking[]>()

    for (const booking of bookings) {
      const key = booking.companyName.trim() || 'Unknown'
      if (!companyMap.has(key)) companyMap.set(key, [])
      companyMap.get(key)!.push(booking)
    }

    const debts: DebtSummary[] = []

    for (const [companyName, companyBookings] of companyMap) {
      const totalAmount = companyBookings.reduce((s, b) => s + b.totalAmount, 0)
      const totalPaid = companyBookings.reduce((s, b) => s + b.paidAmount, 0)
      const totalDebt = totalAmount - totalPaid

      const debtBookings: DebtBooking[] = companyBookings.map((b) => ({
        id: b.id,
        departureDate: b.departureDate,
        trainNumber: b.trainNumber,
        route: b.route,
        totalTickets: b.totalTickets,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        debt: b.totalAmount - b.paidAmount,
        status: b.status,
        lastPaymentDate: b.paidDate,
      }))

      // Sort by debt descending
      debtBookings.sort((a, b) => b.debt - a.debt)

      if (!showPaid && totalDebt <= 0) continue // skip fully paid if not showing

      debts.push({
        companyName,
        totalBookings: companyBookings.length,
        totalAmount,
        totalPaid,
        totalDebt,
        bookings: debtBookings,
      })
    }

    // Sort by totalDebt descending
    debts.sort((a, b) => b.totalDebt - a.totalDebt)

    const overallTotalDebt = debts.reduce((s, d) => s + d.totalDebt, 0)
    const overallTotalAmount = debts.reduce((s, d) => s + d.totalAmount, 0)
    const overallTotalPaid = debts.reduce((s, d) => s + d.totalPaid, 0)

    return NextResponse.json({
      debts,
      overallTotalDebt,
      overallTotalAmount,
      overallTotalPaid,
    })
  } catch (error) {
    console.error('[API /admin/debts GET]', error)
    return NextResponse.json({ error: 'Failed to compute debts' }, { status: 500 })
  }
}
