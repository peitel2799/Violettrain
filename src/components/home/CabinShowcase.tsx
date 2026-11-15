'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Users, BedDouble } from 'lucide-react'
import { getLowestRouteTicketFare } from '@/lib/train-database'
import type { LiveFares } from '@/lib/public-fares'

const CABINS = [
  {
    id: 'standard' as const,
    nameVi: 'Full Cabin (4 giường)',
    nameEn: 'Full Cabin (4 Berths)',
    shortDescVi: 'Cabin riêng dành cho tối đa 4 khách với giường tầng trên cố định. Sản phẩm chỉ bán trọn cabin gồm 4 vé.',
    shortDescEn: 'A private cabin for up to four guests with fixed upper berths. It is sold only as a full cabin containing all 4 tickets.',
    images: ['/premium_room/4pax1.JPG', '/premium_room/4pax.JPG'],
    maxGuests: 4,
    amenities: ['Four fixed berths', 'Full-cabin purchase only', 'Air conditioning', 'Bedding included'],
    amenitiesVi: ['Bốn giường cố định', 'Chỉ bán trọn cabin', 'Điều hòa không khí', 'Bộ ga giường'],
  },
  {
    id: 'premium' as const,
    nameVi: 'VIP 2',
    nameEn: 'VIP 2',
    shortDescVi: 'Chỉ có 1 cabin VIP 2 trên tàu SE19, gồm 4 vé cho tối đa 4 khách. Hai giường tầng trên có thể gập lên.',
    shortDescEn: 'Only one VIP 2 cabin is available on SE19. It includes 4 tickets for up to four guests, with two fold-up upper berths.',
    images: ['/premium_room/room1.JPG', '/premium_room/room2.JPG'],
    maxGuests: 4,
    amenities: ['Two fold-up upper berths', 'Only 1 VIP 2 cabin on SE19', 'Full-cabin purchase only', 'Air conditioning'],
    amenitiesVi: ['Hai giường trên có thể gập lên', 'Chỉ 1 cabin VIP 2 trên SE19', 'Chỉ bán trọn cabin', 'Điều hòa không khí'],
  },
]

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

export default function CabinShowcase({ liveFares = null }: { liveFares?: LiveFares | null }) {
  const isVi = useLocale() === 'vi'
  const ticketFrom = (id: 'standard' | 'premium') => liveFares?.lowest[id] ?? getLowestRouteTicketFare(id)

  return (
    <section id="cabins" className="overflow-hidden bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="mx-auto mb-14 max-w-3xl text-center md:mb-20"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold-600">
            {isVi ? 'Hai cách để nghỉ ngơi' : 'Two ways to travel'}
          </p>
          <h2 className="font-serif text-3xl font-bold leading-tight text-violet-950 sm:text-4xl lg:text-5xl">
            {isVi ? 'Chọn không gian của riêng bạn' : 'Choose the space that suits you'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">
            {isVi
              ? 'Mỗi cabin đều được chuẩn bị trước giờ khởi hành để bạn có thể nghỉ ngơi ngay khi lên tàu.'
              : 'Every cabin is prepared before departure, so you can settle in from the moment you board.'}
          </p>
        </motion.div>

        <div className="space-y-20 md:space-y-28">
          {CABINS.map((cabin, index) => (
            <motion.article
              key={cabin.id}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="grid items-center gap-9 lg:grid-cols-12 lg:gap-16"
            >
              <div className={`relative min-h-[360px] overflow-hidden rounded-2xl bg-gray-100 shadow-elevated sm:min-h-[500px] lg:col-span-7 ${index % 2 ? 'lg:order-2' : ''}`}>
                <Image
                  src={cabin.images[0]}
                  alt={isVi ? cabin.nameVi : cabin.nameEn}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/35 via-transparent to-transparent" />
                <div className="absolute bottom-4 right-4 h-28 w-36 overflow-hidden rounded-xl border-2 border-white/80 bg-white shadow-xl sm:bottom-6 sm:right-6 sm:h-36 sm:w-48">
                  <Image
                    src={cabin.images[1]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
              </div>

              <div className={`lg:col-span-5 ${index % 2 ? 'lg:order-1' : ''}`}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
                    <BedDouble className="h-5 w-5 text-violet-700" />
                  </span>
                  <span className="rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-gold-600">
                    {cabin.id === 'premium' ? 'VIP 2 · SE19' : 'FULL CABIN'}
                  </span>
                </div>

                <h3 className="font-serif text-3xl font-bold text-violet-950 sm:text-4xl">
                  {isVi ? cabin.nameVi : cabin.nameEn}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-gray-500">
                  {isVi ? cabin.shortDescVi : cabin.shortDescEn}
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {(isVi ? cabin.amenitiesVi : cabin.amenities).map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100">
                        <Check className="h-3 w-3 text-violet-700" />
                      </span>
                      {amenity}
                    </div>
                  ))}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100">
                      <Users className="h-3 w-3 text-violet-700" />
                    </span>
                    {isVi ? `Tối đa ${cabin.maxGuests} khách` : `Up to ${cabin.maxGuests} guests`}
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-7">
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                          {isVi ? 'Giá từ / 1 vé' : 'Fare from / 1 ticket'}
                        </p>
                        <p className="mt-1 text-xl font-bold text-gray-700 sm:text-2xl">
                          {formatVnd(ticketFrom(cabin.id))}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-600">
                          {isVi ? 'Giá 1 cabin · 4 vé' : '1 cabin fare · 4 tickets'}
                        </p>
                        <p className="mt-1 font-serif text-3xl font-bold text-violet-950 sm:text-4xl">
                          {formatVnd(ticketFrom(cabin.id) * 4)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-violet-100 pt-3 text-xs font-medium text-violet-700">
                      {isVi ? 'Bắt buộc mua trọn cabin: giá 1 vé × 4. Giá thực tế phụ thuộc tuyến.' : 'Full-cabin purchase required: 1 ticket × 4. The actual fare depends on route.'}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-violet-950 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-lg focus-ring"
                    >
                      {isVi ? 'Đặt cabin' : 'Book this cabin'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/cabins"
                      className="inline-flex items-center rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 focus-ring"
                    >
                      {isVi ? 'Xem chi tiết' : 'View details'}
                    </Link>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
