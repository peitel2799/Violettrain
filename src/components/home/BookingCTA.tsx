'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { ArrowRight, MessageCircle, TicketCheck } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BookingCTA() {
  const isVi = useLocale() === 'vi'

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <Image
        src="/premium_room/outside1.JPG"
        alt={isVi ? 'Cửa sổ cabin Violette vào buổi tối' : 'Violette cabin windows in the evening'}
        fill
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-violet-950/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-violet-950 via-violet-950/65 to-violet-950/80" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">
            {isVi ? 'Hành trình tiếp theo của bạn' : 'Your next journey'}
          </p>
          <h2 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {isVi ? 'Sẵn sàng chọn cabin?' : 'Ready to choose your cabin?'}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            {isVi
              ? 'Tiếp tục đến trang đặt vé hoặc liên hệ với đội ngũ Violette nếu bạn cần tư vấn về tuyến và cabin.'
              : 'Continue to booking or speak with the Violette team if you need help choosing a route or cabin.'}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/booking"
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-base font-semibold text-violet-950 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-xl focus-ring sm:w-auto"
            >
              <TicketCheck className="h-5 w-5" />
              {isVi ? 'Đặt vé ngay' : 'Book your ticket'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10 focus-ring sm:w-auto"
            >
              <MessageCircle className="h-5 w-5" />
              {isVi ? 'Nhờ tư vấn' : 'Ask for advice'}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
