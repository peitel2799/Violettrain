'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Upload, Download, Plus, Pencil, Trash2, RefreshCw, ChevronUp, ChevronDown, History, X, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastContainer, toast, useToast } from './Toast'
import { ConfirmDialog } from './Modal'
import { Badge } from './Badge'

// ─── Original T1-QV Schema (exact column mapping from Excel) ────────────────────

export interface LedgerEntry {
  id: string
  // Sheet tab identifier
  source: string
  // Original T1-QV columns
  sellDate: string          // NGAY
  seller: string             // NGUOI BAN
  customer: string           // KHACH
  departureDate: string      // NGAY ĐI
  trainCode: string         // TAU
  route: string            // TUYEN
  carriage: string          // TOA
  seatCount: number         // SL (số lượng vé)
  unitPrice: number         // GIA
  gikaCount: number         // SL GI-KA
  gikaUnitPrice: number     // GIA GI-KA
  totalAmount: number      // TIEN (tổng tiền)
  paymentMethod: string     // TT (TM / CARD / CK / MoMo / VNPay)
  actualTickets: number      // SL thực tế
  actualUnitPrice: number   // GIA thực tế
  cashAmount: number        // TM (tiền mặt)
  cardAmount: number        // CARD
  balance: number           // CÒN LẠI
  // Extended columns
  customerPhone: string
  customerEmail: string
  trainNumber: string
  carriageNumber: string
  seatInfo: string
  vatCode: string
  ticketCode: string
  agentCode: string
  notes: string
  // Audit
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  auditLog?: unknown[]
  deleted?: boolean
}

// ─── Sheet tabs (mirrors Excel workbook structure) ─────────────────────────────────

export const SHEETS = [
  { key: 'T1-QV',  label: 'T1 - Quầy vé',   color: 'bg-violet-100 text-violet-700' },
  { key: 'T1-NT',  label: 'T1 - Nội thành', color: 'bg-purple-100 text-purple-700' },
  { key: 'T2-QV',  label: 'T2 - Quầy vé',   color: 'bg-blue-100 text-blue-700' },
  { key: 'T2-NT',  label: 'T2 - Nội thành', color: 'bg-cyan-100 text-cyan-700' },
  { key: 'T3-QV',  label: 'T3 - Quầy vé',   color: 'bg-indigo-100 text-indigo-700' },
  { key: 'T3-NT', label: 'T3 - Nội thành', color: 'bg-violet-50 text-violet-800' },
  { key: 'SE19',   label: 'SE19 - Đặt vé', color: 'bg-amber-100 text-amber-700' },
  { key: 'DL5',    label: 'Đại lý DL5',     color: 'bg-green-100 text-green-700' },
  { key: 'DL3',    label: 'Đại lý DL3',     color: 'bg-emerald-100 text-emerald-700' },
  { key: 'HP',     label: 'HP - Hợp tác', color: 'bg-orange-100 text-orange-700' },
  { key: 'VIB',    label: 'VIB - Ngân hàng', color: 'bg-rose-100 text-rose-700' },
  { key: 'VCB',    label: 'VCB - Vietcombank', color: 'bg-blue-100 text-blue-700' },
  { key: 'TECK',   label: 'TECK',            color: 'bg-gray-100 text-gray-700' },
  { key: 'VTIN',   label: 'VTIN',           color: 'bg-teal-100 text-teal-700' },
]

// ─── Column definitions matching original T1-QV Excel headers ──────────────────────

