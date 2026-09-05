import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Clock, Tag, Calendar, User } from 'lucide-react'
import { BLOG_POSTS, CATEGORY_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) return {}

  const isVi = locale === 'vi'
  return {
    title: isVi ? post.title : post.titleEn,
    description: isVi ? post.excerpt : post.excerptEn,
    openGraph: {
      title: isVi ? post.title : post.titleEn,
      description: isVi ? post.excerpt : post.excerptEn,
      images: [{ url: post.coverImage }],
    },
  }
}

const ARTICLE_CONTENT: Record<string, { vi: string[]; en: string[] }> = {
  'discover-sapa-by-train': {
    vi: [
      'Đặt chân lên chuyến tàu đêm từ Hà Nội đến Sapa, bạn không chỉ đơn thuần di chuyển — bạn đang bắt đầu một hành trình khám phá văn hóa và thiên nhiên Tây Bắc Việt Nam ngay từ khi rời ga.',
      'Khoảng 8 tiếng rưỡi trên tàu Violette Orient SE19, từ 22:00 đến 06:30, là khoảng thời gian đủ để bạn nghỉ ngơi trong cabin 4 giường cố định hoặc cabin VIP 2.',
      'Điều đầu tiên khiến chuyến tàu Hà Nội — Sapa trở nên đặc biệt chính là cảnh quan thay đổi không ngừng bên ngoài cửa kính. Từ ánh đèn thành phố về đêm, qua những cánh đồng lúa xanh mướt, rồi dần dần là đồi núi.',
      'Khi đến Lào Cai, không khí se lạnh của vùng núi Tây Bắc chào đón bạn ngay tại ga.',
      'Violette Train có hai sản phẩm cabin 4 khách: cabin 4 giường cố định và VIP 2 với giường tầng trên có thể nâng lên. Mua đủ 4 vé để sử dụng riêng toàn bộ cabin.',
    ],
    en: [
      'Stepping aboard the night train from Hanoi to Sapa, you are not merely traveling — you are beginning a journey of cultural and natural discovery the moment you leave the station.',
      'The approximately 8 hours and 30 minutes aboard the Violette Orient SE19, departing at 22:00 and arriving at 06:30, gives you time to rest in either a fixed four-berth cabin or a VIP 2 cabin.',
      'What makes the Hanoi — Sapa train journey truly special is the ever-changing landscape outside the window. From city lights at night through lush green rice fields and rolling mountain ranges.',
      'When arriving in Lao Cai, the cool mountain air of the Northwest greets you right at the station.',
      'Violette Train offers two four-person cabin products: the fixed four-berth cabin and VIP 2 with raisable upper berths. Buy all 4 tickets to use the cabin privately.',
    ],
  },
  'sapa-travel-guide-2026': {
    vi: [
      'Sapa — thị trấn núi huyền thoại — là điểm đến mà bất kỳ du khách nào cũng muốn một lần đặt chân tới.',
      'Thời điểm đẹp nhất để đến Sapa là từ tháng 9 đến tháng 11. Từ tháng 12 đến tháng 2, Sapa khoác áo tuyết trắng.',
      'Di chuyển bằng tàu lửa Violette là lựa chọn lý tưởng nhất: bạn có thể ngủ qua đêm trên tàu, tiết kiệm một đêm khách sạn.',
      'Fansipan — "Nóc nhà Đông Dương" với chiều cao 3.147m — là đỉnh núi cao nhất Việt Nam.',
      'Ngoài Fansipan, bản làng Tả Van, Lao Chải và thác Bạc là những điểm đến mang đậm bản sắc văn hóa dân tộc.',
    ],
    en: [
      'Sapa — the legendary mountain town — is a destination every traveler dreams of visiting.',
      'The best time to visit Sapa is from September to November. From December to February, Sapa dresses in white snow.',
      'Traveling by Violette train is the ideal choice: you can sleep through the night on the train, saving one hotel night.',
      'Fansipan — the "Roof of Indochina" at 3,147m altitude — is the highest peak in Vietnam.',
      'Beyond Fansipan, Ta Van village, Lao Chai village, and Silver Waterfall are destinations rich in ethnic cultural heritage.',
    ],
  },
  '10-things-before-sapa-trip': {
    vi: [
      'Trước khi lên đường đến Sapa, có những điều quan trọng bạn cần biết để chuyến đi thêm phần trọn vẹn.',
      'Đầu tiên và quan trọng nhất: HÃY ĐẶT VÉ TÀU TRƯỚC. Các chuyến tàu HN-Sapa đặc biệt SE19 rất hay kín chỗ, đặc biệt vào cuối tuần.',
      'Về hành lý: Sapa có khí hậu mát mù quanh năm (15-25°C), nhưng nếu đi mùa đông, nhiệt độ có thể xuống 0°C.',
      'Về tiền bạc: Lào Cai và Sapa có cây ATM, nhưng có thể hết tiền vào cuối tuần hoặc ngày lễ.',
      'Mẹo quan trọng: Nếu đi vào mùa lễ (Tết, 30/4, 1/5), hãy đặt mọi thứ trước ít nhất 1 tháng.',
    ],
    en: [
      'Before setting off for Sapa, there are important things you need to know to make your trip more complete.',
      'First and most importantly: BOOK YOUR TRAIN TICKETS IN ADVANCE. HN-Sapa trains especially SE19 often sell out quickly on weekends.',
      'Regarding luggage: Sapa has a cool climate year-round (15-25°C), but in winter temperatures can drop to 0°C.',
      'Regarding money: Lao Cai and Sapa have ATMs, but they may run out on weekends or holidays.',
      'Important tip: If traveling during holidays, book everything at least 1 month in advance.',
    ],
  },
  'phong-nha-cave-guide': {
    vi: [
      'Phong Nha — Kẻ Bàng, Di sản Thiên nhiên Thế giới UNESCO từ 2003, là quần thể hang động lớn nhất thế giới.',
      'Động Phong Nha — cửa hang rộng nhất và đẹp nhất — là điểm khởi đầu hoàn hảo.',
      'Hang Sơn Đoòng — hang động lớn nhất thế giới — là đỉnh cao của trải nghiệm Phong Nha.',
      'Theo giờ tàu DSVN hiện hành, các tàu Thống Nhất SE7, SE5, SE9, SE3 và SE1 đi từ Hà Nội đến Đồng Hới trong khoảng 9 giờ 37 phút đến 10 giờ 57 phút. Từ Đồng Hới, tiếp tục đi ô tô khoảng 50 km đến khu vực Phong Nha.',
    ],
    en: [
      'Phong Nha — Ke Bang, a UNESCO World Natural Heritage Site since 2003, is the largest cave system in the world.',
      'Phong Nha Cave — the widest and most beautiful entrance — is the perfect starting point.',
      'Hang Son Doong — the largest cave in the world — is the pinnacle of the Phong Nha experience.',
      'Under the current DSVN timetable, Reunification services SE7, SE5, SE9, SE3 and SE1 travel from Hanoi to Dong Hoi in about 9h 37m to 10h 57m. From Dong Hoi, continue roughly 50 km by road to Phong Nha.',
    ],
  },
  'hanoi-night-train-experience': {
    vi: [
      'Khi nhắc đến tuần trăng mật, người ta thường nghĩ đến những bãi biển nhiệt đới hay thành phố lãng mạn châu Âu.',
      'Một hành trình tàu lửa đêm HN-Sapa trên Violette Train mang đến trải nghiệm hoàn toàn khác biệt.',
      'Cabin VIP 2 của Violette Train dành cho 4 khách; giường tầng trên có thể nâng lên để tạo không gian thoải mái hơn vào ban ngày. Mua đủ 4 vé để sử dụng riêng cabin.',
      'Sáng hôm sau, khi tàu đến Lào Cai, cặp đôi được đón bằng khung cảnh núi non hùng vĩ.',
    ],
    en: [
      'When it comes to honeymoons, people typically think of tropical beaches or romantic European cities.',
      'A Hanoi — Sapa overnight train journey on Violette Train offers a completely different experience.',
      'The four-person Violette VIP 2 cabin has upper berths that can be raised for a more comfortable daytime space. Buy all 4 tickets to reserve it privately.',
      'The next morning, when the train arrives in Lao Cai, the couple is greeted by majestic mountain scenery.',
    ],
  },
  'hue-imperial-city-guide': {
    vi: [
      'Huế — Cố đô của Việt Nam — là một trong những trung tâm văn hóa, tâm linh và ẩm thực đặc sắc nhất Việt Nam.',
      'Di sản Cố đô Huế được UNESCO công nhận gồm: Quần thể di tích Cố đô Huế (1993) và Nhạc cung đình Huế (2003).',
      'Cách tốt nhất để khám phá Huế là bắt đầu từ Đại Nội — kinh đô của triều Nguyễn.',
      'Theo giờ tàu DSVN hiện hành, các tàu SE7, SE5, SE9, SE3 và SE1 rời Hà Nội lần lượt lúc 06:00, 08:00, 13:00, 19:20 và 21:45; đến Huế lúc 19:43, 21:40, 03:12, 07:55 và 10:30 (ba giờ đến cuối là ngày hôm sau).',
    ],
    en: [
      'Hue — the former imperial capital of Vietnam — is one of the most distinctive cultural, spiritual, and culinary centers in Vietnam.',
      'Hue Imperial Heritage sites recognized by UNESCO include: Complex of Hue Monuments (1993) and Hue Imperial Court Music (2003).',
      'The best way to explore Hue is starting from the Imperial City — the capital of the Nguyen Dynasty.',
      'Under the current DSVN timetable, trains SE7, SE5, SE9, SE3 and SE1 leave Hanoi at 06:00, 08:00, 13:00, 19:20 and 21:45, arriving in Hue at 19:43, 21:40, 03:12, 07:55 and 10:30 respectively (the final three arrivals are the next day).',
    ],
  },
}

