'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, CreditCard, Globe2, Landmark, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { formatCurrency } from '@/lib/utils'

export interface CheckoutOrder {
  reference: string
  verificationToken: string
  expiresAt: string
  pricing: { subtotal: number; tax: number; total: number }
}

type PaymentMethods = {
  vnpay: boolean
  vnpayInternationalCards: boolean
  paypal: { currency: string; vndPerUnit: number; sandbox: boolean } | null
  fake: boolean
}

type Choice = 'vnpay' | 'vnpay-intcard' | 'paypal' | 'fake'

function useSecondsLeft(expiresAt: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return Math.max(Math.floor((Date.parse(expiresAt) - now) / 1000), 0)
}

export default function CheckoutStep({
  order,
  locale,
  onBack,
}: {
  order: CheckoutOrder
  locale: 'vi' | 'en'
  /** Omit on the status page, where there is no previous step to return to. */
  onBack?: () => void
}) {
  const isVi = locale === 'vi'
  const [methods, setMethods] = useState<PaymentMethods | null>(null)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const secondsLeft = useSecondsLeft(order.expiresAt)
  const expired = secondsLeft <= 0

  useEffect(() => {
    let active = true
    fetch('/api/payments/methods', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('methods'))))
      .then((data: PaymentMethods) => { if (active) setMethods(data) })
      .catch(() => { if (active) setMethods({ vnpay: false, vnpayInternationalCards: false, paypal: null, fake: false }) })
    return () => { active = false }
  }, [])

  const options = useMemo(() => {
    if (!methods) return []
    const list: Array<{ id: Choice; title: string; description: string; icon: typeof CreditCard }> = []
    const domestic = methods.vnpay ? [{
      id: 'vnpay' as const,
      title: isVi ? 'VNPay · Thẻ ATM, QR, Internet Banking' : 'VNPay · Vietnamese bank card, QR, internet banking',
      description: isVi ? 'Dành cho thẻ và tài khoản ngân hàng Việt Nam' : 'For cards and accounts issued in Vietnam',
      icon: Landmark,
    }] : []
    const international = [
      ...(methods.vnpayInternationalCards ? [{
        id: 'vnpay-intcard' as const,
        title: isVi ? 'Thẻ quốc tế Visa / Mastercard / JCB' : 'International card · Visa / Mastercard / JCB',
        description: isVi ? 'Thanh toán bằng VND qua VNPay, ngân hàng của bạn tự quy đổi' : 'Charged in VND via VNPay; your bank converts the currency',
        icon: CreditCard,
      }] : []),
      ...(methods.paypal ? [{
        id: 'paypal' as const,
        title: 'PayPal',
        description: isVi ? `Thanh toán bằng ${methods.paypal.currency} qua tài khoản PayPal hoặc thẻ` : `Pay in ${methods.paypal.currency} with your PayPal balance or card`,
        icon: Wallet,
      }] : []),
    ]
    // Guests browsing in English most likely hold foreign cards.
    list.push(...(isVi ? [...domestic, ...international] : [...international, ...domestic]))
    if (methods.fake) {
      list.push({
        id: 'fake',
        title: isVi ? 'Thanh toán mô phỏng (chỉ máy local)' : 'Simulated payment (local only)',
        description: isVi ? 'Dùng để kiểm thử, không thu tiền thật' : 'Testing only; no real charge',
        icon: Globe2,
      })
    }
    return list
  }, [methods, isVi])

  useEffect(() => {
    if (!choice && options.length) setChoice(options[0].id)
  }, [choice, options])

  const paypalEstimate = methods?.paypal
    ? Math.ceil((order.pricing.total / methods.paypal.vndPerUnit) * 100) / 100
    : null

  async function startCheckout() {
    if (!choice || expired) return
    setLoading(true)
    setError('')
    try {
      sessionStorage.setItem(`violette-order-${order.reference}`, order.verificationToken)
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: order.reference,
          verificationToken: order.verificationToken,
          provider: choice === 'vnpay-intcard' ? 'vnpay' : choice,
          method: choice === 'vnpay-intcard' ? 'intcard' : 'default',
          locale,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.redirectUrl) throw new Error(result.error || (isVi ? 'Không mở được cổng thanh toán.' : 'Unable to open checkout.'))
      window.location.assign(result.redirectUrl)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : (isVi ? 'Không mở được cổng thanh toán.' : 'Unable to open checkout.'))
      setLoading(false)
    }
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="mx-auto max-w-2xl">
      {onBack ? (
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#6f6674] hover:text-[#633671]">
          <ArrowLeft className="h-4 w-4" />
          {isVi ? 'Quay lại thông tin hành khách' : 'Back to passenger details'}
        </button>
      ) : null}

      <div className="overflow-hidden rounded-[26px] border border-[#ded8e1] bg-white shadow-[0_22px_60px_rgba(37,25,43,.1)]">
        <div className="bg-[#2b1538] px-5 py-7 text-white sm:px-8">
          <p className="text-sm text-white/60">{isVi ? 'Mã đơn giữ cabin' : 'Cabin hold reference'}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-extrabold tracking-wide">{order.reference}</h1>
            <p className={`flex items-center gap-1.5 text-sm font-bold ${secondsLeft < 180 ? 'text-rose-300' : 'text-[#edd484]'}`} aria-live="polite">
              <Clock3 className="h-4 w-4" />
              {expired
                ? (isVi ? 'Đã hết thời gian giữ cabin' : 'Cabin hold expired')
                : (isVi ? `Giữ cabin thêm ${minutes}:${seconds}` : `Cabin held for ${minutes}:${seconds}`)}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <h2 className="font-serif text-2xl font-bold text-[#2b1538]">{isVi ? 'Chọn phương thức thanh toán' : 'Choose a payment method'}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {isVi ? 'Cabin chỉ được xác nhận sau khi hệ thống nhận kết quả thanh toán hợp lệ.' : 'Your cabin is confirmed only after a verified payment notification.'}
          </p>

          <fieldset className="mt-6 space-y-3" disabled={expired}>
            <legend className="sr-only">{isVi ? 'Phương thức thanh toán' : 'Payment method'}</legend>
            {!methods ? (
              <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {isVi ? 'Đang tải phương thức thanh toán…' : 'Loading payment methods…'}</p>
            ) : options.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                {isVi
                  ? 'Thanh toán online đang được thiết lập. Vui lòng liên hệ Violette Train để hoàn tất đặt cabin này.'
                  : 'Online payment is being set up. Please contact Violette Train to complete this cabin booking.'}
              </p>
            ) : options.map((option) => (
              <PaymentOption
                key={option.id}
                name={`payment-${order.reference}`}
                checked={choice === option.id}
                onSelect={() => setChoice(option.id)}
                title={option.title}
                description={option.description}
                icon={option.icon}
                extra={option.id === 'paypal' && paypalEstimate != null
                  ? (isVi
                    ? `Số tiền PayPal: ${paypalEstimate.toFixed(2)} ${methods?.paypal?.currency} (1 ${methods?.paypal?.currency} = ${formatCurrency(methods?.paypal?.vndPerUnit)})`
                    : `PayPal amount: ${paypalEstimate.toFixed(2)} ${methods?.paypal?.currency} (1 ${methods?.paypal?.currency} = ${formatCurrency(methods?.paypal?.vndPerUnit)})`)
                  : undefined}
              />
            ))}
          </fieldset>

          <div className="mt-6 rounded-2xl border border-[#eadfcb] bg-[#fbf6e9] p-4">
            <div className="flex justify-between gap-4 text-sm text-gray-600"><span>{isVi ? 'Tiền cabin' : 'Cabin subtotal'}</span><span>{formatCurrency(order.pricing.subtotal)}</span></div>
            <div className="mt-2 flex justify-between gap-4 text-sm text-gray-600"><span>{isVi ? 'Thuế' : 'Tax'}</span><span>{formatCurrency(order.pricing.tax)}</span></div>
            <div className="mt-3 flex items-end justify-between gap-4 border-t border-[#e5d5b4] pt-3">
              <span className="font-extrabold text-[#2b1538]">{isVi ? 'Tổng thanh toán' : 'Total'}</span>
              <span className="text-2xl font-black text-[#9a6d13]">{formatCurrency(order.pricing.total)}</span>
            </div>
          </div>

          {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

          <button
            type="button"
            onClick={startCheckout}
            disabled={loading || expired || !choice}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#2b1538] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(43,21,56,.18)] hover:bg-[#44224f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading
              ? (isVi ? 'Đang mở cổng thanh toán…' : 'Opening checkout…')
              : choice === 'paypal' ? (isVi ? 'Thanh toán với PayPal' : 'Pay with PayPal') : (isVi ? 'Thanh toán ngay' : 'Pay now')}
          </button>
          {expired ? (
            <Link href="/booking" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-[#ded8e1] text-sm font-bold text-[#2b1538] hover:bg-[#f6f0f7]">
              {isVi ? 'Tìm chuyến lại' : 'Search again'}
            </Link>
          ) : null}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {isVi ? 'Số tiền được xác minh lại trên máy chủ.' : 'The amount is revalidated on the server.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function PaymentOption({ name, checked, onSelect, title, description, icon: Icon, extra }: {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  description: string
  icon: typeof CreditCard
  extra?: string
}) {
  return (
    <label className={`flex min-h-18 cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#754382] ${checked ? 'border-[#754382] bg-[#f6f0f7]' : 'border-[#ded8e1] hover:border-[#bca9c1]'}`}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="h-5 w-5 shrink-0 accent-[#633671]" />
      <Icon className="h-6 w-6 shrink-0 text-[#633671]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-extrabold text-[#2b1538]">{title}</span>
        <span className="mt-0.5 block text-xs text-[#756d79]">{description}</span>
        {extra ? <span className="mt-1 block text-xs font-semibold text-[#633671]">{extra}</span> : null}
      </span>
    </label>
  )
}
