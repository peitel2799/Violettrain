'use client'

import { Suspense, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  LockKeyhole,
  MessageCircle,
  MapPin,
  Search,
  TicketCheck,
} from 'lucide-react'
import { cn, getDsvnStationCode } from '@/lib/utils'
import { BOOKABLE_STATIONS, STATION_NAMES } from '@/lib/constants'
import ScheduleResults from '@/components/booking/ScheduleResults'
import type { CheckoutOrder } from '@/components/booking/CheckoutStep'
import type { ManualPaymentInfo } from '@/lib/manual-payment'
import { normalizeWhatsapp } from '@/lib/whatsapp'
import TrainExperienceStrip from '@/components/booking/TrainExperienceStrip'
import { fetchSchedules } from '@/components/booking/schedule-client'
import type { DsvnSchedule, BookingPassenger, BookingStep } from '@/lib/types'

const PassengerForm = dynamic(() => import('@/components/booking/PassengerForm'))
const BookingSummary = dynamic(() => import('@/components/booking/BookingSummary'))
const ConfirmationStep = dynamic(() => import('@/components/booking/ConfirmationStep'))
const CheckoutStep = dynamic(() => import('@/components/booking/CheckoutStep'))

const STATIONS = BOOKABLE_STATIONS

class SoldOutError extends Error {}

const STEPS = ['schedule', 'passenger', 'checkout', 'confirmation'] as const

