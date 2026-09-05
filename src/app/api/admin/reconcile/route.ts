import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { Booking, BankTransaction } from '@/lib/booking-types'

const DATA_DIR = path.join(process.cwd(), 'data')
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json')
const BANK_FILE = path.join(DATA_DIR, 'bank_transactions.json')

async function readBookings(): Promise<Booking[]> {
  if (!existsSync(BOOKINGS_FILE)) return []
  try { return JSON.parse(await readFile(BOOKINGS_FILE, 'utf-8')) } catch { return [] }
}

async function writeBookings(bookings: Booking[]): Promise<void> {
  await writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8')
}

async function readTransactions(): Promise<BankTransaction[]> {
  if (!existsSync(BANK_FILE)) return []
  try { return JSON.parse(await readFile(BANK_FILE, 'utf-8')) } catch { return [] }
}

async function writeTransactions(txs: BankTransaction[]): Promise<void> {
  await writeFile(BANK_FILE, JSON.stringify(txs, null, 2), 'utf-8')
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[.,\s]/g, '')) || 0
  return 0
}

// POST /api/admin/reconcile = match bank transaction to booking
export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, bookingId, bankTxId, amount } = body
    const username = request.headers.get('X-Admin-User') || 'admin'

    if (action === 'match') {
      if (!bookingId || !bankTxId) {
        return NextResponse.json({ error: 'bookingId and bankTxId required' }, { status: 400 })
      }

      const bookings = await readBookings()
      const txs = await readTransactions()
      const bIdx = bookings.findIndex((b) => b.id === bookingId)
      const tIdx = txs.findIndex((t) => t.id === bankTxId)

      if (bIdx === -1) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      if (tIdx === -1) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

      const matchAmount = parseNum(amount) || txs[tIdx].credit

      // Update booking paidAmount
      const booking = { ...bookings[bIdx] }
      const prevPaid = booking.paidAmount
      booking.paidAmount = prevPaid + matchAmount
      if (booking.paidAmount >= booking.totalAmount) booking.status = 'paid'
      else if (booking.paidAmount > 0) booking.status = 'partial'
      booking.updatedBy = username
      booking.updatedAt = new Date().toISOString()
      booking.auditLog = [...(booking.auditLog || []), {
        at: new Date().toISOString(),
        by: username,
        action: 'MATCH',
        changes: { paidAmount: { from: prevPaid, to: booking.paidAmount }, matchedTx: { from: null, to: bankTxId } },
      }]
      if (!booking.matchedTransactionIds) booking.matchedTransactionIds = []
      if (!booking.matchedTransactionIds.includes(bankTxId)) booking.matchedTransactionIds.push(bankTxId)
      bookings[bIdx] = booking

      // Update transaction
      const tx = { ...txs[tIdx] }
      if (!tx.matchedBookingIds) tx.matchedBookingIds = []
      if (!tx.matchedBookingIds.includes(bookingId)) tx.matchedBookingIds.push(bookingId)
      tx.auditLog = [...(tx.auditLog || []), {
        at: new Date().toISOString(),
        by: username,
        action: 'MATCH',
        changes: { matchedBooking: { from: null, to: bookingId } },
      }]
      txs[tIdx] = tx

      await writeBookings(bookings)
      await writeTransactions(txs)

      return NextResponse.json({ booking, transaction: tx })
    }

    if (action === 'unmatch') {
      if (!bookingId || !bankTxId) {
        return NextResponse.json({ error: 'bookingId and bankTxId required' }, { status: 400 })
      }

      const bookings = await readBookings()
      const txs = await readTransactions()
      const bIdx = bookings.findIndex((b) => b.id === bookingId)
      const tIdx = txs.findIndex((t) => t.id === bankTxId)

      if (bIdx === -1 || tIdx === -1) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const matchAmount = parseNum(amount) || txs[tIdx].credit

      // Update booking
      const booking = { ...bookings[bIdx] }
      booking.paidAmount = Math.max(0, booking.paidAmount - matchAmount)
      if (booking.paidAmount <= 0) booking.status = 'pending'
      else booking.status = 'partial'
      booking.updatedBy = username
      booking.updatedAt = new Date().toISOString()
      booking.matchedTransactionIds = (booking.matchedTransactionIds || []).filter((id) => id !== bankTxId)
      booking.auditLog = [...(booking.auditLog || []), {
        at: new Date().toISOString(), by: username, action: 'UNMATCH',
        changes: { paidAmount: { from: booking.paidAmount + matchAmount, to: booking.paidAmount } },
      }]
      bookings[bIdx] = booking

      // Update transaction
      const tx = { ...txs[tIdx] }
      tx.matchedBookingIds = (tx.matchedBookingIds || []).filter((id) => id !== bookingId)
      tx.auditLog = [...(tx.auditLog || []), { at: new Date().toISOString(), by: username, action: 'UNMATCH' }]
      txs[tIdx] = tx

      await writeBookings(bookings)
      await writeTransactions(txs)

      return NextResponse.json({ booking, transaction: tx })
    }

    if (action === 'auto') {
      // Auto-match: find unmatched bank credits to unmatched bookings by amount
      const bookings = await readBookings()
      const txs = await readTransactions()

      const unmatchedBookings = bookings.filter((b) => b.status !== 'paid' && b.status !== 'cancelled')
      const unmatchedTxs = txs.filter((t) => t.credit > 0 && (t.matchedBookingIds || []).length === 0)

      const results: { bookingId: string; bankTxId: string; matchedAmount: number }[] = []

      // Sort by amount descending to match larger amounts first
      unmatchedBookings.sort((a, b) => b.totalAmount - a.totalAmount)
      unmatchedTxs.sort((a, b) => b.credit - a.credit)

      for (const tx of unmatchedTxs) {
        for (const booking of unmatchedBookings) {
          if (booking.status === 'paid') continue
          const remaining = booking.totalAmount - booking.paidAmount
          if (remaining <= 0) continue
          if (Math.abs(tx.credit - remaining) < remaining * 0.05) {
            // Match! (within 5% tolerance)
            const matchAmount = tx.credit
            const bIdx = bookings.findIndex((b) => b.id === booking.id)
            const tIdx = txs.findIndex((t) => t.id === tx.id)

            bookings[bIdx].paidAmount += matchAmount
            bookings[bIdx].status = bookings[bIdx].paidAmount >= bookings[bIdx].totalAmount ? 'paid' : 'partial'
            bookings[bIdx].updatedBy = username
            bookings[bIdx].updatedAt = new Date().toISOString()
            if (!bookings[bIdx].matchedTransactionIds) bookings[bIdx].matchedTransactionIds = []
            bookings[bIdx].matchedTransactionIds.push(tx.id)

            txs[tIdx].matchedBookingIds = [...(txs[tIdx].matchedBookingIds || []), booking.id]

            results.push({ bookingId: booking.id, bankTxId: tx.id, matchedAmount: matchAmount })
            break
          }
        }
      }

      await writeBookings(bookings)
      await writeTransactions(txs)

      return NextResponse.json({
        matched: results.length,
        results,
        message: `Đã tự động đối soát ${results.length} giao dịch`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[API /admin/reconcile POST]', error)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
