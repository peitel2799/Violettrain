import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { ArrowRight, Sparkles, Headphones, Leaf, Train } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isVi = locale === 'vi'

  return (
    <div className="min-h-screen">
      <section className="relative h-56 sm:h-64 md:h-80 flex items-center justify-center overflow-hidden">
        <Image
          src="/violette-train-evening.jpg"
          alt="Violette Train Express"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-violet-950/70" />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-bold mb-3">
            {isVi ? 'Giới thiệu' : 'About Us'}
          </h1>
          <p className="text-white/70 max-w-xl mx-auto">
            {isVi ? 'Khám phá câu chuyện đằng sau Violette Train' : 'Discover the story behind Violette Train'}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gold-500/10 text-gold-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
              <Train className="w-4 h-4" />
              {isVi ? 'Câu chuyện của chúng tôi' : 'Our Story'}
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-gray-900 font-bold mb-6">
              {isVi ? 'Hành trình văn hóa đường sắt' : 'A Cultural Rail Journey'}
            </h2>
            <p className="text-gray-500 leading-relaxed text-lg">
              {isVi
                ? 'Violette Train ra đời từ niềm đam mê kết hợp giữa di sản đường sắt Việt Nam và trải nghiệm du lịch hiện đại. Chúng tôi tin rằng mỗi chuyến tàu không chỉ là phương tiện di chuyển, mà là một hành trình đáng nhớ, nơi hành khách được trải nghiệm văn hóa, thiên nhiên và sự thoải mái đẳng cấp.'
                : "Violette Train was born from a passion for combining Vietnam's railway heritage with modern travel experiences. We believe every train journey is more than transportation — it's a memorable journey where passengers experience culture, nature, and luxury comfort."}
            </p>
          </div>
          <div className="bg-violet-50 rounded-2xl p-8 text-center">
            <h3 className="font-serif text-2xl font-bold text-gray-900 mb-4">
              {isVi ? 'Sứ mệnh của chúng tôi' : 'Our Mission'}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {isVi
                ? 'Mang đến trải nghiệm du lịch đường sắt đẳng cấp, khám phá vẻ đẹp Việt Nam qua mỗi chuyến tàu. Chúng tôi cam kết bảo tồn di sản đường sắt Việt Nam đồng thời mang đến tiêu chuẩn dịch vụ cao nhất cho hành khách.'
                : "To deliver luxury rail travel experiences and showcase the beauty of Vietnam through every train journey. We are committed to preserving Vietnam's railway heritage while delivering the highest standard of service to our passengers."}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-gray-900 font-bold mb-3">
              {isVi ? 'Giá trị cốt lõi' : 'Our Core Values'}
            </h2>
            <div className="w-16 h-1 bg-gold-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {isVi ? 'Độc đáo & Tiên phong' : 'Unique & Pioneering'}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {isVi
                  ? "Thiết kế tàu tinh xảo với hoa văn thổ cẩm H'Mong và tranh Đông Hồ, mang đậm bản sắc văn hóa Việt Nam."
                  : "Train interiors featuring H'Mong brocade patterns and Dong Ho paintings, celebrating Vietnamese cultural heritage."}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-5">
                <Headphones className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {isVi ? 'Chuyên nghiệp & Tận tâm' : 'Professional & Dedicated'}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {isVi
                  ? 'Đội ngũ nhân viên phục vụ 24/7 quanh năm, kể cả ngày lễ Tết, cam kết mang đến dịch vụ nhanh chóng và đáng tin cậy.'
                  : 'Our dedicated team provides 24/7 service year-round, including holidays, committed to fast and reliable service.'}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-5">
                <Leaf className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {isVi ? 'Bền vững & Đổi mới' : 'Sustainable & Innovative'}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {isVi
                  ? 'Cam kết bảo vệ môi trường với các sản phẩm thân thiện, hỗ trợ cộng đồng địa phương và gìn giữ di sản văn hóa.'
                  : 'Committed to environmental protection with eco-friendly products, supporting local communities and preserving cultural heritage.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-violet-950">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="font-serif text-3xl text-white font-bold mb-4">
            {isVi ? 'Sẵn sàng cho hành trình?' : 'Ready for Your Journey?'}
          </h2>
          <p className="text-white/60 mb-8">
            {isVi
              ? 'Đặt vé ngay hôm nay và trải nghiệm du lịch đường sắt đẳng cấp cùng Violette Train.'
              : 'Book your ticket today and experience luxury train travel with Violette Train.'}
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-violet-950 font-semibold text-lg px-8 py-4 rounded-lg transition-all hover:scale-105 shadow-xl shadow-gold-500/25"
          >
            {isVi ? 'Đặt vé ngay' : 'Book Now'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
