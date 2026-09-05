import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { Booking, BookingStatus } from '@/lib/booking-types'

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json')

async function readBookings(): Promise<Booking[]> {
  try {
    if (!existsSync(BOOKINGS_FILE)) return []
    return JSON.parse(await readFile(BOOKINGS_FILE, 'utf-8'))
  } catch { return [] }
}

async function writeBookings(bookings: Booking[]): Promise<void> {
  await writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8')
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[.,\s]/g, '')) || 0
  return 0
}

function calcStatus(paid: number, total: number): BookingStatus {
  if (paid <= 0) return 'pending'
  if (paid >= total) return 'paid'
  return 'partial'
}

// PATCH = update booking
export async function PATCH(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const username = request.headers.get('X-Admin-User') || 'admin'
    const bookings = await readBookings()
    const idx = bookings.findIndex((b) => b.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const old = bookings[idx]

    // Track changes
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    for (const [key, val] of Object.entries(updates)) {
      if (['id', 'auditLog', 'createdAt', 'createdBy'].includes(key)) continue
      const oldVal = (old as unknown as Record<string, unknown>)[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
        changes[key] = { from: oldVal, to: val }
      }
    }

    // Recalculate status if amount changes
    let newPaid = parseNum(updates.paidAmount ?? old.paidAmount)
    let newTotal = parseNum(updates.totalAmount ?? old.totalAmount)
    const newStatus = calcStatus(newPaid, newTotal)

    // Add audit entry
    const auditLog = [...(old.auditLog || [])]
    auditLog.push({ at: new Date().toISOString(), by: username, action: 'UPDATE', changes })

    const updated: Booking = {
      ...old,
      ...updates,
      paidAmount: newPaid,
      totalAmount: newTotal,
      status: updates.status !== undefined ? (updates.status as BookingStatus) : newStatus,
      updatedBy: username,
      updatedAt: new Date().toISOString(),
      auditLog,
    }

    bookings[idx] = updated
    await writeBookings(bookings)

    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('[API /admin/bookings PATCH]', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

// DELETE = soft delete booking
export async function DELETE(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const username = request.headers.get('X-Admin-User') || 'admin'
    const bookings = await readBookings()
    const idx = bookings.findIndex((b) => b.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const old = bookings[idx]
    const auditLog = [...(old.auditLog || [])]
    auditLog.push({ at: new Date().toISOString(), by: username, action: 'DELETE' })

    bookings[idx] = { ...old, status: 'cancelled', updatedBy: username, updatedAt: new Date().toISOString(), auditLog }
    await writeBookings(bookings)

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[API /admin/bookings DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }
}
