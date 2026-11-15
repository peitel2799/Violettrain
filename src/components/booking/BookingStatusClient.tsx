'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle2, Clock3, Home, Loader2, RefreshCw, Search, TriangleAlert, XCircle } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { formatCurrency } from '@/lib/utils'

const CheckoutStep = dynamic(() => import('@/components/booking/CheckoutStep'))

interface Receipt {
  reference: string
  status: string
  paymentStatus: string
  expiresAt: string
  pricing: { subtotal: number; tax: number; total: number }
  legs: Array<{ legNumber: number; fromStation: string; toStation: string; trainNumber: string; departureAt: string; productName: string }>
}

type View = 'loading' | 'error' | 'confirmed' | 'waiting' | 'retry' | 'expired' | 'review'

const POLL_INTERVAL_MS = 3000
const POLL_LIMIT = 20

export default function BookingStatusClient({
  locale,
  reference,
  returnState = '',
}: {
  locale: 'vi' | 'en'
  reference: string
  /** verified | pending | failed | cancelled | invalid — set by the payment return routes. */
  returnState?: string
}) {
  const isVi = locale === 'vi'
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const polls = useRef(0)

  const loadStatus = useCallback(async () => {
    const savedToken = sessionStorage.getItem(`violette-order-${reference}`)
    setToken(savedToken)
    if (!reference || !savedToken) {
      setError(isVi
        ? 'Không tìm thấy mã xác minh đơn trên trình duyệt này. Hãy mở lại trên trình duyệt bạn đã dùng để đặt vé, hoặc liên hệ Violette Train kèm mã đơn.'
        : 'The order verification token is missing from this browser. Open this page in the browser you booked with, or contact Violette Train with your reference.')
      setLoading(false)
      return
    }
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(reference)}`, {
        cache: 'no-store',
        headers: { 'X-Order-Token': savedToken },
      })
      const result = await response.json()
      if (!response.ok || !result.order) throw new Error(isVi ? 'Không tải được trạng thái đơn.' : 'Unable to load the order.')
      setReceipt(result.order)
      setError('')
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to load order')
    } finally {
      setLoading(false)
    }
  }, [isVi, reference])

  useEffect(() => { void loadStatus() }, [loadStatus])

  const holdActive = receipt ? Date.parse(receipt.expiresAt) > Date.now() : false
  const view: View = loading ? 'loading'
    : error || !receipt ? 'error'
    : receipt.status === 'confirmed' && receipt.paymentStatus === 'paid' ? 'confirmed'
    : receipt.status === 'payment_review' ? 'review'
    : receipt.status !== 'awaiting_payment' || !holdActive ? 'expired'
    : returnState === 'cancelled' || returnState === 'failed' || receipt.paymentStatus === 'failed' || receipt.paymentStatus === 'not_started' ? 'retry'
    : 'waiting'

  // After a gateway redirect the confirmation usually lands within seconds; poll briefly.
  useEffect(() => {
    if (view !== 'waiting' || polls.current >= POLL_LIMIT) return
    const timer = setTimeout(() => { polls.current += 1; void loadStatus() }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [view, receipt, loadStatus])

  if (view === 'loading') return <div className="flex min-h-screen items-center justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-violet-700" /></div>

  const copy = {
    confirmed: { icon: <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />, title: isVi ? 'Thanh toán thành công' : 'Payment confirmed', body: isVi ? 'Cabin của bạn đã được xác nhận.' : 'Your cabin is now confirmed.' },
    waiting: { icon: <Clock3 className="mx-auto h-16 w-16 text-violet-500" />, title: isVi ? 'Đang chờ xác nhận thanh toán' : 'Confirming your payment', body: isVi ? 'Hệ thống đang chờ kết quả từ cổng thanh toán, thường chỉ vài giây. Trang sẽ tự cập nhật.' : 'We are waiting for the payment provider, usually a few seconds. This page refreshes automatically.' },
    retry: { icon: <XCircle className="mx-auto h-16 w-16 text-amber-500" />, title: returnState === 'cancelled' ? (isVi ? 'Bạn đã hủy thanh toán' : 'Payment cancelled') : (isVi ? 'Thanh toán chưa hoàn tất' : 'Payment not completed'), body: isVi ? 'Cabin vẫn đang được giữ cho bạn. Bạn có thể chọn lại phương thức thanh toán bên dưới.' : 'Your cabin is still on hold. You can choose a payment method again below.' },
    expired: { icon: <TriangleAlert className="mx-auto h-16 w-16 text-amber-500" />, title: isVi ? 'Đã hết thời gian giữ cabin' : 'The cabin hold has expired', body: isVi ? 'Đơn chưa được thanh toán nên cabin đã được mở lại. Bạn có thể tìm chuyến và đặt lại.' : 'The order was not paid, so the cabin was released. Please search and book again.' },
    review: { icon: <Clock3 className="mx-auto h-16 w-16 text-amber-500" />, title: isVi ? 'Thanh toán đang được đối soát' : 'Payment under review', body: isVi ? 'Chúng tôi đã nhận được thông tin thanh toán nhưng cần kiểm tra thêm. Nhân viên Violette Train sẽ liên hệ bạn sớm.' : 'We received your payment details but need to check them. Violette Train staff will contact you shortly.' },
    error: { icon: <TriangleAlert className="mx-auto h-16 w-16 text-amber-500" />, title: isVi ? 'Chưa thể kiểm tra đơn' : 'Unable to verify order', body: error },
  }[view]

  return (
    <div className="min-h-screen bg-[#f7f6fa] px-4 pb-16 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-3xl border border-violet-100 bg-white p-6 text-center shadow-[0_18px_55px_rgba(45,27,78,0.08)] sm:p-9">
        {copy.icon}
        <h1 className="mt-5 font-serif text-3xl font-bold text-violet-950">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500" aria-live="polite">{copy.body}</p>

        {receipt ? (
          <div className="mt-7 rounded-2xl bg-violet-50 p-5 text-left">
            <div className="flex justify-between gap-4"><span className="text-sm text-gray-500">{isVi ? 'Mã đơn' : 'Reference'}</span><strong>{receipt.reference}</strong></div>
            {receipt.legs.map((leg) => (
              <div key={leg.legNumber} className="mt-3 border-t border-violet-100 pt-3 text-sm">
                <strong>{leg.trainNumber}</strong> · {leg.fromStation} → {leg.toStation}<br />
                <span className="text-gray-500">
                  {new Date(leg.departureAt).toLocaleString(isVi ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' })} · {leg.productName}
                </span>
              </div>
            ))}
            <div className="mt-4 flex items-end justify-between gap-4 border-t border-violet-100 pt-4"><strong>{isVi ? 'Tổng tiền' : 'Total'}</strong><strong className="text-xl text-gold-600">{formatCurrency(receipt.pricing.total)}</strong></div>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {view === 'waiting' ? <button type="button" onClick={() => { polls.current = 0; void loadStatus() }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 px-5 text-sm font-bold text-violet-800 hover:bg-violet-50"><RefreshCw className="h-4 w-4" />{isVi ? 'Kiểm tra lại' : 'Check again'}</button> : null}
          {view === 'expired' ? <Link href="/booking" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 px-5 text-sm font-bold text-violet-800 hover:bg-violet-50"><Search className="h-4 w-4" />{isVi ? 'Tìm chuyến lại' : 'Search again'}</Link> : null}
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-950 px-5 text-sm font-bold text-white"><Home className="h-4 w-4" />{isVi ? 'Về trang chủ' : 'Back home'}</Link>
        </div>
      </div>

      {view === 'retry' && receipt && token ? (
        <div className="mx-auto mt-8 max-w-2xl">
          <CheckoutStep
            order={{ reference: receipt.reference, verificationToken: token, expiresAt: receipt.expiresAt, pricing: receipt.pricing }}
            locale={locale}
          />
        </div>
      ) : null}
    </div>
  )
}
