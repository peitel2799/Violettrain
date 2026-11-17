'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CalendarDeparture,
  displayStatus,
  dsvnCabinBase,
  formatDayMonth,
  formatMoney,
  formatMoneyShort,
  isDeparted,
  isSoldOut,
  marginAgainstDsvn,
  monthKey,
  productOf,
  remainingCabins,
  STATUS_META,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  weekdayIndex,
} from './schedule-utils'

type Props = {
  month: string
  days: string[]
  today: string
  byDate: Map<string, CalendarDeparture[]>
  singleTrain: boolean
  selecting: boolean
  selectedDates: Set<string>
  now: number
  onOpenDay: (date: string) => void
  onToggleDate: (date: string) => void
  onToggleWeekday: (weekday: number) => void
}

function selectable(departures: CalendarDeparture[] | undefined, now: number) {
  return Boolean(departures?.some((departure) => !isDeparted(departure, now)))
}

function DepartureLine({ departure, now, large, fullPrice = false }: { departure: CalendarDeparture; now: number; large: boolean; fullPrice?: boolean }) {
  const status = displayStatus(departure, now)
  const standard = productOf(departure, 'standard')
  const soldOut = isSoldOut(departure)
  const meta = STATUS_META[status]
  const base = dsvnCabinBase(departure.dsvnFare)
  const margin = marginAgainstDsvn(standard?.ticketPrice, departure.dsvnFare)

  if (large) {
    return (
      <div className="space-y-1">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', soldOut ? 'bg-slate-800 text-white ring-slate-800' : meta.chip)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', soldOut ? 'bg-white' : meta.dot)} aria-hidden="true" />
          {soldOut ? 'Hết cabin' : meta.label}
        </span>
        <p className="text-[15px] font-extrabold leading-tight tabular-nums text-slate-900">{formatMoney(standard?.ticketPrice)}</p>
        <p className="text-[11px] leading-tight text-slate-500">
          {departure.departureTime} · còn {remainingCabins(standard)}/{standard?.capacity ?? 0} cabin
        </p>
        {base ? (
          <p className={cn('text-[11px] font-semibold leading-tight', margin && margin.perTicket < 0 ? 'text-rose-700' : 'text-sky-800')}>
            Giá DSVN {formatMoneyShort(base.perTicket)}/vé{margin ? ` · ${margin.perTicket >= 0 ? 'lãi' : 'lỗ'} ${Math.abs(margin.percent)}%` : ''}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[12px] leading-5">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', soldOut ? 'bg-slate-800' : meta.dot)} aria-hidden="true" />
      <span className={cn('font-semibold', status === 'departed' || status === 'cancelled' ? 'text-slate-400' : 'text-slate-700')}>{departure.trainNumber}</span>
      <span className={cn('ml-auto font-bold tabular-nums', status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900')}>
        {fullPrice ? formatMoney(standard?.ticketPrice) : formatMoneyShort(standard?.ticketPrice)}
      </span>
    </div>
  )
}

function dayAriaLabel(date: string, departures: CalendarDeparture[], now: number) {
  const [, month, day] = date.split('-')
  const head = `${WEEKDAY_LONG[weekdayIndex(date)]} ${Number(day)}/${Number(month)}`
  if (!departures.length) return `${head}: chưa có chuyến`
  const parts = departures.map((departure) => {
    const status = STATUS_META[displayStatus(departure, now)].label
    return `tàu ${departure.trainNumber} ${status}, giá ${formatMoney(productOf(departure, 'standard')?.ticketPrice)} một vé`
  })
  return `${head}: ${parts.join('; ')}`
}

export default function CalendarGrid({
  month,
  days,
  today,
  byDate,
  singleTrain,
  selecting,
  selectedDates,
  now,
  onOpenDay,
  onToggleDate,
  onToggleWeekday,
}: Props) {
  const monthDays = days.filter((date) => monthKey(date) === month)

  return (
    <>
      {/* Desktop / tablet: month grid */}
      <div className="hidden md:block" aria-label="Lịch chạy theo tháng">
        <div className="grid grid-cols-7 border-b border-slate-200" aria-hidden={selecting ? undefined : true}>
          {WEEKDAY_SHORT.map((label, index) => (
            <div key={label} className="px-1 py-2 text-center">
              {selecting ? (
                <button
                  type="button"
                  onClick={() => onToggleWeekday(index)}
                  className="h-9 w-full rounded-lg text-sm font-bold text-violet-700 hover:bg-violet-50"
                  title={`Chọn tất cả ${WEEKDAY_LONG[index]} trong tháng`}
                >
                  {label} <span className="font-normal text-violet-500">(chọn)</span>
                </button>
              ) : (
                <span className={cn('text-sm font-bold', index >= 5 ? 'text-violet-700' : 'text-slate-500')}>{label}</span>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date) => {
            const inMonth = monthKey(date) === month
            const departures = byDate.get(date) ?? []
            const canSelect = selectable(departures, now)
            const selected = selectedDates.has(date)
            const isToday = date === today
            const isPast = date < today
            const weekend = weekdayIndex(date) >= 5
            const visible = singleTrain ? departures.slice(0, 1) : departures.slice(0, 4)
            const hidden = departures.length - visible.length

            return (
              <button
                key={date}
                type="button"
                aria-pressed={selecting ? selected : undefined}
                aria-label={dayAriaLabel(date, departures, now)}
                disabled={!inMonth || (selecting && !canSelect)}
                onClick={() => (selecting ? onToggleDate(date) : onOpenDay(date))}
                className={cn(
                  'group relative flex min-h-[124px] flex-col items-stretch gap-1.5 border-b border-r border-slate-100 p-2 text-left outline-none focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-500/40 lg:min-h-[132px]',
                  !inMonth && 'invisible',
                  weekend && inMonth && 'bg-violet-50/40',
                  isPast && 'bg-slate-50/80',
                  !selecting && 'hover:bg-violet-50',
                  selecting && canSelect && 'cursor-pointer hover:bg-violet-50',
                  selecting && !canSelect && 'cursor-not-allowed opacity-45',
                  selected && 'bg-violet-100/70 ring-2 ring-inset ring-violet-600 hover:bg-violet-100'
                )}
              >
                <span className="flex items-center justify-between">
                  <span className={cn(
                    'flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold tabular-nums',
                    isToday ? 'bg-violet-700 text-white' : isPast ? 'text-slate-400' : 'text-slate-800'
                  )}>
                    {Number(date.slice(8))}
                  </span>
                  {isToday ? <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Hôm nay</span> : null}
                  {selecting && canSelect ? (
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2', selected ? 'border-violet-700 bg-violet-700 text-white' : 'border-slate-300 bg-white')}>
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                  ) : null}
                </span>

                {departures.length ? (
                  <span className={cn('flex flex-col gap-0.5', isPast && 'opacity-60')}>
                    {visible.map((departure) => (
                      <DepartureLine key={departure.id} departure={departure} now={now} large={singleTrain} />
                    ))}
                    {hidden > 0 ? <span className="text-[11px] font-semibold text-violet-700">+{hidden} chuyến nữa</span> : null}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Phone: agenda list */}
      <ul className="divide-y divide-slate-100 md:hidden" aria-label="Lịch chạy theo ngày">
        {monthDays.map((date) => {
          const departures = byDate.get(date) ?? []
          const canSelect = selectable(departures, now)
          const selected = selectedDates.has(date)
          const isPast = date < today
          if (isPast && !departures.length) return null
          return (
            <li key={date}>
              <button
                type="button"
                aria-pressed={selecting ? selected : undefined}
                aria-label={dayAriaLabel(date, departures, now)}
                disabled={selecting && !canSelect}
                onClick={() => (selecting ? onToggleDate(date) : onOpenDay(date))}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left disabled:opacity-45',
                  selected && 'bg-violet-100/70',
                  isPast && 'bg-slate-50'
                )}
              >
                <span className={cn(
                  'flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5',
                  date === today ? 'bg-violet-700 text-white' : weekdayIndex(date) >= 5 ? 'bg-violet-50 text-violet-800' : 'bg-slate-100 text-slate-700'
                )}>
                  <span className="text-[11px] font-bold">{WEEKDAY_SHORT[weekdayIndex(date)]}</span>
                  <span className="text-base font-extrabold tabular-nums">{formatDayMonth(date)}</span>
                </span>
                <span className="min-w-0 flex-1 space-y-1 pt-0.5">
                  {departures.length ? departures.map((departure) => (
                    <DepartureLine key={departure.id} departure={departure} now={now} large={false} fullPrice />
                  )) : <span className="text-sm text-slate-400">Chưa có chuyến · bấm để thêm</span>}
                </span>
                {selecting && canSelect ? (
                  <span className={cn('mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', selected ? 'border-violet-700 bg-violet-700 text-white' : 'border-slate-300 bg-white')}>
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
