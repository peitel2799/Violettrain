'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Phone, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BookingCTA() {
  const locale = useLocale()
  const isVi = locale === 'vi'

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/violette-train-evening.jpg"
          alt="Violette Train interior"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-violet-950/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/60 via-transparent to-violet-950/40" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-gold-400 text-sm font-semibold tracking-widest uppercase mb-4">
            {isVi ? 'Bắt đầu hành trình' : 'Start Your Journey'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white font-bold mb-5 leading-tight">
            {isVi ? 'Sẵn sàng cho cuộc phiêu lưu?' : 'Ready for Adventure?'}
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {isVi
              ? 'Dù bạn muốn gì cho chuyến đi Việt Nam, đội ngũ thiết kế du lịch của chúng tôi luôn sẵn sàng hỗ trợ.'
              : 'Whatever you want from your Vietnam tour, our expert travel designers are ready to help.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-violet-950 font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-gold-500/25 w-full sm:w-auto justify-center"
          >
            <Phone className="w-5 h-5" />
            {isVi ? 'Đặt vé ngay' : 'Book Now'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white/80 hover:text-white font-semibold text-lg px-8 py-4 rounded-lg transition-all duration-300 w-full sm:w-auto justify-center hover:bg-white/5"
          >
            {isVi ? 'Liên hệ tư vấn' : 'Contact Us'}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
