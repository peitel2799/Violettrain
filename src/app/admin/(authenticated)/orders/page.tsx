'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Check,
  CircleAlert,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  TrainFront,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatWhatsapp, whatsappLink } from '@/lib/whatsapp'

interface OnlineOrder {
  id: string
  public_reference: string
  status: string
  payment_status: string
  payment_channel: 'online' | 'manual_paypal'
  contact_email: string
  contact_phone: string
  contact_whatsapp: string | null
  lead_guest: string | null
  guest_count: number
  booking_email_sent_at: string | null
  payment_email_sent_at: string | null
  cancellation_reason: string | null
  total_vnd: number
  price_expires_at: string
  created_at: string
  legs: Array<{ leg_number: number; train_number: string; from_station_name_vi: string; to_station_name_vi: string; departure_at: string; product_name_vi: string }>
  payments: Array<{ provider: string; status: string; provider_transaction_id?: string }>
}

type Role = 'admin' | 'operations' | 'pricing' | 'support'
type Notice = { tone: 'success' | 'error'; text: string }

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const statusLabel: Record<string, string> = {
  awaiting_payment: 'Chờ thanh toán', confirmed: 'Đã xác nhận', completed: 'Hoàn thành',
  expired: 'Hết hạn', cancelled: 'Đã hủy', payment_review: 'Cần đối soát',
  refund_pending: 'Chờ hoàn tiền', refunded: 'Đã hoàn tiền',
}
const statusStyle: Record<string, string> = {
  awaiting_payment: 'bg-amber-50 text-amber-800 ring-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  expired: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  payment_review: 'bg-orange-50 text-orange-800 ring-orange-200',
}

/** Each tab is a group of order statuses, so all 8 statuses fit in 5 tabs. */
const TABS = [
  { key: 'all', label: 'Tất cả', statuses: '' },
  { key: 'action', label: 'Cần xử lý', statuses: 'awaiting_payment,payment_review' },
  { key: 'confirmed', label: 'Đã xác nhận', statuses: 'confirmed,completed' },
  { key: 'closed', label: 'Hủy / hết hạn', statuses: 'cancelled,expired' },
  { key: 'refund', label: 'Hoàn tiền', statuses: 'refund_pending,refunded' },
] as const
type TabKey = (typeof TABS)[number]['key']

function vnTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrder[]>([])
  const [role, setRole] = useState<Role | null>(null)
  const [tab, setTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [actionCount, setActionCount] = useState<number | null>(null)
  const [limited, setLimited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const requestId = useRef(0)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const statuses = TABS.find((item) => item.key === tab)?.statuses ?? ''
      const query = new URLSearchParams({ status: statuses, search: search.trim() })
      const response = await fetch(`/api/admin/orders?${query}`, { cache: 'no-store' })
      if (response.status === 401) {
        window.location.assign('/admin/login')
        return
      }
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Không thể tải đơn')
      // Typing fast fires several requests; only the newest one may update the list.
      if (id !== requestId.current) return
      setOrders(result.orders || [])
      setRole(result.viewer?.role ?? null)
      setActionCount(typeof result.actionCount === 'number' ? result.actionCount : null)
      setLimited(Boolean(result.limited))
    } catch (loadError) {
      if (id === requestId.current) setError(loadError instanceof Error ? loadError.message : 'Không thể tải đơn')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [search, tab])

  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer) }, [load])

  // Staff often wait for a PayPal transfer in another tab: refresh when they come back.
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible') void loadRef.current() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])

  function showNotice(next: Notice | null) {
    setNotice(next)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    if (next) noticeTimer.current = setTimeout(() => setNotice(null), next.tone === 'error' ? 10_000 : 6000)
  }

  async function act(payload: Record<string, unknown>) {
    showNotice(null)
    const response = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.status === 401) {
      window.location.assign('/admin/login')
      return false
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      showNotice({ tone: 'error', text: result.error || 'Không thực hiện được thao tác.' })
      return false
    }
    showNotice({ tone: result.emailSent === false ? 'error' : 'success', text: result.message || 'Đã lưu.' })
    await load()
    return true
  }

  const canManage = role === 'admin' || role === 'operations'
  const canContact = canManage || role === 'support'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-600">Bán vé trực tuyến</p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-violet-950">Đơn và thanh toán</h1>
            <p className="mt-2 text-sm text-slate-500">
              Khách chuyển khoản qua PayPal. Khi thấy tiền về tài khoản PayPal, bấm <strong>“Đã nhận tiền”</strong> ở đơn tương ứng.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Lọc đơn theo trạng thái">
            {TABS.map((item) => {
              const selected = item.key === tab
              const badge = item.key === 'action' && actionCount ? actionCount : null
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTab(item.key)}
                  className={cn(
                    'flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold',
                    selected ? 'border-violet-700 bg-violet-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50'
                  )}
                >
                  {item.label}
                  {badge ? (
                    <span className={cn('min-w-6 rounded-full px-1.5 py-0.5 text-xs tabular-nums', selected ? 'bg-white text-violet-800' : 'bg-amber-400 text-amber-950')}>{badge}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <label className="relative mt-3 block">
            <span className="sr-only">Tìm đơn</span>
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={canContact ? 'Tìm theo mã đơn, tên khách, email, số điện thoại hoặc WhatsApp' : 'Tìm theo mã đơn, email hoặc số điện thoại'}
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-10 text-sm outline-none focus:border-violet-500"
            />
            {search ? (
              <button type="button" aria-label="Xóa ô tìm" onClick={() => setSearch('')} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </div>

        {error ? (
          <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="h-10 rounded-lg bg-white px-3 font-bold ring-1 ring-red-200">Thử lại</button>
          </div>
        ) : null}

        {!error ? (
          <p className="mt-4 text-sm text-slate-500" aria-live="polite">
            {loading && !orders.length ? 'Đang tải đơn…' : `${orders.length} đơn${search.trim() ? ` khớp “${search.trim()}”` : ''}`}
            {limited ? ' · Chỉ hiện 200 đơn mới nhất, dùng ô tìm kiếm để tìm đơn cũ hơn.' : ''}
          </p>
        ) : null}

        <div className="mt-3 space-y-3">
          {!loading && !error && orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
              {tab === 'action' && !search.trim() ? 'Không còn đơn nào cần xử lý.' : 'Chưa có đơn phù hợp.'}
              {tab !== 'all' || search.trim() ? (
                <button type="button" onClick={() => { setTab('all'); setSearch('') }} className="mt-3 block w-full font-bold text-violet-700 hover:underline">
                  Xem tất cả đơn
                </button>
              ) : null}
            </div>
          ) : null}
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} canManage={canManage} canContact={canContact} onAct={act} />
          ))}
        </div>
      </div>

      {/* Fixed so the result of an action is visible even on an order far down the list. */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 lg:left-64" aria-live="polite" role="status">
        {notice ? (
          <div className={cn('pointer-events-auto flex max-w-xl items-start gap-3 rounded-2xl px-5 py-4 text-sm font-semibold shadow-xl', notice.tone === 'success' ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-white')}>
            {notice.tone === 'success' ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />}
            <span>{notice.text}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => showNotice(null)} className="-mr-2 -mt-1 rounded-lg p-1 opacity-80 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked: the text is still selectable */ }
  }
  return (
    <button type="button" onClick={() => void copy()} aria-label={copied ? 'Đã sao chép' : label} title={copied ? 'Đã sao chép' : label} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-violet-700">
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function OrderCard({ order, canManage, canContact, onAct }: {
  order: OnlineOrder
  canManage: boolean
  canContact: boolean
  onAct: (payload: Record<string, unknown>) => Promise<boolean>
}) {
  const [panel, setPanel] = useState<'confirm' | 'cancel' | null>(null)
  const [paypalReference, setPaypalReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const firstLeg = order.legs?.find((leg) => leg.leg_number === 1) || order.legs?.[0]
  const payment = order.payments?.[0]
  const manual = order.payment_channel === 'manual_paypal'
  const unpaid = order.status === 'awaiting_payment' || order.status === 'expired'
  const holdLapsed = Date.parse(order.price_expires_at) <= Date.now()

  async function run(kind: string, payload: Record<string, unknown>) {
    setBusy(kind)
    const ok = await onAct(payload)
    setBusy(null)
    if (ok) setPanel(null)
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[190px_1fr_230px_170px] lg:items-start">
        <div>
          <p className="flex items-center gap-1 font-extrabold text-violet-950">
            {order.public_reference}
            <CopyButton text={order.public_reference} label={`Sao chép mã đơn ${order.public_reference}`} />
          </p>
          <p className="text-xs text-slate-400">Đặt lúc {vnTime(order.created_at)}</p>
          <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle[order.status] ?? 'bg-violet-50 text-violet-700 ring-violet-200'}`}>{statusLabel[order.status] || order.status}</span>
        </div>

        <div className="min-w-0">
          {order.lead_guest ? (
            <p className="flex items-center gap-2 text-base font-bold text-slate-900">
              <UserRound className="h-4 w-4 shrink-0 text-violet-600" />
              <span className="truncate">{order.lead_guest}</span>
              {order.guest_count > 1 ? <span className="shrink-0 text-sm font-semibold text-slate-500">+{order.guest_count - 1} khách</span> : null}
            </p>
          ) : null}
          {firstLeg ? <>
            <p className={cn('flex items-center gap-2 font-semibold text-slate-800', order.lead_guest && 'mt-2 text-sm')}><TrainFront className="h-4 w-4 shrink-0 text-violet-600" />{firstLeg.train_number} · {firstLeg.from_station_name_vi} → {firstLeg.to_station_name_vi}{order.legs.length > 1 ? ' (khứ hồi)' : ''}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Clock3 className="h-4 w-4 shrink-0" />{vnTime(firstLeg.departure_at)} · {firstLeg.product_name_vi}</p>
          </> : null}
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
            <span className="break-all">{order.contact_email}</span>
            {canContact ? <CopyButton text={order.contact_email} label="Sao chép email" /> : null}
          </p>
          {order.contact_whatsapp ? (
            canContact && order.contact_whatsapp.startsWith('+') ? (
              <a href={whatsappLink(order.contact_whatsapp, `Violette Train - ${order.public_reference}`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#effcf4] px-3 text-sm font-bold text-[#128c4a] ring-1 ring-[#25d366]/40 hover:bg-[#e2f9eb]">
                <MessageCircle className="h-4 w-4" /> WhatsApp {formatWhatsapp(order.contact_whatsapp)}
              </a>
            ) : <p className="mt-1 text-xs text-slate-400">WhatsApp {order.contact_whatsapp}</p>
          ) : null}
          {order.cancellation_reason ? <p className="mt-2 text-xs text-rose-700">Lý do hủy: {order.cancellation_reason}</p> : null}
        </div>

        <div className="text-sm">
          {manual ? (
            <>
              <p className="flex items-center gap-2 font-bold text-[#003087]"><CreditCard className="h-4 w-4" />Chuyển khoản PayPal</p>
              {order.status === 'awaiting_payment' ? (
                <p className={`mt-1 text-xs ${holdLapsed ? 'font-bold text-rose-700' : 'text-slate-500'}`}>
                  {holdLapsed ? 'Đã quá hạn giữ cabin' : 'Giữ cabin đến'} {vnTime(order.price_expires_at)}
                </p>
              ) : null}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                {order.booking_email_sent_at ? `Đã gửi email hướng dẫn ${vnTime(order.booking_email_sent_at)}` : 'Chưa gửi được email hướng dẫn'}
              </p>
              {order.payment_email_sent_at ? <p className="mt-1 text-xs text-emerald-700">Đã gửi email xác nhận {vnTime(order.payment_email_sent_at)}</p> : null}
            </>
          ) : (
            <p className="flex items-center gap-2 font-bold text-slate-700"><CreditCard className="h-4 w-4 text-violet-600" />{payment?.provider?.toUpperCase() || 'Chưa chọn cổng'}</p>
          )}
          {payment?.provider_transaction_id ? <p className="mt-1 truncate text-xs text-slate-400">Mã giao dịch: {payment.provider_transaction_id}</p> : null}
        </div>

        <p className="text-xl font-extrabold text-gold-600 lg:text-right">{currency.format(order.total_vnd)}</p>
      </div>

      {manual && (canManage || canContact) ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {canManage && unpaid ? (
            <button type="button" aria-expanded={panel === 'confirm'} onClick={() => setPanel(panel === 'confirm' ? null : 'confirm')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Đã nhận tiền
            </button>
          ) : null}
          {canContact && order.status !== 'cancelled' ? (
            <button type="button" disabled={busy !== null} onClick={() => void run('email', { action: 'resend-email', reference: order.public_reference })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {busy === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Gửi lại email
            </button>
          ) : null}
          {canManage && unpaid ? (
            <button type="button" aria-expanded={panel === 'cancel'} onClick={() => setPanel(panel === 'cancel' ? null : 'cancel')} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-rose-700 hover:bg-rose-50">
              <XCircle className="h-4 w-4" /> Hủy đơn
            </button>
          ) : null}
        </div>
      ) : null}

      {panel === 'confirm' ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm font-bold text-emerald-900">Xác nhận đã nhận {currency.format(order.total_vnd)} qua PayPal cho đơn {order.public_reference}?</p>
          <p className="mt-1 text-xs text-emerald-800">Kiểm tra trong tài khoản PayPal rằng tiền đã về và ghi chú có mã đơn. Sau khi xác nhận, khách nhận email “đã xác nhận đặt chỗ”.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Mã giao dịch PayPal (không bắt buộc)
              <input value={paypalReference} onChange={(event) => setPaypalReference(event.target.value)} maxLength={80} placeholder="VD: 5TY12345AB678901C" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-500" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Ghi chú (không bắt buộc)
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="VD: Khách chuyển 340 USD" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-emerald-500" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => void run('confirm', { action: 'confirm-payment', reference: order.public_reference, paypalReference, note })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Xác nhận đã nhận tiền
            </button>
            <button type="button" onClick={() => setPanel(null)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Đóng</button>
          </div>
        </div>
      ) : null}

      {panel === 'cancel' ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-sm font-bold text-rose-900">Hủy đơn {order.public_reference} và mở bán lại cabin?</p>
          <label className="mt-3 block text-sm font-semibold text-slate-700">Lý do (không bắt buộc)
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="VD: Khách không chuyển khoản / khách đổi kế hoạch" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-rose-500" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => void run('cancel', { action: 'cancel', reference: order.public_reference, reason: note })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
              {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Hủy đơn
            </button>
            <button type="button" onClick={() => setPanel(null)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Đóng</button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
