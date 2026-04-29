'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Ticket,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Stats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  totalRevenue: number
  averageTicketPrice: number
  topRoutes: Array<{ routeId: string; routeName: string; count: number; revenue: number }>
  recentBookings: Array<{
    id: string; reference: string; status: string; paymentStatus: string
    routeName: string; total: number; passengers?: Array<{ fullName: string }>; createdAt: string
  }>
  bookingsByDay: Array<{ date: string; count: number; revenue: number }>
  revenueByMonth: Array<{ month: string; revenue: number }>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-50 text-gray-600 border-gray-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  const cls = map[status] || 'bg-gray-50 text-gray-600 border-gray-200'
  return <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ' + cls}>{status}</span>
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    paid: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    refunded: 'bg-gray-50 text-gray-600',
  }
  const cls = map[status] || 'bg-gray-50 text-gray-600'
  return <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + cls}>{status}</span>
}

function StatCard({ label, value, sub, icon: Icon, color = 'violet' }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: 'violet' | 'gold' | 'green' | 'amber'
}) {
  const colorMap = {
    violet: 'bg-violet-50 text-violet-600',
    gold: 'bg-gold-50 text-gold-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + colorMap[color]}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function TopRoutesChart({ routes }: { routes: Stats['topRoutes'] }) {
  if (!routes || routes.length === 0) {
    return <div className="text-center text-gray-400 text-sm py-8">Chưa có dữ liệu tuyến đường</div>
  }
  const maxRev = Math.max(...routes.map((r) => r.revenue))
  return (
    <div className="space-y-3">
      {routes.slice(0, 5).map((route) => (
        <div key={route.routeId}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-700 font-medium truncate max-w-[160px]">{route.routeName}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-gray-500">{route.count} đặt vé</span>
              <span className="text-xs font-semibold text-gray-900">{formatCurrency(route.revenue)}</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
              style={{ width: maxRev > 0 ? (route.revenue / maxRev) * 100 + '%' : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/admin/login'); return }
    try {
      const res = await fetch('/api/admin/stats', { headers: { Authorization: 'Bearer ' + token } })
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/admin/login')
        return
      }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setStats(data)
      setError('')
    } catch (err) {
      setError('Không thể tải dữ liệu dashboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error || 'Không thể tải dữ liệu'}</p>
        <button onClick={fetchStats} className="text-sm text-violet-600 hover:text-violet-700">Thử lại</button>
      </div>
    )
  }

  const confirmRate = stats.totalBookings > 0
    ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100) : 0

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>Bảng điều khiển</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tổng quan hoạt động của Violette Train.</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng đặt vé" value={stats.totalBookings.toLocaleString()} sub={confirmRate + '% tỷ lệ xác nhận'} icon={Ticket} color="violet" />
        <StatCard label="Đã xác nhận" value={stats.confirmedBookings.toLocaleString()} sub={stats.pendingBookings + ' đang chờ'} icon={Users} color="green" />
        <StatCard label="Tổng doanh thu" value={formatCurrency(stats.totalRevenue)} sub={'TB ' + formatCurrency(stats.averageTicketPrice) + '/đặt vé'} icon={DollarSign} color="gold" />
        <StatCard label="Đã hủy" value={stats.cancelledBookings.toLocaleString()} sub="Tháng này" icon={Clock} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" /> Tuyến đường phổ biến
          </h3>
          <TopRoutesChart routes={stats.topRoutes} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gold-500" /> Doanh thu (12 tháng gần nhất)
          </h3>
          {!stats.revenueByMonth || stats.revenueByMonth.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">Chưa có dữ liệu doanh thu</div>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {stats.revenueByMonth.map((m) => {
                const maxRev = Math.max(...stats.revenueByMonth.map((x) => x.revenue))
                const height = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-violet-700 to-violet-400 rounded-t-sm min-h-[4px] transition-all duration-500"
                      style={{ height: Math.max(height, 4) + '%' }}
                      title={formatCurrency(m.revenue)}
                    />
                    <span className="text-xs text-gray-400">{m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Đặt vé gần đây</h3>
          <button onClick={() => router.push('/admin/bookings')} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
            Xem tất cả
          </button>
        </div>
        {(!stats.recentBookings || stats.recentBookings.length === 0) ? (
          <div className="text-center py-12 text-gray-400 text-sm">Chưa có đặt vé nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-5 py-3 font-medium">Mã đặt vé</th>
                  <th className="px-5 py-3 font-medium">Tuyến đường</th>
                  <th className="px-5 py-3 font-medium">Hành khách</th>
                  <th className="px-5 py-3 font-medium">Số tiền</th>
                  <th className="px-5 py-3 font-medium">Trạng thái đặt vé</th>
                  <th className="px-5 py-3 font-medium">Thanh toán</th>
                  <th className="px-5 py-3 font-medium">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-mono text-xs text-violet-600 font-bold">{b.reference}</td>
                    <td className="px-5 py-3.5 text-gray-700">{b.routeName}</td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{b.passengers?.[0]?.fullName || 'N/A'}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{formatCurrency(b.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5"><PaymentBadge status={b.paymentStatus} /></td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
