'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { BLOG_POSTS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export default function TripInspiration() {
  const t = useTranslations('home.inspiration')

  const featured = BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0]
  const rest = BLOG_POSTS.filter((p) => p.id !== featured.id).slice(0, 3)

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 md:mb-16">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-gray-900 font-bold mb-3">
              {t('title')}
            </h2>
            <p className="text-gray-500 max-w-xl">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-gold-600 hover:text-gold-700 font-medium group"
          >
            {t('viewAll')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Featured Post */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <Link href={`/blog/${featured.slug}`} className="group block h-full">
              <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden mb-5">
                <Image
                  src={featured.coverImage}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="bg-gold-500 text-violet-950 text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide">
                    {featured.category}
                  </span>
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <h3 className="font-serif text-xl md:text-2xl text-white font-bold mb-2 leading-snug">
                    {featured.title}
                  </h3>
                  <p className="text-white/70 text-sm line-clamp-2">
                    {featured.excerpt}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Smaller Posts */}
          <div className="lg:col-span-2 space-y-5">
            {rest.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`} className="group flex gap-3 sm:gap-4">
                  <div className="relative w-20 sm:w-24 h-16 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="112px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gold-600 text-xs font-semibold uppercase tracking-wide">
                      {post.category}
                    </span>
                    <h4 className="text-gray-900 font-medium text-sm leading-snug mt-1 line-clamp-2 group-hover:text-gold-600 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-gray-400 text-xs mt-1">
                      {formatDate(post.publishedAt)} · {post.readTime} {t('minRead')}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
