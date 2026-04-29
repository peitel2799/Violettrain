'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Calendar, Users, ArrowRight, ChevronDown, Train } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BOOKABLE_STATIONS, STATION_NAMES } from '@/lib/constants'

const STATIONS = BOOKABLE_STATIONS

export default function BookingWidget() {
  const t = useTranslations('home.booking')
  const tCta = useTranslations('common.cta')
  const locale = useLocale()
  const router = useRouter()
  const isVi = locale === 'vi'

  const [tripType, setTripType] = useState<'oneWay' | 'roundTrip'>('oneWay')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [passengers, setPassengers] = useState(1)

  const handleSearch = () => {
    if (!from || !to || !departureDate) return
    const prefix = locale === 'en' ? '/en' : ''
    router.push(`${prefix}/booking?from=${from}&to=${to}&date=${departureDate}&passengers=${passengers}`)
  }

  return (
    <section className="relative z-20 px-4 sm:px-6 -mt-20">
      <div className="max-w-5xl mx-auto">
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-violet-900/15 overflow-hidden">

          {/* Header Bar */}
          <div className="bg-violet-950 px-6 py-3 flex items-center gap-2">
            <Train className="w-4 h-4 text-gold-400" />
            <span className="text-white text-sm font-medium">{isVi ? 'Đặt vé tàu' : 'Book your train'}</span>
          </div>

          {/* Trip Type Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTripType('oneWay')}
              className={cn(
                'flex-1 py-3.5 text-sm font-medium transition-colors',
                tripType === 'oneWay'
                  ? 'text-gold-600 border-b-2 border-gold-500 bg-gold-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {t('oneWay')}
            </button>
            <button
              onClick={() => setTripType('roundTrip')}
              className={cn(
                'flex-1 py-3.5 text-sm font-medium transition-colors',
                tripType === 'roundTrip'
                  ? 'text-gold-600 border-b-2 border-gold-500 bg-gold-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {t('roundTrip')}
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">

              {/* From */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('from')}</label>
                <div className="relative">
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 pr-8 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">{isVi ? 'Chọn điểm đi' : 'Select departure'}</option>
                    {STATIONS.map((s) => (
                      <option key={s} value={s}>{isVi ? STATION_NAMES[s].vi : STATION_NAMES[s].en}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* To */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('to')}</label>
                <div className="relative">
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 pr-8 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">{isVi ? 'Chọn điểm đến' : 'Select destination'}</option>
                    {STATIONS.map((s) => (
                      <option key={s} value={s}>{isVi ? STATION_NAMES[s].vi : STATION_NAMES[s].en}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Departure Date */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{isVi ? 'Ngày đi' : 'Departure'}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Return Date or Passengers */}
              {tripType === 'roundTrip' ? (
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{isVi ? 'Ngày về' : 'Return'}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      min={departureDate || new Date().toISOString().split('T')[0]}
                      className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('passengers')}</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                      className="w-full pl-9 pr-8 appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus:border-transparent transition-all cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} {isVi ? 'khách' : 'guests'}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Search Button */}
              <div className="sm:col-span-2 lg:col-span-1">
                <button
                  onClick={handleSearch}
                  disabled={!from || !to || !departureDate}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all',
                    from && to && departureDate
                      ? 'bg-violet-950 hover:bg-violet-900 text-white shadow-lg shadow-violet-950/20'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {tCta('searchTickets')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
