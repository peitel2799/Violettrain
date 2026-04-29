'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { Clock, Tag, ChevronRight, Bell, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlogPost } from '@/lib/types'

interface NewsSectionProps {
  locale: 'vi' | 'en'
  limit?: number
  showViewAll?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-50 text-blue-600',
  policy: 'bg-violet-50 text-violet-600',
  announcement: 'bg-red-50 text-red-600',
}

const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
  news: { vi: 'Tin tức', en: 'News' },
  policy: { vi: 'Chính sách', en: 'Policy' },
  announcement: { vi: 'Thông báo', en: 'Announcement' },
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  news: <Tag className="w-3.5 h-3.5" />,
  policy: <Megaphone className="w-3.5 h-3.5" />,
  announcement: <Bell className="w-3.5 h-3.5" />,
}

export default function NewsSection({ locale, limit = 4, showViewAll = true }: NewsSectionProps) {
  const [news, setNews] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`/api/news?limit=${limit}`)
        const data = await res.json()
        setNews(data.news || [])
      } catch {
        setNews([])
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [limit])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (news.length === 0) return null

  return (
    <div className="space-y-3">
      {news.map((item) => (
        <Link
          key={item.id}
          href="/news"
          className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-violet-200 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
                  CATEGORY_COLORS[item.category] || CATEGORY_COLORS.news
                )}
              >
                {CATEGORY_ICONS[item.category] || CATEGORY_ICONS.news}
                {CATEGORY_LABELS[item.category]?.[locale === 'vi' ? 'vi' : 'en'] || item.category}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 transition-colors line-clamp-2">
                {locale === 'vi' ? item.title : (item.titleEn || item.title)}
              </h4>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {locale === 'vi' ? item.excerpt : (item.excerptEn || item.excerpt)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">
                  {new Date(item.publishedAt).toLocaleDateString(
                    locale === 'vi' ? 'vi-VN' : 'en-US',
                    { day: '2-digit', month: 'short', year: 'numeric' }
                  )}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 group-hover:text-violet-400 transition-colors" />
          </div>
        </Link>
      ))}

      {showViewAll && (
        <Link
          href="/news"
          className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
        >
          {locale === 'vi' ? 'Xem tất cả tin tức' : 'View All News'}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
