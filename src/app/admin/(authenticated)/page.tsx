'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Ticket,
  DollarSign,
  RefreshCw,
  FileSpreadsheet,
  Globe,
  TrendingUp,
} from 'lucide-react'
import { KPICard } from '@/components/admin/ui/Badge'
import { formatCurrency } from '@/lib/utils'

interface WebsiteStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  totalRevenue: number
  topRoutes: Array<{ routeId: string; routeName: string; count: number; revenue: number }>
  recentBookings: Array<{
    id: string; reference: string; status: string; paymentStatus: string
    routeName: string; total: number; passengers?: Array<{ fullName: string }>; createdAt: string
  }>
  revenueByMonth: Array<{ month: string; revenue: number }>
}

interface LedgerStats {
  totalRevenue: number
  totalTickets: number
  bySource: Record<string, { count: number; revenue: number }>
  byMonth: Array<{ month: string; revenue: number; count: number }>
  byCustomer: Array<{ customer: string; revenue: number; count: number }>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-gray-50 text-gray-600 border-gray-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ' + (map[status] || 'bg-gray-50 text-gray-600 border-gray-200')}>{status}</span>
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    paid: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    refunded: 'bg-gray-50 text-gray-600',
  }
  return <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (map[status] || 'bg-gray-50 text-gray-600')}>{status}</span>
}

