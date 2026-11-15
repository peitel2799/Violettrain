'use client'

import { ArrowRight, CalendarClock, Check, Clock3, TrainFront, UsersRound } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DsvnSchedule, DsvnSeatAvailability } from '@/lib/types'

interface ScheduleResultsProps {
  schedules: DsvnSchedule[]
  locale: 'vi' | 'en'
  onSelect: (
    schedule: DsvnSchedule,
    cabinClass: string,
    price: number,
    cabinClassVi?: string,
    cabinClassEn?: string
  ) => void
  isLoading?: boolean
  isSearching?: boolean
  productFilter?: string
}

export default function ScheduleResults({
  schedules,
  locale,
  onSelect,
  isLoading,
  isSearching,
  productFilter,
}: ScheduleResultsProps) {
  const isVi = locale === 'vi'

  if (isLoading || isSearching) {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        <p className="sr-only">{isVi ? 'Đang tìm chuyến tàu' : 'Searching for trains'}</p>
        {[1, 2].map((item) => (
          <div key={item} className="animate-pulse overflow-hidden rounded-[22px] border border-[#e2dde4] bg-white">
            <div className="grid gap-6 p-5 sm:grid-cols-[9rem_1fr] sm:p-7">
              <div className="h-14 rounded-xl bg-[#eee9ef]" />
              <div className="h-14 rounded-xl bg-[#f3f0f3]" />
            </div>
            <div className="h-28 border-t border-[#ece8ed] bg-[#faf9f7]" />
          </div>
        ))}
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-[24px] border border-[#dfd9e2] bg-white px-5 py-14 text-center shadow-[0_16px_50px_rgba(37,25,43,.05)]">
        <CalendarClock className="mx-auto mb-4 h-11 w-11 text-[#9b7aa3]" />
        <h3 className="text-lg font-extrabold text-[#2b1538]">
          {isVi ? 'Không có chuyến phù hợp trong ngày này' : 'No matching trains on this date'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756d79]">
          {isVi
            ? 'Thử chọn ngày khác hoặc đổi ga đi, ga đến trong ô tìm kiếm phía trên.'
            : 'Try another date or change your departure and arrival stations above.'}
        </p>
      </div>
    )
  }

  return (
    <section aria-labelledby="schedule-results-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 id="schedule-results-heading" className="font-serif text-3xl font-bold tracking-[-0.025em] text-[#2b1538] sm:text-4xl">
            {isVi ? 'Chuyến tàu phù hợp' : 'Available trains'}
          </h2>
          <p className="mt-2 text-sm text-[#756d79]">
            {isVi
              ? `${schedules.length} chuyến · Giá cuối cùng được hiển thị cho trọn cabin`
              : `${schedules.length} train(s) · Final full-cabin pricing is shown below`}
          </p>
        </div>
        {schedules[0]?.sourceUrl ? (
          <a
            href={schedules[0].sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-[#633671] underline decoration-[#cdbed1] underline-offset-4 hover:decoration-[#633671]"
          >
            {isVi ? 'Lịch tàu tham khảo DSVN' : 'DSVN reference timetable'}
            {schedules[0].sourceVerifiedOn ? ` · ${schedules[0].sourceVerifiedOn}` : ''}
          </a>
        ) : null}
      </div>

      <div className="space-y-4">
        {schedules.map((schedule, index) => (
          <ScheduleRow
            key={schedule.scheduleId ?? `${schedule.trainNumber}-${index}`}
            schedule={schedule}
            locale={locale}
            onSelect={onSelect}
            productFilter={productFilter}
          />
        ))}
      </div>
    </section>
  )
}

function ScheduleRow({
  schedule,
  locale,
  onSelect,
  productFilter,
}: {
  schedule: DsvnSchedule
  locale: 'vi' | 'en'
  onSelect: ScheduleResultsProps['onSelect']
  productFilter?: string
}) {
  const isVi = locale === 'vi'
  const fares = schedule.availableSeats.filter(
    (fare) => (fare.available === null || fare.available > 0)
      && (!productFilter || fare.seatClass === productFilter)
  )

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#ded8e1] bg-white shadow-[0_14px_45px_rgba(37,25,43,.07)]">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-center lg:gap-8 lg:p-7">
        <div className="flex items-center gap-3 lg:border-r lg:border-[#e9e5ea] lg:pr-7">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2b1538] text-[#edd484]">
            <TrainFront className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xl font-black tracking-tight text-[#2b1538]">{schedule.trainNumber}</p>
            <p className="mt-0.5 text-xs text-[#7d7480]">Violette Train</p>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,.8fr)_minmax(0,1fr)] items-center gap-3 sm:gap-6">
          <TimeBlock time={schedule.departureTime} station={schedule.fromStation} align="left" />

          <div className="min-w-0 text-center">
            <p className="mb-2 flex items-center justify-center gap-1 text-[11px] font-bold text-[#7d7480] sm:text-xs">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {schedule.duration}
            </p>
            <div className="flex items-center" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-[#c89b3c] bg-white" />
              <span className="h-px flex-1 bg-[#cfc7d2]" />
              <TrainFront className="mx-1 h-4 w-4 text-[#633671]" />
              <span className="h-px flex-1 bg-[#cfc7d2]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#633671]" />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[#9a919d] sm:text-[11px]">
              {isVi ? 'Chạy thẳng' : 'Direct'}
            </p>
          </div>

          <TimeBlock
            time={schedule.arrivalTime}
            station={schedule.toStation}
            dayOffset={schedule.arrivalDayOffset}
            align="right"
          />
        </div>
      </div>

      <div className="border-t border-[#e7e2e8] bg-[#faf9f7]">
        {fares.map((fare) => (
          <FareRow
            key={fare.seatClass}
            fare={fare}
            locale={locale}
            onClick={() => onSelect(
              schedule,
              fare.seatClass,
              fare.price,
              fare.seatClassVi,
              fare.seatClassEn
            )}
          />
        ))}
        {fares.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm font-bold text-[#756d79]">
            {isVi ? 'Cabin trên chuyến này đã hết hoặc chưa mở bán.' : 'Cabins on this train are sold out or not yet available.'}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function TimeBlock({
  time,
  station,
  dayOffset,
  align,
}: {
  time: string
  station: string
  dayOffset?: number
  align: 'left' | 'right'
}) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className="whitespace-nowrap text-2xl font-black tabular-nums tracking-[-0.035em] text-[#241b28] sm:text-3xl">
        {time}
        {dayOffset ? <sup className="ml-1 align-super text-[10px] font-bold text-[#633671]">+{dayOffset}</sup> : null}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[#746c78] sm:text-sm" title={station}>{station}</p>
    </div>
  )
}

function FareRow({
  fare,
  locale,
  onClick,
}: {
  fare: DsvnSeatAvailability
  locale: 'vi' | 'en'
  onClick: () => void
}) {
  const isVi = locale === 'vi'
  const cabinName = isVi ? fare.seatClassVi : fare.seatClassEn

  return (
    <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,.75fr)_minmax(13rem,.85fr)_auto] lg:gap-7 lg:px-7">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold text-[#2b1538]">{cabinName}</h3>
          {fare.seatClass === 'premium' ? (
            <span className="rounded-full bg-[#eee4f0] px-2.5 py-1 text-[10px] font-extrabold text-[#633671]">SE19 · VIP 2</span>
          ) : null}
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#756d79]">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          {isVi ? 'Cabin riêng · tối đa 4 khách' : 'Private cabin · up to 4 guests'}
        </p>
        {fare.available !== null ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#51705c]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {isVi ? `Còn ${fare.available} cabin` : `${fare.available} cabin(s) left`}
          </p>
        ) : null}
      </div>

      <div className="border-l-2 border-[#d8b45c] pl-4">
        <p className="text-[11px] font-bold text-[#7d7480]">{isVi ? 'Giá 1 vé' : 'One ticket'}</p>
        <p className="mt-1 text-base font-black tabular-nums text-[#33263a]">{formatCurrency(fare.ticketPrice)}</p>
        <p className="mt-0.5 text-[11px] text-[#918895]">× 4 {isVi ? 'vé' : 'tickets'}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-[#7d7480]">{isVi ? 'Tổng trọn cabin' : 'Full cabin total'}</p>
        <p className="mt-1 whitespace-nowrap text-[1.35rem] font-black tabular-nums tracking-[-0.025em] text-[#9a6d13] sm:text-2xl">
          {formatCurrency(fare.price)}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#756d79]">{isVi ? 'Bắt buộc mua đủ 4 vé' : 'All 4 tickets required'}</p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2b1538] px-5 text-sm font-extrabold text-white transition-colors hover:bg-[#4a2655] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c89b3c] focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1 lg:w-auto"
        aria-label={`${isVi ? 'Chọn' : 'Select'} ${cabinName}, ${formatCurrency(fare.price)}`}
      >
        {isVi ? 'Chọn cabin' : 'Select cabin'}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
