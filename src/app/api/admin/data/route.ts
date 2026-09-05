import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
}

async function readLedger(): Promise<Record<string, unknown>[]> {
  try {
    const content = await readFile(LEDGER_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return [] }
}

async function writeLedger(entries: Record<string, unknown>[]) {
  await ensureDataDir()
  await writeFile(LEDGER_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

function now() { return new Date().toISOString() }

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[.,]/g, '').replace(/\s/g, '')
    return parseFloat(cleaned) || 0
  }
  return 0
}

// ─── GET /api/admin/data ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const sortField = searchParams.get('sortField') || 'sellDate'
    const sortDir = searchParams.get('sortDir') || 'desc'

    let entries = await readLedger()

    // Soft-delete filter
    entries = entries.filter((e) => !e.deleted)

    // Filters
    if (source) entries = entries.filter((e) => e.source === source)
    if (dateFrom) entries = entries.filter((e) => String(e.sellDate || '') >= dateFrom)
    if (dateTo) entries = entries.filter((e) => String(e.sellDate || '') <= dateTo)
    if (search) {
      const q = search.toLowerCase()
      entries = entries.filter((e) =>
        String(e.customer || '').toLowerCase().includes(q) ||
        String(e.customerPhone || '').toLowerCase().includes(q) ||
        String(e.seller || '').toLowerCase().includes(q) ||
        String(e.trainCode || '').toLowerCase().includes(q) ||
        String(e.route || '').toLowerCase().includes(q) ||
        String(e.notes || '').toLowerCase().includes(q) ||
        String(e.vatCode || '').toLowerCase().includes(q) ||
        String(e.source || '').toLowerCase().includes(q) ||
        String(e.ticketCode || '').toLowerCase().includes(q)
      )
    }

    // ── Stats ──────────────────────────────────────────────────────────
    const allEntries = entries // use filtered entries for stats
    const totalRevenue = allEntries.reduce((s, e) => s + parseNum(e.totalAmount || e.totalPrice || 0), 0)
    const totalTickets = allEntries.reduce((s, e) => s + parseNum(e.seatCount || e.tickets || 1), 0)

    // Stats for the active sheet
    const sheetEntries = source ? allEntries : allEntries
    const sheetRevenue = sheetEntries.reduce((s, e) => s + parseNum(e.totalAmount || 0), 0)
    const sheetTickets = sheetEntries.reduce((s, e) => s + parseNum(e.seatCount || 1), 0)

    const bySource: Record<string, { count: number; revenue: number }> = {}
    allEntries.forEach((e) => {
      const src = String(e.source || 'other')
      if (!bySource[src]) bySource[src] = { count: 0, revenue: 0 }
      bySource[src].count++
      bySource[src].revenue += parseNum(e.totalAmount || 0)
    })

    const byMonth: Record<string, { revenue: number; count: number }> = {}
    allEntries.forEach((e) => {
      const d = new Date(String(e.sellDate || e.date || ''))
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { revenue: 0, count: 0 }
      byMonth[key].revenue += parseNum(e.totalAmount || 0)
      byMonth[key].count++
    })

    const byCustomer: Record<string, { revenue: number; count: number }> = {}
    allEntries.forEach((e) => {
      const name = String(e.customer || 'Unknown').trim()
      if (!name || name === 'Unknown') return
      if (!byCustomer[name]) byCustomer[name] = { revenue: 0, count: 0 }
      byCustomer[name].count++
      byCustomer[name].revenue += parseNum(e.totalAmount || 0)
    })

    // ── Sort ───────────────────────────────────────────────────────────
    entries.sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sortField] || '')
      const bVal = String((b as Record<string, unknown>)[sortField] || '')
      const cmp = aVal.localeCompare(bVal, 'vi')
      return sortDir === 'asc' ? cmp : -cmp
    })

    // ── Pagination ──────────────────────────────────────────────────────
    const total = entries.length
    const start = (page - 1) * limit
    const pageItems = entries.slice(start, start + limit)

    // Strip auditLog from list (too large)
    const safeItems = pageItems.map((e) => {
      const { auditLog, ...rest } = e
      return rest
    })

    return NextResponse.json({
      items: safeItems,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: {
        totalRevenue,
        totalTickets,
        sheetRevenue,
        sheetTickets,
        bySource,
        byMonth: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
        byCustomer: Object.entries(byCustomer).sort(([, a], [, b]) => b.revenue - a.revenue)
          .slice(0, 50)
          .map(([customer, data]) => ({ customer, ...data })),
      },
    })
  } catch (error) {
    console.error('[API /admin/data GET]', error)
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 })
  }
}

