'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, Notice, SaleChoice, SaleStatusPicker, Stepper, TicketPriceField } from './controls'
import {
  ApiError,
  CalendarDeparture,
  formatDayMonth,
  formatMoney,
  Permissions,
  postSchedule,
  productOf,
  STATUS_META,
  UpdatePayload,
  WEEKDAY_SHORT,
  weekdayIndex,
} from './schedule-utils'

export type BulkMode = 'price' | 'status' | 'capacity'

type Props = {
  open: boolean
  mode: BulkMode
  departures: CalendarDeparture[]
  dayCount: number
  permissions: Permissions
  suggestions: number[]
  onClose: () => void
  onSaved: (message: string) => Promise<void> | void
  onConflict: (message: string) => Promise<void> | void
}

export default function BulkEditDialog({ open, mode, departures, dayCount, permissions, suggestions, onClose, onSaved, onConflict }: Props) {
  const [changePrice, setChangePrice] = useState(false)
  const [price, setPrice] = useState<number | null>(null)
  const [changeStatus, setChangeStatus] = useState(false)
  const [status, setStatus] = useState<SaleChoice>('published')
  const [changeCapacity, setChangeCapacity] = useState(false)
  const [capacity, setCapacity] = useState(4)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset the form each time the dialog opens, focused on the action that opened it.
  useEffect(() => {
    if (!open) return
    const prices = departures.map((departure) => productOf(departure, 'standard')?.ticketPrice).filter(Boolean) as number[]
    const capacities = departures.map((departure) => productOf(departure, 'standard')?.capacity ?? 0)
    setChangePrice(mode === 'price')
    setChangeStatus(mode === 'status')
    setChangeCapacity(mode === 'capacity')
    setPrice(prices.length && prices.every((value) => value === prices[0]) ? prices[0] : null)
    setCapacity(capacities.length ? Math.max(...capacities) : 4)
    setStatus('published')
    setReason('')
    setError('')
  }, [open, mode, departures])

  const minCapacity = Math.max(0, ...departures.map((departure) => {
    const standard = productOf(departure, 'standard')
    return (standard?.sold ?? 0) + (standard?.held ?? 0)
  }))

  const payload: UpdatePayload = {}
  if (changePrice && price) payload.standardTicketPriceVnd = price
  if (changeStatus) payload.status = status
  if (changeCapacity) payload.standardCapacity = capacity
  if (reason.trim()) payload.reason = reason.trim()
  const hasChange = Boolean(payload.standardTicketPriceVnd || payload.status || payload.standardCapacity != null)
  const invalidPrice = changePrice && (!price || price < 10_000)

  const preview = useMemo(() => departures.slice(0, 60), [departures])

  async function save() {
    if (!hasChange || invalidPrice) return
    setSaving(true)
    setError('')
    try {
      const result = await postSchedule<{ updated: number }>({
        action: 'update',
        items: departures.map((departure) => ({ id: departure.id, version: departure.version })),
        ...payload,
      })
      await onSaved(`Đã cập nhật ${result.updated} chuyến trong ${dayCount} ngày.`)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không lưu được.'
      if (caught instanceof ApiError && caught.conflict) await onConflict(message)
      else setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Sửa ${departures.length} chuyến đã chọn`}
      description={`${dayCount} ngày được chọn. Chỉ những mục bạn đánh dấu mới bị thay đổi.`}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
          <button
            type="button"
            onClick={save}
            disabled={!hasChange || invalidPrice || saving}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 text-base font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
            {saving ? 'Đang lưu…' : `Lưu cho ${departures.length} chuyến`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {permissions.canPrice ? (
          <Section title="Đổi giá vé" checked={changePrice} onChange={setChangePrice}>
            <TicketPriceField id="bulk-price" label="Giá 1 vé mới" value={price} onChange={setPrice} suggestions={suggestions} />
          </Section>
        ) : null}

        {permissions.canOperate ? (
          <Section title="Mở bán / tạm ngưng bán trên web" checked={changeStatus} onChange={setChangeStatus}>
            <SaleStatusPicker name="bulk-status" value={status} onChange={setStatus} />
          </Section>
        ) : null}

        {permissions.canOperate ? (
          <Section title="Đổi số cabin mở bán" checked={changeCapacity} onChange={setChangeCapacity}>
            <Stepper
              id="bulk-capacity"
              label="Số cabin cho mỗi chuyến"
              value={capacity}
              onChange={setCapacity}
              min={minCapacity}
              hint={minCapacity > 0 ? `Tối thiểu ${minCapacity} vì có chuyến đã có khách đặt/giữ chỗ.` : 'Mỗi cabin gồm 4 vé.'}
            />
          </Section>
        ) : null}

        <div>
          <label htmlFor="bulk-reason" className="mb-2 block text-sm font-semibold text-slate-700">Ghi chú (không bắt buộc)</label>
          <input
            id="bulk-reason"
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: Tăng giá dịp Tết Dương lịch"
            className="h-12 w-full rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
          />
        </div>

        {error ? <div role="alert"><Notice tone="error">{error}</Notice></div> : null}

        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-700">Xem trước thay đổi</h3>
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2">Ngày</th>
                  <th scope="col" className="px-3 py-2">Tàu</th>
                  <th scope="col" className="px-3 py-2">Giá 1 vé</th>
                  <th scope="col" className="px-3 py-2">Bán vé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((departure) => {
                  const standard = productOf(departure, 'standard')
                  const priceChanged = Boolean(payload.standardTicketPriceVnd) && payload.standardTicketPriceVnd !== standard?.ticketPrice
                  const statusChanged = Boolean(payload.status) && payload.status !== departure.status
                  return (
                    <tr key={departure.id}>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">{WEEKDAY_SHORT[weekdayIndex(departure.serviceDate)]} {formatDayMonth(departure.serviceDate)}</td>
                      <td className="px-3 py-2">{departure.trainNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        <span className={cn(priceChanged && 'text-slate-400 line-through')}>{formatMoney(standard?.ticketPrice)}</span>
                        {priceChanged ? <><ArrowRight className="mx-1 inline h-3.5 w-3.5" aria-label="thành" /><strong className="text-violet-800">{formatMoney(payload.standardTicketPriceVnd)}</strong></> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={cn(statusChanged && 'text-slate-400 line-through')}>{STATUS_META[departure.status].label}</span>
                        {statusChanged ? <><ArrowRight className="mx-1 inline h-3.5 w-3.5" aria-label="thành" /><strong className={STATUS_META[payload.status!].text}>{STATUS_META[payload.status!].label}</strong></> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {departures.length > preview.length ? <p className="px-3 py-2 text-xs text-slate-500">… và {departures.length - preview.length} chuyến khác</p> : null}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

function Section({ title, checked, onChange, children }: { title: string; checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-3xl border p-4', checked ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200')}>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-bold text-slate-900">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-violet-700" />
        {title}
      </label>
      {checked ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