function BookingContent({ locale }: { locale: string }) {
  const t = useTranslations('booking')
  const tForm = useTranslations('booking.form')
  const searchParams = useSearchParams()

  const [step, setStep] = useState<BookingStep>('select')
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [schedules, setSchedules] = useState<DsvnSchedule[]>([])
  const [returnSchedules, setReturnSchedules] = useState<DsvnSchedule[]>([])
  const [error, setError] = useState('')

  // Form state
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')
  const [departureDate, setDepartureDate] = useState(
    searchParams.get('date') || today
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
  const [selectedReturnSchedule, setSelectedReturnSchedule] = useState<DsvnSchedule>()
  const [selectedReturnPrice, setSelectedReturnPrice] = useState<number>()
  const [passengers, setPassengers] = useState<BookingPassenger[]>([
    { type: 'adult', fullName: '', email: '', phone: '' },
  ])
  const [bookingRef, setBookingRef] = useState('')
  const [confirmedTotal, setConfirmedTotal] = useState<number>()
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder>()
  const [whatsapp, setWhatsapp] = useState('')
  const [whatsappTouched, setWhatsappTouched] = useState(false)
  const [manualPayment, setManualPayment] = useState<ManualPaymentInfo>()
  const whatsappE164 = normalizeWhatsapp(whatsapp)
  // One key per distinct selection: retries of the same request reuse it, but a changed
  // train/cabin/passenger list (or an expired hold) must create a new order, not replay the old one.
  const idempotencyRef = useRef<{ fingerprint: string; key: string; expiresAt?: string } | null>(null)
  const currentLocale = locale === 'en' ? 'en' : 'vi'

  const isVi = currentLocale === 'vi'

  const handleSwapStations = () => {
    setFrom(to)
    setTo(from)
    setSchedules([])
    setStep('select')
  }

  const currentStepIndex = step === 'select' || step === 'returnSchedule'
    ? 0
    : STEPS.indexOf(step as (typeof STEPS)[number])

  const canProceed = (() => {
    if (step === 'select') {
      return Boolean(
        from &&
        to &&
        from !== to &&
        departureDate &&
        (tripType === 'oneWay' || returnDate)
      )
    }
    if (step === 'schedule') return selectedSchedule && selectedSeatClass && selectedPrice
    if (step === 'returnSchedule') return selectedReturnSchedule && selectedReturnPrice
    if (step === 'passenger') {
      return passengers.length > 0 && passengers.every(
        (p) => p.fullName.trim() && p.email.includes('@') && p.phone.length >= 8
      ) && Boolean(whatsappE164)
    }
    return true
  })()

  const handleSearch = async () => {
    if (!from || !to || !departureDate) return
    if (from === to) {
      setError(isVi ? 'Ga đi và ga đến phải khác nhau.' : 'Departure and arrival stations must be different.')
      return
    }
    if (tripType === 'roundTrip' && !returnDate) {
      setError(isVi ? 'Vui lòng chọn ngày về.' : 'Please select a return date.')
      return
    }

    setIsLoading(true)
    setIsSearching(true)
    setError('')
    setSchedules([])
    setReturnSchedules([])
    setSelectedSchedule(undefined)
    setSelectedReturnSchedule(undefined)
    setSelectedPrice(undefined)
    setSelectedReturnPrice(undefined)

    try {
      const fromCode = getDsvnStationCode(from) || from.toUpperCase()
      const toCode = getDsvnStationCode(to) || to.toUpperCase()
      const outboundRequest = fetchSchedules({
        from: fromCode,
        to: toCode,
        date: departureDate,
        locale: currentLocale,
      })
      const returnRequest = tripType === 'roundTrip'
        ? fetchSchedules({
            from: toCode,
            to: fromCode,
            date: returnDate,
            locale: currentLocale,
          })
        : Promise.resolve([] as DsvnSchedule[])
      const [outbound, inbound] = await Promise.all([outboundRequest, returnRequest])

      setSchedules(outbound)
      setReturnSchedules(inbound)
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
    setSelectedReturnSchedule(undefined)
    setSelectedReturnPrice(undefined)

    if (tripType === 'roundTrip') {
      setError('')
      setStep('returnSchedule')
      return
    }

    setStep('passenger')
  }

  const handleReturnScheduleSelect = (
    schedule: DsvnSchedule,
    cabinClass: string,
    price: number
  ) => {
    if (cabinClass !== selectedSeatClass) return
    setSelectedReturnSchedule(schedule)
    setSelectedReturnPrice(price)
    setStep('passenger')
  }

  const handleConfirmBooking = async () => {
    if (!canProceed) return

    setIsLoading(true)
    setError('')
    const primaryEmail = passengers[0]?.email
    const primaryPhone = passengers[0]?.phone || ''

    try {
      // The server validates the selected DSVN service and recalculates the route fare.
      const requestBody = {
          routeId: `${from}-${to}`,
          departureId: selectedSchedule?.departureId,
          returnDepartureId: tripType === 'roundTrip' ? selectedReturnSchedule?.departureId : undefined,
          cabinClassId: selectedSeatClass || '',
          departureDate,
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
          contact: { email: primaryEmail, phone: primaryPhone, whatsapp: whatsappE164 ?? undefined },
          locale: currentLocale,
      }
      const fingerprint = JSON.stringify(requestBody)
      const previous = idempotencyRef.current
      const reusable = previous?.fingerprint === fingerprint
        && (!previous.expiresAt || Date.parse(previous.expiresAt) > Date.now())
      if (!reusable) idempotencyRef.current = { fingerprint, key: crypto.randomUUID() }

      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, idempotencyKey: idempotencyRef.current!.key }),
      })
      const bookingResult = await bookingResponse.json()
      if (bookingResponse.status === 409) {
        idempotencyRef.current = null
        throw new SoldOutError(bookingResult.error || 'Sold out')
      }
      if (!bookingResponse.ok || !bookingResult.booking?.reference) {
        throw new Error(bookingResult.error || 'Unable to save booking request')
      }
      if (bookingResult.booking.expiresAt && idempotencyRef.current) {
        idempotencyRef.current.expiresAt = bookingResult.booking.expiresAt
      }

      const ref = bookingResult.booking.reference as string
      const trustedPricing = bookingResult.booking.pricing as {
        subtotal: number
        tax: number
        total: number
      }
      setBookingRef(ref)
      setConfirmedTotal(trustedPricing.total)
      if (bookingResult.manualPayment) {
        // Payments are handled by PayPal transfer for now: show the instructions that were emailed.
        setManualPayment(bookingResult.manualPayment as ManualPaymentInfo)
        setStep('confirmation')
      } else if (bookingResult.booking.verificationToken && bookingResult.booking.expiresAt) {
        setCheckoutOrder({
          reference: ref,
          verificationToken: bookingResult.booking.verificationToken,
          expiresAt: bookingResult.booking.expiresAt,
          pricing: trustedPricing,
        })
        setStep('checkout')
      } else {
        setStep('confirmation')
      }
    } catch (err) {
      console.error('[handleConfirmBooking]', err)
      setError(err instanceof SoldOutError
        ? (isVi
          ? 'Cabin bạn chọn vừa được khách khác đặt hoặc chuyến đã đóng bán. Vui lòng quay lại chọn chuyến khác.'
          : 'The cabin you selected was just booked or the departure is no longer on sale. Please go back and choose another departure.')
        : isVi
        ? 'Không thể lưu yêu cầu đặt vé. Vui lòng kiểm tra thông tin và thử lại.'
        : 'We could not save your booking request. Please check the details and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const subtotal = selectedPrice
    ? selectedPrice + (tripType === 'roundTrip' ? (selectedReturnPrice || 0) : 0)
    : 0
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  const stepLabels: Record<string, string> = {
    schedule: isVi ? 'Chọn chuyến' : 'Choose train',
    passenger: t('steps.passengerInfo'),
    // With manual PayPal the payment happens after this page, so that step stays open.
    checkout: manualPayment ? (isVi ? 'Chờ chuyển khoản PayPal' : 'Awaiting PayPal transfer') : (isVi ? 'Thanh toán' : 'Payment'),
    confirmation: t('steps.confirmation'),
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f5f3f0] pt-16 sm:pt-[72px]">
      {step === 'passenger' || step === 'checkout' || step === 'confirmation' ? (
        <div className="sticky top-16 z-10 border-b border-gray-100 bg-white/95 backdrop-blur sm:top-20">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <div className="flex items-center justify-center gap-2">
              {STEPS.map((s, idx) => {
                const activeIndex = manualPayment ? STEPS.indexOf('checkout') : currentStepIndex
                const isCompleted = idx < activeIndex
                const isCurrent = idx === activeIndex
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        isCompleted
                          ? 'bg-violet-100 text-violet-700'
                          : isCurrent
                            ? 'bg-gold-500 text-violet-950'
                            : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px]">
                          {idx + 1}
                        </span>
                      )}
                      <span>{stepLabels[s]}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {step === 'select' || step === 'schedule' ? (
        <section className="relative min-h-[350px] overflow-hidden sm:min-h-[410px] lg:min-h-[440px]">
          <Image
            src="/premium_room/outside2.JPG"
            alt={isVi ? 'Toa tàu Violette tại sân ga' : 'Violette Train carriage at the station'}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[66%_55%] sm:object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,8,31,.94)_0%,rgba(28,10,39,.78)_42%,rgba(24,10,34,.18)_76%,rgba(24,10,34,.3)_100%)]" />
          <div className="relative mx-auto flex min-h-[350px] max-w-7xl items-start px-4 pb-28 pt-12 sm:min-h-[410px] sm:items-center sm:px-6 sm:pb-32 sm:pt-8 lg:min-h-[440px] lg:px-8">
            <div className="max-w-xl text-white">
              <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-[#efd890]">
                <span className="h-px w-9 bg-[#d2a84a]" aria-hidden="true" />
                {isVi ? 'Violette Train · Cabin riêng' : 'Violette Train · Private cabins'}
              </div>
              <h1 className="max-w-[13ch] font-serif text-[2.45rem] font-bold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.65rem]">
                {isVi ? 'Hành trình bắt đầu từ một cabin riêng.' : 'Your journey starts in a private cabin.'}
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/78 sm:text-base">
                {isVi
                  ? 'Chọn ngày đi, so sánh giờ tàu và xem ngay giá 1 vé cùng tổng giá trọn cabin 4 vé.'
                  : 'Choose your date, compare train times, and see both the one-ticket fare and full four-ticket cabin total.'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(
        'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
        step === 'select' || step === 'schedule' ? 'relative z-10 -mt-24 pb-16 sm:-mt-28' : 'py-8 sm:py-10'
      )}>
        {step === 'select' || step === 'schedule' ? (
          <div>
            <section
              aria-label={isVi ? 'Tìm chuyến tàu' : 'Train search'}
              className="mb-6 overflow-hidden rounded-[26px] bg-white shadow-[0_28px_80px_rgba(27,13,38,0.2)] ring-1 ring-black/5 sm:mb-8"
            >
              <div className="flex border-b border-[#e9e5eb] px-4 sm:px-6">
                {(['oneWay', 'roundTrip'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTripType(type)
                      setError('')
                    }}
                    className={cn(
                      'relative min-h-14 px-3 text-sm font-bold transition-colors sm:px-5',
                      tripType === type ? 'text-[#2b1538]' : 'text-[#8c8491] hover:text-[#44224f]'
                    )}
                    aria-pressed={tripType === type}
                  >
                    {type === 'oneWay' ? t('oneWay') : t('roundTrip')}
                    {tripType === type ? (
                      <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-[#c89b3c]" />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)_minmax(13rem,.9fr)_auto] lg:items-end lg:p-6">
                <SearchField label={tForm('from')} icon={<MapPin className="h-4 w-4" />}>
                  <select
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value)
                      setStep('select')
                      setError('')
                    }}
                    className="block h-14 w-full min-w-0 max-w-full appearance-none bg-transparent px-4 pb-1 pt-6 text-[15px] font-extrabold text-[#291535] outline-none"
                    aria-label={tForm('from')}
                  >
                    <option value="">{t('selectDeparture')}</option>
                    {STATIONS.map((station) => (
                      <option key={station} value={station} disabled={station === to}>
                        {isVi ? STATION_NAMES[station].vi : STATION_NAMES[station].en}
                      </option>
                    ))}
                  </select>
                </SearchField>

                <button
                  type="button"
                  onClick={handleSwapStations}
                  className="mx-auto flex h-11 w-11 rotate-90 items-center justify-center rounded-full border border-[#ddd7e0] bg-[#f6f3f7] text-[#5a3266] transition-colors hover:border-[#c89b3c] hover:bg-[#fbf4e4] lg:mb-1.5 lg:rotate-0"
                  title={t('swapStations')}
                  aria-label={t('swapStations')}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>

                <SearchField label={tForm('to')} icon={<MapPin className="h-4 w-4" />}>
                  <select
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value)
                      setStep('select')
                      setError('')
                    }}
                    className="block h-14 w-full min-w-0 max-w-full appearance-none bg-transparent px-4 pb-1 pt-6 text-[15px] font-extrabold text-[#291535] outline-none"
                    aria-label={tForm('to')}
                  >
                    <option value="">{t('selectDestination')}</option>
                    {STATIONS.map((station) => (
                      <option key={station} value={station} disabled={station === from}>
                        {isVi ? STATION_NAMES[station].vi : STATION_NAMES[station].en}
                      </option>
                    ))}
                  </select>
                </SearchField>

                <div className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3', tripType === 'roundTrip' && 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2')}>
                  <SearchField label={tForm('departureDate')} icon={<CalendarDays className="h-4 w-4" />}>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(event) => {
                        setDepartureDate(event.target.value)
                        if (returnDate && event.target.value > returnDate) setReturnDate('')
                        setStep('select')
                        setError('')
                      }}
                      min={today}
                      className="block h-14 w-full min-w-0 max-w-full appearance-none bg-transparent px-4 pb-1 pt-6 text-[15px] font-extrabold text-[#291535] outline-none [color-scheme:light]"
                      aria-label={tForm('departureDate')}
                    />
                  </SearchField>

                  {tripType === 'roundTrip' ? (
                    <SearchField label={tForm('returnDate')} icon={<CalendarDays className="h-4 w-4" />}>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(event) => {
                          setReturnDate(event.target.value)
                          setStep('select')
                          setError('')
                        }}
                        min={departureDate || today}
                        className="block h-14 w-full min-w-0 max-w-full appearance-none bg-transparent px-4 pb-1 pt-6 text-[15px] font-extrabold text-[#291535] outline-none [color-scheme:light]"
                        aria-label={tForm('returnDate')}
                      />
                    </SearchField>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isLoading || !from || !to || from === to || !departureDate || (tripType === 'roundTrip' && !returnDate)}
                  className="flex h-14 w-full min-w-0 items-center justify-center gap-2 rounded-[14px] bg-[#2b1538] px-6 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(43,21,56,.2)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#44224f] disabled:cursor-not-allowed disabled:bg-[#ded9e0] disabled:text-[#918895] disabled:shadow-none disabled:hover:translate-y-0 lg:w-auto lg:min-w-40"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t('searching')}</>
                  ) : (
                    <><Search className="h-4 w-4" />{t('searchTrains')}</>
                  )}
                </button>
              </div>
            </section>

            <TrainExperienceStrip locale={currentLocale} />

            <div className="mb-8 grid gap-px overflow-hidden rounded-2xl border border-[#e4dfe6] bg-[#e4dfe6] sm:grid-cols-3">
              <BookingAssurance
                icon={<TicketCheck className="h-5 w-5" />}
                title={isVi ? 'Giá hiển thị rõ ràng' : 'Clear pricing'}
                detail={isVi ? '1 vé và trọn cabin 4 vé' : 'One ticket and full 4-ticket cabin'}
              />
              <BookingAssurance
                icon={<LockKeyhole className="h-5 w-5" />}
                title={isVi ? 'Cabin riêng tư' : 'A private cabin'}
                detail={isVi ? 'Mua nguyên cabin, không ghép khách' : 'The whole cabin, never shared'}
              />
              <BookingAssurance
                icon={<Headphones className="h-5 w-5" />}
                title={isVi ? 'Cần hỗ trợ đặt vé?' : 'Need booking help?'}
                detail="0915 823 667"
                href="tel:0915823667"
              />
            </div>

            {error ? (
              <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            {step === 'schedule' ? (
              <ScheduleResults
                schedules={schedules}
                locale={currentLocale}
                onSelect={handleScheduleSelect}
                isLoading={isLoading}
                isSearching={isSearching}
              />
            ) : (
              <div className="rounded-[24px] border border-[#e0dbe2] bg-[#fbfaf8] px-5 py-10 text-center shadow-[0_16px_50px_rgba(37,25,43,.05)] sm:py-12">
                <TrainSearchHint locale={currentLocale} />
              </div>
            )}
          </div>
        ) : null}

        {step === 'returnSchedule' ? (
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={() => setStep('schedule')}
              className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-600 hover:text-violet-800"
            >
              <ChevronLeft className="h-4 w-4" />
              {isVi ? 'Đổi chuyến đi' : 'Change outbound train'}
            </button>
            <div className="mb-6 rounded-2xl bg-violet-950 p-5 text-white sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-gold-300">{isVi ? 'Chuyến đi đã chọn' : 'Selected outbound'}</p>
                <p className="mt-1 text-lg font-bold">{selectedSchedule?.trainNumber} · {selectedSchedule?.fromStation} → {selectedSchedule?.toStation}</p>
              </div>
              <p className="mt-2 text-sm text-white/70 sm:mt-0">{departureDate} · {selectedSchedule?.departureTime}</p>
            </div>
            <div className="mb-5">
              <h1 className="font-serif text-3xl font-bold text-violet-950">{isVi ? 'Chọn chuyến về' : 'Choose your return train'}</h1>
              <p className="mt-2 text-sm text-gray-600">{isVi ? `${STATION_NAMES[to]?.vi} → ${STATION_NAMES[from]?.vi} · ${returnDate}` : `${STATION_NAMES[to]?.en} → ${STATION_NAMES[from]?.en} · ${returnDate}`}</p>
            </div>
            {error ? <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
            <ScheduleResults
              schedules={returnSchedules}
              locale={currentLocale}
              onSelect={handleReturnScheduleSelect}
              isLoading={isLoading}
              isSearching={isSearching}
              productFilter={selectedSeatClass}
            />
          </div>
        ) : null}

        {/* Step 3: Passenger Info + Booking Summary */}
        {step === 'passenger' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(tripType === 'roundTrip' ? 'returnSchedule' : 'schedule')}
                  className="rounded-full border border-[#ded8e1] bg-white p-2.5 hover:bg-[#faf7fb]"
                >
                  <ChevronLeft className="h-5 w-5 text-[#633671]" />
                </button>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-[#2b1538]">
                  {stepLabels.passenger}
                </h2>
              </div>

              <div className="rounded-[22px] border border-[#dfd9e2] bg-white p-5 shadow-[0_12px_35px_rgba(37,25,43,.06)] sm:p-6">
                <label htmlFor="booking-whatsapp" className="flex items-center gap-2.5 font-extrabold text-[#2b1538]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7f8ee] text-[#128c4a]"><MessageCircle className="h-4 w-4" /></span>
                  {isVi ? 'Số WhatsApp liên hệ' : 'WhatsApp number'} <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <p id="booking-whatsapp-help" className="mt-2 text-sm leading-6 text-[#6f6674]">
                  {isVi
                    ? 'Nhập kèm mã quốc gia, ví dụ +84 912 345 678 (số Việt Nam có thể bắt đầu bằng 0). Chúng tôi dùng số này để xác nhận thanh toán và hướng dẫn lên tàu.'
                    : 'Include your country code, e.g. +44 7911 123456. We use it to confirm your payment and share boarding details.'}
                </p>
                <input
                  id="booking-whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  onBlur={() => setWhatsappTouched(true)}
                  aria-invalid={whatsappTouched && !whatsappE164 ? true : undefined}
                  aria-describedby="booking-whatsapp-help booking-whatsapp-error"
                  placeholder={isVi ? '+84 912 345 678' : '+44 7911 123456'}
                  className={cn(
                    'mt-3 h-12 w-full rounded-xl border bg-white px-4 text-base outline-none focus:ring-2 focus:ring-[#c89b3c]',
                    whatsappTouched && !whatsappE164 ? 'border-red-300' : 'border-[#ded8e1]'
                  )}
                />
                {whatsappTouched && !whatsappE164 ? (
                  <p id="booking-whatsapp-error" role="alert" className="mt-2 text-sm text-red-600">
                    {isVi ? 'Số WhatsApp chưa đúng. Hãy nhập kèm mã quốc gia, ví dụ +84…' : 'Please enter a valid number with country code, e.g. +44…'}
                  </p>
                ) : null}
              </div>

              <PassengerForm
                passengers={passengers}
                locale={currentLocale}
                onUpdate={setPassengers}
              />

              {/* Confirm Button */}
              <button
                onClick={handleConfirmBooking}
                disabled={!canProceed || isLoading}
                className={cn(
                  'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors',
                  canProceed && !isLoading
                    ? 'bg-[#2b1538] text-white shadow-[0_12px_28px_rgba(43,21,56,.18)] hover:bg-[#44224f]'
                    : 'cursor-not-allowed bg-[#ded9e0] text-[#918895]'
                )}
              >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{t('processing')}</>
                  ) : (
                    <>{t('confirmBooking')}<ChevronRight className="w-4 h-4" /></>
                  )}
              </button>
              {error && (
                <p role="alert" className="text-center text-sm text-red-600">{error}</p>
              )}
            </div>

            <div>
              <BookingSummary
                schedule={selectedSchedule}
                returnSchedule={selectedReturnSchedule}
                selectedSeatClass={isVi ? selectedSeatClassVi : selectedSeatClassEn}
                seatPrice={selectedPrice}
                returnSeatPrice={selectedReturnPrice}
                passengers={passengers}
                departureDate={departureDate}
                isRoundTrip={tripType === 'roundTrip'}
                returnDate={returnDate}
                locale={currentLocale}
              />
            </div>
          </div>
        )}

        {step === 'checkout' && checkoutOrder ? (
          <CheckoutStep
            order={checkoutOrder}
            locale={currentLocale}
            onBack={() => setStep('passenger')}
          />
        ) : null}

        {/* Step 4: Confirmation */}
        {step === 'confirmation' && (
          <ConfirmationStep
            bookingRef={bookingRef}
            schedule={selectedSchedule}
            selectedSeatClass={isVi ? selectedSeatClassVi : selectedSeatClassEn}
            seatPrice={selectedPrice}
            passengers={passengers}
            departureDate={departureDate}
            isRoundTrip={tripType === 'roundTrip'}
            returnDate={returnDate}
            totalAmount={confirmedTotal ?? Math.round(total)}
            manualPayment={manualPayment}
            locale={currentLocale}
          />
        )}
      </div>
    </div>
  )
}

