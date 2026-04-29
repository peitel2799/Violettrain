'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

const STATIONS = [
  {
    id: 'hanoi',
    nameVi: 'Hà Nội',
    nameEn: 'Hanoi',
    taglineVi: 'Thủ đô ngàn năm văn hiến',
    taglineEn: 'Ancient Capital of a Thousand Years',
    image: '/stations/HaNoiStation.webp',
  },
  {
    id: 'ninhbinh',
    nameVi: 'Ninh Bình',
    nameEn: 'Ninh Binh',
    taglineVi: 'Di sản thế giới Tràng An',
    taglineEn: 'UNESCO World Heritage Trang An',
    image: '/stations/NinhBinhStation.webp',
  },
  {
    id: 'donghoi',
    nameVi: 'Đồng Hới',
    nameEn: 'Dong Hoi',
    taglineVi: 'Vương quốc hang động Phong Nha',
    taglineEn: 'Kingdom of Phong Nha Caves',
    image: '/stations/DongHoiStation.jpg',
  },
  {
    id: 'hue',
    nameVi: 'Huế',
    nameEn: 'Hue',
    taglineVi: 'Cố đô kinh đô ngàn năm',
    taglineEn: 'Imperial Capital of a Thousand Years',
    image: '/stations/HueStation.JPG',
  },
  {
    id: 'danang',
    nameVi: 'Đà Nẵng',
    nameEn: 'Da Nang',
    taglineVi: 'Thành phố đáng sống nhất Việt Nam',
    taglineEn: "Vietnam's Most Livable City",
    image: '/stations/DaNangStation.JPG',
  },
]

const AUTO_ADVANCE_INTERVAL = 5000

export default function StationCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const locale = useLocale()
  const isVi = locale === 'vi'

  const goToNext = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % STATIONS.length)
  }, [])

  const goToPrev = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + STATIONS.length) % STATIONS.length)
  }, [])

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }

  useEffect(() => {
    const timer = setInterval(goToNext, AUTO_ADVANCE_INTERVAL)
    return () => clearInterval(timer)
  }, [goToNext])

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  }

  const currentStation = STATIONS[currentIndex]

  return (
    <section className="relative w-full h-[60vh] min-h-[420px] max-h-[700px] sm:h-[70vh] sm:min-h-[500px] sm:max-h-[800px] overflow-hidden bg-violet-950">
      {/* Image Slides */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 },
          }}
          className="absolute inset-0"
        >
          <Image
            src={currentStation.image}
            alt={`${isVi ? currentStation.nameVi : currentStation.nameEn} - ${currentStation.taglineEn}`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-950/80 via-violet-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute inset-0 flex items-center"
        >
          <div className="relative z-10 max-w-2xl mx-6 sm:mx-8 md:mx-16 lg:mx-24">
            {/* Station Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6"
            >
              <MapPin className="w-4 h-4 text-gold-400" />
              <span className="text-white/80 text-sm font-medium tracking-wide">
                {isVi ? 'Ga tàu' : 'Train Station'}
              </span>
            </motion.div>

            {/* Station Name */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-3 sm:mb-4 leading-tight"
            >
              {isVi ? currentStation.nameVi : currentStation.nameEn}
            </motion.h2>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white/70 text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed"
            >
              {isVi ? currentStation.taglineVi : currentStation.taglineEn}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrev}
        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white transition-all duration-200 flex items-center justify-center hover:scale-110"
        aria-label={isVi ? 'Trước' : 'Previous'}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white transition-all duration-200 flex items-center justify-center hover:scale-110"
        aria-label={isVi ? 'Tiếp' : 'Next'}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {STATIONS.map((station, index) => (
          <button
            key={station.id}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'w-8 h-2 bg-gold-500'
                : 'w-2 h-2 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to ${isVi ? station.nameVi : station.nameEn}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
        <motion.div
          key={`progress-${currentIndex}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: AUTO_ADVANCE_INTERVAL / 1000, ease: 'linear' }}
          className="h-full bg-gold-500 origin-left"
        />
      </div>

    </section>
  )
}