// ─── POST /api/admin/data ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const username = request.headers.get('X-Admin-User') || 'admin'
    const entries = await readLedger()

    if (Array.isArray(body)) {
      // Bulk import
      const newEntries = body.map((item: Record<string, unknown>, idx: number) => ({
        id: `entry_${Date.now()}_${idx}`,
        ...normalizeEntry(item),
        createdBy: username,
        createdAt: now(),
        updatedBy: username,
        updatedAt: now(),
        auditLog: [],
      }))
      const combined = [...newEntries, ...entries]
      await writeLedger(combined)
      return NextResponse.json({ imported: newEntries.length, total: combined.length }, { status: 201 })
    }

    // Single create
    const entry: Record<string, unknown> = {
      id: `entry_${Date.now()}`,
      ...normalizeEntry(body),
      createdBy: username,
      createdAt: now(),
      updatedBy: username,
      updatedAt: now(),
      auditLog: [],
    }
    entries.unshift(entry)
    await writeLedger(entries)
    const { auditLog, ...safe } = entry
    return NextResponse.json({ item: safe }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/data POST]', error)
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })
  }
}

function normalizeEntry(item: Record<string, unknown>): Record<string, unknown> {
  return {
    // Original T1-QV fields
    source: String(item.source || item.loai || item.type || 'T1-QV'),
    sellDate: String(item.sellDate || item.date || item.sell_date || item.ngay_ban || item.ngay || ''),
    seller: String(item.seller || item.nguoi_ban || item.platform || item.createdBy || ''),
    customer: String(item.customer || item.customerName || item.khach_hang || item.name || ''),
    customerPhone: String(item.customerPhone || item.customer_phone || item.sdt || item.phone || ''),
    customerEmail: String(item.customerEmail || item.customer_email || item.email || ''),
    departureDate: String(item.departureDate || item.departure_date || item.ngay_di || item.ngay_khoi_hanh || ''),
    trainCode: String(item.trainCode || item.train_code || item.tau || ''),
    route: String(item.route || item.tuyen || item.tuyen_duong || ''),
    carriage: String(item.carriage || item.toa || item.seatCarriage || ''),
    seatInfo: String(item.seatInfo || item.seat_info || item.vi_tri || item.ghe || ''),
    seatCount: parseNum(item.seatCount || item.tickets || item.ticketCount || item.so_ve || item.sl || 1),
    unitPrice: parseNum(item.unitPrice || item.don_gia || item.gia || item.unit_price || 0),
    totalAmount: parseNum(item.totalAmount || item.totalPrice || item.total || item.tong || item.amount || 0),
    paymentMethod: String(item.paymentMethod || item.payment || item.phuong_thuc || item.tt || 'TM'),
    actualTickets: parseNum(item.actualTickets || item.sl_thuc_te || 0),
    actualUnitPrice: parseNum(item.actualUnitPrice || item.gia_tt || item.gia_thuc_te || 0),
    cashAmount: parseNum(item.cashAmount || item.tien_mat || item.tm || 0),
    cardAmount: parseNum(item.cardAmount || item.the || item.card || 0),
    balance: parseNum(item.balance || item.con_lai || 0),
    gikaCount: parseNum(item.gikaCount || item.gi_ka_count || item.sl_gika || 0),
    gikaUnitPrice: parseNum(item.gikaUnitPrice || item.gi_ka_price || item.gia_gika || 0),
    vatCode: String(item.vatCode || item.vat_code || item.ma_vat || ''),
    ticketCode: String(item.ticketCode || item.ma_ve || item.ticket_code || ''),
    agentCode: String(item.agentCode || item.ma_dl || item.agent_code || ''),
    trainNumber: String(item.trainNumber || item.so_hieu || ''),
    carriageNumber: String(item.carriageNumber || item.so_toa || ''),
    notes: String(item.notes || item.ghi_chu || item.note || ''),
    deleted: false,
  }
}
