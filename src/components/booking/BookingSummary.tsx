'use client'

import { useTranslations } from 'next-intl'
import { BedDouble, Calendar, Tag, Train, Users } from 'lucide-react'
import { formatCurrency, formatDate, getDayName } from '@/lib/utils'
import type { DsvnSchedule, BookingPassenger } from '@/lib/types'

interface BookingSummaryProps {
  schedule?: DsvnSchedule
  returnSchedule?: DsvnSchedule
  selectedSeatClass?: string
  seatPrice?: number
  returnSeatPrice?: number
  passengers: BookingPassenger[]
  departureDate: string
  isRoundTrip?: boolean
  returnDate?: string
  locale: 'vi' | 'en'
}

export default function BookingSummary({
  schedule,
  returnSchedule,
  selectedSeatClass,
  seatPrice,
  returnSeatPrice,
  passengers,
  departureDate,
  isRoundTrip,
  returnDate,
  locale,
}: BookingSummaryProps) {
  const t = useTranslations('booking.summary')

  const subtotal = (seatPrice || 0) + (isRoundTrip ? (returnSeatPrice || 0) : 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  return (
    <div className="sticky top-20 rounded-[22px] border border-[#ded8e1] bg-white p-5 shadow-[0_14px_42px_rgba(37,25,43,.07)] sm:top-24 sm:p-6">
      <h3 className="mb-5 flex items-center gap-2 font-extrabold text-[#2b1538]">
        <Tag className="h-4 w-4 text-[#8b6594]" />
        {t('title')}
      </h3>

      {/* Route */}
      {schedule && (
        <div className="space-y-4 border-b border-[#e7e2e8] pb-5">
          <div className="flex items-start gap-3">
            <Train className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#754382]" />
            <div>
              <p className="text-sm font-bold text-[#33263a]">
                {schedule.fromStation}
              </p>
              <p className="text-xs text-gray-400">↓</p>
              <p className="text-sm font-bold text-[#33263a]">
                {schedule.toStation}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">{schedule.trainNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 flex-shrink-0 text-[#754382]" />
            <div>
              <p className="text-sm font-semibold text-[#33263a]">
                {formatDate(departureDate, locale === 'vi' ? 'vi-VN' : 'en-US')}
              </p>
              <p className="text-xs text-gray-400">
                {getDayName(departureDate, locale)} · {schedule.departureTime}
              </p>
            </div>
          </div>

          {isRoundTrip && returnDate && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 flex-shrink-0 rotate-180 text-[#754382]" />
              <div>
                <p className="text-sm text-gray-800">
                  {formatDate(returnDate, locale === 'vi' ? 'vi-VN' : 'en-US')}
                </p>
                <p className="text-xs text-gray-400">
                  {getDayName(returnDate, locale)}
                  {returnSchedule ? ` · ${returnSchedule.trainNumber} · ${returnSchedule.departureTime}` : ` · ${locale === 'vi' ? 'Khứ hồi' : 'Round trip'}`}
                </p>
              </div>
            </div>
          )}

          {selectedSeatClass && (
            <div className="flex items-start gap-3">
              <BedDouble className="h-4 w-4 flex-shrink-0 text-[#754382]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800">{selectedSeatClass}</p>
                {seatPrice ? (
                  <div className="mt-2 rounded-xl border border-[#eadfcb] bg-[#fbf6e9] p-3.5">
                    <p className="text-xs text-gray-500">
                      {locale === 'vi' ? 'Giá 1 vé' : '1 ticket'}:{' '}
                      <span className="font-bold text-gray-700">{formatCurrency(seatPrice / 4)}</span>
                    </p>
                    <p className="mt-1 text-base font-extrabold text-[#2b1538]">
                      {locale === 'vi' ? 'Giá 1 cabin' : '1 cabin'}: {formatCurrency(seatPrice)}
                    </p>
                    <p className="text-[11px] font-semibold text-[#795b24]">
                      {locale === 'vi' ? '1 vé × 4 · bắt buộc mua trọn' : '1 ticket × 4 · full purchase required'}
                      {isRoundTrip ? (locale === 'vi' ? ' · cộng giá chuyến về' : ' · plus return fare') : ''}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {passengers.length > 0 && (
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 flex-shrink-0 text-[#754382]" />
              <p className="text-sm text-gray-800">
                {passengers.filter((p) => p.type === 'adult').length}{' '}
                {locale === 'vi' ? 'người lớn' : 'adult(s)'}
                {passengers.filter((p) => p.type === 'child').length > 0 && (
                  <>
                    {' '}
                    + {passengers.filter((p) => p.type === 'child').length}{' '}
                    {locale === 'vi' ? 'trẻ em' : 'child(ren)'}
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pricing */}
      <div className="space-y-2 py-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t('subtotal')}</span>
          <span className="text-gray-700">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t('tax')}</span>
          <span className="text-gray-700">{formatCurrency(tax)}</span>
        </div>
      </div>

      <div className="border-t border-[#ded8e1] pt-5">
        <div className="flex justify-between items-end">
          <span className="font-extrabold text-[#2b1538]">{t('total')}</span>
          <span className="text-xl font-black text-[#9a6d13]">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          {locale === 'vi' ? 'Đã bao gồm VAT' : 'VAT included'}
        </p>
      </div>
    </div>
  )
}