export const COLUMNS: {
  key: keyof LedgerEntry | 'rowNum' | 'actions'
  label: string
  width: string
  editable?: boolean
  type?: 'text' | 'number' | 'date' | 'select' | 'currency'
  options?: string[]
  align?: 'left' | 'center' | 'right'
}[] = [
  { key: 'rowNum',      label: '#',          width: '44px',  align: 'center' },
  { key: 'sellDate',     label: 'NGÀY BÁN',   width: '110px', editable: true, type: 'date' },
  { key: 'seller',       label: 'NGƯỜI BÁN',  width: '110px', editable: true, type: 'text' },
  { key: 'customer',     label: 'KHÁCH HÀNG', width: '200px', editable: true, type: 'text' },
  { key: 'customerPhone',label: 'ĐIỆN THOẠI',width: '120px', editable: true, type: 'text' },
  { key: 'departureDate',label: 'NGÀY ĐI',    width: '110px', editable: true, type: 'date' },
  { key: 'trainCode',    label: 'TÀU',       width: '80px',  editable: true, type: 'text' },
  { key: 'route',        label: 'TUYẾN',     width: '80px',  editable: true, type: 'text' },
  { key: 'carriage',     label: 'TÒA',       width: '70px',  editable: true, type: 'text', align: 'center' },
  { key: 'seatInfo',     label: 'VỊ TRÍ GHẾ',width: '130px', editable: true, type: 'text' },
  { key: 'seatCount',    label: 'SL',         width: '50px',  editable: true, type: 'number', align: 'center' },
  { key: 'unitPrice',    label: 'GIÁ',        width: '100px', editable: true, type: 'currency', align: 'right' },
  { key: 'totalAmount',  label: 'TIỀN',       width: '120px', type: 'currency', align: 'right' },
  { key: 'paymentMethod',label: 'THANH TOÁN', width: '90px',  editable: true, type: 'select',
    options: ['TM', 'CARD', 'CK', 'TM+CARD', 'MoMo', 'VNPay', 'TECH'], align: 'center' },
  { key: 'actualTickets',label: 'SL THỰC TẾ',width: '70px',  editable: true, type: 'number', align: 'center' },
  { key: 'actualUnitPrice',label: 'GIÁ TT',   width: '90px',  editable: true, type: 'currency', align: 'right' },
  { key: 'cashAmount',   label: 'TM (TIỀN MẶT)', width: '110px', editable: true, type: 'currency', align: 'right' },
  { key: 'cardAmount',   label: 'CARD',       width: '90px',  editable: true, type: 'currency', align: 'right' },
  { key: 'balance',     label: 'CÒN LẠI',   width: '100px', editable: true, type: 'currency', align: 'right' },
  { key: 'gikaCount',    label: 'SL GI-KA',   width: '70px',  editable: true, type: 'number', align: 'center' },
  { key: 'gikaUnitPrice',label: 'GIÁ GI-KA',  width: '100px', editable: true, type: 'currency', align: 'right' },
  { key: 'vatCode',      label: 'MÃ VAT',    width: '100px', editable: true, type: 'text' },
  { key: 'ticketCode',  label: 'MÃ VÉ',     width: '100px', editable: true, type: 'text' },
  { key: 'notes',        label: 'GHI CHÚ',   width: '180px', editable: true, type: 'text' },
  { key: 'actions',      label: '',           width: '80px',  align: 'center' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(n: number | string | undefined): string {
  const num = typeof n === 'string' ? parseFloat(n) || 0 : n || 0
  return isNaN(num) ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(num))
}

function fmtDate(d: string): string {
  if (!d) return ''
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('vi-VN')
  } catch { return d }
}

