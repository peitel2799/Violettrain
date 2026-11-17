'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock3, LoaderCircle, Lock, Save, TrainFront } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, Notice, SaleChoice, SaleStatusPicker, Stepper, TicketPriceField } from './controls'
import DsvnBase from './DsvnBase'
import {
  ApiError,
  arrivalDayText,
  CalendarDeparture,
  displayStatus,
  formatFullDate,
  formatMoney,
  isDeparted,
  Permissions,
  postSchedule,
  productOf,
  remainingCabins,
  STATUS_META,
  UpdatePayload,
} from './schedule-utils'

type Props = {
  date: string | null
  routeName: string
  departures: CalendarDeparture[]
  permissions: Permissions
  suggestions: number[]
  now: number
  onClose: () => void
  onSaved: (message: string) => Promise<void> | void
  onConflict: (message: string) => Promise<void> | void
}

export default function DayPanel({
  date,
  routeName,
  departures,
  permissions,
  suggestions,
  now,
  onClose,
  onSaved,
  onConflict,
}: Props) {
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set())
  const [confirmClose, setConfirmClose] = useState(false)

  function requestClose() {
    if (dirtyIds.size > 0 && !confirmClose) {
      setConfirmClose(true)
      return
    }
    setConfirmClose(false)
    setDirtyIds(new Set())
    onClose()
  }

  const markDirty = useCallback((id: number, dirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === dirty) return current
      const next = new Set(current)
      if (dirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  return (
    <Dialog
      open={Boolean(date)}
      onClose={requestClose}
      variant="drawer"
      title={date ? formatFullDate(date) : ''}
      description={routeName}
      footer={
        confirmClose ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm font-semibold text-amber-800">Bạn có thay đổi chưa lưu. Đóng mà không lưu?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmClose(false)} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Ở lại</button>
              <button type="button" onClick={requestClose} className="h-11 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700">Đóng, bỏ thay đổi</button>
            </div>
          </div>
        ) : null
      }
    >
      {departures.length === 0 ? (
        <div className="py-10 text-center">
          <TrainFront className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-800">DSVN chưa có chuyến nào ngày này</p>
          <p className="mt-1 text-sm text-slate-500">Lịch tàu tự cập nhật từ DSVN lúc 4 giờ sáng mỗi ngày.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {departures.map((departure) => (
            <DepartureEditor
              key={`${departure.id}-${departure.version}`}
              departure={departure}
              permissions={permissions}
              suggestions={suggestions}
              now={now}
              onDirty={markDirty}
              onSaved={async (message) => { markDirty(departure.id, false); setConfirmClose(false); await onSaved(message) }}
              onConflict={onConflict}
            />
          ))}
        </div>
      )}
    </Dialog>
  )
}