function SearchField({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <label className="relative block min-w-0 overflow-hidden rounded-[14px] bg-[#faf9fa] ring-1 ring-inset ring-[#ded9e0] transition-[background-color,box-shadow] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#c89b3c]">
      <span className="pointer-events-none absolute left-4 top-2.5 flex items-center gap-1.5 text-[10px] font-bold text-[#756c7a]">
        <span className="text-[#754382]" aria-hidden="true">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  )
}

function BookingAssurance({
  icon,
  title,
  detail,
  href,
}: {
  icon: ReactNode
  title: string
  detail: string
  href?: string
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1e9f3] text-[#60326c]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-[#2a2030]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[#746c78]">{detail}</span>
      </span>
    </>
  )

  const className = 'flex min-h-[82px] items-center gap-3 bg-[#fbfaf8] px-5 py-4'
  return href ? <a href={href} className={`${className} hover:bg-white`}>{content}</a> : <div className={className}>{content}</div>
}

function TrainSearchHint({ locale }: { locale: 'vi' | 'en' }) {
  const isVi = locale === 'vi'

  return (
    <div className="mx-auto max-w-lg py-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#ded7e1] bg-white text-[#633671] shadow-sm">
        <Search className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-5 text-lg font-extrabold text-[#2b1538]">
        {isVi ? 'Chọn hành trình để xem danh sách tàu' : 'Choose a journey to see available trains'}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#756d79]">
        {isVi
          ? 'Mỗi kết quả hiển thị giờ chạy, thời gian hành trình và giá cabin rõ ràng.'
          : 'Each result clearly shows its times, journey duration and cabin fare.'}
      </p>
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
