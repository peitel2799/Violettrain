'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle, Printer, Home, Mail, Ticket, Phone } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DsvnSchedule, BookingPassenger } from '@/lib/types'

interface ConfirmationStepProps {
  bookingRef: string
  schedule?: DsvnSchedule
  selectedSeatClass?: string
  seatPrice?: number
  passengers: BookingPassenger[]
  departureDate: string
  isRoundTrip?: boolean
  returnDate?: string
  totalAmount: number
  locale: 'vi' | 'en'
}

export default function ConfirmationStep({
  bookingRef,
  schedule,
  selectedSeatClass,
  seatPrice,
  passengers,
  departureDate,
  isRoundTrip,
  returnDate,
  totalAmount,
  locale,
}: ConfirmationStepProps) {
  const isVi = locale === 'vi'

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isVi ? 'Đặt vé thành công!' : 'Booking Confirmed!'}
      </h2>
      <p className="text-gray-500 mb-6">
        {isVi
          ? 'Cảm ơn bạn đã đặt vé. Nhân viên Violette Train sẽ liên hệ bạn sớm nhất để xác nhận và hướng dẫn thanh toán.'
          : 'Thank you for your booking. Violette Train staff will contact you soon to confirm and guide you through payment.'}
      </p>

      {/* Booking Reference */}
      <div className="bg-violet-50 rounded-xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wider text-violet-500 mb-1">
          {isVi ? 'Mã đặt chỗ' : 'Booking Reference'}
        </p>
        <p className="text-3xl font-bold text-violet-900 tracking-widest">{bookingRef}</p>
      </div>

      {/* Itinerary */}
      {schedule && (
        <div className="bg-white rounded-xl border border-gray-100 text-left overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-violet-500" />
              <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                {isVi ? 'Hành trình' : 'Itinerary'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isVi ? 'Tuyến đường' : 'Route'}</span>
                <span className="font-medium">{schedule.fromStation} → {schedule.toStation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isVi ? 'Chuyến tàu' : 'Train'}</span>
                <span className="font-medium">{schedule.trainNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isVi ? 'Khởi hành' : 'Departure'}</span>
                <span className="font-medium">
                  {formatDate(departureDate, locale === 'vi' ? 'vi-VN' : 'en-US')} · {schedule.departureTime}
                </span>
              </div>
              {isRoundTrip && returnDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{isVi ? 'Khứ hồi' : 'Return'}</span>
                  <span className="font-medium">{formatDate(returnDate, locale === 'vi' ? 'vi-VN' : 'en-US')}</span>
                </div>
              )}
              {selectedSeatClass && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{isVi ? 'Hạng ghế' : 'Cabin'}</span>
                  <span className="font-medium">{selectedSeatClass}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-b border-gray-100">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">
              {isVi ? 'Hành khách' : 'Passengers'}
            </p>
            <div className="space-y-2">
              {passengers.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {p.type === 'child' ? (isVi ? 'Trẻ em' : 'Child') : (isVi ? 'Người lớn' : 'Adult')}
                  </span>
                  <span className="font-medium">{p.fullName}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-gray-50">
            <div className="flex justify-between items-end">
              <span className="font-semibold text-gray-700">{isVi ? 'Tổng tiền' : 'Total Amount'}</span>
              <span className="text-xl font-bold text-violet-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin will contact notice */}
      <div className="bg-amber-50 rounded-xl p-4 mb-6 flex items-center gap-3 text-left">
        <Phone className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          {isVi
            ? 'Nhân viên Violette Train sẽ liên hệ bạn qua email hoặc điện thoại để xác nhận và hướng dẫn thanh toán trong vòng 24 giờ.'
            : 'Violette Train staff will contact you via email or phone within 24 hours to confirm and guide you through payment.'}
        </p>
      </div>

      {/* Email notice */}
      <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-center gap-3 text-left">
        <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          {isVi
            ? 'Email xác nhận đã được gửi đến địa chỉ email của bạn. Vui lòng kiểm tra hộp thư.'
            : 'A confirmation email has been sent to your email address. Please check your inbox.'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => typeof window !== 'undefined' && window.print()}
          className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          {isVi ? 'In đặt vé' : 'Print Booking'}
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-violet-950 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-gold-500/25"
        >
          <Home className="w-4 h-4" />
          {isVi ? 'Về trang chủ' : 'Back to Home'}
        </Link>
      </div>

      {/* Contact */}
      <p className="text-xs text-gray-400 mt-8">
        {isVi
          ? 'Cần hỗ trợ? Liên hệ 1900 2695 hoặc info@violettetrain.vn'
          : 'Need help? Call 1900 2695 or email info@violettetrain.vn'}
      </p>
    </div>
  )
}
