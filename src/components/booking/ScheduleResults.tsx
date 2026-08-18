'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Train, Utensils, MapPin, ArrowRight, Users, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { DsvnSchedule } from '@/lib/types'

interface ScheduleResultsProps {
  schedules: DsvnSchedule[]
  locale: 'vi' | 'en'
  onSelect: (schedule: DsvnSchedule, seatClass: string, price: number, seatClassVi?: string, seatClassEn?: string) => void
  isLoading?: boolean
  isSearching?: boolean
}

export default function ScheduleResults({
  schedules,
  locale,
  onSelect,
  isLoading,
  isSearching,
}: ScheduleResultsProps) {
  const t = useTranslations('booking')
  const tDsvn = useTranslations('dsvn')

  if (isLoading || isSearching) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (schedules.length === 0 && !isSearching) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <Train className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {locale === 'vi' ? 'Không có chuyến tàu' : 'No trains available'}
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          {locale === 'vi'
            ? 'Không tìm thấy chuyến tàu phù hợp. Vui lòng thử ngày hoặc tuyến đường khác.'
            : 'No trains found for this route. Please try a different date or route.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">
          {locale === 'vi'
            ? `Tìm thấy ${schedules.length} chuyến tàu`
            : `Found ${schedules.length} train(s)`}
        </p>
        <div className="flex items-center gap-1 text-xs text-gold-500">
          <Star className="w-3 h-3 fill-current" />
          <span>{locale === 'vi' ? 'Giá tốt nhất' : 'Best price'}</span>
        </div>
      </div>

      {schedules.map((schedule, idx) => (
        <ScheduleCard
          key={`${schedule.trainNumber}-${idx}`}
          schedule={schedule}
          locale={locale}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function ScheduleCard({
  schedule,
  locale,
  onSelect,
}: {
  schedule: DsvnSchedule
  locale: 'vi' | 'en'
  onSelect: (schedule: DsvnSchedule, seatClass: string, price: number, seatClassVi?: string, seatClassEn?: string) => void
}) {
  const t = useTranslations('booking')
  const [expanded, setExpanded] = useState(false)
  const bestSeat = schedule.availableSeats
    .filter((s) => s.available > 0)
    .sort((a, b) => a.price - b.price)[0]

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gold-300">
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {/* Train Info */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center">
              <Train className="w-7 h-7 text-violet-600" />
            </div>
            <p className="text-xs text-center mt-1 font-medium text-gray-500">
              {schedule.trainNumber}
            </p>
          </div>

          {/* Times */}
          <div className="flex-1 flex items-center gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{schedule.departureTime}</p>
              <p className="text-xs text-gray-400">{schedule.fromStation}</p>
            </div>

            <div className="flex-1 flex flex-col items-center px-2">
              <p className="text-xs text-gray-400 mb-1">{schedule.duration}</p>
              <div className="w-full flex items-center">
                <div className="w-2 h-2 rounded-full bg-gold-500" />
                <div className="flex-1 h-px bg-gradient-to-r from-gold-400 to-violet-400" />
                <ArrowRight className="w-3 h-3 text-violet-400" />
                <div className="w-2 h-2 rounded-full bg-violet-500" />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                <Train className="w-3 h-3 inline mr-0.5" />
                {schedule.trainNumber}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{schedule.arrivalTime}</p>
              <p className="text-xs text-gray-400">{schedule.toStation}</p>
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0 min-w-[120px]">
            {bestSeat ? (
              <>
                <p className="text-xl font-bold text-gold-600">
                  {formatCurrency(bestSeat.price)}
                </p>
                <p className="text-xs text-gray-400">
                  {locale === 'vi' ? 'Giá vé' : 'Ticket price'} {locale === 'vi' ? bestSeat.seatClassVi : bestSeat.seatClassEn}
                </p>
              </>
            ) : (
              <span className="text-sm text-red-500 font-medium">
                {locale === 'vi' ? 'Hết vé' : 'Sold out'}
              </span>
            )}
          </div>
        </div>

        {/* Amenities row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          {schedule.hasRestaurant && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
              <Utensils className="w-3 h-3" />
              {locale === 'vi' ? 'Nhà hàng' : 'Restaurant'}
            </span>
          )}
          {schedule.availableSeats.slice(0, 4).map((seat) => (
            <span
              key={seat.seatClass}
              className={cn(
                'text-xs px-2 py-1 rounded-full',
                seat.available > 5
                  ? 'bg-green-50 text-green-600'
                  : seat.available > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-gray-100 text-gray-400'
              )}
            >
              {seat.available} {seat.seatClassVi}
            </span>
          ))}
        </div>
      </div>

      {/* Expanded seat selection */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-gray-50/50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t('selectCabinClass')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {schedule.availableSeats.map((seat) => (
              <button
                key={seat.seatClass}
                onClick={() =>
                  seat.available > 0 && onSelect(schedule, seat.seatClass, seat.price, seat.seatClassVi, seat.seatClassEn)
                }
                disabled={seat.available === 0}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border text-left transition-all',
                  seat.available === 0
                    ? 'border-gray-100 bg-white opacity-50 cursor-not-allowed'
                    : 'border-gold-200 bg-white hover:border-gold-400 hover:shadow-sm cursor-pointer'
                )}
              >
                <div>
                  <p className="font-semibold text-sm text-gray-800">
                    {locale === 'vi' ? seat.seatClassVi : seat.seatClassEn}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <Users className="w-3 h-3 inline mr-0.5" />
                    {seat.available} {t('available')}
                  </p>
                  <p className="mt-1 text-[11px] text-violet-600">
                    {locale === 'vi' ? 'Mua 4 vé để có cabin riêng' : 'Buy 4 tickets for a private cabin'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gold-600">{formatCurrency(seat.price)}</p>
                  <p className="text-xs text-gray-400">
                    {t('perGuest')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
