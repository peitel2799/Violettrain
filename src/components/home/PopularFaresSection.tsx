'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useProductPricing } from '@/hooks/useProductPricing'

const FARES = [
  {
    from: 'hanoi',
    to: 'ninhbinh',
    nameVi: 'Hà Nội → Ninh Bình',
    nameEn: 'Hanoi → Ninh Binh',
    durationVi: 'Khoảng 2 giờ',
    durationEn: 'About 2 hours',
    image: '/stations/NinhBinhStation.webp',
  },
  {
    from: 'hanoi',
    to: 'donghoi',
    nameVi: 'Hà Nội → Đồng Hới',
    nameEn: 'Hanoi → Dong Hoi',
    durationVi: 'Khoảng 6 giờ',
    durationEn: 'About 6 hours',
    image: '/stations/DongHoiStation.jpg',
  },
  {
    from: 'hanoi',
    to: 'hue',
    nameVi: 'Hà Nội → Huế',
    nameEn: 'Hanoi → Hue',
    durationVi: 'Khoảng 12 giờ',
    durationEn: 'About 12 hours',
    image: '/stations/HueStation.JPG',
  },
  {
    from: 'hanoi',
    to: 'danang',
    nameVi: 'Hà Nội → Đà Nẵng',
    nameEn: 'Hanoi → Da Nang',
    durationVi: 'Khoảng 17 giờ 30 phút',
    durationEn: 'About 17 hours 30 minutes',
    image: '/stations/DaNangStation.JPG',
    featured: true,
  },
]

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

export default function PopularFaresSection() {
  const locale = useLocale()
  const isVi = locale === 'vi'
  const prices = useProductPricing()

  return (
    <section id="fares" className="relative z-20 bg-[#fbfaf8] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold-600">
              {isVi ? 'Giá vé minh bạch' : 'Clear ticket fares'}
            </p>
            <h2 className="font-serif text-3xl font-bold leading-tight text-violet-950 sm:text-4xl lg:text-5xl">
              {isVi ? 'Chọn hành trình phù hợp' : 'Choose your journey'}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">
              {isVi
                ? 'Hai sản phẩm cabin có giá cố định, áp dụng giống nhau trên mọi tuyến.'
                : 'Both cabin products have fixed prices that apply to every route.'}
            </p>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-gray-400 md:text-right">
            {isVi
              ? 'Giá cho mỗi vé. Mua đủ 4 vé nếu bạn muốn sử dụng riêng toàn bộ cabin.'
              : 'Price per ticket. Buy all 4 tickets if you want the entire cabin privately.'}
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FARES.map((fare, index) => {
            return (
              <motion.article
                key={`${fare.from}-${fare.to}`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: index * 0.07 }}
                className="group overflow-hidden rounded-2xl border border-violet-950/10 bg-white shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={fare.image}
                    alt={isVi ? fare.nameVi : fare.nameEn}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-violet-950/10 to-transparent" />
                  {fare.featured && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-950">
                      <Sparkles className="h-3 w-3" />
                      {isVi ? 'Nổi bật' : 'Featured'}
                    </span>
                  )}
                  <div className="absolute inset-x-4 bottom-4">
                    <h3 className="font-serif text-xl font-bold text-white">
                      {isVi ? fare.nameVi : fare.nameEn}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
                      <Clock3 className="h-3.5 w-3.5" />
                      {isVi ? fare.durationVi : fare.durationEn}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-3">
                    <div className="flex items-end justify-between gap-3 border-b border-gray-100 pb-3">
                      <span className="text-sm text-gray-500">{isVi ? 'Cabin 4 giường' : 'Fixed 4-Berth'}</span>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                          {isVi ? 'Mỗi vé' : 'Per ticket'}
                        </span>
                        <strong className="font-serif text-xl text-violet-950">
                          {formatVnd(prices.standard)}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-sm text-gray-500">VIP 2</span>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                          {isVi ? 'Mỗi vé' : 'Per ticket'}
                        </span>
                        <strong className="font-serif text-xl text-violet-950">
                          {formatVnd(prices.premium)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/booking?from=${fare.from}&to=${fare.to}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-800 focus-ring"
                  >
                    {isVi ? 'Chọn tuyến này' : 'Choose this route'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
