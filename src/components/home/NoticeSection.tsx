'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Train } from 'lucide-react'

export default function NoticeSection() {
  const t = useTranslations('home.notice')

  return (
    <section className="py-12 bg-gray-100 border-y border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex gap-4"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Train className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-gray-900 font-semibold mb-2">
              {t('title')}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              {t('text')}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
