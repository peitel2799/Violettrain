import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { Bell, Tag, Megaphone } from 'lucide-react'
import NewsSection from '@/components/home/NewsSection'
import type { NewsCategory } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'news' })

  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const categories: { id: NewsCategory; label: string }[] = [
    { id: 'news', label: locale === 'vi' ? 'Tin tức' : 'News' },
    { id: 'policy', label: locale === 'vi' ? 'Chính sách' : 'Policies' },
    { id: 'announcement', label: locale === 'vi' ? 'Thông báo' : 'Announcements' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-900 to-violet-950 text-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Bell className="w-12 h-12 mx-auto text-gold-400 mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
            {locale === 'vi' ? 'Tin tức & Thông báo' : 'News & Updates'}
          </h1>
          <p className="text-violet-200 max-w-2xl mx-auto">
            {locale === 'vi'
              ? 'Cập nhật lịch trình, chính sách và thông báo mới nhất từ Violette Train và đường sắt Việt Nam.'
              : 'Stay updated with the latest schedules, policies and announcements from Violette Train and Vietnam Railway.'}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-violet-300 hover:shadow-sm transition-all"
            >
              {cat.id === 'news' && <Tag className="w-6 h-6 text-blue-500" />}
              {cat.id === 'policy' && <Megaphone className="w-6 h-6 text-violet-500" />}
              {cat.id === 'announcement' && <Bell className="w-6 h-6 text-red-500" />}
              <span className="text-sm font-medium text-gray-700">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* News List */}
        <NewsSection locale={locale as 'vi' | 'en'} limit={20} showViewAll={false} />
      </div>
    </div>
  )
}
