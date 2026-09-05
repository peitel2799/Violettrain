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
  if (typeof v === 'string') {
    // Remove currency symbols, spaces, thousands separators
    const cleaned = v.replace(/[VNĐđ.$€£¥,\s]/g, '').replace(/\./g, (m, offset, str) => {
      // If dots are between digits, treat as thousands separator (only when followed by 3 digits)
      return ''
    }).replace(/,/g, '').trim()
    const n = parseFloat(cleaned)
    if (!isNaN(n)) return n
    // Try reversed: dots as decimal
    const parts = cleaned.split('.')
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(',', '.'))
    }
    return 0
  }
  return 0
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): string[][] {
  return text.split(/\r?\n/).filter((l) => l.trim()).map(parseCSVLine)
}

// Try to detect bank type from headers
function detectBank(headers: string[]): BankAccount | null {
  const h = headers.map((x) => x.toLowerCase())
  if (h.some((x) => x.includes('vietcombank') || x.includes('vcb'))) return 'VCB'
  if (h.some((x) => x.includes('vib'))) return 'VIB'
  if (h.some((x) => x.includes('teck'))) return 'TECK'
  if (h.some((x) => x.includes('vtin'))) return 'VTIN'
  return null
}

// Parse VCB / Vietcombank statement format
// Columns: Date, Transaction Details, Amount (debit), Amount (credit), Balance, Ref
function parseVCB(rows: string[][]): BankTransaction[] {
  return rows.map((row, i) => {
    // Find date, desc, debit, credit
    let date = ''
    let desc = ''
    let debit = 0
    let credit = 0
    let ref = ''

    for (const cell of row) {
      const trimmed = cell.trim()
      // Try date (DD/MM/YYYY or YYYY-MM-DD)
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split('/')
        date = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
      // Try amount
      const num = parseNum(trimmed)
      if (num !== 0 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        if (trimmed.includes('-') && debit === 0) debit = num
        else if (!trimmed.includes('-') && credit === 0 && num > 0) credit = num
      }
    }

    // Description is the long text field
    for (const cell of row) {
      if (cell.length > desc.length && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cell.trim())) {
        desc = cell.trim()
      }
    }

    return {
      id: `bank_vcb_${Date.now()}_${i}`,
      bankAccount: 'VCB' as BankAccount,
      transactionDate: date,
      description: desc,
      credit,
      debit,
      runningBalance: 0,
      ref,
      category: '',
      matchedBookingIds: [],
      notes: '',
      createdBy: 'import',
      createdAt: new Date().toISOString(),
      auditLog: [],
    }
  })
}

// Parse TECK bank statement format
// Cols: NGUOI NOP(0), NGAY(1), NOP(2), CHI(3), SO_DU(4), NGUOI(5)
function parseTECK(rows: string[][]): BankTransaction[] {
  return rows.map((row, i) => {
    const dateStr = String(row[1] || '')
    let date = ''
    try {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0]
    } catch {}
    const credit = parseNum(row[2])
    const debit = parseNum(row[3])
    return {
      id: `bank_teck_${Date.now()}_${i}`,
      bankAccount: 'TECK' as BankAccount,
      transactionDate: date,
      description: String(row[0] || ''),
      credit,
      debit,
      runningBalance: parseNum(row[4]),
      ref: '',
      category: String(row[5] || ''),
      matchedBookingIds: [],
      notes: '',
      createdBy: 'import',
      createdAt: new Date().toISOString(),
      auditLog: [],
    }
  })
}

// Parse VTIN bank statement
// Cols: date, datetime, description, debit, credit, balance
function parseVTIN(rows: string[][]): BankTransaction[] {
  return rows.map((row, i) => {
    let date = ''
    const dStr = String(row[0] || '').trim()
    const dtStr = String(row[1] || '').trim()
    if (dtStr) date = dtStr.split(' ')[0]
    else if (dStr) {
      try {
        const d = new Date(dStr)
        if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0]
      } catch {}
    }
    const desc = String(row[2] || '')
    return {
      id: `bank_vtin_${Date.now()}_${i}`,
      bankAccount: 'VTIN' as BankAccount,
      transactionDate: date,
      description: desc,
      credit: parseNum(row[4]),
      debit: parseNum(row[3]),
      runningBalance: parseNum(row[5]),
      ref: '',
      category: '',
      matchedBookingIds: [],
      notes: '',
      createdBy: 'import',
      createdAt: new Date().toISOString(),
      auditLog: [],
    }
  })
}

// Generic parser: auto-detect columns by position
function parseGeneric(rows: string[][], bank: BankAccount): BankTransaction[] {
  return rows.map((row, i) => {
    let date = ''
    let desc = ''
    let credit = 0
    let debit = 0
    let balance = 0

    for (let j = 0; j < row.length; j++) {
      const cell = row[j].trim()
      const num = parseNum(cell)

      // Date detection
      if (/^\d{4}-\d{2}-\d{2}/.test(cell) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cell)) {
        try {
          const d = new Date(cell)
          if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0]
        } catch {}
      }

      // Amount detection (non-date strings that are numbers)
      if (num !== 0 && !/^\d{4}-\d{2}-\d{2}/.test(cell) && cell.length > 2) {
        if (cell.includes('-')) debit = Math.abs(num)
        else if (num > 0) {
          if (credit === 0) credit = num
          else balance = num
        }
      }

      // Longest text = description
      if (cell.length > desc.length && cell.length > 5 && !/^\d/.test(cell)) {
        desc = cell
      }
    }

    return {
      id: `bank_${bank.toLowerCase()}_${Date.now()}_${i}`,
      bankAccount: bank,
      transactionDate: date,
      description: desc,
      credit,
      debit,
      runningBalance: balance,
      ref: '',
      category: '',
      matchedBookingIds: [],
      notes: '',
      createdBy: 'import',
      createdAt: new Date().toISOString(),
      auditLog: [],
    }
  })
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bankRaw = String(formData.get('bank') || 'auto')

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()))

    // Detect bank
    let bank: BankAccount = (bankRaw !== 'auto' ? bankRaw : 'other') as BankAccount
    if (bankRaw === 'auto') {
      const detected = detectBank(headers)
      if (detected) bank = detected
    }

    let parsed: BankTransaction[] = []

    if (bank === 'TECK') parsed = parseTECK(dataRows)
    else if (bank === 'VTIN') parsed = parseVTIN(dataRows)
    else parsed = parseGeneric(dataRows, bank)

    // Deduplicate
    const existing = await readTransactions()
    const existingKeys = new Set(existing.map((t) => `${t.bankAccount}_${t.transactionDate}_${t.credit}_${t.description.substring(0, 20)}`))
    const newTxs = parsed.filter((t) => {
      const key = `${t.bankAccount}_${t.transactionDate}_${t.credit}_${t.description.substring(0, 20)}`
      return !existingKeys.has(key)
    })

    const combined = [...newTxs, ...existing]
    await writeTransactions(combined)

    return NextResponse.json({
      imported: newTxs.length,
      skipped: parsed.length - newTxs.length,
      total: combined.length,
      bank: parsed.length > 0 ? parsed[0].bankAccount : bank,
    }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/bank/import POST]', error)
    return NextResponse.json({ error: 'Import failed: ' + String(error) }, { status: 500 })
  }
}