function EditableCell({
  value,
  column,
  onSave,
}: {
  value: unknown
  column: (typeof COLUMNS)[number]
  onSave: (val: string | number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setVal(String(value ?? '')) }, [value])
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() } }, [editing])

  if (!editing) {
    return (
      <div
        onClick={() => column.editable && setEditing(true)}
        className={cn(
          'w-full h-full px-2 py-1.5 text-sm truncate cursor-text',
          column.editable && 'hover:bg-violet-50',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center'
        )}
        title={String(value ?? '')}
      >
        {column.type === 'currency' ? fmt(value as number) + ' đ' : String(value ?? '')}
      </div>
    )
  }

  if (column.type === 'select' && column.options) {
    return (
      <select
        ref={inputRef as unknown as React.RefObject<HTMLSelectElement>}
        value={val}
        onChange={(e) => { onSave(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="w-full h-full px-2 py-1.5 text-sm border border-violet-400 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white"
      >
        <option value="">—</option>
        {column.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  return (
    <input
      ref={inputRef}
      type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const v = column.type === 'number' ? parseFloat(val) || 0 : val
        onSave(v)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { const v = column.type === 'number' ? parseFloat(val) || 0 : val; onSave(v); setEditing(false) }
        if (e.key === 'Escape') { setVal(String(value)); setEditing(false) }
      }}
      className="w-full h-full px-2 py-1.5 text-sm border border-violet-400 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
    />
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataSheetProps {
  data: LedgerEntry[]
  loading: boolean
  page: number
  pages: number
  total: number
  activeSheet: string
  stats?: {
    totalRevenue: number
    totalTickets: number
    sheetRevenue: number
    sheetTickets: number
    bySource: Record<string, { count: number; revenue: number }>
    byMonth: Array<{ month: string; revenue: number; count: number }>
    byCustomer: Array<{ customer: string; revenue: number; count: number }>
  }
  onSheetChange: (sheet: string) => void
  onSearch: (q: string) => void
  onPageChange: (p: number) => void
  onSort: (field: string, dir: string) => void
  onRefresh: () => void
  onImport: (file: File) => Promise<void>
  onExport: () => void
  onEdit: (entry: Partial<LedgerEntry>) => void
  onDelete: (entry: LedgerEntry) => void
  onAddRow: () => void
  onViewHistory: (entry: LedgerEntry) => void
  search: string
  sortField: string
  sortDir: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataSheet({
  data, loading, page, pages, total, activeSheet, stats,
  onSheetChange, onSearch, onPageChange, onSort, onRefresh,
  onImport, onExport, onEdit, onDelete, onAddRow, onViewHistory,
  search, sortField, sortDir,
}: DataSheetProps) {
  const { toasts, removeToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [localSearch, setLocalSearch] = useState(search)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await onImport(file) }
    catch (err) { toast('Lỗi khi import: ' + String(err), 'error') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { onDelete(deleteTarget); setDeleteTarget(null) }
    catch { toast('Lỗi khi xóa.', 'error') }
    finally { setDeleting(false) }
  }

  const PAYMENT_COLORS: Record<string, string> = {
    TM: 'bg-green-50 text-green-600',
    CARD: 'bg-blue-50 text-blue-600',
    CK: 'bg-violet-50 text-violet-600',
    'TM+CARD': 'bg-amber-50 text-amber-600',
    MoMo: 'bg-pink-50 text-pink-600',
    VNPay: 'bg-cyan-50 text-cyan-600',
    TECH: 'bg-orange-50 text-orange-600',
  }

  const currentSheet = SHEETS.find(s => s.key === activeSheet) || SHEETS[0]

  return (
    <div className="flex flex-col h-full bg-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(localSearch)}
            placeholder="Tìm: khách, tàu, tuyến, ghi chú..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Sheet filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
          <span className="text-xs text-gray-400 whitespace-nowrap mr-1">Sheet:</span>
          {SHEETS.map(s => (
            <button key={s.key}
              onClick={() => onSheetChange(s.key)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border',
                activeSheet === s.key
                  ? 'bg-violet-600 text-white border-violet-600'
                  : `${s.color} border-transparent hover:opacity-80`
              )}
            >
              {s.label}
              {stats?.bySource?.[s.key] && (
                <span className={cn('ml-1 text-[10px]', activeSheet === s.key ? 'text-white/70' : 'opacity-60')}>
                  ({stats.bySource[s.key].count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" /> {uploading ? 'Đang import...' : 'Import CSV'}
          </button>
          <button onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onAddRow}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Thêm dòng
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 bg-violet-50 border-b border-violet-100 text-xs">
          <span className="text-violet-800 font-semibold">{fmt(stats.totalTickets)} vé</span>
          <span className="text-violet-700">Doanh thu: <span className="font-bold text-violet-900">{fmt(stats.totalRevenue)} đ</span></span>
          <span className="text-violet-600">{currentSheet.label}: <span className="font-medium">{fmt(stats.sheetTickets)} vé / {fmt(stats.sheetRevenue)} đ</span></span>
          {Object.entries(stats.bySource || {})
            .filter(([, d]) => d.count > 0)
            .slice(0, 8)
            .map(([src, d]) => {
              const sheet = SHEETS.find(s => s.key === src)
              return (
                <span key={src} className="text-violet-500">
                  {sheet?.label || src}: <span className="font-medium">{fmt(d.revenue)} đ</span>
                </span>
              )
            })}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Chưa có dữ liệu trong sheet này</p>
            <p className="text-gray-400 text-sm mt-1">Import file CSV hoặc nhấn Thêm dòng</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key}
                    className={cn(
                      'px-1 py-2.5 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap border-r border-gray-100',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                    style={{ minWidth: col.width, width: col.width }}
                  >
                    {col.key !== 'rowNum' && col.key !== 'actions' ? (
                      <button
                        onClick={() => col.type !== 'currency' && onSort(col.key, sortField === col.key && sortDir === 'asc' ? 'desc' : 'asc')}
                        className={cn(
                          'flex items-center gap-0.5 hover:text-violet-600',
                          col.align === 'right' && 'ml-auto',
                          col.align === 'center' && 'mx-auto'
                        )}
                      >
                        {col.label}
                        {sortField === col.key && (
                          sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                        )}
                      </button>
                    ) : col.key === 'rowNum' ? (
                      <span className="text-center block">#</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={row.id}
                  className={cn(
                    'border-b border-gray-50 hover:bg-violet-50/20 transition-colors group',
                    row.deleted && 'opacity-50 bg-red-50/10'
                  )}
                >
                  {COLUMNS.map((col) => {
                    if (col.key === 'rowNum') {
                      return (
                        <td key="rowNum"
                          className="px-2 py-1.5 text-xs text-gray-400 text-center border-r border-gray-100 bg-gray-50">
                          {(page - 1) * 100 + idx + 1}
                        </td>
                      )
                    }
                    if (col.key === 'actions') {
                      return (
                        <td key="actions" className="px-1 py-1.5 border-r border-gray-100">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                            <button onClick={() => onViewHistory(row)}
                              className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded" title="Lịch sử">
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onEdit(row)}
                              className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded" title="Sửa">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(row)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Xóa">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )
                    }
                    if (col.key === 'paymentMethod') {
                      const pm = String((row as unknown as Record<string, unknown>)[col.key] || '')
                      const colorClass = PAYMENT_COLORS[pm] || 'bg-gray-100 text-gray-600'
                      return (
                        <td key={col.key} className="px-1 py-1 border-r border-gray-100"
                          style={{ minWidth: col.width, width: col.width }}>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium block text-center', colorClass)}>{pm}</span>
                        </td>
                      )
                    }
                    const cellValue = (row as unknown as Record<string, unknown>)[col.key]
                    return (
                      <td key={col.key}
                        className={cn('px-1 py-1 border-r border-gray-100',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                        style={{ minWidth: col.width, width: col.width }}
                      >
                        {col.editable ? (
                          <EditableCell value={cellValue} column={col}
                            onSave={(val) => onEdit({ ...row, [col.key]: val })} />
                        ) : col.type === 'currency' ? (
                          <span className="font-semibold px-2 block text-right">{fmt(cellValue as number)}</span>
                        ) : col.type === 'date' ? (
                          <span className="px-2 text-gray-700">{fmtDate(String(cellValue))}</span>
                        ) : (
                          <span className="px-2 truncate block" title={String(cellValue ?? '')}>{String(cellValue ?? '')}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500 flex-shrink-0">
          <span>{(page - 1) * 100 + 1}–{Math.min(page * 100, total)} / {total} dòng</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(1)} disabled={page <= 1}
              className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">Đầu</button>
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">‹</button>
            <span className="px-3 py-1.5 font-medium">Trang {page} / {pages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
              className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">›</button>
            <button onClick={() => onPageChange(pages)} disabled={page >= pages}
              className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">Cuối</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa dòng?"
        message={`Xóa dòng "${deleteTarget?.customer || deleteTarget?.sellDate}"? Hành động được ghi log.`}
        confirmLabel="Xóa" danger loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