function RevenueBarChart({ months }: { months: WebsiteStats['revenueByMonth'] }) {
  if (!months || months.length === 0) {
    return <div className="text-center text-gray-400 text-sm py-8">Chưa có dữ liệu doanh thu</div>
  }
  const maxRev = Math.max(...months.map((m) => m.revenue))
  return (
    <div className="flex items-end gap-1 h-28">
      {months.map((m) => {
        const height = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-gradient-to-t from-violet-700 to-violet-400 rounded-t-sm min-h-[4px] transition-all duration-500"
              style={{ height: Math.max(height, 4) + '%' }}
              title={formatCurrency(m.revenue)}
            />
            <span className="text-xs text-gray-400">{m.month.split('-')[1]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [websiteStats, setWebsiteStats] = useState<WebsiteStats | null>(null)
  const [ledgerStats, setLedgerStats] = useState<LedgerStats | null>(null)
  const [loading, setLoading] = useState(true)

  const getToken = () => localStorage.getItem('admin_token') || ''

  const fetchAll = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push('/admin/login'); return }

    setLoading(true)

    const [webRes, ledgerRes] = await Promise.allSettled([
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/data?limit=1', { headers: { Authorization: `Bearer ${token}` } }),
    ])

    if (webRes.status === 'fulfilled' && webRes.value.ok) {
      try {
        const data = await webRes.value.json()
        setWebsiteStats(data)
      } catch {}
    }

    if (ledgerRes.status === 'fulfilled' && ledgerRes.value.ok) {
      try {
        const data = await ledgerRes.value.json()
        setLedgerStats(data.stats || null)
      } catch {}
    }

    setLoading(false)
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  const totalRevenue = (websiteStats?.totalRevenue || 0) + (ledgerStats?.totalRevenue || 0)
  const totalTickets = (ledgerStats?.totalTickets || 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Bảng điều khiển
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng quan hoạt động — Sổ quỹ + Website
          </p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              label="Tổng doanh thu"
              value={formatCurrency(totalRevenue)}
              sub="Sổ quỹ + Website"
              icon={DollarSign}
              color="gold"
            />
            <KPICard
              label="Sổ quỹ bán vé"
              value={formatCurrency(ledgerStats?.totalRevenue || 0)}
              sub={`${ledgerStats?.totalTickets || 0} vé đã bán`}
              icon={FileSpreadsheet}
              color="violet"
            />
            <KPICard
              label="Đặt vé website"
              value={(websiteStats?.totalBookings || 0).toLocaleString()}
              sub={`${websiteStats?.confirmedBookings || 0} đã xác nhận`}
              icon={Globe}
              color="green"
            />
            <KPICard
              label="Đặt vé đang chờ"
              value={(websiteStats?.pendingBookings || 0).toLocaleString()}
              sub="Cần xác nhận"
              icon={Ticket}
              color="amber"
            />
          </div>

          {/* Sổ quỹ breakdown */}
          {ledgerStats?.bySource && Object.keys(ledgerStats.bySource).length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-violet-500" /> Sổ quỹ — Doanh thu theo nguồn
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(ledgerStats.bySource).map(([src, data]) => {
                  const labels: Record<string, string> = {
                    'T1-QV': 'T1 - Quầy vé', 'T1-NT': 'T1 - Nội thành',
                    'T2-QV': 'T2 - Quầy vé', 'T2-NT': 'T2 - Nội thành',
                    'T3-QV': 'T3 - Quầy vé', 'T3-NT': 'T3 - Nội thành',
                    'SE19': 'SE19 - Đặt vé', 'DL5': 'Đại lý DL5', 'DL3': 'Đại lý DL3',
                    'HP': 'HP - Hợp tác', 'VIB': 'VIB - Ngân hàng', 'VCB': 'VCB - Vietcombank',
                    'TECK': 'TECK', 'VTIN': 'VTIN',
                  }
                  const colors: Record<string, string> = {
                    'T1-QV': 'bg-violet-50 border-violet-200', 'T1-NT': 'bg-purple-50 border-purple-200',
                    'T2-QV': 'bg-blue-50 border-blue-200', 'T2-NT': 'bg-cyan-50 border-cyan-200',
                    'T3-QV': 'bg-indigo-50 border-indigo-200', 'T3-NT': 'bg-violet-50 border-violet-100',
                    'SE19': 'bg-amber-50 border-amber-200', 'DL5': 'bg-green-50 border-green-200',
                    'DL3': 'bg-emerald-50 border-emerald-200', 'HP': 'bg-orange-50 border-orange-200',
                    'VIB': 'bg-rose-50 border-rose-200', 'VCB': 'bg-blue-50 border-blue-200',
                  }
                  return (
                    <div key={src} className={`rounded-xl border p-4 ${colors[src] || 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs font-medium text-gray-600 mb-1">{labels[src] || src}</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(data.revenue)}</p>
                      <p className="text-xs text-gray-500">{data.count} giao dịch</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top routes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" /> Tuyến đường phổ biến (Website)
              </h3>
              {(!websiteStats?.topRoutes || websiteStats.topRoutes.length === 0) ? (
                <div className="text-center text-gray-400 text-sm py-8">Chưa có dữ liệu</div>
              ) : (
                <div className="space-y-3">
                  {websiteStats.topRoutes.slice(0, 5).map((route) => {
                    const maxRev = Math.max(...websiteStats.topRoutes.map((r) => r.revenue))
                    return (
                      <div key={route.routeId}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-gray-700 font-medium truncate max-w-[140px]">{route.routeName}</span>
                          <span className="text-xs font-semibold text-gray-900">{formatCurrency(route.revenue)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                            style={{ width: maxRev > 0 ? (route.revenue / maxRev) * 100 + '%' : '0%' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gold-500" /> Doanh thu website (12 tháng gần nhất)
              </h3>
              <RevenueBarChart months={websiteStats?.revenueByMonth || []} />
            </div>
          </div>

          {/* Recent website bookings */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-500" /> Đặt vé website gần đây
              </h3>
              <button onClick={() => router.push('/admin/bookings')}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                Xem tất cả
              </button>
            </div>
            {(!websiteStats?.recentBookings || websiteStats.recentBookings.length === 0) ? (
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
                      <th className="px-5 py-3 font-medium">Trạng thái</th>
                      <th className="px-5 py-3 font-medium">Thanh toán</th>
                      <th className="px-5 py-3 font-medium">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {websiteStats.recentBookings.slice(0, 8).map((b) => (
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
        </>
      )}
    </div>
  )
}