function getArticleContent(slug: string, locale: string): string[] {
  return ARTICLE_CONTENT[slug]?.[locale === 'vi' ? 'vi' : 'en'] || []
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) notFound()

  const isVi = locale === 'vi'
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.slug !== slug && p.category === post.category
  ).slice(0, 3)

  const contentParagraphs = getArticleContent(slug, locale)
  const categoryColor = CATEGORY_COLORS[post.category] || 'bg-gray-50 text-gray-600'
  const categoryLabel = t(`categories.${post.category}`)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-64 sm:h-72 md:h-96">
        <Image
          src={post.coverImage}
          alt={isVi ? post.title : post.titleEn}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-violet-950/30 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('categories.all')}
          </Link>
        </div>

        <div className="absolute bottom-5 left-5 right-5">
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${categoryColor}`}>
            <Tag className="w-3 h-3" />
            {categoryLabel}
          </div>
          <h1 className="font-serif text-2xl md:text-4xl text-white font-bold mb-2 leading-tight">
            {isVi ? post.title : post.titleEn}
          </h1>
          <div className="flex items-center gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(post.publishedAt, isVi ? 'vi-VN' : 'en-US')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime} min
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-10 shadow-sm">
          <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
            {isVi ? post.excerpt : post.excerptEn}
          </p>

          {contentParagraphs.map((paragraph, idx) => (
            <p key={idx} className="text-gray-700 leading-loose mb-6 text-base md:text-lg">
              {paragraph}
            </p>
          ))}

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400">{t('tags')}</span>
            {['Sapa', 'Train', 'Travel', 'Vietnam'].map((tag) => (
              <span
                key={tag}
                className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm text-gray-500">{t('share')}</span>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=https://violettetrain.vn/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Facebook
            </a>
          </div>
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">
              {t('relatedArticles')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="relative h-36">
                    <Image
                      src={related.coverImage}
                      alt={isVi ? related.title : related.titleEn}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="33vw"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-violet-600 transition-colors">
                      {isVi ? related.title : related.titleEn}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {related.readTime} {t('minRead')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 bg-gradient-to-br from-violet-900 to-violet-950 rounded-2xl p-8 text-center">
          <h3 className="font-serif text-2xl text-white font-bold mb-3">
            {t('readyTitle')}
          </h3>
          <p className="text-white/70 mb-6 text-sm">
            {t('readySubtitle')}
          </p>
          <Link
            href={`/${locale}/booking`}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-violet-950 font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-gold-500/25"
          >
            {t('bookNow')}
          </Link>
        </div>
      </div>
    </div>
  )
}
