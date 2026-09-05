'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Pencil, Download, Search, RefreshCw, ChevronUp, ChevronDown,
  X, MoreHorizontal, Columns3, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastContainer, toast, useToast } from '@/components/admin/ui/Toast'
import { ConfirmDialog } from '@/components/admin/ui/Modal'
import { Badge } from '@/components/admin/ui/Badge'
import type { SheetColumn, SheetRow } from '@/lib/sheets-api'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: unknown): string {
  const num = typeof n === 'string' ? parseFloat(n) || 0 : (n as number) || 0
  return isNaN(num) ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(num))
}

function fmtDate(d: unknown): string {
  if (!d) return ''
  try {
    const date = new Date(String(d))
    if (isNaN(date.getTime())) return String(d)
    return date.toLocaleDateString('vi-VN')
  } catch { return String(d) }
}

// ─── Add Column Modal ──────────────────────────────────────────────────────────

interface AddColumnModalProps {
  open: boolean
  onClose: () => void
  onAdd: (col: Partial<SheetColumn>) => Promise<void>
}

function AddColumnModal({ open, onClose, onAdd }: AddColumnModalProps) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<SheetColumn['type']>('text')
  const [width, setWidth] = useState('150px')
  const [options, setOptions] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!label.trim()) { toast('Nhập tên cột', 'warning'); return }
    setSaving(true)
    try {
      await onAdd({
        label: label.trim(),
        type,
        width,
        editable: true,
        align: type === 'number' || type === 'currency' ? 'right' : 'left',
        options: type === 'select' ? options.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })
      setLabel(''); setType('text'); setWidth('150px'); setOptions('')
      onClose()
    } catch { toast('Lỗi khi thêm cột', 'error') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Thêm cột mới
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Tên cột (header)</label>
            <input value={label} onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="VD: Ngày bán, Khách hàng, Số điện thoại..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Loại dữ liệu</label>
            <div className="grid grid-cols-3 gap-2">
              {(['text', 'number', 'date', 'currency', 'select'] as const).map(t => (
                <button key={t}
                  onClick={() => setType(t)}
                  className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
                    type === t ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100')}>
                  {t === 'currency' ? 'Tiền tệ' : t === 'text' ? 'Văn bản' : t === 'number' ? 'Số' : t === 'date' ? 'Ngày' : 'Chọn'}
                </button>
              ))}
            </div>
          </div>
          {type === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Các lựa chọn <span className="text-gray-400">(phân cách bằng dấu phẩy)</span></label>
              <input value={options} onChange={e => setOptions(e.target.value)}
                placeholder="VD: Có, Không, Cần đặt"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Chiều rộng</label>
            <div className="flex gap-2">
              {['100px', '120px', '150px', '200px', '250px'].map(w => (
                <button key={w}
                  onClick={() => setWidth(w)}
                  className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
                    width === w ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100')}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleAdd} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Đang thêm...' : 'Thêm cột'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Inline Editable Cell ──────────────────────────────────────────────────────

function EditableCell({
  value,
  column,
  onSave,
}: {
  value: unknown
  column: SheetColumn
  onSave: (val: string | number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setVal(String(value ?? '')) }, [value])
  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() }
  }, [editing])

  if (!editing) {
    return (
      <div
        onClick={() => column.editable && setEditing(true)}
        className={cn(
          'w-full h-full px-2.5 py-2 text-sm truncate cursor-text transition-colors',
          column.editable && 'hover:bg-violet-50 cursor-pointer',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center',
          !value && 'text-gray-300 italic'
        )}
        title={String(value ?? '')}
      >
        {column.type === 'currency' ? fmt(value) + ' đ' : column.type === 'date' ? fmtDate(value) : String(value ?? '')}
      </div>
    )
  }

  if (column.type === 'select' && column.options) {
    return (
      <select
        ref={inputRef as unknown as React.RefObject<HTMLSelectElement>}
        value={val}
        onChange={e => { onSave(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="w-full h-full px-2 py-1.5 text-sm border border-violet-400 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white"
      >
        <option value="">—</option>
        {column.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  return (
    <input
      ref={inputRef}
      type={column.type === 'number' || column.type === 'currency' ? 'number' : column.type === 'date' ? 'date' : 'text'}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        const v = column.type === 'number' || column.type === 'currency' ? parseFloat(val) || 0 : val
        onSave(v)
        setEditing(false)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          const v = column.type === 'number' || column.type === 'currency' ? parseFloat(val) || 0 : val
          onSave(v); setEditing(false)
        }
        if (e.key === 'Escape') { setVal(String(value)); setEditing(false) }
      }}
      className="w-full h-full px-2 py-1.5 text-sm border border-violet-400 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
    />
  )
}

// ─── Add Row Quick Modal ───────────────────────────────────────────────────────

function AddRowModal({
  open,
  columns,
  onClose,
  onAdd,
}: {
  open: boolean
  columns: SheetColumn[]
  onClose: () => void
  onAdd: (data: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm({}) }, [open])

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    setSaving(true)
    try { await onAdd(form); onClose() }
    catch { toast('Lỗi khi thêm dòng', 'error') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Thêm dòng mới</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {columns.map(col => (
            <div key={col.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">{col.label}</label>
              {col.type === 'select' && col.options ? (
                <select value={String(form[col.key] ?? '')} onChange={e => set(col.key, e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">—</option>
                  {col.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={col.type === 'number' || col.type === 'currency' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                  value={String(form[col.key] ?? '')}
                  onChange={e => set(col.key, col.type === 'number' || col.type === 'currency' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Hủy</button>
          <button onClick={handleAdd} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Đang thêm...' : 'Thêm dòng'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SpreadsheetSheetProps {
  sheetId: string
  sheetName: string
  columns: SheetColumn[]
  initialRows: SheetRow[]
  onColumnAdded?: () => void
  onRowsChanged?: () => void
}

export function SpreadsheetSheet({
  sheetId, sheetName, columns: initialColumns, initialRows,
  onColumnAdded, onRowsChanged,
}: SpreadsheetSheetProps) {
  const { toasts, removeToast } = useToast()
  const [rows, setRows] = useState<SheetRow[]>(initialRows)
  const [columns, setColumns] = useState<SheetColumn[]>(initialColumns)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deleteTarget, setDeleteTarget] = useState<SheetRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [colMenuSheet, setColMenuSheet] = useState<string | null>(null)
  const [localSearch, setLocalSearch] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { rows: r } = await import('@/lib/sheets-api').then(m => m.getSheet(sheetId))
      setRows(r)
    } catch { toast('Không thể tải dữ liệu', 'error') }
    finally { setLoading(false) }
  }, [sheetId])

  const handleSort = (key: string) => {
    const dir = sortField === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortField(key); setSortDir(dir)
    setRows(prev => [...prev].sort((a, b) => {
      const av = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'vi')
      return dir === 'asc' ? av : -av
    }))
  }

  const handleSearch = (q: string) => {
    setLocalSearch(q)
    if (!q) { setRows(initialRows); return }
    const lower = q.toLowerCase()
    setRows(initialRows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(lower))
    ))
  }

  const handleSaveCell = async (rowId: string, key: string, val: unknown) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [key]: val } : r))
    try {
      await import('@/lib/sheets-api').then(m => m.updateRow(sheetId, rowId, { [key]: val }))
    } catch {
      toast('Lỗi khi lưu', 'error')
      refresh()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await import('@/lib/sheets-api').then(m => m.deleteRow(sheetId, deleteTarget.id))
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast('Đã xóa dòng', 'success')
      onRowsChanged?.()
    } catch { toast('Lỗi khi xóa', 'error') }
    finally { setDeleting(false) }
  }

  const handleAddColumn = async (col: Partial<SheetColumn>) => {
    try {
      const { sheet } = await import('@/lib/sheets-api').then(m => m.addColumn(sheetId, col))
      setColumns(sheet.columns)
      toast('Đã thêm cột "' + col.label + '"', 'success')
      onColumnAdded?.()
    } catch { toast('Lỗi khi thêm cột', 'error') }
  }

  const handleAddRow = async (data: Record<string, unknown>) => {
    try {
      const { row } = await import('@/lib/sheets-api').then(m => m.addRow(sheetId, data))
      setRows(prev => [...prev, row])
      setShowAddRow(false)
      toast('Đã thêm dòng', 'success')
      onRowsChanged?.()
    } catch { toast('Lỗi khi thêm dòng', 'error') }
  }

  const handleExport = () => {
    if (rows.length === 0) { toast('Không có dữ liệu', 'warning'); return }
    import('@/lib/sheets-api').then(m => m.exportSheetCSV(rows, columns, sheetName))
    toast('Đã xuất file CSV', 'success')
  }

  // Computed totals for currency columns
  const totals: Record<string, string> = {}
  columns.forEach(col => {
    if (col.type === 'currency') {
      const sum = rows.reduce((s, r) => s + (parseFloat(String(r[col.key] || 0)) || 0), 0)
      totals[col.key] = fmt(sum)
    }
  })

  return (
    <div className="flex flex-col h-full bg-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(localSearch)}
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-violet-200 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors">
            <Columns3 className="w-4 h-4" /> Thêm cột
          </button>
          <button onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors font-medium">
            <Plus className="w-4 h-4" /> Thêm dòng
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Sheet trống</p>
            <p className="text-gray-400 text-sm mt-1">Nhấn "Thêm dòng" để bắt đầu</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide text-center border-r border-gray-100 w-10">
                  #
                </th>
                {columns.map(col => (
                  <th key={col.key}
                    className={cn(
                      'px-1 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wide border-r border-gray-100 whitespace-nowrap',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                    style={{ minWidth: col.width, width: col.width }}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort(col.key)}
                        className={cn(
                          'flex items-center gap-0.5 hover:text-violet-600 transition-colors',
                          col.align === 'right' && 'ml-auto',
                          col.align === 'center' && 'mx-auto'
                        )}>
                        {col.label}
                        {sortField === col.key && (
                          sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-16 px-1 py-3 border-r border-gray-100" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id}
                  className="border-b border-gray-50 hover:bg-violet-50/15 transition-colors group">
                  <td className="px-2 py-1.5 text-xs text-gray-300 text-center border-r border-gray-100 bg-gray-50/50">
                    {row._rowNum ?? idx + 1}
                  </td>
                  {columns.map(col => (
                    <td key={col.key}
                      className={cn('px-1 py-1 border-r border-gray-100',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                      style={{ minWidth: col.width, width: col.width }}>
                      {col.editable ? (
                        <EditableCell
                          value={row[col.key]}
                          column={col}
                          onSave={val => handleSaveCell(row.id, col.key, val)}
                        />
                      ) : col.type === 'currency' ? (
                        <span className="font-semibold px-2 block text-right">{fmt(row[col.key])}</span>
                      ) : col.type === 'date' ? (
                        <span className="px-2 text-gray-700">{fmtDate(row[col.key])}</span>
                      ) : (
                        <span className="px-2 truncate block" title={String(row[col.key] ?? '')}>{String(row[col.key] ?? '')}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                      <button onClick={() => setDeleteTarget(row)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Xóa dòng">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              {Object.keys(totals).length > 0 && (
                <tr className="bg-violet-50 border-t-2 border-violet-200 font-bold">
                  <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-100 bg-violet-50">
                    Σ
                  </td>
                  {columns.map(col => (
                    <td key={col.key}
                      className={cn('px-1 py-2 border-r border-gray-100',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                      style={{ minWidth: col.width, width: col.width }}>
                      {totals[col.key] ? (
                        <span className="px-2 text-violet-700 text-sm">{totals[col.key]} đ</span>
                      ) : col.key !== 'rowNum' ? (
                        <span />
                      ) : null}
                    </td>
                  ))}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Row count */}
      <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0">
        {rows.length} dòng · {columns.length} cột
      </div>

      {/* Modals */}
      <AddColumnModal open={showAddColumn} onClose={() => setShowAddColumn(false)} onAdd={handleAddColumn} />
      <AddRowModal open={showAddRow} columns={columns} onClose={() => setShowAddRow(false)} onAdd={handleAddRow} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa dòng?"
        message={`Xóa 1 dòng? Hành động có thể hoàn tác.`}
        confirmLabel="Xóa" danger loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
