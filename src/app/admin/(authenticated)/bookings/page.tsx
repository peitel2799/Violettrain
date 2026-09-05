'use client'

declare global {
  interface Window {
    _bookingSearch?: number
    _debtSearch?: number
  }
}

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, RefreshCw, Download, Upload, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Modal } from '@/components/admin/ui/Modal'
import { ConfirmDialog } from '@/components/admin/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { toast, useToast } from '@/components/admin/ui/Toast'
import { listBookings, createBooking, updateBooking, deleteBooking, exportBookingsCSV } from '@/lib/booking-api'
import type { Booking, BookingStatus } from '@/lib/booking-types'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

function fmtDate(d: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('vi-VN') } catch { return d }
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chưa thanh toán', color: 'text-red-600', bg: 'bg-red-50' },
  partial: { label: 'Thanh toán một phần', color: 'text-amber-600', bg: 'bg-amber-50' },
  paid: { label: 'Đã thanh toán đủ', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: 'Đã hủy', color: 'text-gray-500', bg: 'bg-gray-100' },
}

const STATUS_OPTIONS: BookingStatus[] = ['pending', 'partial', 'paid', 'cancelled']

// ─── Booking Form ────────────────────────────────────────────────────────

function BookingForm({ booking, onSave, onClose }: {
  booking: Partial<Booking> | null
  onSave: (b: Partial<Booking>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Booking>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (booking !== null) setForm({ ...booking }) }, [booking])

  const set = (k: keyof Booking, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const totalTickets = Number(form.totalTickets) || 0
  const unitPrice = Number(form.unitPrice) || 0
  const totalAmount = totalTickets * unitPrice

  return (
    <Modal open={!!(booking !== null)} onClose={onClose} title={form.id ? 'Sửa đoàn' : 'Thêm đoàn mới'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button><Button variant="primary" onClick={async () => { setSaving(true); try { await onSave(form) } finally { setSaving(false) } }} loading={saving}>{form.id ? 'Lưu' : 'Thêm'}</Button></>}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Company Info */}
        <div className="col-span-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Thông tin công ty / đại lý</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tên công ty / Đại lý *</label>
              <input value={form.companyName || ''} onChange={(e) => set('companyName', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Công ty ABC, Đất Xanh, Đại lý XYZ..." />
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Người liên hệ</label><input value={form.companyContact || ''} onChange={(e) => set('companyContact', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Số điện thoại</label><input value={form.companyPhone || ''} onChange={(e) => set('companyPhone', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label><input type="email" value={form.companyEmail || ''} onChange={(e) => set('companyEmail', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Mã số thuế (MST)</label><input value={form.taxCode || ''} onChange={(e) => set('taxCode', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="col-span-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Chi tiết đoàn</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Ngày đặt</label><input type="date" value={form.bookingDate || ''} onChange={(e) => set('bookingDate', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Ngày khởi hành *</label><input type="date" value={form.departureDate || ''} onChange={(e) => set('departureDate', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Số hiệu tàu</label><input value={form.trainNumber || ''} onChange={(e) => set('trainNumber', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Tuyến đường</label><input value={form.route || ''} onChange={(e) => set('route', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Toa</label><input value={form.carriage || ''} onChange={(e) => set('carriage', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Phương thức</label>
              <select value={form.paymentMethod || 'CK'} onChange={(e) => set('paymentMethod', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>CK</option><option>TM</option><option>CARD</option><option>MoMo</option><option>VNPay</option>
              </select>
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="col-span-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Thanh toán</h3>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Số vé</label><input type="number" value={form.totalTickets || ''} onChange={(e) => set('totalTickets', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Đơn giá (VND)</label><input type="number" value={form.unitPrice || ''} onChange={(e) => set('unitPrice', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Tổng tiền (VND)</label><input type="number" value={form.totalAmount || totalAmount} onChange={(e) => set('totalAmount', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Đã thanh toán (VND)</label><input type="number" value={form.paidAmount || ''} onChange={(e) => set('paidAmount', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
          </div>
          <div className="flex items-center justify-between mt-3 p-3 bg-violet-50 rounded-lg">
            <span className="text-sm text-gray-600">Số tiền còn nợ:</span>
            <span className="text-lg font-bold text-red-600">{fmt((form.totalAmount || totalAmount) - (form.paidAmount || 0))} đ</span>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
          <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Ghi chú thêm..." />
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function BookingsPage() {
  const { toasts, removeToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState('departureDate')
  const [sortDir, setSortDir] = useState('desc')
  const [stats, setStats] = useState<{ totalAmount: number; totalPaid: number; totalDebt: number } | null>(null)
  const [editBooking, setEditBooking] = useState<Partial<Booking> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const [saving, setSaving] = useState(false)
  const [localSearch, setLocalSearch] = useState('')

  const load = useCallback(async (p = 1, q = search, status = statusFilter) => {
    setLoading(true)
    try {
      const result = await listBookings({ page: p, search: q, status, sortField, sortDir })
      setBookings(result.items || [])
      setPage(result.page)
      setPages(result.pages)
      setTotal(result.total)
      setStats(result.stats)
    } catch { toast('Không thể tải danh sách đoàn', 'error') }
    finally { setLoading(false) }
  }, [search, statusFilter, sortField, sortDir])

  useEffect(() => { load() }, [load])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(window._bookingSearch as unknown as number)
    window._bookingSearch = setTimeout(() => load(1, q, statusFilter), 400) as unknown as number
  }

  const handleSave = async (form: Partial<Booking>) => {
    setSaving(true)
    try {
      if (form.id) {
        await updateBooking(form.id, form)
        toast('Cập nhật thành công', 'success')
      } else {
        await createBooking(form)
        toast('Thêm đoàn thành công', 'success')
      }
      setEditBooking(null)
      load(page)
    } catch (e) { toast('Lỗi: ' + String(e), 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBooking(deleteTarget.id)
      toast('Đã hủy đoàn', 'success')
      setDeleteTarget(null)
      load(page)
    } catch (e) { toast('Lỗi: ' + String(e), 'error') }
  }

  const COLS = [
    { key: 'companyName', label: 'Công ty / Đại lý', width: '180px' },
    { key: 'departureDate', label: 'Ngày KH', width: '100px' },
    { key: 'trainNumber', label: 'Tàu', width: '80px' },
    { key: 'route', label: 'Tuyến', width: '80px' },
    { key: 'totalTickets', label: 'Vé', width: '60px', align: 'center' as const },
    { key: 'totalAmount', label: 'Tổng tiền', width: '120px', align: 'right' as const },
    { key: 'paidAmount', label: 'Đã TT', width: '110px', align: 'right' as const },
    { key: 'debt', label: 'Còn nợ', width: '110px', align: 'right' as const },
    { key: 'status', label: 'Trạng thái', width: '140px', align: 'center' as const },
    { key: 'notes', label: 'Ghi chú', width: '150px' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Quản lý đoàn</h1>
          <p className="text-sm text-gray-500">Theo dõi đoàn khách, công nợ, và đối soát thanh toán</p>
        </div>
        <Button variant="primary" onClick={() => setEditBooking({})}>
          <Plus className="w-4 h-4" /> Thêm đoàn
        </Button>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase">Tổng giá trị đoàn</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(stats.totalAmount)} đ</p>
            <p className="text-xs text-gray-400">{total} đoàn</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase">Đã thanh toán</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(stats.totalPaid)} đ</p>
            <p className="text-xs text-gray-400">{fmt(stats.totalPaid > 0 ? (stats.totalPaid / stats.totalAmount * 100) : 0)}%</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm bg-red-50">
            <p className="text-xs font-medium text-red-400 uppercase">Còn nợ</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{fmt(stats.totalDebt)} đ</p>
            <p className="text-xs text-red-400">{stats.totalDebt > 0 ? 'Cần theo dõi' : 'Đã thanh toán hết'}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(localSearch)}
            placeholder="Tìm công ty, tàu, tuyến..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); load(1, search, e.target.value) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => exportBookingsCSV(bookings)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button onClick={() => load(page)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {COLS.map((col) => (
                  <th key={col.key}
                    className={cn('px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                    style={{ minWidth: col.width, width: col.width }}
                  >
                    <button onClick={() => { setSortField(col.key); setSortDir(sortField === col.key && sortDir === 'asc' ? 'desc' : 'asc'); load(page) }}
                      className={cn('flex items-center gap-1 hover:text-violet-600',
                        col.align === 'right' && 'ml-auto', col.align === 'center' && 'mx-auto')}>
                      {col.label}
                      {sortField === col.key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase w-20 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLS.length + 1} className="text-center py-20">
                  <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={COLS.length + 1} className="text-center py-20 text-gray-400">Chưa có đoàn nào. Nhấn "Thêm đoàn" để bắt đầu.</td></tr>
              ) : (
                bookings.map((b) => {
                  const debt = b.totalAmount - b.paidAmount
                  const cfg = STATUS_CONFIG[b.status]
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-violet-50/10 transition-colors group">
                      {COLS.map((col) => {
                        if (col.key === 'companyName') return (
                          <td key="companyName" className="px-3 py-3 font-medium text-gray-800">{b.companyName}</td>
                        )
                        if (col.key === 'departureDate') return (
                          <td className="px-3 py-3 text-gray-600">{fmtDate(b.departureDate)}</td>
                        )
                        if (col.key === 'totalAmount' || col.key === 'paidAmount') {
                          const v = col.key === 'totalAmount' ? b.totalAmount : b.paidAmount
                          return <td className="px-3 py-3 text-right font-semibold text-gray-900">{fmt(v)} đ</td>
                        }
                        if (col.key === 'debt') return (
                          <td className={cn('px-3 py-3 text-right font-bold', debt > 0 ? 'text-red-600' : 'text-green-600')}>
                            {fmt(debt)} đ
                          </td>
                        )
                        if (col.key === 'status') return (
                          <td className="px-3 py-3 text-center">
                            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>{cfg.label}</span>
                          </td>
                        )
                        if (col.key === 'totalTickets') return <td className="px-3 py-3 text-center font-semibold">{b.totalTickets}</td>
                        return (
                          <td className="px-3 py-3 text-gray-600 truncate max-w-[150px]" title={String((b as unknown as Record<string, unknown>)[col.key] ?? '')}>
                            {String((b as unknown as Record<string, unknown>)[col.key] ?? '')}
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditBooking(b)} className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded" title="Sửa"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget(b)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hủy"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
            <span>{(page - 1) * 50 + 1}–{Math.min(page * 50, total)} / {total} đoàn</span>
            <div className="flex items-center gap-1">
              <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-30">‹</button>
              <span className="px-3 py-1.5 font-medium">Trang {page} / {pages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= pages} className="px-3 py-1.5 rounded border hover:bg-gray-50 disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </div>

      <BookingForm booking={editBooking} onSave={handleSave} onClose={() => setEditBooking(null)} />
      <ConfirmDialog open={!!deleteTarget} title="Hủy đoàn?" message={`Hủy đoàn "${deleteTarget?.companyName}"?`} confirmLabel="Hủy" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
