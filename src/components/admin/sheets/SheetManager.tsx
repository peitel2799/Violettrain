'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, X, Ticket, FileText, LayoutGrid, Columns3,
  MoreHorizontal, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastContainer, toast, useToast } from '@/components/admin/ui/Toast'
import { ConfirmDialog } from '@/components/admin/ui/Modal'
import { SpreadsheetSheet } from './SpreadsheetSheet'
import type { SheetDefinition, SheetRow, SheetColumn } from '@/lib/sheets-api'

// ─── Create Sheet Modal ────────────────────────────────────────────────────────

function CreateSheetModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (params: { name: string; template: 'blank' | 'booking'; description?: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<'blank' | 'booking'>('blank')
  const [saving, setSaving] = useState(false)

  const templates = [
    {
      id: 'blank' as const,
      label: 'Trang trắng',
      icon: FileText,
      desc: 'Bắt đầu từ đầu với 3 cột trống',
      color: 'bg-gray-100 text-gray-500',
    },
    {
      id: 'booking' as const,
      label: 'Quản lý đặt vé',
      icon: Ticket,
      desc: 'Có sẵn: Ngày bán, Khách hàng, Mã đặt vé, Ngày khởi hành, Tàu, Tuyến, Số ghế, Số lượng, Đơn giá, Thành tiền, Bữa sáng, Ghi chú',
      color: 'bg-violet-100 text-violet-700',
    },
  ]

  const handleCreate = async () => {
    if (!name.trim()) { toast('Nhập tên sheet', 'warning'); return }
    setSaving(true)
    try { await onCreate({ name: name.trim(), template }) } catch { toast('Lỗi khi tạo sheet', 'error') }
    finally { setSaving(false); onClose() }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Tạo sheet mới</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Tên sheet</label>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="VD: Sổ quỹ tháng 5, Danh sách khách VIP..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Chọn loại sheet</label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      template === t.id
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    )}>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', template === t.id ? 'bg-violet-100' : t.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{t.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Đang tạo...' : 'Tạo sheet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sheet Manager ─────────────────────────────────────────────────────────────

export function SheetManager() {
  const { toasts, removeToast } = useToast()
  const [sheets, setSheets] = useState<SheetDefinition[]>([])
  const [activeSheet, setActiveSheet] = useState<SheetDefinition | null>(null)
  const [activeRows, setActiveRows] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SheetDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ sheet: SheetDefinition; x: number; y: number } | null>(null)

  const loadSheets = useCallback(async () => {
    try {
      const { listSheets } = await import('@/lib/sheets-api')
      const data = await listSheets()
      setSheets(data)
      if (data.length > 0 && !activeSheet) {
        setActiveSheet(data[0])
        loadSheetData(data[0].id)
      }
    } catch { toast('Không thể tải danh sách sheet', 'error') }
    finally { setLoading(false) }
  }, [])

  const loadSheetData = async (sheetId: string) => {
    try {
      const { getSheet } = await import('@/lib/sheets-api')
      const { rows } = await getSheet(sheetId)
      setActiveRows(rows)
    } catch { toast('Không thể tải dữ liệu', 'error') }
  }

  useEffect(() => { loadSheets() }, [loadSheets])

  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const handleSheetSelect = async (sheet: SheetDefinition) => {
    setActiveSheet(sheet)
    setLoading(true)
    await loadSheetData(sheet.id)
    setLoading(false)
  }

  const handleCreate = async (params: { name: string; template: 'blank' | 'booking' }) => {
    const { createSheet } = await import('@/lib/sheets-api')
    const { sheet } = await createSheet(params)
    setSheets(prev => [...prev, sheet])
    setActiveSheet(sheet)
    setActiveRows([])
    toast('Đã tạo sheet "' + sheet.name + '"', 'success')
  }

  const handleDeleteSheet = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { deleteSheet } = await import('@/lib/sheets-api')
      await deleteSheet(deleteTarget.id)
      setSheets(prev => prev.filter(s => s.id !== deleteTarget.id))
      if (activeSheet?.id === deleteTarget.id) {
        const remaining = sheets.filter(s => s.id !== deleteTarget.id)
        setActiveSheet(remaining[0] || null)
        if (remaining[0]) loadSheetData(remaining[0].id)
        else setActiveRows([])
      }
      setDeleteTarget(null)
      toast('Đã xóa sheet', 'success')
    } catch { toast('Lỗi khi xóa sheet', 'error') }
    finally { setDeleting(false) }
  }

  const handleRowsChanged = () => {
    loadSheets()
    if (activeSheet) loadSheetData(activeSheet.id)
  }

  const SHEET_ICONS: Record<string, React.ElementType> = {
    booking: Ticket,
    default: LayoutGrid,
  }

  return (
    <div className="flex flex-col h-full">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Sheets
          </h1>
          <p className="text-sm text-gray-500">{sheets.length} sheet · Tạo sheet mới để bắt đầu</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Tạo sheet
        </button>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
        {sheets.map(sheet => {
          const Icon = SHEET_ICONS[sheet.id] || SHEET_ICONS.default
          return (
            <div key={sheet.id} className="relative group">
              <button
                onClick={() => handleSheetSelect(sheet)}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ sheet, x: e.clientX, y: e.clientY }) }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border',
                  activeSheet?.id === sheet.id
                    ? 'bg-white text-violet-700 border-violet-200 shadow-sm'
                    : `${sheet.color || 'bg-gray-50 text-gray-600 border-transparent'} hover:opacity-80`
                )}>
                <Icon className="w-3.5 h-3.5" />
                <span>{sheet.name}</span>
                <span className="text-[10px] opacity-60 ml-0.5">{sheet.rowCount}</span>
              </button>

              {/* Context menu on hover */}
              <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px] z-20 hidden group-hover:block">
                <button onClick={() => { setDeleteTarget(sheet); setContextMenu(null) }}
                  className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" /> Xóa sheet
                </button>
              </div>
            </div>
          )
        })}

        {sheets.length === 0 && !loading && (
          <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 rounded-xl border border-violet-100 text-sm text-violet-700">
            <AlertCircle className="w-4 h-4" />
            Chưa có sheet nào — nhấn "Tạo sheet" để bắt đầu
          </div>
        )}
      </div>

      {/* Sheet content */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeSheet ? (
          <SpreadsheetSheet
            key={activeSheet.id}
            sheetId={activeSheet.id}
            sheetName={activeSheet.name}
            columns={activeSheet.columns}
            initialRows={activeRows}
            onRowsChanged={handleRowsChanged}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-violet-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có sheet nào</h3>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">Tạo sheet mới để bắt đầu quản lý dữ liệu. Chọn "Trang trắng" hoặc "Quản lý đặt vé" có sẵn cột.</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Tạo sheet đầu tiên
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateSheetModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa sheet?"
        message={`Xóa sheet "${deleteTarget?.name}" và toàn bộ dữ liệu bên trong? Hành động không thể hoàn tác.`}
        confirmLabel="Xóa vĩnh viễn" danger loading={deleting}
        onConfirm={handleDeleteSheet} onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
