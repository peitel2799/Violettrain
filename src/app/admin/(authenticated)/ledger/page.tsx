'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { History, Database, BarChart3, Download, Upload } from 'lucide-react'
import { DataSheet, LedgerEntry, SHEETS } from '@/components/admin/ui/DataSheet'
import { Modal } from '@/components/admin/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast, useToast } from '@/components/admin/ui/Toast'
import { listData, createEntry, updateEntry, deleteEntry, listAuditLogs, getEntryAuditLog, exportCSV, downloadBackup, AuditLogEntry } from '@/lib/admin-data-api'
import { cn } from '@/lib/utils'

// ─── Helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

function fmtDate(d: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('vi-VN') } catch { return d }
}

// ─── Edit Modal ────────────────────────────────────────────────────────

function EditModal({ entry, onSave, onClose }: {
  entry: Partial<LedgerEntry> | null
  onSave: (e: Partial<LedgerEntry>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<LedgerEntry>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (entry !== null) setForm({ ...entry }) }, [entry])

  const set = (k: keyof LedgerEntry, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={!!entry} onClose={onClose} title={form.id ? 'Sửa dòng' : 'Thêm dòng mới'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button><Button variant="primary" onClick={async () => { setSaving(true); try { await onSave(form) } finally { setSaving(false) } }} loading={saving}>{form.id ? 'Lưu' : 'Thêm'}</Button></>}
    >
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'source', label: 'Sheet', type: 'select', options: SHEETS.map(s => s.key) },
          { key: 'sellDate', label: 'Ngày bán', type: 'date' },
          { key: 'seller', label: 'Người bán', type: 'text' },
          { key: 'customer', label: 'Khách hàng', type: 'text', span: 2 },
          { key: 'customerPhone', label: 'Điện thoại', type: 'text' },
          { key: 'customerEmail', label: 'Email', type: 'text' },
          { key: 'departureDate', label: 'Ngày đi', type: 'date' },
          { key: 'trainCode', label: 'Tàu', type: 'text' },
          { key: 'trainNumber', label: 'Số hiệu', type: 'text' },
          { key: 'route', label: 'Tuyến', type: 'text' },
          { key: 'carriage', label: 'Tòa', type: 'text' },
          { key: 'carriageNumber', label: 'Số toa', type: 'text' },
          { key: 'seatInfo', label: 'Vị trí ghế', type: 'text', span: 2 },
          { key: 'seatCount', label: 'SL', type: 'number' },
          { key: 'unitPrice', label: 'Giá', type: 'number' },
          { key: 'totalAmount', label: 'Tổng tiền', type: 'number' },
          { key: 'paymentMethod', label: 'Thanh toán', type: 'select', options: ['TM', 'CARD', 'CK', 'TM+CARD', 'MoMo', 'VNPay', 'TECH'] },
          { key: 'actualTickets', label: 'SL thực tế', type: 'number' },
          { key: 'actualUnitPrice', label: 'Giá thực tế', type: 'number' },
          { key: 'cashAmount', label: 'TM (Tiền mặt)', type: 'number' },
          { key: 'cardAmount', label: 'CARD', type: 'number' },
          { key: 'balance', label: 'Còn lại', type: 'number' },
          { key: 'gikaCount', label: 'SL GI-KA', type: 'number' },
          { key: 'gikaUnitPrice', label: 'Giá GI-KA', type: 'number' },
          { key: 'vatCode', label: 'Mã VAT', type: 'text' },
          { key: 'ticketCode', label: 'Mã vé', type: 'text' },
          { key: 'agentCode', label: 'Mã đại lý', type: 'text' },
          { key: 'notes', label: 'Ghi chú', type: 'text', span: 3 },
        ].map(field => (
          <div key={field.key} style={{ gridColumn: field.span ? `span ${field.span}` : undefined }}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
            {field.type === 'select' && field.options ? (
              <select value={String(form[field.key as keyof LedgerEntry] ?? '')} onChange={e => set(field.key as keyof LedgerEntry, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">—</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={String(form[field.key as keyof LedgerEntry] ?? '')}
                onChange={e => set(field.key as keyof LedgerEntry, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ─── History Modal ──────────────────────────────────────────────────────

function HistoryModal({ entry, onClose }: { entry: LedgerEntry | null; onClose: () => void }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entry) return
    setLoading(true)
    getEntryAuditLog(entry.id)
      .then(data => setLogs(data.items || []))
      .catch(() => toast('Không thể tải lịch sử', 'error'))
      .finally(() => setLoading(false))
  }, [entry])

  const actionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-50'
      case 'UPDATE': return 'text-blue-600 bg-blue-50'
      case 'DELETE': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Modal open={!!entry} onClose={onClose} title={`Lịch sử: ${entry?.customer || entry?.sellDate || ''}`} size="xl">
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Chưa có lịch sử thay đổi</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={cn('px-2 py-1 rounded-lg text-xs font-bold uppercase', actionColor(log.action))}>{log.action}</span>
                <div className="text-right text-xs text-gray-400">
                  <div>{fmtDate(log.at)}</div>
                  <div className="font-medium text-violet-600">bởi: {log.by}</div>
                </div>
              </div>
              {log.changes && Object.keys(log.changes).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(log.changes).map(([key, { from, to }]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 text-xs">
                      <span className="font-semibold text-gray-500 capitalize">{key}</span>
                      <span className="text-red-500 line-through truncate">{String(from ?? '—')}</span>
                      <span className="text-green-600 truncate">{String(to ?? '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─── Audit Log Tab ───────────────────────────────────────────────────

function AuditLogPanel() {
  const [logs, setLogs] = useState<Array<{ entryId: string; entryLabel: string; source: string; log: AuditLogEntry }>>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const data = await listAuditLogs(undefined, p, 50)
      setLogs(data.items || [])
      setPage(data.page)
    } catch { toast('Không thể tải lịch sử', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const actionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-50'
      case 'UPDATE': return 'text-blue-600 bg-blue-50'
      case 'DELETE': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Nhật ký thay đổi</h2>
        <button onClick={() => load(page)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          <History className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Chưa có lịch sử thay đổi nào</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((item, i) => (
              <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn('px-2 py-1 rounded-lg text-xs font-bold uppercase', actionColor(item.log.action))}>{item.log.action}</span>
                    <span className="font-medium text-gray-800">{item.entryLabel}</span>
                    <span className="text-xs text-gray-400">({item.source})</span>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>{fmtDate(item.log.at)}</div>
                    <div className="text-violet-500 font-medium">{item.log.by}</div>
                  </div>
                </div>
                {item.log.changes && Object.keys(item.log.changes).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {Object.entries(item.log.changes).map(([key, { from, to }]) => (
                      <span key={key} className="text-xs">
                        <span className="text-gray-400">{key}:</span>{' '}
                        <span className="text-red-400 line-through">{String(from ?? '—')}</span>{' → '}
                        <span className="text-green-600">{String(to ?? '—')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Backup Panel ──────────────────────────────────────────────────────

function BackupPanel({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try { await downloadBackup(); toast('Đã tải file backup!', 'success') }
    catch { toast('Lỗi khi tải backup', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Sao lưu & Tải dữ liệu</h2>
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          ← Quay lại sổ quỹ
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Tải file Backup JSON</h3>
                <p className="text-sm text-gray-500 mb-4">Tải toàn bộ dữ liệu sổ quỹ (bao gồm nhật ký thay đổi) ra file JSON để lưu trữ an toàn trên máy.</p>
                <Button variant="primary" onClick={handleDownload} loading={loading}>
                  <Download className="w-4 h-4" /> Tải file Backup (.json)
                </Button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Xuất file CSV</h3>
                <p className="text-sm text-gray-500 mb-4">Xuất dữ liệu sổ quỹ hiện tại ra file CSV. Sử dụng nút "Xuất CSV" trên bảng dữ liệu để xuất với bộ lọc hiện tại.</p>
                <Button variant="secondary" onClick={onBack}>
                  Mở bảng dữ liệu để xuất CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-sm text-amber-700 font-medium">Lưu ý:</p>
        <ul className="text-sm text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
          <li>Nên sao lưu định kỳ ít nhất 1 lần/tuần</li>
          <li>Lưu file backup ở nơi an toàn (Google Drive, USB, ...)</li>
          <li>File backup chứa toàn bộ dữ liệu bao gồm nhật ký thay đổi</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function AdminLedgerPage() {
  const { toasts, removeToast } = useToast()
  const [data, setData] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSheet, setActiveSheet] = useState('T1-QV')
  const [sortField, setSortField] = useState('sellDate')
  const [sortDir, setSortDir] = useState('desc')
  const [stats, setStats] = useState<{
    totalRevenue: number
    totalTickets: number
    sheetRevenue: number
    sheetTickets: number
    bySource: Record<string, { count: number; revenue: number }>
    byMonth: Array<{ month: string; revenue: number; count: number }>
    byCustomer: Array<{ customer: string; revenue: number; count: number }>
  }>()
  const [editEntry, setEditEntry] = useState<Partial<LedgerEntry> | null>(null)
  const [historyEntry, setHistoryEntry] = useState<LedgerEntry | null>(null)
  const [activeTab, setActiveTab] = useState<'data' | 'history' | 'backup'>('data')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (p = 1, sheet = activeSheet, q = search) => {
    setLoading(true)
    try {
      const result = await listData({
        page: p, limit: 100,
        search: q,
        source: sheet === 'ALL' ? '' : sheet,
        sortField,
        sortDir,
      })
      setData(result.items || [])
      setPage(result.page)
      setPages(result.pages)
      setTotal(result.total)
      setStats(result.stats)
    } catch { toast('Không thể tải dữ liệu sổ quỹ', 'error') }
    finally { setLoading(false) }
  }, [search, activeSheet, sortField, sortDir])

  useEffect(() => { load() }, [load])

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = (q: string) => {
    setSearch(q)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => load(1, activeSheet, q), 400)
  }

  const handleSheetChange = (sheet: string) => {
    setActiveSheet(sheet)
    setPage(1)
    load(1, sheet, search)
  }

  const handleSort = (field: string, dir: string) => {
    setSortField(field)
    setSortDir(dir)
    load(page)
  }

  const handlePageChange = (p: number) => { setPage(p); load(p) }

  const handleSave = async (entry: Partial<LedgerEntry>) => {
    setSaving(true)
    try {
      if (entry.id) {
        await updateEntry(entry.id, entry)
        toast('Cập nhật thành công.', 'success')
      } else {
        await createEntry({ ...entry, source: activeSheet })
        toast('Thêm dòng thành công.', 'success')
      }
      setEditEntry(null)
      load(page)
    } catch (e) { toast('Lỗi: ' + String(e), 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (entry: LedgerEntry) => {
    try {
      await deleteEntry(entry.id)
      toast('Đã xóa dòng (soft delete — ghi log).', 'success')
      load(page)
    } catch (e) { toast('Lỗi: ' + String(e), 'error') }
  }

  const handleImport = async (file: File) => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('vm_token') || ''
    const user = localStorage.getItem('admin_user') || 'admin'
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', activeSheet)
    const res = await fetch('/api/admin/data/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Admin-User': user },
      body: formData,
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Import failed')
    toast(`Đã import ${result.imported} dòng!`, 'success')
    load(1)
  }

  const handleExport = () => {
    if (data.length === 0) { toast('Không có dữ liệu để xuất.', 'warning'); return }
    exportCSV(data)
    toast('Đã xuất file CSV!', 'success')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-0 px-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Sổ quỹ bán vé
          </h1>
          <p className="text-sm text-gray-500">Quản lý dữ liệu bán vé — giống Google Sheets với 14 nguồn dữ liệu</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Tài khoản: <span className="font-semibold text-violet-600">
            {localStorage.getItem('admin_user') || 'admin'}
          </span></span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mt-4 mb-4 bg-white rounded-xl border border-gray-100 p-1 w-fit">
        <button onClick={() => setActiveTab('data')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'data' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
          <Database className="w-4 h-4" /> Sổ quỹ
          {total > 0 && <span className="text-xs opacity-70">({total})</span>}
        </button>
        <button onClick={() => setActiveTab('history')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'history' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
          <History className="w-4 h-4" /> Nhật ký
        </button>
        <button onClick={() => setActiveTab('backup')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === 'backup' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
          <Download className="w-4 h-4" /> Backup
        </button>
      </div>

      {/* Content */}
      {activeTab === 'data' && (
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <DataSheet
            data={data} loading={loading} page={page} pages={pages} total={total}
            activeSheet={activeSheet} stats={stats}
            search={search} sortField={sortField} sortDir={sortDir}
            onSheetChange={handleSheetChange}
            onSearch={handleSearch}
            onPageChange={handlePageChange}
            onSort={handleSort}
            onRefresh={() => load(page)}
            onImport={handleImport}
            onExport={handleExport}
            onEdit={(entry) => setEditEntry(entry)}
            onDelete={handleDelete}
            onAddRow={() => setEditEntry({ source: activeSheet })}
            onViewHistory={(entry) => setHistoryEntry(entry)}
          />
        </div>
      )}

      {activeTab === 'history' && <AuditLogPanel />}
      {activeTab === 'backup' && <BackupPanel onBack={() => setActiveTab('data')} />}

      {/* Modals */}
      <EditModal entry={editEntry} onSave={handleSave} onClose={() => setEditEntry(null)} />
      <HistoryModal entry={historyEntry} onClose={() => setHistoryEntry(null)} />
    </div>
  )
}
