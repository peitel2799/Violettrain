'use client'

import { useTranslations } from 'next-intl'
import { Calendar, Train, Users, Armchair, Tag } from 'lucide-react'
import { formatCurrency, formatDate, getDayName } from '@/lib/utils'
import type { DsvnSchedule, BookingPassenger } from '@/lib/types'

interface BookingSummaryProps {
  schedule?: DsvnSchedule
  selectedSeatClass?: string
  seatPrice?: number
  passengers: BookingPassenger[]
  departureDate: string
  isRoundTrip?: boolean
  returnDate?: string
  locale: 'vi' | 'en'
}

export default function BookingSummary({
  schedule,
  selectedSeatClass,
  seatPrice,
  passengers,
  departureDate,
  isRoundTrip,
  returnDate,
  locale,
}: BookingSummaryProps) {
  const t = useTranslations('booking.summary')

  const subtotal = (seatPrice || 0) * passengers.length * (isRoundTrip ? 2 : 1)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm sticky top-20 sm:top-24">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 text-violet-500" />
        {t('title')}
      </h3>

      {/* Route */}
      {schedule && (
        <div className="space-y-3 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <Train className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {schedule.fromStation}
              </p>
              <p className="text-xs text-gray-400">↓</p>
              <p className="text-sm font-medium text-gray-800">
                {schedule.toStation}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">{schedule.trainNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-800">
                {formatDate(departureDate, locale === 'vi' ? 'vi-VN' : 'en-US')}
              </p>
              <p className="text-xs text-gray-400">
                {getDayName(departureDate, locale)} · {schedule.departureTime}
              </p>
            </div>
          </div>

          {isRoundTrip && returnDate && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-violet-500 flex-shrink-0 rotate-180" />
              <div>
                <p className="text-sm text-gray-800">
                  {formatDate(returnDate, locale === 'vi' ? 'vi-VN' : 'en-US')}
                </p>
                <p className="text-xs text-gray-400">
                  {getDayName(returnDate, locale)} · {locale === 'vi' ? 'Khứ hồi' : 'Round trip'}
                </p>
              </div>
            </div>
          )}

          {selectedSeatClass && (
            <div className="flex items-center gap-3">
              <Armchair className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-800">{selectedSeatClass}</p>
                <p className="text-xs text-gray-400">
                  {seatPrice && formatCurrency(seatPrice)} × {passengers.length}
                  {isRoundTrip ? ' × 2' : ''}
                </p>
              </div>
            </div>
          )}

          {passengers.length > 0 && (
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-violet-500 flex-shrink-0" />
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
      <div className="py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t('subtotal')}</span>
          <span className="text-gray-700">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t('tax')}</span>
          <span className="text-gray-700">{formatCurrency(tax)}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-end">
          <span className="font-semibold text-gray-900">{t('total')}</span>
          <span className="font-bold text-xl text-gold-600">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          {locale === 'vi' ? 'Đã bao gồm VAT' : 'VAT included'}
        </p>
      </div>
    </div>
  )
}
