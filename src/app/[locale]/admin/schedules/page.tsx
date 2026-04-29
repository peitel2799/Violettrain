// Admin Schedules Page
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, RefreshCw, Save, Edit2, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Schedule {
  id: string
  trainNumber: string
  routeId: string
  routeName: string
  cabinClassId: string
  cabinClassName: string
  departureDate: string
  departureTime: string
  arrivalTime: string
  duration: string
  availableSeats: number
  totalSeats: number
  isActive: boolean
}

export default function AdminSchedulesPage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ availableSeats?: number; isActive?: boolean }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [routeFilter, setRouteFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addValues, setAddValues] = useState({
    trainNumber: '',
    routeId: 'HNO-LCA',
    fromStation: 'Ga Hà Nội',
    toStation: 'Ga Lào Cai (Sapa)',
    departureTime: '21:00',
    arrivalTime: '05:00',
    duration: '',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as string[],
    hasLanding: true,
    hasRestaurant: true,
    active: true,
    notes: '',
  })
  const [addError, setAddError] = useState('')

  const getToken = () => localStorage.getItem('admin_token') || ''

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    const token = getToken()
    try {
      const params = new URLSearchParams()
      if (dateFilter) params.set('date', dateFilter)
      if (routeFilter) params.set('routeId', routeFilter)
      const res = await fetch('/api/admin/schedules?' + params, { headers: { Authorization: 'Bearer ' + token } })
      if (res.status === 401) { router.push('/vi/admin/login'); return }
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [router, dateFilter, routeFilter])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const handleEdit = (s: Schedule) => {
    setEditingId(s.id)
    setEditValues({ availableSeats: s.availableSeats, isActive: s.isActive })
    setMessage('')
  }

  const handleSave = async (scheduleId: string) => {
    setSaving(true)
    const token = getToken()
    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ id: scheduleId, updates: editValues }),
      })
      const data = await res.json()
      if (res.ok) {
        setSchedules((prev) => prev.map((s) => s.id === scheduleId ? { ...s, ...editValues } : s))
        setEditingId(null)
        setMessage('Schedule updated!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Error: ' + data.error)
      }
    } catch { setMessage('Failed to update schedule') }
    finally { setSaving(false) }
  }

  const handleAdd = async () => {
    if (!addValues.trainNumber || !addValues.fromStation || !addValues.toStation || !addValues.departureTime || !addValues.arrivalTime) {
      setAddError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setAddError('')
    const token = getToken()
    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(addValues),
      })
      const data = await res.json()
      if (res.ok || res.status === 201) {
        setShowAddModal(false)
        setAddValues({
          trainNumber: '', routeId: 'HNO-LCA',
          fromStation: 'Ga Hà Nội', toStation: 'Ga Lào Cai (Sapa)',
          departureTime: '21:00', arrivalTime: '05:00', duration: '',
          days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          hasLanding: true, hasRestaurant: true, active: true, notes: '',
        })
        setMessage('Schedule added!')
        setTimeout(() => setMessage(''), 3000)
        fetchSchedules()
      } else {
        setAddError(data.error || 'Failed to add schedule.')
      }
    } catch {
      setAddError('Failed to add schedule.')
    } finally {
      setSaving(false)
    }
  }

  const handleDayToggle = (day: string) => {
    setAddValues((v) => ({
      ...v,
      days: v.days.includes(day) ? v.days.filter((d) => d !== day) : [...v.days, day],
    }))
  }

  const handleRouteChange = (routeId: string) => {
    const routeMap: Record<string, { from: string; to: string }> = {
      'HNO-LCA': { from: 'Ga Hà Nội', to: 'Ga Lào Cai (Sapa)' },
      'HNO-NBI': { from: 'Ga Hà Nội', to: 'Ga Ninh Bình' },
      'HNO-DHO': { from: 'Ga Hà Nội', to: 'Ga Đồng Hới (Phong Nha)' },
      'HNO-HUE': { from: 'Ga Hà Nội', to: 'Ga Huế' },
      'HNO-DNA': { from: 'Ga Hà Nội', to: 'Ga Đà Nẵng' },
    }
    const route = routeMap[routeId] || { from: 'Ga Hà Nội', to: '' }
    setAddValues((v) => ({ ...v, routeId, fromStation: route.from, toStation: route.to }))
  }

  const uniqueRoutes = Array.from(new Set(schedules.map((s) => s.routeId)))

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Schedules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage train schedules and seat availability.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={cn('text-sm font-medium', message.includes('Error') ? 'text-red-500' : 'text-green-600')}>
              {message}
            </span>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </button>
          <button onClick={fetchSchedules} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Date</label>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Route</label>
          <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[200px]">
            <option value="">All Routes</option>
            {uniqueRoutes.map((r) => (
              <option key={r} value={r}>{schedules.find((s) => s.routeId === r)?.routeName || r}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No schedules found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                <th className="px-5 py-3 font-medium">Train</th>
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-5 py-3 font-medium">Cabin</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Seats</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schedules.map((s) => {
                const fillPct = s.totalSeats > 0 ? ((s.totalSeats - s.availableSeats) / s.totalSeats) * 100 : 0
                return (
                  <tr key={s.id} className={cn('hover:bg-gray-50', !s.isActive && 'opacity-60')}>
                    <td className="px-5 py-3.5 font-mono font-bold text-violet-600">{s.trainNumber}</td>
                    <td className="px-5 py-3.5 text-gray-700">{s.routeName}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', s.cabinClassId === 'standard' ? 'bg-blue-400' : 'bg-gold-400')} />
                        <span className="text-gray-700">{s.cabinClassName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{s.departureDate}</td>
                    <td className="px-5 py-3.5 text-gray-600">{s.departureTime}</td>
                    <td className="px-5 py-3.5">
                      {editingId === s.id ? (
                        <input type="number" min="0" max={s.totalSeats} value={editValues.availableSeats || 0}
                          onChange={(e) => setEditValues((v) => ({ ...v, availableSeats: Number(e.target.value) }))}
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', fillPct > 80 ? 'bg-red-400' : fillPct > 50 ? 'bg-amber-400' : 'bg-green-400')}
                              style={{ width: fillPct + '%' }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{s.availableSeats}/{s.totalSeats}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === s.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(s.id)} disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                            <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(s)}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
                Add Train Schedule
              </h2>
              <button onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{addError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Train Number *</label>
                  <input type="text" value={addValues.trainNumber}
                    onChange={(e) => setAddValues((v) => ({ ...v, trainNumber: e.target.value }))}
                    placeholder="e.g. SE19"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Route</label>
                <select value={addValues.routeId} onChange={(e) => handleRouteChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                  <option value="HNO-LCA">HNO-LCA: Hà Nội → Lào Cai (Sapa)</option>
                  <option value="HNO-NBI">HNO-NBI: Hà Nội → Ninh Bình</option>
                  <option value="HNO-DHO">HNO-DHO: Hà Nội → Đồng Hới (Phong Nha)</option>
                  <option value="HNO-HUE">HNO-HUE: Hà Nội → Huế</option>
                  <option value="HNO-DNA">HNO-DNA: Hà Nội → Đà Nẵng</option>
                  <option value="HNO-VIN">HNO-VIN: Hà Nội → Vinh</option>
                  <option value="HNO-PLY">HNO-PLY: Hà Nội → Phủ Lý</option>
                  <option value="HNO-NDI">HNO-NDI: Hà Nội → Nam Định</option>
                  <option value="HNO-THO">HNO-THO: Hà Nội → Thanh Hóa</option>
                  <option value="HNO-HPH">HNO-HPH: Hà Nội → Hải Phòng</option>
                  <option value="VIN-DNA">VIN-DNA: Vinh → Đà Nẵng</option>
                  <option value="VIN-HUE">VIN-HUE: Vinh → Huế</option>
                  <option value="VIN-SGO">VIN-SGO: Vinh → TP. Hồ Chí Minh</option>
                  <option value="NDI-THO">NDI-THO: Nam Định → Thanh Hóa</option>
                  <option value="NDI-VIN">NDI-VIN: Nam Định → Vinh</option>
                  <option value="THO-VIN">THO-VIN: Thanh Hóa → Vinh</option>
                  <option value="THO-DHO">THO-DHO: Thanh Hóa → Đồng Hới</option>
                  <option value="NBI-THO">NBI-THO: Ninh Bình → Thanh Hóa</option>
                  <option value="NBI-VIN">NBI-VIN: Ninh Bình → Vinh</option>
                  <option value="HPH-NBI">HPH-NBI: Hải Phòng → Ninh Bình</option>
                  <option value="HPH-THO">HPH-THO: Hải Phòng → Thanh Hóa</option>
                  <option value="HPH-VIN">HPH-VIN: Hải Phòng → Vinh</option>
                  <option value="HPH-DHO">HPH-DHO: Hải Phòng → Đồng Hới</option>
                  <option value="HPH-DNA">HPH-DNA: Hải Phòng → Đà Nẵng</option>
                  <option value="HPH-SGO">HPH-SGO: Hải Phòng → TP. Hồ Chí Minh</option>
                  <option value="DNA-HUE">DNA-HUE: Đà Nẵng → Huế</option>
                  <option value="DNA-SGO">DNA-SGO: Đà Nẵng → TP. Hồ Chí Minh</option>
                  <option value="DNA-BHO">DNA-BHO: Đà Nẵng → Biên Hòa</option>
                  <option value="DNA-QNG">DNA-QNG: Đà Nẵng → Quảng Ngãi</option>
                  <option value="DNA-NTR">DNA-NTR: Đà Nẵng → Nha Trang</option>
                  <option value="HUE-SGO">HUE-SGO: Huế → TP. Hồ Chí Minh</option>
                  <option value="HUE-BHO">HUE-BHO: Huế → Biên Hòa</option>
                  <option value="HUE-QNG">HUE-QNG: Huế → Quảng Ngãi</option>
                  <option value="HUE-NTR">HUE-NTR: Huế → Nha Trang</option>
                  <option value="DHO-QNG">DHO-QNG: Đồng Hới → Quảng Ngãi</option>
                  <option value="QNG-NTR">QNG-NTR: Quảng Ngãi → Nha Trang</option>
                  <option value="QNG-SGO">QNG-SGO: Quảng Ngãi → TP. Hồ Chí Minh</option>
                  <option value="NTR-SGO">NTR-SGO: Nha Trang → TP. Hồ Chí Minh</option>
                  <option value="BHO-SGO">BHO-SGO: Biên Hòa → TP. Hồ Chí Minh</option>
                  <option value="DHO-DHA">DHO-DHA: Đồng Hới → Đông Hà</option>
                  <option value="DHO-QTI">DHO-QTI: Đồng Hới → Quảng Trị</option>
                  <option value="DHA-HUE">DHA-HUE: Đông Hà → Huế</option>
                  <option value="QTI-HUE">QTI-HUE: Quảng Trị → Huế</option>
                  <option value="QNG-DTR">QNG-DTR: Quảng Ngãi → Diêu Trì</option>
                  <option value="DTR-QNH">DTR-QNH: Diêu Trì → Quy Nhơn</option>
                  <option value="DTR-THA">DTR-THA: Diêu Trì → Tuy Hòa</option>
                  <option value="DTR-NTR">DTR-NTR: Diêu Trì → Nha Trang</option>
                  <option value="QNH-THA">QNH-THA: Quy Nhơn → Tuy Hòa</option>
                  <option value="THA-NTR">THA-NTR: Tuy Hòa → Nha Trang</option>
                  <option value="THA-SGO">THA-SGO: Tuy Hòa → TP. Hồ Chí Minh</option>
                  <option value="NTR-TCH">NTR-TCH: Nha Trang → Tháp Chàm</option>
                  <option value="TCH-PTH">TCH-PTH: Tháp Chàm → Phan Thiết</option>
                  <option value="TCH-DAT">TCH-DAT: Tháp Chàm → Đà Lạt</option>
                  <option value="PTH-SGO">PTH-SGO: Phan Thiết → TP. Hồ Chí Minh</option>
                  <option value="PTH-BHO">PTH-BHO: Phan Thiết → Biên Hòa</option>
                  <option value="DTR-SGO">DTR-SGO: Diêu Trì → TP. Hồ Chí Minh</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From *</label>
                  <input type="text" value={addValues.fromStation}
                    onChange={(e) => setAddValues((v) => ({ ...v, fromStation: e.target.value }))}
                    placeholder="e.g. Ga Hà Nội"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">To *</label>
                  <input type="text" value={addValues.toStation}
                    onChange={(e) => setAddValues((v) => ({ ...v, toStation: e.target.value }))}
                    placeholder="e.g. Ga Lào Cai (Sapa)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Departure *</label>
                  <input type="time" value={addValues.departureTime}
                    onChange={(e) => setAddValues((v) => ({ ...v, departureTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Arrival *</label>
                  <input type="time" value={addValues.arrivalTime}
                    onChange={(e) => setAddValues((v) => ({ ...v, arrivalTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                  <input type="text" value={addValues.duration}
                    onChange={(e) => setAddValues((v) => ({ ...v, duration: e.target.value }))}
                    placeholder="e.g. 8h 30m"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Departure Days</label>
                <div className="flex flex-wrap gap-2">
                  {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                    const labels: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
                    const isActive = addValues.days.includes(day)
                    return (
                      <button key={day} type="button"
                        onClick={() => handleDayToggle(day)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          isActive ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        )}>
                        {labels[day]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea value={addValues.notes}
                  onChange={(e) => setAddValues((v) => ({ ...v, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes about this schedule"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
              <button onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-xl font-medium disabled:opacity-50 transition-colors">
                {saving ? 'Adding...' : 'Add Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
