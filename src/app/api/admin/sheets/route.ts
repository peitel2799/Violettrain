import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SHEETS_FILE = path.join(DATA_DIR, 'sheets.json')

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
}

async function readSheets(): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(SHEETS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return { sheets: [], rows: {} } }
}

async function writeSheets(data: Record<string, unknown>) {
  await ensureDataDir()
  await writeFile(SHEETS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function now() { return new Date().toISOString() }

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[.,]/g, '').replace(/\s/g, '')) || 0
  return 0
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const { searchParams } = request.nextUrl
    const sheetId = searchParams.get('sheetId')

    const store = await readSheets()
    const sheets = (store.sheets as Record<string, unknown>[] || [])
    const rows = (store.rows as Record<string, Record<string, unknown>[]> || {})

    if (sheetId) {
      const sheet = sheets.find((s: Record<string, unknown>) => s.id === sheetId)
      if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      const sheetRows = (rows[sheetId] as Record<string, unknown>[] || [])
        .filter((r: Record<string, unknown>) => !r._deleted)
        .map((r: Record<string, unknown>, idx: number) => ({ ...r, _rowNum: idx + 1 }))
      return NextResponse.json({ sheet, rows: sheetRows })
    }

    // Update rowCount for each sheet
    const sheetsWithCount = sheets.map((s: Record<string, unknown>) => ({
      ...s,
      rowCount: ((rows[s.id as string] as Record<string, unknown>[] || [])).filter((r: Record<string, unknown>) => !r._deleted).length,
    }))

    return NextResponse.json({ sheets: sheetsWithCount })
  } catch (error) {
    console.error('[API /api/admin/sheets GET]', error)
    return NextResponse.json({ error: 'Failed to read sheets' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
// Creates a new sheet or adds a row

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const body = await request.json()
    const username = request.headers.get('X-Admin-User') || 'admin'
    const store = await readSheets()
    const sheets = (store.sheets as Record<string, unknown>[]) || []
    const rows = (store.rows as Record<string, Record<string, unknown>[]>) || {}

    // ── Create new sheet ────────────────────────────────────────────────
    if (body.action === 'createSheet') {
      const id = `sheet_${Date.now()}`
      const isBooking = body.template === 'booking'
      const columns = isBooking
        ? [
            { key: 'sellDate', label: 'Ngày bán', width: '110px', editable: true, type: 'date' },
            { key: 'customer', label: 'Khách hàng', width: '180px', editable: true, type: 'text' },
            { key: 'bookingCode', label: 'Mã đặt vé', width: '120px', editable: true, type: 'text' },
            { key: 'departureDate', label: 'Ngày khởi hành', width: '120px', editable: true, type: 'date' },
            { key: 'trainNumber', label: 'Số hiệu tàu', width: '100px', editable: true, type: 'text' },
            { key: 'route', label: 'Tuyến', width: '120px', editable: true, type: 'text' },
            { key: 'seatNumber', label: 'Số ghế', width: '80px', editable: true, type: 'text', align: 'center' },
            { key: 'amount', label: 'Số lượng', width: '80px', editable: true, type: 'number', align: 'center' },
            { key: 'price', label: 'Đơn giá', width: '110px', editable: true, type: 'currency', align: 'right' },
            { key: 'total', label: 'Thành tiền', width: '130px', editable: true, type: 'currency', align: 'right' },
            { key: 'breakfast', label: 'Bữa sáng', width: '100px', editable: true, type: 'select', options: ['Có', 'Không', 'Cần đặt'] },
            { key: 'notes', label: 'Ghi chú', width: '200px', editable: true, type: 'text' },
          ]
        : [
            { key: 'col1', label: 'Cột 1', width: '150px', editable: true, type: 'text' },
            { key: 'col2', label: 'Cột 2', width: '150px', editable: true, type: 'text' },
            { key: 'col3', label: 'Cột 3', width: '150px', editable: true, type: 'text' },
          ]

      const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
        'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700']
      const colorIdx = sheets.length % colors.length

      const newSheet: Record<string, unknown> = {
        id,
        name: String(body.name || 'Sheet mới'),
        description: String(body.description || ''),
        columns,
        createdAt: now(),
        createdBy: username,
        rowCount: 0,
        color: colors[colorIdx],
      }
      sheets.push(newSheet)
      rows[id] = []
      store.sheets = sheets
      store.rows = rows
      await writeSheets(store)
      return NextResponse.json({ sheet: { ...newSheet, rowCount: 0 } }, { status: 201 })
    }

    // ── Add row to sheet ─────────────────────────────────────────────────
    if (body.action === 'addRow') {
      const { sheetId, data } = body
      if (!sheetId) return NextResponse.json({ error: 'sheetId required' }, { status: 400 })
      if (!sheets.find((s: Record<string, unknown>) => s.id === sheetId)) {
        return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      }
      const id = `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const row: Record<string, unknown> = {
        id,
        ...data,
        _createdBy: username,
        _createdAt: now(),
        _updatedBy: username,
        _updatedAt: now(),
        _deleted: false,
      }
      if (!rows[sheetId]) rows[sheetId] = []
      rows[sheetId].push(row)
      store.rows = rows
      await writeSheets(store)
      return NextResponse.json({ row: { ...row, _rowNum: rows[sheetId].length } }, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[API /api/admin/sheets POST]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
// Update row or sheet column structure

export async function PATCH(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const body = await request.json()
    const username = request.headers.get('X-Admin-User') || 'admin'
    const store = await readSheets()
    const sheets = (store.sheets as Record<string, unknown>[]) || []
    const rows = (store.rows as Record<string, Record<string, unknown>[]>) || {}

    // ── Update row ───────────────────────────────────────────────────────
    if (body.action === 'updateRow') {
      const { sheetId, rowId, data } = body
      if (!sheetId || !rowId) return NextResponse.json({ error: 'sheetId and rowId required' }, { status: 400 })
      const sheetRows = rows[sheetId]
      if (!sheetRows) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      const idx = sheetRows.findIndex((r: Record<string, unknown>) => r.id === rowId)
      if (idx === -1) return NextResponse.json({ error: 'Row not found' }, { status: 404 })

      const oldRow = sheetRows[idx]
      sheetRows[idx] = {
        ...oldRow,
        ...data,
        _updatedBy: username,
        _updatedAt: now(),
      }
      rows[sheetId] = sheetRows
      store.rows = rows
      await writeSheets(store)
      return NextResponse.json({ row: sheetRows[idx] })
    }

    // ── Add column to sheet ──────────────────────────────────────────────
    if (body.action === 'addColumn') {
      const { sheetId, column } = body
      if (!sheetId || !column) return NextResponse.json({ error: 'sheetId and column required' }, { status: 400 })
      const sheetIdx = sheets.findIndex((s: Record<string, unknown>) => s.id === sheetId)
      if (sheetIdx === -1) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      const sheet = sheets[sheetIdx]
      const sheetColumns = (sheet.columns as Record<string, unknown>[]) || []
      sheetColumns.push({
        key: String(column.key || `col_${Date.now()}`).replace(/\s+/g, '_').toLowerCase(),
        label: String(column.label || 'Cột mới'),
        width: String(column.width || '150px'),
        editable: true,
        type: String(column.type || 'text'),
        options: column.options || [],
        align: column.align || 'left',
      })
      sheets[sheetIdx] = { ...sheet, columns: sheetColumns }
      store.sheets = sheets
      await writeSheets(store)
      return NextResponse.json({ sheet: sheets[sheetIdx] })
    }

    // ── Update sheet metadata ────────────────────────────────────────────
    if (body.action === 'updateSheet') {
      const { sheetId, data } = body
      if (!sheetId) return NextResponse.json({ error: 'sheetId required' }, { status: 400 })
      const sheetIdx = sheets.findIndex((s: Record<string, unknown>) => s.id === sheetId)
      if (sheetIdx === -1) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      sheets[sheetIdx] = { ...sheets[sheetIdx], ...data }
      store.sheets = sheets
      await writeSheets(store)
      return NextResponse.json({ sheet: sheets[sheetIdx] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[API /api/admin/sheets PATCH]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const { searchParams } = request.nextUrl
    const sheetId = searchParams.get('sheetId')
    const rowId = searchParams.get('rowId')
    const username = request.headers.get('X-Admin-User') || 'admin'
    const store = await readSheets()
    const sheets = (store.sheets as Record<string, unknown>[]) || []
    const rows = (store.rows as Record<string, Record<string, unknown>[]>) || {}

    if (sheetId && rowId) {
      // Delete a single row
      const sheetRows = rows[sheetId]
      if (!sheetRows) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      const idx = sheetRows.findIndex((r: Record<string, unknown>) => r.id === rowId)
      if (idx === -1) return NextResponse.json({ error: 'Row not found' }, { status: 404 })
      sheetRows[idx] = { ...sheetRows[idx], _deleted: true, _deletedBy: username, _deletedAt: now() }
      rows[sheetId] = sheetRows
      store.rows = rows
      await writeSheets(store)
      return NextResponse.json({ success: true })
    }

    if (sheetId && !rowId) {
      // Delete entire sheet
      const idx = sheets.findIndex((s: Record<string, unknown>) => s.id === sheetId)
      if (idx === -1) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
      sheets.splice(idx, 1)
      delete rows[sheetId]
      store.sheets = sheets
      store.rows = rows
      await writeSheets(store)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'sheetId required' }, { status: 400 })
  } catch (error) {
    console.error('[API /api/admin/sheets DELETE]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
