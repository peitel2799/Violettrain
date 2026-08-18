'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, RefreshCw, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PricingEntry {
  cabinClassId: 'standard' | 'premium'
  cabinClassName: string
  ticketPrice: number
  lastUpdated: string
}

export default function AdminPricingPage() {
  const router = useRouter()
  const [pricing, setPricing] = useState<PricingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchPricing = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token') || ''
      const response = await fetch('/api/admin/pricing', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await response.json()
      setPricing(data.pricing || [])
    } catch {
      setMessage('Không thể tải giá vé.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  const savePrice = async (entry: PricingEntry) => {
    if (!Number.isFinite(editPrice) || editPrice <= 0) {
      setMessage('Giá vé phải lớn hơn 0.')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const token = localStorage.getItem('admin_token') || ''
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cabinClassId: entry.cabinClassId, ticketPrice: editPrice }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Không thể cập nhật giá vé.')

      setPricing((current) => current.map((item) =>
        item.cabinClassId === entry.cabinClassId ? data.pricing : item
      ))
      setEditingId(null)
      setMessage('Đã cập nhật giá. Website và trang đặt vé sẽ dùng giá mới.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật giá vé.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Giá vé sản phẩm</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Mỗi sản phẩm có một giá cố định cho tất cả tuyến. Thay đổi tại đây sẽ áp dụng cho trang giới thiệu và kết quả đặt vé.
          </p>
        </div>
        <button onClick={fetchPricing} className="flex w-fit items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">{message}</div>
      )}

      {loading ? (
        <div className="flex h-52 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {pricing.map((entry) => {
            const editing = editingId === entry.cabinClassId
            const isVip = entry.cabinClassId === 'premium'
            return (
              <section key={entry.cabinClassId} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className={isVip ? 'bg-violet-700 px-6 py-5 text-white' : 'bg-slate-800 px-6 py-5 text-white'}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">{isVip ? '7 cabin · 4 khách' : 'Cabin 4 khách'}</p>
                  <h2 className="mt-1 text-xl font-bold">{entry.cabinClassName}</h2>
                  <p className="mt-1 text-sm text-white/75">
                    {isVip ? 'Giường tầng trên có thể nâng lên.' : 'Giường tầng trên cố định, không thể nâng lên.'}
                  </p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Giá cố định / 1 vé</p>
                  {editing ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        step="10000"
                        value={editPrice}
                        onChange={(event) => setEditPrice(Number(event.target.value))}
                        className="w-48 rounded-xl border border-gray-200 px-3 py-2 text-lg font-semibold outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="font-semibold text-gray-500">VND</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(entry.ticketPrice)}</p>
                  )}
                  <p className="mt-3 text-sm text-gray-500">Mua đủ 4 vé để sử dụng riêng toàn bộ cabin.</p>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-xs text-gray-400">
                      Cập nhật: {new Date(entry.lastUpdated).toLocaleDateString('vi-VN')}
                    </span>
                    {editing ? (
                      <div className="flex gap-2">
                        <button disabled={saving} onClick={() => savePrice(entry)} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                          <Save className="h-3.5 w-3.5" /> Lưu
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" aria-label="Hủy">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(entry.cabinClassId); setEditPrice(entry.ticketPrice); setMessage('') }} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50">
                        <Edit2 className="h-3.5 w-3.5" /> Sửa giá
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
