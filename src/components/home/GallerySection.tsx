'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'

const GALLERY = [
  {
    src: '/premium_room/staff.JPG',
    altVi: 'Nhân viên Violette chào đón hành khách',
    altEn: 'Violette staff welcoming passengers',
    className: 'sm:col-span-2 lg:col-span-7 lg:row-span-2 min-h-[330px] lg:min-h-[560px]',
  },
  {
    src: '/premium_room/room1.JPG',
    altVi: 'Cabin VIP 2 với giường trên có thể nâng lên',
    altEn: 'VIP 2 cabin with raisable upper berths',
    className: 'lg:col-span-5 min-h-[270px]',
  },
  {
    src: '/premium_room/4pax1.JPG',
    altVi: 'Cabin bốn giường cố định',
    altEn: 'Fixed four-berth cabin',
    className: 'lg:col-span-5 min-h-[270px]',
  },
]

export default function GallerySection() {
  const isVi = useLocale() === 'vi'

  return (
    <section className="bg-violet-950 py-20 text-white md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 max-w-2xl md:mb-14"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">
            {isVi ? 'Bên trong Violette' : 'Inside Violette'}
          </p>
          <h2 className="font-serif text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {isVi ? 'Không gian của hành trình' : 'A closer look at your journey'}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60 sm:text-base">
            {isVi
              ? 'Từ lúc lên tàu đến khi nghỉ ngơi trong cabin, từng chi tiết đều được chuẩn bị cho một hành trình nhẹ nhàng.'
              : 'From boarding to settling into your cabin, every detail is prepared for an effortless journey.'}
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
          {GALLERY.map((photo, index) => (
            <motion.figure
              key={photo.src}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
              className={`group relative overflow-hidden rounded-2xl bg-violet-900 ${photo.className}`}
            >
              <Image
                src={photo.src}
                alt={isVi ? photo.altVi : photo.altEn}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/45 via-transparent to-transparent" />
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
