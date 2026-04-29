'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Tag } from 'lucide-react'
import { BLOG_POSTS, CATEGORIES, CATEGORY_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import NewsletterForm from '@/components/blog/NewsletterForm'

const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
  travel: { vi: 'Du lịch', en: 'Travel' },
  tips: { vi: 'Mẹo hay', en: 'Tips' },
  culture: { vi: 'Văn hóa', en: 'Culture' },
  food: { vi: 'Ẩm thực', en: 'Food' },
  testimonial: { vi: 'Cảm nhận', en: 'Guest Stories' },
}

export default function BlogPage() {
  const locale = useLocale()
  const isVi = locale === 'vi'
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = activeCategory
    ? BLOG_POSTS.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase())
    : BLOG_POSTS

  const featured = BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0]
  const rest = filtered.filter((p) => p.id !== featured.id || activeCategory !== null)

  const categoryLabels: Record<string, { vi: string; en: string }> = {
    travel: { vi: 'Du lịch', en: 'Travel' },
    tips: { vi: 'Mẹo hay', en: 'Tips' },
    culture: { vi: 'Văn hóa', en: 'Culture' },
    food: { vi: 'Ẩm thực', en: 'Food' },
    testimonial: { vi: 'Cảm nhận', en: 'Guest Stories' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-900 to-violet-950 text-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {isVi ? 'Blog & Cảm hứng du lịch' : 'Blog & Travel Inspiration'}
          </h1>
          <p className="text-violet-200 max-w-xl mx-auto">
            {isVi
              ? 'Khám phá những câu chuyện du lịch, destination guides và trải nghiệm từ Violette Train.'
              : 'Discover travel stories, destination guides and experiences from Violette Train passengers.'}
          </p>
        </div>
      </div>

      {/* Featured Post */}
      {!activeCategory && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <Link href={`/blog/${featured.slug}`} className="group block">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative h-72 md:h-96 rounded-2xl overflow-hidden"
            >
              <Image
                src={featured.coverImage}
                alt={isVi ? featured.title : featured.titleEn}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="bg-gold-500 text-violet-950 text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide">
                  {featured.category}
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <h2 className="font-serif text-2xl md:text-3xl text-white font-bold mb-2">
                  {isVi ? featured.title : featured.titleEn}
                </h2>
                <p className="text-white/70 text-sm line-clamp-2 mb-3">
                  {isVi ? featured.excerpt : featured.excerptEn}
                </p>
                <span className="inline-flex items-center gap-1 text-gold-400 text-sm font-medium">
                  {isVi ? 'Đọc tiếp' : 'Read More'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Category Filter */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === null
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {isVi ? 'Tất cả' : 'All'}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {categoryLabels[cat]?.[isVi ? 'vi' : 'en'] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {rest.length === 0 ? (
          <EmptyState
            icon="search"
            title={isVi ? 'Không có bài viết nào' : 'No posts found'}
            description={isVi ? 'Không có bài viết nào trong danh mục này.' : 'No posts in this category yet.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeCategory ? filtered : rest).map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Link href={`/blog/${post.slug}`} className="group block h-full">
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all h-full flex flex-col">
                    <div className="relative h-44 flex-shrink-0">
                      <Image
                        src={post.coverImage}
                        alt={isVi ? post.title : post.titleEn}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            CATEGORY_COLORS[post.category.toLowerCase()] || CATEGORY_COLORS.travel
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {categoryLabels[post.category.toLowerCase()]?.[isVi ? 'vi' : 'en'] || post.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2 leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
                        {isVi ? post.title : post.titleEn}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                        {isVi ? post.excerpt : post.excerptEn}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime} min
                        </span>
                        <span>·</span>
                        <span>{formatDate(post.publishedAt, isVi ? 'vi-VN' : 'en-US')}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter CTA */}
      <div className="bg-violet-950 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl text-white font-bold mb-3">
            {isVi ? 'Đăng ký nhận tin mới' : 'Subscribe for Updates'}
          </h2>
          <p className="text-white/60 mb-6">
            {isVi
              ? 'Nhận thông tin về các bài viết mới và ưu đãi đặc biệt từ Violette Train.'
              : 'Get the latest travel articles and exclusive offers from Violette Train.'}
          </p>
          <NewsletterForm />
        </div>
      </div>
    </div>
  )
}
