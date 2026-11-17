'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, Landmark, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CalendarDeparture,
  DSVN_FARE_PAGE,
  DsvnFareRow,
  dsvnCabinBase,
  formatMoney,
  marginAgainstDsvn,
} from './schedule-utils'

function range(min: number | null, max: number | null) {
  if (!min) return '—'
  return max && max !== min ? `${formatMoney(min)} – ${formatMoney(max)}` : formatMoney(min)
}

/**
 * DSVN reference ("giá cơ sở") next to the Violette price: what the same
 * 4-berth compartment costs from DSVN that day, and the live margin while the
 * admin types a new price.
 */
export default function DsvnBase({ departure, ticketPrice }: { departure: CalendarDeparture; ticketPrice: number | null }) {
  const fare = departure.dsvnFare
  const base = dsvnCabinBase(fare)
  const margin = marginAgainstDsvn(ticketPrice, fare)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<DsvnFareRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggleDetails() {
    const next = !open
    setOpen(next)
    if (next && !rows) {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/schedule-calendar/fares?departureId=${departure.id}`, { cache: 'no-store' })
        const result = await response.json()
        setRows(response.ok ? result.fares : [])
      } finally {
        setLoading(false)
      }
    }
  }

  if (!fare || !base) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="flex items-center gap-2 font-semibold text-slate-700"><Landmark className="h-4 w-4" /> Giá cơ sở DSVN</p>
        <p className="mt-1">Chưa có giá DSVN cho tàu {departure.trainNumber} ngày này.</p>
        <a href={DSVN_FARE_PAGE} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-violet-700 underline-offset-2 hover:underline">
          Tra giá trên trang DSVN <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    )
  }

  return (
    <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-slate-700" aria-label="Giá cơ sở DSVN">
      <p className="flex items-center gap-2 font-bold text-sky-950"><Landmark className="h-4 w-4" /> Giá cơ sở DSVN · khoang 4 giường</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block"><dt className="text-slate-500">Giường tầng 1</dt><dd className="font-semibold tabular-nums">{range(fare.lowerMin, fare.lowerMax)}</dd></div>
        <div className="flex justify-between gap-3 sm:block"><dt className="text-slate-500">Giường tầng 2</dt><dd className="font-semibold tabular-nums">{range(fare.upperMin, fare.upperMax)}</dd></div>
      </dl>
      <p className="mt-3 rounded-xl bg-white px-3 py-2">
        Mua trọn 1 khoang (2 tầng 1 + 2 tầng 2) từ <strong className="tabular-nums">{formatMoney(base.cabin)}</strong>
        {' '}≈ <strong className="tabular-nums">{formatMoney(base.perTicket)}</strong>/vé
      </p>
      {margin ? (
        <p className={cn(
          'mt-2 rounded-xl px-3 py-2 font-semibold',
          margin.perTicket < 0 ? 'bg-rose-100 text-rose-900' : margin.percent < 10 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
        )} aria-live="polite">
          {margin.perTicket < 0
            ? `Giá bán đang THẤP hơn giá DSVN ${formatMoney(-margin.perTicket)}/vé (${margin.percent}%).`
            : `Giá bán cao hơn giá DSVN ${formatMoney(margin.perTicket)}/vé (+${margin.percent}%) · ${formatMoney(margin.perCabin)}/cabin.`}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Giá DSVN đã gồm bảo hiểm và VAT
          {fare.fetchedAt ? ` · cập nhật ${new Date(fare.fetchedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}` : ''}
        </span>
        <button type="button" onClick={toggleDetails} aria-expanded={open} className="inline-flex min-h-11 items-center gap-1 font-semibold text-sky-800 hover:underline">
          {open ? 'Ẩn bảng giá đầy đủ' : 'Xem mọi loại chỗ'} <ChevronDown className={cn('h-4 w-4', open && 'rotate-180')} />
        </button>
      </div>
      {open ? (
        loading ? (
          <p className="mt-2 flex items-center gap-2 text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải…</p>
        ) : rows && rows.length ? (
          <table className="mt-2 w-full overflow-hidden rounded-xl bg-white text-xs">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th scope="col" className="px-3 py-2">Loại chỗ</th><th scope="col" className="px-3 py-2">Mã</th><th scope="col" className="px-3 py-2 text-right">Giá DSVN</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.seatCode}><td className="px-3 py-1.5">{row.seatName}</td><td className="px-3 py-1.5 text-slate-500">{row.seatCode}</td><td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatMoney(row.fare)}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-slate-500">Không có dữ liệu chi tiết.</p>
        )
      ) : null}
    </section>
  )
}
