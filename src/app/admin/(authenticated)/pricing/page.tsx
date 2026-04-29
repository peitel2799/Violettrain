'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Save, Edit2, X, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PricingEntry {
  routeId: string
  routeName: string
  cabinClassId: string
  cabinClassName: string
  basePrice: number
  peakPrice: number
  seasonFactor: number
  lastUpdated: string
}

export default function AdminPricingPage() {
  const router = useRouter()
  const [pricing, setPricing] = useState<PricingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PricingEntry>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addValues, setAddValues] = useState({
    routeId: '',
    cabinClassId: '',
    basePrice: 0,
    peakPrice: 0,
    seasonFactor: 1.0,
  })
  const [addError, setAddError] = useState('')

  const getToken = () => localStorage.getItem('admin_token') || ''

  const fetchPricing = useCallback(async () => {
    setLoading(true)
    const token = getToken()
    try {
      const res = await fetch('/api/admin/pricing', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      setPricing(data.pricing || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  const handleEdit = (entry: PricingEntry) => {
    const key = `${entry.routeId}__${entry.cabinClassId}`
    setEditingKey(key)
    setEditValues({ basePrice: entry.basePrice, peakPrice: entry.peakPrice, seasonFactor: entry.seasonFactor })
    setMessage('')
  }

  const handleSave = async (entry: PricingEntry) => {
    setSaving(true)
    const token = getToken()
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          routeId: entry.routeId,
          cabinClassId: entry.cabinClassId,
          basePrice: editValues.basePrice,
          peakPrice: editValues.peakPrice,
          seasonFactor: editValues.seasonFactor,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setPricing((prev) => prev.map((p) =>
          p.routeId === entry.routeId && p.cabinClassId === entry.cabinClassId
            ? { ...p, ...data.pricing }
            : p
        ))
        setEditingKey(null)
        setMessage('Cập nhật giá thành công!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`Lỗi: ${data.error}`)
      }
    } catch {
      setMessage('Không thể cập nhật giá')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    if (!addValues.routeId || !addValues.cabinClassId) {
      setAddError('Vui lòng chọn tuyến đường và hạng cabin.')
      return
    }
    setSaving(true)
    setAddError('')
    const token = getToken()
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(addValues),
      })
      const data = await res.json()
      if (res.ok || res.status === 201) {
        setPricing((prev) => [...prev, data.pricing])
        setShowAddModal(false)
        setAddValues({ routeId: '', cabinClassId: '', basePrice: 0, peakPrice: 0, seasonFactor: 1.0 })
        setMessage('Thêm giá tuyến đường thành công!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setAddError(data.error || 'Không thể thêm giá tuyến đường.')
      }
    } catch {
      setAddError('Không thể thêm giá tuyến đường.')
    } finally {
      setSaving(false)
    }
  }

  const grouped = pricing.reduce<Record<string, PricingEntry[]>>((acc, p) => {
    if (!acc[p.routeId]) acc[p.routeId] = []
    acc[p.routeId].push(p)
    return acc
  }, {})

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Giá vé</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý giá vé theo tuyến đường và hạng cabin.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={cn('text-sm font-medium', message.includes('Lỗi') ? 'text-red-500' : 'text-green-600')}>
              {message}
            </span>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm giá tuyến
          </button>
          <button onClick={fetchPricing} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([routeId, entries]) => (
            <div key={routeId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-violet-50 border-b border-violet-100">
                <h3 className="font-semibold text-gray-900">{entries[0]?.routeName || routeId}</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                    <th className="px-5 py-3 font-medium">Hạng cabin</th>
                    <th className="px-5 py-3 font-medium">Giá cơ bản</th>
                    <th className="px-5 py-3 font-medium">Giá cao điểm</th>
                    <th className="px-5 py-3 font-medium">Hệ số mùa</th>
                    <th className="px-5 py-3 font-medium">Cập nhật lần cuối</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((entry) => {
                    const key = `${entry.routeId}__${entry.cabinClassId}`
                    const isEditing = editingKey === key
                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', entry.cabinClassId === 'standard' ? 'bg-blue-400' : 'bg-gold-400')} />
                            <span className="font-medium text-gray-900">{entry.cabinClassName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.basePrice || 0}
                              onChange={(e) => setEditValues((v) => ({ ...v, basePrice: Number(e.target.value) }))}
                              className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          ) : (
                            <span className="font-semibold">{formatCurrency(entry.basePrice)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.peakPrice || 0}
                              onChange={(e) => setEditValues((v) => ({ ...v, peakPrice: Number(e.target.value) }))}
                              className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          ) : (
                            <span>{formatCurrency(entry.peakPrice)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.1"
                              value={editValues.seasonFactor || 1}
                              onChange={(e) => setEditValues((v) => ({ ...v, seasonFactor: Number(e.target.value) }))}
                              className="w-20 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          ) : (
                            <span className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              entry.seasonFactor > 1 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            )}>
                              x{entry.seasonFactor}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400">
                          {entry.lastUpdated ? new Date(entry.lastUpdated).toLocaleDateString('vi-VN') : 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(entry)}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                              >
                                <Save className="w-3 h-3" />
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(entry)}
                              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                            >
                              <Edit2 className="w-3 h-3" />
                              Sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Add Price Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                Thêm giá tuyến đường
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tuyến đường</label>
                <select
                  value={addValues.routeId}
                  onChange={(e) => setAddValues((v) => ({ ...v, routeId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  <option value="">Chọn tuyến đường</option>
                  <option value="HNO-LCA">Ga Hà Nội → Ga Lào Cai (Sapa)</option>
                  <option value="HNO-NBI">Ga Hà Nội → Ga Ninh Bình</option>
                  <option value="HNO-DHO">Ga Hà Nội → Ga Đồng Hới (Phong Nha)</option>
                  <option value="HNO-HUE">Ga Hà Nội → Ga Huế</option>
                  <option value="HNO-DNA">Ga Hà Nội → Ga Đà Nẵng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hạng cabin</label>
                <select
                  value={addValues.cabinClassId}
                  onChange={(e) => setAddValues((v) => ({ ...v, cabinClassId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  <option value="">Chọn hạng cabin</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giá cơ bản (VND)</label>
                  <input
                    type="number"
                    value={addValues.basePrice || ''}
                    onChange={(e) => setAddValues((v) => ({ ...v, basePrice: Number(e.target.value) }))}
                    placeholder="e.g. 1500000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giá cao điểm (VND)</label>
                  <input
                    type="number"
                    value={addValues.peakPrice || ''}
                    onChange={(e) => setAddValues((v) => ({ ...v, peakPrice: Number(e.target.value) }))}
                    placeholder="e.g. 2100000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hệ số mùa</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3"
                  value={addValues.seasonFactor}
                  onChange={(e) => setAddValues((v) => ({ ...v, seasonFactor: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-400 mt-1">VD: 1.0 = bình thường, 1.5 = cao điểm 50%</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Đang thêm...' : 'Thêm giá tuyến'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
