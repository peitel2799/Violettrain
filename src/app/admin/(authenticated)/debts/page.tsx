'use client'

declare global {
  interface Window {
    _debtSearch?: number
  }
}

import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { DataTable, DataTableColumn } from '@/components/admin/ui/DataTable'
import { Badge } from '@/components/admin/ui/Badge'
import { Modal } from '@/components/admin/ui/Modal'
import { ConfirmDialog } from '@/components/admin/ui/Modal'
import { ToastContainer, toast, useToast } from '@/components/admin/ui/Toast'
import { listDebts, createDebt, updateDebt, deleteDebt } from '@/lib/admin/manager-api'

const statuses = ['PENDING', 'PAID', 'OVERDUE']

function fmt(n: number | string) {
  const num = typeof n === 'string' ? parseFloat(n) : n
  return isNaN(num) ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(num))
}
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—' }
function fmtCurrency(v: number | string) { return fmt(v) + ' đ' }

const statusVariants: Record<string, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning', PAID: 'success', OVERDUE: 'danger',
}
const statusLabels: Record<string, string> = {
  PENDING: 'Đang chờ', PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn',
}

interface DebtData {
  id?: number
  debtor: string; amount: number; due_date: string
  status: string; description: string; notes: string
}

function DebtForm({ data, onSubmit, loading }: { data: DebtData; onSubmit: (f: DebtData) => void; loading: boolean }) {
  const isEdit = !!data?.id
  const [form, setForm] = useState<DebtData>(data || { debtor: '', amount: 0, due_date: '', status: 'PENDING', description: '', notes: '' })
  const set = (k: keyof DebtData, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên khách nợ *</label>
          <input required value={form.debtor} onChange={(e) => set('debtor', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VND)</label>
          <input type="number" min="0" step="1000" value={form.amount} onChange={(e) => set('amount', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày đến hạn</label>
          <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
            {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
          {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm công nợ'}</button>
      </div>
    </form>
  )
}

export default function AdminDebtsPage() {
  const { toasts, removeToast } = useToast()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0)
  const [modal, setModal] = useState<DebtData | null>(null)
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true)
    try {
      const res = await listDebts({ page: p, search: q, per_page: 50 }) as { items: Record<string, unknown>[]; page: number; pages: number; total: number }
      setData(res.items || []); setPage(res.page); setPages(res.pages); setTotal(res.total)
    } catch { toast('Không thể tải dữ liệu công nợ', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(window._debtSearch as number)
    window._debtSearch = setTimeout(() => load(1, q), 400) as unknown as number
  }

  const handleSubmit = async (form: DebtData) => {
    setSaving(true)
    try {
      if (form.id) { await updateDebt(form.id, form as unknown as Record<string, unknown>); toast('Cập nhật thành công.', 'success') }
      else { await createDebt(form as unknown as Record<string, unknown>); toast('Thêm công nợ thành công.', 'success') }
      setModal(null); load(page)
    } catch { toast('Lỗi khi lưu công nợ.', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try { await deleteDebt(deleting.id as number); toast('Xóa thành công.', 'success'); setDeleting(null); load(page) }
    catch { toast('Lỗi khi xóa.', 'error') }
  }

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID', width: '60px', mono: true },
    { key: 'debtor', label: 'Khách nợ' },
    { key: 'amount', label: 'Số tiền (VND)', align: 'right', render: (v) => <span className="font-semibold">{fmtCurrency(v as number)}</span> },
    { key: 'due_date', label: 'Ngày đến hạn', render: (v) => fmtDate(v as string) },
    {
      key: 'status', label: 'Trạng thái',
      render: (v) => <Badge variant={statusVariants[String(v)] || 'warning'}>{statusLabels[String(v)] || String(v)}</Badge>
    },
    { key: 'description', label: 'Mô tả', truncate: true },
    { key: 'notes', label: 'Ghi chú', truncate: true },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Công nợ</h1>
          <p className="text-sm text-gray-500 mt-0.5">Theo dõi công nợ phải thu — PENDING, PAID, OVERDUE</p>
        </div>
        <button onClick={() => setModal({ debtor: '', amount: 0, due_date: '', status: 'PENDING', description: '', notes: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl font-medium transition-colors">
          <Plus className="w-4 h-4" /> Thêm công nợ</button>
      </div>
      <DataTable columns={columns} data={data} loading={loading} page={page} pages={pages} total={total} perPage={50}
        searchPlaceholder="Tìm theo tên khách nợ..."
        onSearch={handleSearch} onPageChange={(p) => load(p, search)}
        onEdit={(row) => setModal(row as unknown as DebtData)} onDelete={(row) => setDeleting(row)}
        onRefresh={() => load(page, search)}
        emptyTitle="Chưa có công nợ" emptyDesc="Thêm bản ghi công nợ đầu tiên." />
      {modal !== null && (
        <Modal open onClose={() => setModal(null)} title={modal.id ? 'Sửa công nợ' : 'Thêm công nợ'} size="md">
          <DebtForm data={modal} onSubmit={handleSubmit} loading={saving} /></Modal>)}
      <ConfirmDialog open={!!deleting} title="Xóa công nợ?" message={`Xóa công nợ #${deleting?.id}? Không thể hoàn tác.`}
        confirmLabel="Xóa" danger loading={saving} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
