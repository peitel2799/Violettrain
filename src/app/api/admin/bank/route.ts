import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { BankTransaction, BankAccount } from '@/lib/booking-types'

const DATA_DIR = path.join(process.cwd(), 'data')
const BANK_FILE = path.join(DATA_DIR, 'bank_transactions.json')

async function readTransactions(): Promise<BankTransaction[]> {
  try {
    if (!existsSync(BANK_FILE)) return []
    return JSON.parse(await readFile(BANK_FILE, 'utf-8'))
  } catch { return [] }
}

async function writeTransactions(txs: BankTransaction[]): Promise<void> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(BANK_FILE, JSON.stringify(txs, null, 2), 'utf-8')
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[.,\s]/g, '')) || 0
  return 0
}

// GET = list bank transactions
export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const search = searchParams.get('search') || ''
    const bank = searchParams.get('bank') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const sortField = searchParams.get('sortField') || 'transactionDate'
    const sortDir = searchParams.get('sortDir') || 'desc'

    let txs = await readTransactions()

    // Filter
    if (bank) txs = txs.filter((t) => t.bankAccount === bank)
    if (dateFrom) txs = txs.filter((t) => t.transactionDate >= dateFrom)
    if (dateTo) txs = txs.filter((t) => t.transactionDate <= dateTo)
    if (search) {
      const q = search.toLowerCase()
      txs = txs.filter((t) =>
        t.description.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }

    // Sort
    txs.sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortField] || '').toLowerCase()
      const bVal = String((b as unknown as Record<string, unknown>)[sortField] || '').toLowerCase()
      const cmp = aVal.localeCompare(bVal, 'vi')
      return sortDir === 'asc' ? cmp : -cmp
    })

    // Stats
    const totalCredit = txs.reduce((s, t) => s + t.credit, 0)
    const totalDebit = txs.reduce((s, t) => s + t.debit, 0)
    const matchedCount = txs.filter((t) => (t.matchedBookingIds || []).length > 0).length
    const unmatchedCount = txs.length - matchedCount

    const total = txs.length
    const start = (page - 1) * limit
    const items = txs.slice(start, start + limit)

    return NextResponse.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: { totalCredit, totalDebit, matchedCount, unmatchedCount },
    })
  } catch (error) {
    console.error('[API /admin/bank GET]', error)
    return NextResponse.json({ error: 'Failed to read transactions' }, { status: 500 })
  }
}

// POST = create / import bank transactions
export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const username = request.headers.get('X-Admin-User') || 'admin'

    if (Array.isArray(body)) {
      // Bulk import
      const existing = await readTransactions()
      const existingRefs = new Set(existing.map((t) => `${t.bankAccount}_${t.transactionDate}_${t.credit}_${t.ref}`))

      const newTxs: BankTransaction[] = []
      for (const item of body) {
        const ref = String(item.ref || `${item.transactionDate}_${item.credit}`)
        const key = `${item.bankAccount}_${item.transactionDate}_${item.credit}_${ref}`
        if (existingRefs.has(key)) continue // skip duplicates

        newTxs.push({
          id: `bank_${Date.now()}_${newTxs.length}`,
          bankAccount: (item.bankAccount || 'other') as BankAccount,
          transactionDate: String(item.transactionDate || ''),
          description: String(item.description || ''),
          credit: parseNum(item.credit),
          debit: parseNum(item.debit),
          runningBalance: parseNum(item.runningBalance),
          ref: ref,
          category: String(item.category || ''),
          matchedBookingIds: [],
          notes: '',
          createdBy: username,
          createdAt: new Date().toISOString(),
          auditLog: [],
        })
      }

      const combined = [...newTxs, ...existing]
      await writeTransactions(combined)
      return NextResponse.json({ imported: newTxs.length, total: combined.length })
    }

    // Single create
    const tx: BankTransaction = {
      id: `bank_${Date.now()}`,
      bankAccount: (body.bankAccount || 'other') as BankAccount,
      transactionDate: String(body.transactionDate || ''),
      description: String(body.description || ''),
      credit: parseNum(body.credit),
      debit: parseNum(body.debit),
      runningBalance: parseNum(body.runningBalance),
      ref: String(body.ref || ''),
      category: String(body.category || ''),
      matchedBookingIds: [],
      notes: '',
      createdBy: username,
      createdAt: new Date().toISOString(),
      auditLog: [],
    }

    const txs = await readTransactions()
    txs.unshift(tx)
    await writeTransactions(txs)
    return NextResponse.json({ item: tx }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/bank POST]', error)
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 })
  }
}
