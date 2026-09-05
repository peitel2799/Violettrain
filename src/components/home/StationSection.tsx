'use client'

import { useLocale } from 'next-intl'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'

const STATIONS = [
  {
    id: 'hanoi',
    nameVi: 'Ga Hà Nội',
    nameEn: 'Hanoi Station',
    taglineVi: 'Thủ đô ngàn năm văn hiến',
    taglineEn: 'Ancient Capital of a Thousand Years',
    addressVi: 'Số 120 Đường Lê Duẩn, Quận Hoàn Kiếm, Hà Nội',
    addressEn: '120 Le Duynh Street, Hoan Kiem District, Hanoi',
    image: '/stations/HaNoiStation.webp',
  },
  {
    id: 'ninhbinh',
    nameVi: 'Ga Ninh Bình',
    nameEn: 'Ninh Binh Station',
    taglineVi: 'Di sản thế giới UNESCO Tràng An',
    taglineEn: 'UNESCO World Heritage Site — Trang An',
    addressVi: 'Đường Trần Hưng Đạo, Phường Đông Thành, Ninh Bình',
    addressEn: 'Tran Hung Dao Street, Dong Thanh Ward, Ninh Binh',
    image: '/stations/NinhBinhStation.webp',
  },
  {
    id: 'donghoi',
    nameVi: 'Ga Đồng Hới',
    nameEn: 'Dong Hoi Station',
    taglineVi: 'Cửa ngõ Vương quốc hang động Phong Nha',
    taglineEn: 'Gateway to Phong Nha Cave Kingdom',
    addressVi: 'Đường Trần Huy Liệu, Phường Nam Lý, Đồng Hới, Quảng Bình',
    addressEn: 'Tran Huy Lieu Street, Nam Ly Ward, Dong Hoi, Quang Binh',
    image: '/stations/DongHoiStation.jpg',
  },
  {
    id: 'hue',
    nameVi: 'Ga Huế',
    nameEn: 'Hue Station',
    taglineVi: 'Cố đô kinh đô ngàn năm văn hiến',
    taglineEn: 'Imperial Capital of a Thousand Years',
    addressVi: 'Số 2 Đường An Dương Vương, Phường Phú Hội, Huế, Thừa Thiên Huế',
    addressEn: '2 An Duong Vuong Street, Phu Hoi Ward, Hue, Thua Thien Hue',
    image: '/stations/HueStation.JPG',
  },
  {
    id: 'danang',
    nameVi: 'Ga Đà Nẵng',
    nameEn: 'Da Nang Station',
    taglineVi: 'Thành phố đáng sống nhất Việt Nam',
    taglineEn: "Vietnam's Most Livable City",
    addressVi: 'Số 224 Đường Trưng Nữ Vương, Quận Hải Châu, Đà Nẵng',
    addressEn: '224 Trung Nu Vuong Street, Hai Chau District, Da Nang',
    image: '/stations/DaNangStation.JPG',
  },
]

export default function StationSection() {
  const locale = useLocale()
  const isVi = locale === 'vi'

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 md:mb-16"
        >
          <p className="text-gold-500 text-xs font-medium tracking-[0.2em] uppercase mb-3">
            {isVi ? 'Hệ thống ga tàu' : 'Our Network'}
          </p>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl text-gray-900 font-bold"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {isVi ? 'Những điểm đến của Violette' : 'Where Violette Goes'}
          </h2>
          <div className="w-12 h-0.5 bg-gold-500 mx-auto mt-5 rounded-full" />
        </motion.div>

        {/* Station Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STATIONS.map((station, i) => (
            <motion.div
              key={station.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Station Image */}
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={station.image}
                  alt={isVi ? station.nameVi : station.nameEn}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-950/20 to-transparent" />

                {/* Station name on image */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3
                    className="text-white font-bold leading-tight"
                    style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}
                  >
                    {isVi ? station.nameVi : station.nameEn}
                  </h3>
                  <p className="text-white/80 text-sm mt-0.5">
                    {isVi ? station.taglineVi : station.taglineEn}
                  </p>
                </div>
              </div>

              {/* Address & CTA */}
              <div className="p-5">
                <div className="flex items-start gap-2.5 mb-4">
                  <MapPin className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {isVi ? station.addressVi : station.addressEn}
                  </p>
                </div>
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-1.5 text-violet-700 hover:text-violet-900 font-medium text-sm group/link"
                >
                  {isVi ? 'Xem lịch trình' : 'View schedules'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
