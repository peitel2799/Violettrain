'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Train, Edit2, Save, X, RefreshCw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RouteData {
  id: string
  from: string
  to: string
  fromStation: string
  toStation: string
  duration: string
  departureDays: string[]
  departureTime: string
  arrivalTime: string
  basePrice: number
  [key: string]: unknown
}

const DAY_LABELS: Record<string, string> = {
  mon: 'T2', tue: 'T3', wed: 'T4', thu: 'T5', fri: 'T6', sat: 'T7', sun: 'CN',
}

export default function AdminRoutesPage() {
  const router = useRouter()
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ duration?: string; departureTime?: string; arrivalTime?: string; basePrice?: number }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const getToken = () => localStorage.getItem('admin_token') || ''

  const fetchRoutes = useCallback(async () => {
    setLoading(true)
    const token = getToken()
    try {
      const res = await fetch('/api/admin/routes', { headers: { Authorization: 'Bearer ' + token } })
      if (res.status === 401) { router.push('/admin/login'); return }
      const data = await res.json()
      setRoutes(data.routes || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { fetchRoutes() }, [fetchRoutes])

  const handleEdit = (route: RouteData) => {
    setEditingId(route.id)
    setEditValues({
      duration: route.duration,
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      basePrice: route.basePrice,
    })
    setMessage('')
  }

  const handleSave = async (routeId: string) => {
    setSaving(true)
    const token = getToken()
    try {
      const res = await fetch('/api/admin/routes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ id: routeId, updates: editValues }),
      })
      const data = await res.json()
      if (res.ok) {
        setRoutes((prev) => prev.map((r) => r.id === routeId ? { ...r, ...editValues } : r))
        setEditingId(null)
        setMessage('Cập nhật tuyến đường thành công!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Lỗi: ' + data.error)
      }
    } catch (err) {
      setMessage('Không thể cập nhật tuyến đường')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Tuyến đường</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý tuyến tàu, lịch trình và giá cơ bản.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={cn('text-sm font-medium', message.includes('Lỗi') ? 'text-red-500' : 'text-green-600')}>
              {message}
            </span>
          )}
          <button onClick={fetchRoutes} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                      <Train className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{route.fromStation} &rarr; {route.toStation}</h3>
                      <p className="text-xs text-gray-400">{route.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian</p>
                      {editingId === route.id ? (
                        <input type="text" value={editValues.duration || ''}
                          onChange={(e) => setEditValues((v) => ({ ...v, duration: e.target.value }))}
                          className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm">{route.duration}</p>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">Khởi hành</p>
                      {editingId === route.id ? (
                        <input type="text" value={editValues.departureTime || ''}
                          onChange={(e) => setEditValues((v) => ({ ...v, departureTime: e.target.value }))}
                          className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm">{route.departureTime}</p>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">Đến</p>
                      {editingId === route.id ? (
                        <input type="text" value={editValues.arrivalTime || ''}
                          onChange={(e) => setEditValues((v) => ({ ...v, arrivalTime: e.target.value }))}
                          className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <p className="font-medium text-gray-900 mt-1 text-sm">{route.arrivalTime}</p>
                      )}
                    </div>
                    <div className="p-3 bg-gold-50 rounded-xl">
                      <p className="text-xs text-gold-600">Giá cơ bản</p>
                      {editingId === route.id ? (
                        <input type="number" value={editValues.basePrice || 0}
                          onChange={(e) => setEditValues((v) => ({ ...v, basePrice: Number(e.target.value) }))}
                          className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      ) : (
                        <p className="font-bold text-gray-900 mt-1 text-sm">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(route.basePrice)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                      const isActive = route.departureDays?.includes(day)
                      return (
                        <span key={day} className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          isActive ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'
                        )}>
                          {DAY_LABELS[day]}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {editingId === route.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSave(route.id)} disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                        <X className="w-3.5 h-3.5" /> Hủy
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(route)}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                      <Edit2 className="w-3.5 h-3.5" /> Sửa
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
