import HeroSection from '@/components/home/HeroSection'
import StationCarousel from '@/components/home/StationCarousel'
import WhyUsSection from '@/components/home/WhyUsSection'
import CabinShowcase from '@/components/home/CabinShowcase'
import StatsSection from '@/components/home/StatsSection'
import NoticeSection from '@/components/home/NoticeSection'
import NewsSection from '@/components/home/NewsSection'
import TripInspiration from '@/components/home/TripInspiration'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import BookingCTA from '@/components/home/BookingCTA'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <>
      <HeroSection />
      <StationCarousel />
      <WhyUsSection />
      <CabinShowcase />
      <StatsSection />
      <NoticeSection />
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h2
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {locale === 'vi' ? 'Tin tức & Thông báo' : 'News & Updates'}
            </h2>
            <p className="text-gray-500 text-sm">
              {locale === 'vi'
                ? 'Cập nhật lịch trình và chính sách mới nhất.'
                : 'Latest schedules and policies updates.'}
            </p>
          </div>
          <NewsSection locale={locale as 'vi' | 'en'} limit={4} showViewAll />
        </div>
      </section>
      <TripInspiration />
      <TestimonialsSection />
      <BookingCTA />
    </>
  )
}
