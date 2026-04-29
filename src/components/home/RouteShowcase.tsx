'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { Clock, ArrowRight, Mountain, Landmark, Waves, MapPin } from 'lucide-react'

const ROUTES = [
  {
    id: 'HNO-LCA',
    slug: 'hanoi-laocai',
    name: 'Lào Cai / Sapa',
    taglineVi: 'Thung lũng Mường Hoa huyền bí',
    taglineEn: 'The Enigmatic Muong Hoa Valley',
    image: '/stations/HaNoiStation.webp',
    duration: '8h 30m',
    tag: 'popular',
    icon: Mountain,
  },
  {
    id: 'HNO-DNA',
    slug: 'hanoi-danang',
    name: 'Đà Nẵng',
    taglineVi: 'Cầu Rồng & Bãi Biển Mỹ Khê',
    taglineEn: 'Dragon Bridge & My Khe Beach',
    image: '/stations/DaNangStation.JPG',
    duration: '17h 30m',
    tag: 'scenic',
    icon: Waves,
  },
  {
    id: 'HNO-HUE',
    slug: 'hanoi-hue',
    name: 'Huế',
    taglineVi: 'Cố đô kinh đô ngàn năm',
    taglineEn: 'Imperial Capital of a Thousand Years',
    image: '/stations/HueStation.JPG',
    duration: '12h 15m',
    tag: 'heritage',
    icon: Landmark,
  },
  {
    id: 'HNO-DHO',
    slug: 'hanoi-donghoi',
    name: 'Đồng Hới / Phong Nha',
    taglineVi: 'Vương quốc hang động kỳ vĩ',
    taglineEn: 'Kingdom of Spectacular Caves',
    image: '/stations/DongHoiStation.jpg',
    duration: '6h',
    tag: 'adventure',
    icon: MapPin,
  },
  {
    id: 'HNO-NBI',
    slug: 'hanoi-ninhbinh',
    name: 'Ninh Bình',
    taglineVi: 'Di sản thế giới Tràng An',
    taglineEn: 'UNESCO World Heritage Trang An',
    image: '/stations/NinhBinhStation.webp',
    duration: '2h',
    tag: 'unesco',
    icon: Mountain,
  },
]

const TAG_CONFIG: Record<string, { labelVi: string; labelEn: string; color: string }> = {
  popular: { labelVi: 'Phổ biến', labelEn: 'Popular', color: 'bg-gold-500 text-violet-950' },
  scenic: { labelVi: 'Nghỉ dưỡng', labelEn: 'Scenic', color: 'bg-blue-500 text-white' },
  heritage: { labelVi: 'Di sản', labelEn: 'Heritage', color: 'bg-amber-700 text-white' },
  adventure: { labelVi: 'Khám phá', labelEn: 'Adventure', color: 'bg-emerald-600 text-white' },
  unesco: { labelVi: 'UNESCO', labelEn: 'UNESCO', color: 'bg-violet-600 text-white' },
}

