'use client'

import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CABIN_CLASSES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

const cabinImages: Record<string, string> = {
  standard: '/violette-cabin-standard-1.jpg',
  premium: '/premium_room/4pax.JPG',
}

export default function CabinShowcase() {
  const t = useTranslations('home.cabins')
  const locale = useLocale()
  const isVi = locale === 'vi'

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-gray-900 font-bold mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="w-16 h-1 bg-gold-500 mx-auto rounded-full mt-4" />
        </div>

        {/* Cabin Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CABIN_CLASSES.map((cabin, i) => (
            <motion.div
              key={cabin.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <Image
                  src={cabinImages[cabin.id]}
                  alt={cabin.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/60 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="bg-gold-500 text-violet-950 text-xs font-bold px-2.5 py-1 rounded">
                    {cabin.abbr}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-serif text-xl text-gray-900 font-semibold mb-1">
                  {cabin.name}
                </h3>
                <p className="text-gold-600 text-sm font-medium mb-3">
                  {t('startingFrom')} {formatCurrency(Math.round(cabin.priceFactor * 1500000))}
                </p>
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                  {isVi ? 'Tối đa' : 'Up to'} {cabin.maxBeds} {isVi ? 'khách/phòng' : 'guests/room'}
                </p>

                <Link
                  href={`/cabins#${cabin.id}`}
                  className="inline-flex items-center gap-1.5 text-gold-600 hover:text-gold-700 font-medium text-sm group/link"
                >
                  {t('viewDetails')}
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
