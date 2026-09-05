import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json')

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
  })
}

function normalizeToLedger(rows: Record<string, string>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const clean = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, '_'), v])
    )

    return {
      type: clean['sell_type'] || clean['type'] || clean['loai'] || 'train_sale',
      sellDate: clean['sell_date'] || clean['sale_date'] || clean['ngay_ban'] || clean['booking_date'] || '',
      customerName: clean['customer'] || clean['customer_name'] || clean['khach_hang'] || clean['name'] || '',
      customerPhone: clean['phone'] || clean['customer_phone'] || clean['sdt'] || clean['tel'] || '',
      customerEmail: clean['email'] || clean['customer_email'] || clean['mail'] || '',
      departureDate: clean['departure_date'] || clean['ngay_khoi_hanh'] || clean['dep_date'] || '',
      trainNumber: clean['train'] || clean['train_number'] || clean['train_code'] || clean['ma_tau'] || '',
      route: clean['route'] || clean['tuyen'] || clean['tuyen_duong'] || '',
      seatInfo: clean['seats'] || clean['seat_info'] || clean['seat'] || clean['vi_tri_ghe'] || '',
      numberTickets: parseInt(clean['pax'] || clean['pax_count'] || clean['so_khach'] || clean['so_ve'] || '1') || 1,
      unitPrice: parseFloat(clean['unit_price'] || clean['don_gia'] || clean['price'] || '0') || 0,
      totalPrice: parseFloat(clean['total'] || clean['total_price'] || clean['tong'] || clean['amount'] || '0') || 0,
      paymentMethod: clean['payment'] || clean['payment_method'] || clean['phuong_thuc'] || '',
      seller: clean['seller'] || clean['platform'] || clean['nguoi_ban'] || '',
      notes: clean['notes'] || clean['ghi_chu'] || '',
      vatCode: clean['vat_code'] || clean['ma_vat'] || '',
    }
  })
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const content = await file.text()
    const ext = file.name.split('.').pop()?.toLowerCase()

    let rows: Record<string, string>[] = []
    if (ext === 'csv') {
      rows = parseCSV(content)
    } else {
      // For Excel (.xlsx, .xls), return raw content for client-side parsing
      // Node.js doesn't have built-in xlsx parsing, so we pass the raw buffer
      // and let the client parse it with xlsx library
      return NextResponse.json({
        raw: content,
        ext,
        filename: file.name,
        rowCount: 0,
        message: 'Excel files are parsed client-side for better compatibility.',
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    const entries = normalizeToLedger(rows)

    // Append to ledger
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
    const existing: Record<string, unknown>[] = await readFile(LEDGER_FILE, 'utf-8')
      .then((c) => JSON.parse(c))
      .catch(() => [])

    const newEntries = entries.map((entry, idx) => ({
      ...entry,
      id: `ledger_import_${Date.now()}_${idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const combined = [...newEntries, ...existing]
    await writeFile(LEDGER_FILE, JSON.stringify(combined, null, 2), 'utf-8')

    return NextResponse.json({
      imported: newEntries.length,
      total: combined.length,
      preview: newEntries.slice(0, 3),
    }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/ledger/import]', error)
    return NextResponse.json({ error: 'Failed to import file' }, { status: 500 })
  }
}