export default function RouteShowcase() {
  const locale = useLocale()
  const isVi = locale === 'vi'

  return (
    <section className="py-20 md:py-32 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-gold-500 text-sm font-semibold tracking-widest uppercase mb-4">
            {isVi ? 'Các tuyến đường' : 'Our Routes'}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-gray-900 font-bold mb-4">
            {isVi ? 'Khám phá Việt Nam bằng tàu' : 'Explore Vietnam by Train'}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            {isVi
              ? 'Mỗi tuyến tàu là một hành trình độc đáo, mang đến trải nghiệm du lịch đẳng cấp qua những cảnh quan tuyệt đẹp của Việt Nam.'
              : 'Each route is a unique journey, offering a luxury travel experience through Vietnam\'s most breathtaking landscapes.'}
          </p>
          <div className="w-16 h-1 bg-gold-500 mx-auto rounded-full mt-6" />
        </motion.div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Large featured card — Lào Cai */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="md:col-span-2 lg:col-span-1 lg:row-span-2 group relative overflow-hidden rounded-2xl"
          >
            <Link href={`/booking?from=hanoi&to=laocai`} className="block h-full">
              <div className="relative h-full min-h-[380px] sm:min-h-[480px] lg:min-h-[600px]">
                <Image
                  src={ROUTES[0].image}
                  alt="Hanoi to Sapa train route"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/30 to-transparent" />

                {/* Tag */}
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${TAG_CONFIG[ROUTES[0].tag].color}`}>
                    {isVi ? TAG_CONFIG[ROUTES[0].tag].labelVi : TAG_CONFIG[ROUTES[0].tag].labelEn}
                  </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ROUTES[0].duration}</span>
                    <span className="mx-1">·</span>
                    <span>Ga Hà Nội → Ga Lào Cai</span>
                  </div>
                  <h3 className="font-serif text-2xl lg:text-3xl text-white font-bold mb-2">
                    {ROUTES[0].name}
                  </h3>
                  <p className="text-white/70 text-sm mb-4 leading-relaxed">
                    {isVi ? ROUTES[0].taglineVi : ROUTES[0].taglineEn}
                  </p>
                  <div className="flex items-center gap-1 text-gold-400 font-medium text-sm group-hover:gap-2 transition-all">
                    <span>{isVi ? 'Đặt vé' : 'Book Now'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Đà Nẵng */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl"
          >
            <Link href={`/booking?from=hanoi&to=danang`} className="block h-full">
              <div className="relative h-72 sm:h-64">
                <Image
                  src={ROUTES[1].image}
                  alt="Hanoi to Da Nang train route"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${TAG_CONFIG[ROUTES[1].tag].color}`}>
                    {isVi ? TAG_CONFIG[ROUTES[1].tag].labelEn : TAG_CONFIG[ROUTES[1].tag].labelEn}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 text-white/60 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ROUTES[1].duration}</span>
                  </div>
                  <h3 className="font-serif text-xl text-white font-bold mb-1">{ROUTES[1].name}</h3>
                  <p className="text-white/60 text-xs">{isVi ? ROUTES[1].taglineVi : ROUTES[1].taglineEn}</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Huế */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="group relative overflow-hidden rounded-2xl"
          >
            <Link href={`/booking?from=hanoi&to=hue`} className="block h-full">
              <div className="relative h-72 sm:h-64">
                <Image
                  src={ROUTES[2].image}
                  alt="Hanoi to Hue train route"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${TAG_CONFIG[ROUTES[2].tag].color}`}>
                    {isVi ? TAG_CONFIG[ROUTES[2].tag].labelVi : TAG_CONFIG[ROUTES[2].tag].labelEn}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 text-white/60 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ROUTES[2].duration}</span>
                  </div>
                  <h3 className="font-serif text-xl text-white font-bold mb-1">{ROUTES[2].name}</h3>
                  <p className="text-white/60 text-xs">{isVi ? ROUTES[2].taglineVi : ROUTES[2].taglineEn}</p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Bottom row: Đồng Hới + Ninh Bình */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl"
          >
            <Link href={`/booking?from=hanoi&to=donghoi`} className="block h-full">
              <div className="relative h-44 sm:h-52">
                <Image
                  src={ROUTES[3].image}
                  alt="Hanoi to Phong Nha train route"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${TAG_CONFIG[ROUTES[3].tag].color}`}>
                    {isVi ? TAG_CONFIG[ROUTES[3].tag].labelVi : TAG_CONFIG[ROUTES[3].tag].labelEn}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 text-white/60 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ROUTES[3].duration}</span>
                  </div>
                  <h3 className="font-serif text-lg text-white font-bold">{ROUTES[3].name}</h3>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="group relative overflow-hidden rounded-2xl"
          >
            <Link href={`/booking?from=hanoi&to=ninhbinh`} className="block h-full">
              <div className="relative h-44 sm:h-52">
                <Image
                  src={ROUTES[4].image}
                  alt="Hanoi to Ninh Binh train route"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${TAG_CONFIG[ROUTES[4].tag].color}`}>
                    {isVi ? TAG_CONFIG[ROUTES[4].tag].labelVi : TAG_CONFIG[ROUTES[4].tag].labelEn}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 text-white/60 text-xs mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ROUTES[4].duration}</span>
                  </div>
                  <h3 className="font-serif text-lg text-white font-bold">{ROUTES[4].name}</h3>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 bg-violet-950 hover:bg-violet-900 text-white font-semibold text-base px-8 py-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-violet-950/20"
          >
            {isVi ? 'Xem tất cả tuyến đường' : 'View All Routes'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
