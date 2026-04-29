'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Ticket,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Booking {
  id: string
  reference: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  routeId: string
  routeName: string
  cabinClassId: string
  cabinClassName: string
  departureDate: string
  departureTime: string
  trainNumber: string
  passengers: Array<{
    type: 'adult' | 'child'
    fullName: string
    email: string
    phone: string
  }>
  pricing: { subtotal: number; discount: number; tax: number; total: number }
  payment: { method: string; transactionId?: string }
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-gray-50 text-gray-600 border-gray-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
}

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-gray-50 text-gray-600',
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Đang chờ',
    confirmed: 'Đã xác nhận',
    cancelled: 'Đã hủy',
    refunded: 'Đã hoàn tiền',
    completed: 'Hoàn tất',
  }
  const cls = STATUS_COLORS[status] || 'bg-gray-50 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {labels[status] || status}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại',
    refunded: 'Đã hoàn tiền',
  }
  const cls = PAYMENT_COLORS[status] || 'bg-gray-50 text-gray-600'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {labels[status] || status}
    </span>
  )
}

function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const router = useRouter()

  const handleStatusChange = async (newStatus: string) => {
    const token = localStorage.getItem('admin_token') || ''
    await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reference: booking.reference, status: newStatus }),
    })
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-sm text-violet-600 font-bold">{booking.reference}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(booking.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
            <PaymentBadge status={booking.paymentStatus} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-xs text-violet-500 font-medium mb-1">Tuyến đường</p>
              <p className="font-semibold text-gray-900">{booking.routeName}</p>
              <p className="text-sm text-gray-500 mt-1">
                {booking.trainNumber} &middot; {booking.departureDate} lúc {booking.departureTime}
              </p>
            </div>
            <div className="bg-gold-50 rounded-xl p-4">
              <p className="text-xs text-gold-600 font-medium mb-1">Tổng số tiền</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(booking.pricing.total)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Phụ: {formatCurrency(booking.pricing.subtotal)} &middot; Giảm: -{formatCurrency(booking.pricing.discount)} &middot; Thuế: {formatCurrency(booking.pricing.tax)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Hành khách ({booking.passengers.length})</h4>
            <div className="space-y-2">
              {booking.passengers.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">
                    {p.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.fullName}</p>
                    <p className="text-xs text-gray-500">{p.email} &middot; {p.phone}</p>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{p.type === 'adult' ? 'Người lớn' : 'Trẻ em'}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Thanh toán</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400">Phương thức</p>
                <p className="font-medium text-gray-700">{booking.payment.method}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400">Mã giao dịch</p>
                <p className="font-mono text-xs text-gray-700">{booking.payment.transactionId || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            {booking.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange('confirmed')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Xác nhận
                </button>
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Hủy
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Đánh dấu hoàn tất
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminBookingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRef = searchParams.get('ref')

  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const getToken = () => localStorage.getItem('admin_token') || ''

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const token = getToken()
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/bookings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      setBookings(data.bookings || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, router])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  useEffect(() => {
    if (initialRef) {
      fetch(`/api/admin/bookings?ref=${initialRef}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.booking) setSelectedBooking(d.booking)
        })
      const url = new URL(window.location.href)
      url.searchParams.delete('ref')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [initialRef])

  const filtered = search
    ? bookings.filter(
        (b) =>
          b.reference.toLowerCase().includes(search.toLowerCase()) ||
          b.passengers.some((p) => p.fullName.toLowerCase().includes(search.toLowerCase())) ||
          b.routeName.toLowerCase().includes(search.toLowerCase())
      )
    : bookings

  const totalPages = Math.ceil(total / 15)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Đặt vé
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} đặt vé</p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đặt vé, tên, tuyến đường..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Đang chờ</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="completed">Hoàn tất</option>
          <option value="cancelled">Đã hủy</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Không tìm thấy đặt vé nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-5 py-3 font-medium">Mã đặt vé</th>
                  <th className="px-5 py-3 font-medium">Tuyến đường</th>
                  <th className="px-5 py-3 font-medium">Ngày</th>
                  <th className="px-5 py-3 font-medium">Hành khách</th>
                  <th className="px-5 py-3 font-medium">Số tiền</th>
                  <th className="px-5 py-3 font-medium">Trạng thái đặt vé</th>
                  <th className="px-5 py-3 font-medium">Thanh toán</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-violet-600 font-bold">{b.reference}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-gray-700">{b.routeName}</div>
                      <div className="text-xs text-gray-400">{b.trainNumber}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      <div>{b.departureDate}</div>
                      <div className="text-gray-400">{b.departureTime}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      {b.passengers.map((p) => p.fullName).join(', ')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {formatCurrency(b.pricing.total)}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5"><PaymentBadge status={b.paymentStatus} /></td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Hiển thị {(page - 1) * 15 + 1}-{Math.min(page * 15, total)} của {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  )
}
