'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Users, BedDouble } from 'lucide-react'
import { getLowestRouteFare } from '@/lib/train-database'

const CABINS = [
  {
    id: 'standard' as const,
    nameVi: 'Cabin 4 giường cố định',
    nameEn: 'Fixed 4-Berth Cabin',
    shortDescVi: 'Cabin dành cho 4 khách với giường tầng trên cố định, không thể nâng lên. Mua đủ 4 vé để sử dụng riêng toàn bộ cabin.',
    shortDescEn: 'A four-person cabin with fixed upper berths that cannot be raised. Buy all 4 tickets to reserve the entire cabin privately.',
    images: ['/premium_room/4pax1.JPG', '/premium_room/4pax.JPG'],
    maxGuests: 4,
    amenities: ['Four fixed berths', 'Private when buying 4 tickets', 'Air conditioning', 'Bedding included'],
    amenitiesVi: ['Bốn giường cố định', 'Riêng tư khi mua đủ 4 vé', 'Điều hòa không khí', 'Bộ ga giường'],
  },
  {
    id: 'premium' as const,
    nameVi: 'VIP 2',
    nameEn: 'VIP 2',
    shortDescVi: 'Một trong 7 cabin VIP 2 dành cho 4 khách. Giường tầng trên có thể nâng lên để tạo không gian thoải mái hơn vào ban ngày.',
    shortDescEn: 'One of only 7 VIP 2 cabins for four guests. The upper berths can be raised to create a more comfortable daytime space.',
    images: ['/premium_room/room1.JPG', '/premium_room/room2.JPG'],
    maxGuests: 4,
    amenities: ['Upper berths can be raised', 'Only 7 VIP 2 cabins', 'Private when buying 4 tickets', 'Air conditioning'],
    amenitiesVi: ['Giường trên có thể nâng lên', 'Chỉ có 7 cabin VIP 2', 'Riêng tư khi mua đủ 4 vé', 'Điều hòa không khí'],
  },
]

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

export default function CabinShowcase() {
  const isVi = useLocale() === 'vi'

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
                    {cabin.id === 'premium' ? 'VIP 2' : (isVi ? '4 giường' : '4-berth')}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                    {isVi ? 'Giá từ / 1 vé' : 'Fare from / ticket'}
                  </p>
                  <p className="mt-1 font-serif text-3xl font-bold text-violet-950">
                    {formatVnd(getLowestRouteFare(cabin.id))}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {isVi ? 'giá cuối cùng phụ thuộc vào tuyến đã chọn' : 'final fare depends on the selected route'}
                  </p>

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