function DepartureEditor({
  departure,
  permissions,
  suggestions,
  now,
  onDirty,
  onSaved,
  onConflict,
}: {
  departure: CalendarDeparture
  permissions: Permissions
  suggestions: number[]
  now: number
  onDirty: (id: number, dirty: boolean) => void
  onSaved: (message: string) => Promise<void> | void
  onConflict: (message: string) => Promise<void> | void
}) {
  const standard = productOf(departure, 'standard')
  const premium = productOf(departure, 'premium')
  const isSe19 = departure.trainNumber === 'SE19'
  const departed = isDeparted(departure, now)
  const cancelled = departure.status === 'cancelled'
  const initialStatus: SaleChoice = departure.status === 'draft' ? 'draft' : 'published'

  const initial = {
    status: initialStatus,
    price: standard?.ticketPrice ?? null,
    capacity: standard?.capacity ?? 0,
    vip2On: (premium?.capacity ?? 0) > 0,
    vip2Price: premium?.ticketPrice ?? null,
  }
  const [status, setStatus] = useState<SaleChoice>(initial.status)
  const [price, setPrice] = useState<number | null>(initial.price)
  const [capacity, setCapacity] = useState(initial.capacity)
  const [vip2On, setVip2On] = useState(initial.vip2On)
  const [vip2Price, setVip2Price] = useState<number | null>(initial.vip2Price)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const changes: UpdatePayload = {}
  if (status !== initial.status) changes.status = status
  if (price !== initial.price && price != null) changes.standardTicketPriceVnd = price
  if (capacity !== initial.capacity) changes.standardCapacity = capacity
  if (isSe19 && vip2On !== initial.vip2On) changes.vip2Capacity = vip2On ? 1 : 0
  if (isSe19 && vip2On && vip2Price !== initial.vip2Price && vip2Price != null) changes.vip2TicketPriceVnd = vip2Price
  const dirty = Object.keys(changes).length > 0
  const priceMissing = status === 'published' && !price
  const vip2PriceMissing = isSe19 && vip2On && !vip2Price
  const readOnly = departed || cancelled || (!permissions.canOperate && !permissions.canPrice)

  useEffect(() => { onDirty(departure.id, dirty) }, [onDirty, departure.id, dirty])

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setError('')
    }
  }

  async function save() {
    if (!dirty) return
    setSaving(true)
    setError('')
    try {
      await postSchedule({ action: 'update', items: [{ id: departure.id, version: departure.version }], ...changes })
      await onSaved(`Đã lưu chuyến tàu ${departure.trainNumber}.`)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không lưu được.'
      if (caught instanceof ApiError && caught.conflict) await onConflict(message)
      else setError(message)
    } finally {
      setSaving(false)
    }
  }

  const shown = displayStatus(departure, now)
  const meta = STATUS_META[shown]

  return (
    <section className={cn('rounded-3xl border p-4 sm:p-5', dirty ? 'border-violet-300 bg-violet-50/30 shadow-sm' : 'border-slate-200 bg-white')} aria-label={`Tàu ${departure.trainNumber}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <TrainFront className="h-5 w-5 text-violet-700" /> Tàu {departure.trainNumber}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Clock3 className="h-4 w-4" /> Đi {departure.departureTime} → đến {departure.arrivalTime} ({arrivalDayText(departure.arrivalDayOffset)})
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {departure.source === 'dsvn' ? 'Tàu và giờ chạy theo lịch DSVN' : 'Chuyến tạo tay trước đây, không có trong lịch DSVN'}
          </p>
          {departure.projected ? (
            <p className="mt-1.5 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              Lịch dự kiến: DSVN chưa mở bán ngày này, chưa có giá vé DSVN
            </p>
          ) : null}
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset', meta.chip)}>
          <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden="true" /> {meta.label}
        </span>
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 px-2 py-2.5">
          <dt className="text-xs text-slate-500">Đã bán</dt>
          <dd className="text-lg font-extrabold tabular-nums text-slate-900">{standard?.sold ?? 0}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 px-2 py-2.5">
          <dt className="text-xs text-slate-500">Đang giữ chỗ</dt>
          <dd className="text-lg font-extrabold tabular-nums text-slate-900">{standard?.held ?? 0}</dd>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-2 py-2.5">
          <dt className="text-xs text-emerald-700">Còn trống</dt>
          <dd className="text-lg font-extrabold tabular-nums text-emerald-800">{remainingCabins(standard)}</dd>
        </div>
      </dl>

      <DsvnBase departure={departure} ticketPrice={price} />

      {departed ? (
        <div className="mt-4">
          <Notice><Lock className="mr-1 inline h-4 w-4" /> Chuyến đã khởi hành nên chỉ xem được. Giá đã bán: {formatMoney(standard?.ticketPrice)}/vé.</Notice>
        </div>
      ) : cancelled ? (
        <div className="mt-4">
          <Notice tone="warning"><Lock className="mr-1 inline h-4 w-4" /> DSVN không chạy chuyến này nên web không bán. Nếu DSVN chạy lại, lịch sẽ tự mở lại ở lần cập nhật kế tiếp.</Notice>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <TicketPriceField
            id={`price-${departure.id}`}
            label="Giá 1 vé"
            value={price}
            onChange={update(setPrice)}
            suggestions={suggestions}
            disabled={!permissions.canPrice}
          />

          {permissions.canOperate ? (
            <SaleStatusPicker
              name={`status-${departure.id}`}
              value={status}
              onChange={update(setStatus)}
            />
          ) : null}

          {permissions.canOperate ? (
            <Stepper
              id={`capacity-${departure.id}`}
              label="Số cabin mở bán"
              value={capacity}
              onChange={update(setCapacity)}
              min={(standard?.sold ?? 0) + (standard?.held ?? 0)}
              max={100}
              hint={(standard?.sold ?? 0) + (standard?.held ?? 0) > 0 ? `Không giảm được dưới ${(standard?.sold ?? 0) + (standard?.held ?? 0)} vì đã có khách đặt/giữ chỗ.` : 'Mỗi cabin gồm 4 vé, khách mua trọn cabin.'}
            />
          ) : null}

          {isSe19 ? (
            <div className="rounded-2xl border border-gold-300 bg-[#fffaf0] p-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={vip2On}
                  disabled={!permissions.canOperate || (premium?.sold ?? 0) + (premium?.held ?? 0) > 0}
                  onChange={(event) => update(setVip2On)(event.target.checked)}
                  className="h-5 w-5 accent-violet-700"
                />
                Bán cabin VIP2 (chỉ tàu SE19, tối đa 1 cabin)
              </label>
              {vip2On ? (
                <div className="mt-3">
                  <TicketPriceField id={`vip2-${departure.id}`} label="Giá 1 vé VIP2" value={vip2Price} onChange={update(setVip2Price)} disabled={!permissions.canPrice} />
                </div>
              ) : null}
            </div>
          ) : null}

          {priceMissing ? <Notice tone="warning">Muốn mở bán thì cần nhập giá 1 vé.</Notice> : null}
          {vip2PriceMissing ? <Notice tone="warning">Hãy nhập giá 1 vé VIP2.</Notice> : null}
          {error ? <div role="alert"><Notice tone="error">{error}</Notice></div> : null}

          {!readOnly ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving || priceMissing || vip2PriceMissing || (price != null && price < 10_000)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 text-base font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {saving ? 'Đang lưu…' : dirty ? 'Lưu thay đổi' : 'Chưa có thay đổi'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
