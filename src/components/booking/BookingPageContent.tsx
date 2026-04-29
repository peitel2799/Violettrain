'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ChevronLeft, ChevronRight, Check, Loader2, ArrowLeftRight } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { BOOKABLE_STATIONS, STATION_NAMES } from '@/lib/constants'
import ScheduleResults from '@/components/booking/ScheduleResults'
import PassengerForm from '@/components/booking/PassengerForm'
import BookingSummary from '@/components/booking/BookingSummary'
import ConfirmationStep from '@/components/booking/ConfirmationStep'
import type { DsvnSchedule, BookingPassenger, BookingStep } from '@/lib/types'
import { searchSchedules } from '@/lib/dsvn-client'

const STATIONS = BOOKABLE_STATIONS

const STEPS: BookingStep[] = ['select', 'schedule', 'passenger', 'confirmation']

function BookingContent({ locale }: { locale: string }) {
  const t = useTranslations('booking')
  const tForm = useTranslations('booking.form')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<BookingStep>('select')
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [schedules, setSchedules] = useState<DsvnSchedule[]>([])
  const [error, setError] = useState('')

  // Form state
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')
  const [departureDate, setDepartureDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  )
  const [tripType, setTripType] = useState<'oneWay' | 'roundTrip'>(
    searchParams.get('return') ? 'roundTrip' : 'oneWay'
  )
  const [returnDate, setReturnDate] = useState(searchParams.get('return') || '')

  // Selection state
  const [selectedSchedule, setSelectedSchedule] = useState<DsvnSchedule>()
  const [selectedSeatClass, setSelectedSeatClass] = useState<string>()
  const [selectedSeatClassVi, setSelectedSeatClassVi] = useState<string>()
  const [selectedSeatClassEn, setSelectedSeatClassEn] = useState<string>()
  const [selectedPrice, setSelectedPrice] = useState<number>()
  const [passengers, setPassengers] = useState<BookingPassenger[]>([
    { type: 'adult', fullName: '', email: '', phone: '' },
  ])
  const [bookingRef, setBookingRef] = useState('')
  const [currentLocale, setCurrentLocale] = useState<'vi' | 'en'>(locale as 'vi' | 'en')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const isVi = currentLocale === 'vi'

  const handleSwapStations = () => {
    setFrom(to)
    setTo(from)
  }

  const currentStepIndex = STEPS.indexOf(step)

  const canProceed = useCallback(() => {
    if (step === 'select') return from && to && departureDate
    if (step === 'schedule') return selectedSchedule && selectedSeatClass && selectedPrice
    if (step === 'passenger') {
      return passengers.length > 0 && passengers.every(
        (p) => p.fullName.trim() && p.email.includes('@') && p.phone.length >= 8
      )
    }
    return true
  }, [step, from, to, departureDate, selectedSchedule, selectedSeatClass, selectedPrice, passengers])

  const handleSearch = async () => {
    if (!from || !to || !departureDate) return

    setIsLoading(true)
    setIsSearching(true)
    setError('')
    setSchedules([])

    try {
      const fromCode = STATION_NAMES[from]?.dsvnCode || from.toUpperCase()
      const toCode = STATION_NAMES[to]?.dsvnCode || to.toUpperCase()
      const results = searchSchedules(fromCode, toCode, departureDate, currentLocale)

      if (results.length > 0) {
        setSchedules(results)
      } else {
        setError(t('noSchedules'))
      }
      setStep('schedule')
    } catch {
      setError(t('loadError'))
    } finally {
      setIsLoading(false)
      setIsSearching(false)
    }
  }

  const handleScheduleSelect = (
    schedule: DsvnSchedule,
    seatClass: string,
    price: number,
    seatClassVi?: string,
    seatClassEn?: string
  ) => {
    setSelectedSchedule(schedule)
    setSelectedSeatClass(seatClass)
    setSelectedSeatClassVi(seatClassVi || seatClass)
    setSelectedSeatClassEn(seatClassEn || seatClass)
    setSelectedPrice(price)
    setStep('passenger')
  }

  const handleConfirmBooking = async () => {
    if (!canProceed()) return

    setIsLoading(true)
    const ref = generateRef()
    const primaryEmail = passengers[0]?.email
    const primaryName = passengers[0]?.fullName || 'Valued Customer'
    const primaryPhone = passengers[0]?.phone || ''

    try {
      // 1. Create confirmed booking
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: ref,
          status: 'confirmed',
          paymentStatus: 'pending',
          routeId: `${from}-${to}`,
          routeName: `${STATION_NAMES[from]?.[isVi ? 'vi' : 'en']} → ${STATION_NAMES[to]?.[isVi ? 'vi' : 'en']}`,
          cabinClassId: selectedSeatClass || '',
          cabinClassName: selectedSeatClassVi || selectedSeatClass || '',
          departureDate,
          departureTime: selectedSchedule?.departureTime || '',
          trainNumber: selectedSchedule?.trainNumber || '',
          isRoundTrip: tripType === 'roundTrip',
          returnDate: tripType === 'roundTrip' ? returnDate : undefined,
          passengers: passengers.map((p) => ({
            type: p.type,
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            dateOfBirth: p.dateOfBirth,
          })),
          pricing: { subtotal, tax, total },
          payment: { method: 'cash', paidAt: new Date().toISOString() },
          contact: { email: primaryEmail, phone: primaryPhone },
        }),
      })

      // 2. Send confirmation email
      setBookingRef(ref)
      setEmailStatus('sending')

      if (primaryEmail) {
        await fetch('/api/booking/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingRef: ref,
            customerName: primaryName,
            customerEmail: primaryEmail,
            customerPhone: primaryPhone,
            trainNumber: selectedSchedule?.trainNumber || '',
            fromStation: selectedSchedule?.fromStation || '',
            toStation: selectedSchedule?.toStation || '',
            departureDate,
            departureTime: selectedSchedule?.departureTime || '',
            arrivalTime: selectedSchedule?.arrivalTime || '',
            seatClass: selectedSeatClass || '',
            seatClassVi: selectedSeatClassVi || '',
            seatClassEn: selectedSeatClassEn || '',
            passengers: passengers.map((p) => ({ name: p.fullName, type: p.type })),
            isRoundTrip: tripType === 'roundTrip',
            returnDate: tripType === 'roundTrip' ? returnDate : undefined,
            subtotal,
            tax,
            total,
            paymentMethod: 'cash',
            locale: currentLocale,
          }),
        })
        setEmailStatus('sent')
      }

      setStep('confirmation')
    } catch (err) {
      console.error('[handleConfirmBooking]', err)
      setEmailStatus('failed')
      setBookingRef(ref)
      setStep('confirmation')
    } finally {
      setIsLoading(false)
    }
  }

  const subtotal = selectedPrice
    ? selectedPrice * passengers.length * (tripType === 'roundTrip' ? 2 : 1)
    : 0
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  const stepLabels: Record<BookingStep, string> = {
    select: isVi ? 'Chọn hành trình' : 'Select Route',
    schedule: isVi ? 'Chọn tàu' : 'Select Train',
    passenger: isVi ? 'Thông tin khách' : 'Passenger Info',
    confirmation: isVi ? 'Hoàn tất' : 'Confirmation',
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24">
      {/* Progress Steps */}
      {step !== 'select' && (
        <div className="bg-white border-b border-gray-100 sticky top-16 sm:top-20 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-center gap-2">
              {STEPS.map((s, idx) => {
                const isCompleted = idx < currentStepIndex
                const isCurrent = idx === currentStepIndex
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        isCompleted
                          ? 'bg-violet-100 text-violet-700'
                          : isCurrent
                            ? 'bg-gold-500 text-violet-950'
                            : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <span className="hidden sm:inline">{stepLabels[s]}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Step 1: Route Selection */}
        {step === 'select' && (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {t('title')}
            </h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Trip Type */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setTripType('oneWay')}
                  className={cn(
                    'flex-1 py-3.5 text-sm font-medium transition-colors',
                    tripType === 'oneWay'
                      ? 'text-gold-600 border-b-2 border-gold-500'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {t('oneWay')}
                </button>
                <button
                  onClick={() => setTripType('roundTrip')}
                  className={cn(
                    'flex-1 py-3.5 text-sm font-medium transition-colors',
                    tripType === 'roundTrip'
                      ? 'text-gold-600 border-b-2 border-gold-500'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {t('roundTrip')}
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {tForm('from')}
                    </label>
                    <select
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                    >
                      <option value="">{t('selectDeparture')}</option>
                      {STATIONS.map((s) => (
                        <option key={s} value={s}>
                          {isVi ? STATION_NAMES[s].vi : STATION_NAMES[s].en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwapStations}
                    className="hidden sm:flex mx-auto mb-3 p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-600 transition-all"
                    title={t('swapStations')}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {tForm('to')}
                    </label>
                    <select
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                    >
                      <option value="">{t('selectDestination')}</option>
                      {STATIONS.map((s) => (
                        <option key={s} value={s}>
                          {isVi ? STATION_NAMES[s].vi : STATION_NAMES[s].en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {tForm('departureDate')}
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                    />
                  </div>

                  {tripType === 'roundTrip' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        {tForm('returnDate')}
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={departureDate || new Date().toISOString().split('T')[0]}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                      />
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={handleSearch}
                  disabled={!from || !to || !departureDate || isLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all mt-4',
                    from && to && departureDate
                      ? 'bg-gold-500 hover:bg-gold-400 text-violet-950 shadow-lg shadow-gold-500/25 hover:scale-[1.01]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{t('searching')}</>
                  ) : (
                    <>{t('searchTrains')}<ChevronRight className="w-4 h-4" /></>
                  )}
                </button>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Schedule Results */}
        {step === 'schedule' && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep('select')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {STATION_NAMES[from]?.[isVi ? 'vi' : 'en']} →{' '}
                  {STATION_NAMES[to]?.[isVi ? 'vi' : 'en']}
                </h2>
                <p className="text-sm text-gray-500">
                  {formatDate(departureDate, isVi ? 'vi-VN' : 'en-US')}
                </p>
              </div>
            </div>

            <ScheduleResults
              schedules={schedules}
              locale={currentLocale}
              onSelect={handleScheduleSelect}
              isLoading={isLoading}
              isSearching={isSearching}
            />
          </div>
        )}

        {/* Step 3: Passenger Info + Booking Summary */}
        {step === 'passenger' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('schedule')}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">
                  {stepLabels.passenger}
                </h2>
              </div>

              <PassengerForm
                passengers={passengers}
                locale={currentLocale}
                onUpdate={setPassengers}
              />

              {/* Confirm Button */}
              <button
                onClick={handleConfirmBooking}
                disabled={!canProceed() || isLoading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all',
                  canProceed() && !isLoading
                    ? 'bg-violet-950 hover:bg-violet-900 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t('processing')}</>
                ) : (
                  <>{isVi ? 'Xác nhận đặt vé' : 'Confirm Booking'}<ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>

            <div>
              <BookingSummary
                schedule={selectedSchedule}
                selectedSeatClass={selectedSeatClass}
                seatPrice={selectedPrice}
                passengers={passengers}
                departureDate={departureDate}
                isRoundTrip={tripType === 'roundTrip'}
                returnDate={returnDate}
                locale={currentLocale}
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirmation' && (
          <ConfirmationStep
            bookingRef={bookingRef}
            schedule={selectedSchedule}
            selectedSeatClass={selectedSeatClass}
            seatPrice={selectedPrice}
            passengers={passengers}
            departureDate={departureDate}
            isRoundTrip={tripType === 'roundTrip'}
            returnDate={returnDate}
            totalAmount={Math.round(total)}
            locale={currentLocale}
          />
        )}
      </div>
    </div>
  )
}

function BookingPageContent({ locale }: { locale: string }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <BookingContent locale={locale} />
    </Suspense>
  )
}

export default BookingPageContent

function generateRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let ref = 'VT-'
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return ref
}
