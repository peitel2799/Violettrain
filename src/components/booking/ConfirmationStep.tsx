'use client'

import { CheckCircle, Printer, Home, Mail, Ticket, Phone, Clock3, MessageCircle, ExternalLink } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DsvnSchedule, BookingPassenger } from '@/lib/types'
import type { ManualPaymentInfo } from '@/lib/manual-payment'
import { formatWhatsapp, whatsappLink } from '@/lib/whatsapp'

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
  /** Present when payment is a manual PayPal transfer (no online checkout). */
  manualPayment?: ManualPaymentInfo
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
  manualPayment,
}: ConfirmationStepProps) {
  const isVi = locale === 'vi'
  const deadline = manualPayment
    ? new Intl.DateTimeFormat(isVi ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' }).format(new Date(manualPayment.deadline))
    : ''

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {manualPayment
          ? (isVi ? 'Đã giữ cabin cho bạn!' : 'Your cabin is on hold!')
          : (isVi ? 'Yêu cầu đặt vé đã được gửi!' : 'Booking Request Received!')}
      </h2>
      <p className="text-gray-500 mb-6">
        {manualPayment
          ? (isVi
            ? 'Vui lòng chuyển khoản qua PayPal theo hướng dẫn bên dưới. Cabin được xác nhận ngay khi chúng tôi nhận được tiền.'
            : 'Please pay by PayPal using the instructions below. Your cabin is confirmed as soon as we receive the payment.')
          : (isVi
            ? 'Cảm ơn bạn đã gửi yêu cầu đặt vé. Nhân viên Violette Train sẽ liên hệ bạn qua email hoặc điện thoại để xác nhận trong thời gian sớm nhất.'
            : 'Thank you for submitting your booking request. Violette Train staff will contact you via email or phone to confirm your booking shortly.')}
      </p>

      {/* Booking Reference */}
      <div className="bg-violet-50 rounded-xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wider text-violet-500 mb-1">
          {isVi ? 'Mã đặt chỗ' : 'Booking Reference'}
        </p>
        <p className="text-3xl font-bold text-violet-900 tracking-widest">{bookingRef}</p>
        {manualPayment ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-violet-800">
            <Clock3 className="h-4 w-4" />
            {isVi ? 'Giữ cabin đến' : 'Held until'} <strong>{deadline}</strong>
          </p>
        ) : null}
      </div>

      {manualPayment ? (
        <section className="mb-6 rounded-2xl border border-[#b3d7f2] bg-[#f2f8fd] p-5 text-left" aria-label={isVi ? 'Hướng dẫn thanh toán PayPal' : 'PayPal payment instructions'}>
          <h3 className="text-lg font-bold text-[#003087]">{isVi ? 'Thanh toán qua PayPal' : 'Pay with PayPal'}</h3>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{isVi ? 'Số tiền cần chuyển' : 'Amount to send'}</p>
              <p className="text-3xl font-black text-[#0070ba]">
                {manualPayment.usdAmount != null ? `${manualPayment.usdAmount.toFixed(2)} USD` : formatCurrency(manualPayment.totalVnd)}
              </p>
              {manualPayment.usdAmount != null && manualPayment.vndPerUsd ? (
                <p className="text-xs text-slate-500">= {formatCurrency(manualPayment.totalVnd)} · 1 USD = {formatCurrency(manualPayment.vndPerUsd)}</p>
              ) : null}
            </div>
            {manualPayment.paypalLink ? (
              <a
                href={manualPayment.paypalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#0070ba] px-6 text-sm font-bold text-white hover:bg-[#005ea6]"
              >
                {isVi ? 'Mở PayPal để thanh toán' : 'Open PayPal to pay'} <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
            {manualPayment.paypalEmail ? (
              <li>{isVi ? 'Gửi tiền tới tài khoản PayPal' : 'Send the money to PayPal account'} <strong className="break-all">{manualPayment.paypalEmail}</strong></li>
            ) : null}
            <li>{isVi ? 'Ghi mã đặt chỗ' : 'Write your booking reference'} <strong>{bookingRef}</strong> {isVi ? 'trong phần ghi chú của PayPal.' : 'in the PayPal note.'}</li>
            <li>{isVi ? 'Hoàn tất trước' : 'Pay before'} <strong>{deadline}</strong>{isVi ? '. Sau thời hạn này cabin có thể được mở bán lại.' : '. After that the cabin may be released.'}</li>
            {manualPayment.usdAmount == null ? (
              <li>{isVi ? 'Nhân viên sẽ nhắn số tiền cần chuyển qua WhatsApp cho bạn.' : 'Our team will message you the exact amount on WhatsApp.'}</li>
            ) : null}
          </ol>
        </section>
      ) : null}

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
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="text-gray-500">{isVi ? 'Loại cabin' : 'Cabin'}</span>
                  <span className="font-medium">{selectedSeatClass}</span>
                </div>
              )}
              {seatPrice ? (
                <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-gray-500">{isVi ? 'Giá 1 vé' : '1 ticket'}</span>
                    <span className="font-bold text-gray-800">{formatCurrency(seatPrice / 4)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-violet-700">{isVi ? 'Giá 1 cabin (4 vé)' : '1 cabin (4 tickets)'}</span>
                    <span className="text-lg font-bold text-violet-950">{formatCurrency(seatPrice)}</span>
                  </div>
                </div>
              ) : null}
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

      {manualPayment ? (
        <>
          {/* Email notice: only claims delivery when the server actually sent it */}
          <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 text-left ${manualPayment.emailSent ? 'bg-blue-50' : 'bg-amber-50'}`}>
            <Mail className={`w-5 h-5 flex-shrink-0 ${manualPayment.emailSent ? 'text-blue-500' : 'text-amber-500'}`} />
            <p className={`text-sm ${manualPayment.emailSent ? 'text-blue-700' : 'text-amber-800'}`}>
              {manualPayment.emailSent
                ? (isVi
                  ? <>Hướng dẫn thanh toán đã được gửi tới <strong>{manualPayment.contactEmail}</strong>. Nếu không thấy, hãy kiểm tra mục Spam/Quảng cáo.</>
                  : <>Payment instructions were sent to <strong>{manualPayment.contactEmail}</strong>. If you cannot find them, check your spam folder.</>)
                : (isVi
                  ? 'Chưa gửi được email hướng dẫn. Bạn vẫn có thể thanh toán theo thông tin trên; nhân viên sẽ liên hệ qua WhatsApp.'
                  : 'We could not send the instruction email yet. You can still pay using the details above; our team will contact you on WhatsApp.')}
            </p>
          </div>
          {manualPayment.companyWhatsapp ? (
            <a
              href={whatsappLink(manualPayment.companyWhatsapp, `${isVi ? 'Xin chào Violette Train, mã đặt chỗ của tôi là' : 'Hello Violette Train, my booking reference is'} ${bookingRef}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-[#25d366] bg-[#effcf4] p-4 text-sm font-bold text-[#128c4a] hover:bg-[#e2f9eb]"
            >
              <MessageCircle className="h-5 w-5" />
              {isVi ? 'Nhắn WhatsApp cho Violette Train' : 'Message Violette Train on WhatsApp'} · {formatWhatsapp(manualPayment.companyWhatsapp)}
            </a>
          ) : null}
        </>
      ) : (
        <div className="bg-amber-50 rounded-xl p-4 mb-6 flex items-center gap-3 text-left">
          <Phone className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {isVi
              ? 'Nhân viên Violette Train sẽ liên hệ bạn qua email hoặc điện thoại trong vòng 24 giờ để xác nhận yêu cầu đặt vé của bạn.'
              : 'Violette Train staff will contact you via email or phone within 24 hours to confirm your booking request.'}
          </p>
        </div>
      )}

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
          ? 'Cần hỗ trợ? Liên hệ 091 582 3667 / 0947 163 497 hoặc violettetrains@gmail.com'
          : 'Need help? Call 091 582 3667 / 0947 163 497 or email violettetrains@gmail.com'}
      </p>
    </div>
  )
}
