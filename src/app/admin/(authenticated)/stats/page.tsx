'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, TrendingUp, Users, Train, Calendar, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react'
import { listData } from '@/lib/admin-data-api'
import { cn } from '@/lib/utils'
import { toast, useToast } from '@/components/admin/ui/Toast'

// ─── Chart components (inline, no external chart lib dependency) ───────────────

function SimpleBarChart({ data, height = 280 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return <div className="text-center text-gray-400 py-8">Không có dữ liệu</div>
  const max = Math.max(...data.map((d) => Math.abs(d.value)))
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return String(n)
  }

  return (
    <div style={{ height }} className="flex flex-col gap-1">
      <div className="flex items-end gap-1 flex-1">
        {data.map((d, i) => {
          const pct = max > 0 ? (Math.abs(d.value) / max) * 100 : 0
          const isNeg = d.value < 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="w-full flex flex-col-reverse" style={{ height: `${Math.max(pct, 2)}%` }}>
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isNeg ? 'bg-red-400' : 'bg-violet-500',
                    'group-hover:opacity-80'
                  )}
                  title={`${d.label}: ${fmt(d.value)} đ`}
                />
              </div>
              <span className="text-[10px] text-gray-400 text-center leading-tight truncate w-full overflow-hidden"
                style={{ maxWidth: '100%' }}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SimplePieChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  if (!data.length) return <div className="text-center text-gray-400 py-8">Không có dữ liệu</div>
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = size / 2, cy = size / 2, r = size / 2 - 10

  let currentAngle = -90
  const paths = data.map((d, i) => {
    const angle = (d.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const toRad = (deg: number) => (deg * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(endAngle))
    const y2 = cy + r * Math.sin(toRad(endAngle))
    const large = angle > 180 ? 1 : 0

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return (
      <g key={i}>
        <title>{`${d.label}: ${new Intl.NumberFormat('vi-VN').format(d.value)} đ`}</title>
        <path d={path} fill={d.color} stroke="white" strokeWidth="2"
          className="transition-opacity hover:opacity-80 cursor-pointer"
        />
      </g>
    )
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size}>
        {paths}
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-600 truncate max-w-[120px]">{d.label}</span>
            <span className="text-xs font-semibold text-gray-800 ml-auto">
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

function StatCard({ label, value, icon: Icon, sub, trend }: {
  label: string
  value: string
  icon: React.ElementType
  sub?: string
  trend?: { value: number; positive: boolean }
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2.5 bg-violet-50 rounded-xl">
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
          {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend.value).toFixed(1)}% so với tháng trước
        </div>
      )}
    </div>
  )
}

// ─── Main Statistics Page ─────────────────────────────────────────────────────

export default function AdminStatsPage() {
  const { toasts, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    totalRevenue: number
    totalTickets: number
    bySource: Record<string, { count: number; revenue: number }>
    byMonth: Array<{ month: string; revenue: number; count: number }>
    byCustomer: Array<{ customer: string; revenue: number; count: number }>
  } | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterSource, setFilterSource] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listData({ limit: 1, dateFrom, dateTo, source: filterSource })
      setStats(result.stats)
    } catch { toast('Không thể tải thống kê', 'error') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, filterSource])

  useEffect(() => { load() }, [load])

  // Revenue by month chart data
  const monthlyData = (stats?.byMonth || []).map((m) => ({
    label: m.month,
    value: m.revenue,
  }))

  // Revenue by source pie data
  const sourceColors = [
    '#7c3aed', '#d4af37', '#059669', '#dc2626', '#0891b2',
    '#c026d3', '#ea580c', '#16a34a', '#2563eb', '#9333ea',
    '#db2777', '#0284c7', '#65a30d', '#ca8a04',
  ]
  const sourceData = Object.entries(stats?.bySource || {})
    .filter(([, d]) => d.revenue > 0)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([src, d], i) => ({
      label: src,
      value: d.revenue,
      color: sourceColors[i % sourceColors.length],
    }))

  // Top customers
  const topCustomers = (stats?.byCustomer || []).slice(0, 10)

  // Summary stats
  const months = stats?.byMonth || []
  const currentMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const monthTrend = prevMonth && currentMonth
    ? {
        value: ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100,
        positive: currentMonth.revenue >= prevMonth.revenue,
      }
    : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Báo cáo doanh thu
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Thống kê doanh thu theo tháng, khách hàng, nguồn dữ liệu</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Từ ngày" />
          <span className="text-gray-400">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Đến ngày" />
          <button onClick={load}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg transition-colors">
            Áp dụng
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Tổng doanh thu"
              value={`${fmt(stats?.totalRevenue || 0)} đ`}
              icon={TrendingUp}
              sub={`${(stats?.totalTickets || 0).toLocaleString()} vé`}
              trend={monthTrend}
            />
            <StatCard
              label="Tổng số vé"
              value={(stats?.totalTickets || 0).toLocaleString()}
              icon={Train}
              sub="tất cả nguồn"
            />
            <StatCard
              label="Khách hàng"
              value={(stats?.byCustomer || []).length.toLocaleString()}
              icon={Users}
              sub="khách hàng duy nhất"
            />
            <StatCard
              label="Tháng hiện tại"
              value={`${fmt(currentMonth?.revenue || 0)} đ`}
              icon={Calendar}
              sub={`${currentMonth?.count || 0} giao dịch`}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly revenue */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                Doanh thu theo tháng
              </h3>
              <SimpleBarChart data={monthlyData} height={280} />
            </div>

            {/* By source pie */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                Doanh thu theo nguồn
              </h3>
              <SimplePieChart data={sourceData} size={180} />
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top customers */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800" style={{ fontFamily: 'var(--font-serif)' }}>
                  Top khách hàng
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Số vé</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{c.customer}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{c.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(c.revenue)} đ</td>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Monthly breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800" style={{ fontFamily: 'var(--font-serif)' }}>
                  Chi tiết theo tháng
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Tháng</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Số giao dịch</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">TB/GD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...months].reverse().map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{m.month}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{m.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-violet-700">{fmt(m.revenue)} đ</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{fmt(m.count > 0 ? m.revenue / m.count : 0)} đ</td>
                    </tr>
                  ))}
                  {months.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source breakdown table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800" style={{ fontFamily: 'var(--font-serif)' }}>
                Chi tiết theo nguồn dữ liệu
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nguồn</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Số giao dịch</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Tỷ trọng</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Biểu đồ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sourceData.map((s, i) => {
                  const pct = (stats?.totalRevenue ?? 0) > 0 ? (s.value / (stats?.totalRevenue ?? 1)) * 100 : 0
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{s.label}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{stats?.bySource?.[s.label]?.count || 0}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-violet-700">{fmt(s.value)} đ</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{pct.toFixed(1)}%</td>
                      <td className="px-4 py-2.5 w-48">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {sourceData.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                )}
              </tbody>
              {sourceData.length > 0 && (
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-4 py-2.5 text-gray-700">Tổng cộng</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{Object.values(stats?.bySource || {}).reduce((s, d) => s + d.count, 0)}</td>
                    <td className="px-4 py-2.5 text-right text-violet-700">{fmt(stats?.totalRevenue || 0)} đ</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">100%</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  )
}
