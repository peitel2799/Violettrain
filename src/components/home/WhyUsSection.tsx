'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Sparkles, Headphones, Leaf } from 'lucide-react'

const icons = {
  unique: Sparkles,
  service: Headphones,
  sustain: Leaf,
}

export default function WhyUsSection() {
  const t = useTranslations('home.whyUs')

  const items = [
    {
      key: 'unique',
      icon: icons.unique,
      title: t('uniqueTitle'),
      desc: t('uniqueDesc'),
    },
    {
      key: 'service',
      icon: icons.service,
      title: t('serviceTitle'),
      desc: t('serviceDesc'),
    },
    {
      key: 'sustain',
      icon: icons.sustain,
      title: t('sustainTitle'),
      desc: t('sustainDesc'),
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-gray-900 font-bold mb-4">
            {t('title')}
          </h2>
          <div className="w-16 h-1 bg-gold-500 mx-auto rounded-full" />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="group bg-gray-50 rounded-2xl p-8 hover:bg-violet-50 transition-all duration-500 hover:shadow-xl hover:shadow-violet-900/5"
            >
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mb-6 group-hover:bg-gold-500/20 transition-colors">
                <item.icon className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl md:text-2xl text-gray-900 font-semibold mb-3">
                {item.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
