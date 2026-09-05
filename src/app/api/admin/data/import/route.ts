import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line)
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || '' })
    return obj
  })
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
      result.push(current); current = ''
    } else { current += ch }
  }
  result.push(current)
  return result
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[.,\s]/g, '')) || 0
  return 0
}

function mapCSVToEntry(row: Record<string, unknown>, source: string): Record<string, unknown> {
  const get = (keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) =>
        rk.toLowerCase().replace(/\s+/g, '_') === k.toLowerCase().replace(/\s+/g, '_'))
      if (found && row[found]) return String(row[found])
    }
    return ''
  }
  const getNum = (keys: string[]): number => {
    const v = get(keys)
    return parseFloat(v.replace(/[.,\s]/g, '')) || 0
  }

  return {
    source,
    sellDate: get(['ngay_ban', 'ngày_bán', 'ngay', 'date', 'sell_date']),
    seller: get(['nguoi_ban', 'người_bán', 'seller', 'platform', 'loai_nv']),
    customer: get(['khach', 'khách', 'customer', 'name', 'khach_hang', 'ten_khach']),
    customerPhone: get(['sdt', 'phone', 'dienthoai', 'điện_thoại']),
    customerEmail: get(['email']),
    departureDate: get(['ngay_di', 'ngày_đi', 'departure_date', 'ngay_khoi_hanh', 'ngày_khởi_hành']),
    trainCode: get(['tau', 'train', 'train_code', 'mác_tàu', 'mac_tau']),
    route: get(['tuyen', 'tuyến', 'route', 'tuyen_duong', 'hanh_trinh', 'hành_trình']),
    carriage: get(['toa', 'tòa', 'carriage', 'so_toa', 'số_toa']),
    seatInfo: get(['vi_tri', 'vị_trí', 'seat', 'seat_info', 'ghe', 'ghế', 'toa_ghe']),
    seatCount: getNum(['sl', 'số_lượng', 'ticket_count', 'tickets', 'so_ve', 'pax']),
    unitPrice: getNum(['gia', 'giá', 'price', 'unit_price', 'don_gia', 'đơn_giá', 'gia_ban']),
    totalAmount: getNum(['tien', 'tiền', 'total', 'tong', 'tổng', 'amount', 'total_price']),
    paymentMethod: get(['tt', 'thanhtoan', 'thanh_toán', 'payment', 'phuong_thuc', 'phương_thức']) || 'TM',
    actualTickets: getNum(['sl_thuc_te', 'actual_tickets']),
    actualUnitPrice: getNum(['gia_tt', 'actual_price', 'gia_thuc_te']),
    cashAmount: getNum(['tm', 'tien_mat', 'tiền_mặt', 'cash']),
    cardAmount: getNum(['card', 'the', 'thẻ', 'card_payment']),
    balance: getNum(['con_lai', 'còn_lại', 'balance', 'sodu']),
    gikaCount: getNum(['sl_gika', 'gika_count', 'so_gika', 'sl_gi_ka']),
    gikaUnitPrice: getNum(['gia_gika', 'gika_price', 'gia_gi_ka']),
    vatCode: get(['vat', 'vat_code', 'ma_vat', 'mã_vat']),
    ticketCode: get(['ma_ve', 'ticket_code', 'mã_vé']),
    agentCode: get(['ma_dl', 'agent_code', 'agent', 'mã_đại_lý']),
    trainNumber: get(['so_hieu', 'train_number']),
    carriageNumber: get(['so_toa']),
    notes: get(['ghi_chu', 'ghi_chú', 'notes', 'note', 'chuthich', 'chú_thích']),
    deleted: false,
  }
}

async function readLedger(): Promise<Record<string, unknown>[]> {
  try {
    const content = await readFile(LEDGER_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return [] }
}

async function writeLedger(entries: Record<string, unknown>[]) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(LEDGER_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const source = String(formData.get('source') || 'T1-QV')
    const username = request.headers.get('X-Admin-User') || 'admin'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const filename = file.name.toLowerCase()

    if (!filename.endsWith('.csv')) {
      return NextResponse.json({ error: 'Chỉ hỗ trợ file CSV. Vui lòng chuyển Excel sang CSV trước khi import.' }, { status: 400 })
    }

    const rawRows = parseCSV(text)
    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu trong file' }, { status: 400 })
    }

    const entries = await readLedger()
    const newEntries = rawRows.map((row, idx) => ({
      id: `entry_${Date.now()}_${idx}`,
      ...mapCSVToEntry(row, source),
      createdBy: username,
      createdAt: new Date().toISOString(),
      updatedBy: username,
      updatedAt: new Date().toISOString(),
      auditLog: [],
    }))

    const combined = [...newEntries, ...entries]
    await writeLedger(combined)

    return NextResponse.json({ imported: newEntries.length, total: combined.length }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/data/import POST]', error)
    return NextResponse.json({ error: 'Import thất bại: ' + String(error) }, { status: 500 })
  }
}
