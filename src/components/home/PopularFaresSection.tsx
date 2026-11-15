'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { getRoutePricing, getTrainStation } from '@/lib/train-database'
import type { LiveFares } from '@/lib/public-fares'

const FARES = [
  {
    from: 'hanoi',
    to: 'ninhbinh',
    nameVi: 'Hà Nội → Ninh Bình',
    nameEn: 'Hanoi → Ninh Binh',
    durationVi: '2 giờ 16–18 phút',
    durationEn: '2h 16–18m',
    image: '/stations/NinhBinhStation.webp',
  },
  {
    from: 'hanoi',
    to: 'donghoi',
    nameVi: 'Hà Nội → Đồng Hới',
    nameEn: 'Hanoi → Dong Hoi',
    durationVi: '9 giờ 37 phút–10 giờ 57 phút',
    durationEn: '9h 37m–10h 57m',
    image: '/stations/DongHoiStation.jpg',
  },
  {
    from: 'hanoi',
    to: 'hue',
    nameVi: 'Hà Nội → Huế',
    nameEn: 'Hanoi → Hue',
    durationVi: '12 giờ 35 phút–14 giờ 12 phút',
    durationEn: '12h 35m–14h 12m',
    image: '/stations/HueStation.JPG',
  },
  {
    from: 'hanoi',
    to: 'danang',
    nameVi: 'Hà Nội → Đà Nẵng',
    nameEn: 'Hanoi → Da Nang',
    durationVi: '15 giờ 23 phút–17 giờ 03 phút',
    durationEn: '15h 23m–17h 03m',
    image: '/stations/DaNangStation.JPG',
    featured: true,
  },
]

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

export default function PopularFaresSection({ liveFares = null }: { liveFares?: LiveFares | null }) {
  const locale = useLocale()
  const isVi = locale === 'vi'

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
              {isVi ? 'Giá vé & cabin minh bạch' : 'Clear ticket & cabin fares'}
            </p>
            <h2 className="font-serif text-3xl font-bold leading-tight text-violet-950 sm:text-4xl lg:text-5xl">
              {isVi ? 'Chọn hành trình phù hợp' : 'Choose your journey'}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-500 sm:text-base">
              {isVi
                ? 'Giá 1 vé giữ nguyên theo tuyến; giá 1 cabin bằng giá vé × 4.'
                : 'The per-ticket fare stays unchanged by route; one cabin costs the ticket fare × 4.'}
            </p>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-gray-400 md:text-right">
            {isVi
              ? 'Website hiển thị cả đơn giá 1 vé và tổng giá 4 vé. Cabin chỉ bán trọn.'
              : 'Both the 1-ticket fare and 4-ticket total are shown. Cabins are sold only as complete units.'}
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {FARES.map((fare, index) => {
            const pricing = getRoutePricing(fare.from, fare.to)
            const routeKey = `${getTrainStation(fare.from)?.code ?? ''}-${getTrainStation(fare.to)?.code ?? ''}`.toUpperCase()
            const live = liveFares?.byRoute[routeKey]
            // Live fares (set per day by staff) win; reference fares are only a fallback.
            const priceFor = (id: 'standard' | 'premium') => {
              const range = live?.[id]
              if (range) return { ticketPrice: range.min, cabinPrice: range.min * 4, from: range.max > range.min }
              if (liveFares) return undefined
              const reference = pricing.find((entry) => entry.seatClass === id)
              return reference ? { ticketPrice: reference.ticketPrice, cabinPrice: reference.cabinPrice, from: false } : undefined
            }
            const standardPrice = priceFor('standard')
            const premiumPrice = priceFor('premium')

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
                    {[
                      {
                        id: 'standard',
                        label: isVi ? 'Full Cabin (4 giường)' : 'Full Cabin (4 Berths)',
                        pricing: standardPrice,
                      },
                      {
                        id: 'premium',
                        label: 'VIP 2 · SE19',
                        pricing: premiumPrice,
                      },
                    ].map((product) => (
                      <div key={product.id} className="rounded-xl border border-violet-100 bg-violet-50/45 p-3.5">
                        <p className="text-sm font-semibold text-violet-950">{product.label}</p>
                        {!product.pricing ? (
                          <p className="mt-2 text-sm font-medium text-gray-500">
                            {isVi ? 'Chưa mở bán — liên hệ để được báo giá' : 'Not on sale yet — contact us for a quote'}
                          </p>
                        ) : (
                        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                          <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                              {product.pricing.from ? (isVi ? 'Giá 1 vé từ' : '1 ticket from') : (isVi ? 'Giá 1 vé' : '1 ticket')}
                            </span>
                            <strong className="text-base font-bold text-gray-700">
                              {formatVnd(product.pricing.ticketPrice)}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gold-600">
                              {product.pricing.from ? (isVi ? '1 cabin (4 vé) từ' : '1 cabin (4 tickets) from') : (isVi ? 'Giá 1 cabin (4 vé)' : '1 cabin (4 tickets)')}
                            </span>
                            <strong className="font-serif text-xl font-bold text-violet-950 sm:text-2xl">
                              {formatVnd(product.pricing.cabinPrice)}
                            </strong>
                          </div>
                        </div>
                        )}
                      </div>
                    ))}
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
