import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Clock, Tag, Calendar, User } from 'lucide-react'
import { BLOG_POSTS } from '@/lib/constants'
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

const CATEGORY_COLORS: Record<string, string> = {
  travel: 'bg-blue-50 text-blue-600',
  tips: 'bg-green-50 text-green-600',
  culture: 'bg-violet-50 text-violet-600',
  food: 'bg-orange-50 text-orange-600',
  testimonial: 'bg-gold-50 text-gold-600',
}

const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
  travel: { vi: 'Du lịch', en: 'Travel' },
  tips: { vi: 'Mẹo hay', en: 'Tips' },
  culture: { vi: 'Văn hóa', en: 'Culture' },
  food: { vi: 'Ẩm thực', en: 'Food' },
  testimonial: { vi: 'Cảm nhận', en: 'Guest Stories' },
}

const ARTICLE_CONTENT: Record<string, { vi: string[]; en: string[] }> = {
  'discover-sapa-by-train': {
    vi: [
      'Dat cho~n lên chuyen tau dem tu Hanoi den Sapa, ban khong chi don thuan di chuyen — ban dang bat dau mot hanh trinh kham pha van hoa va thien nhien Tay Bac Viet Nam ngay tu khi roi ga.',
      'Khoang 8 tieng ruoi tren tau Violette Orient SE19, tu 22:00 den 06:30, la khoang thoi gian du de ban chim vao giac ngu trong khong gian phong Standard am cung hoac phong Premium yen tinh.',
      'Dieu dau tien khiến chuyen tau Hanoi — Sapa tro nen dac biet chinh la canh quan thay doi khong ngung ben ngoai cua kinh. Tu anh den thanh pho ve dem, qua nhung canh dong lua xanh muot, roi dan dan la doi nuoi trung dien.',
      'Khi den Lao Cai, khong khi se la~nh cua vung nui Tay Bac chao don ban ngay tai ga.',
      'Violette Train cung cap dich vu tau dem Hanoi — Sapa voi hai hang phong: Standard (4 giuong/phong) va Premium (2 giuong/phong co nha ve sinh rieng).',
    ],
    en: [
      'Stepping aboard the night train from Hanoi to Sapa, you are not merely traveling — you are beginning a journey of cultural and natural discovery the moment you leave the station.',
      'The approximately 8 hours and 30 minutes aboard the Violette Orient SE19, departing at 22:00 and arriving at 06:30, is just enough time to drift into a restful sleep in the cozy Standard cabin or the serene Premium cabin.',
      'What makes the Hanoi — Sapa train journey truly special is the ever-changing landscape outside the window. From city lights at night through lush green rice fields and rolling mountain ranges.',
      'When arriving in Lao Cai, the cool mountain air of the Northwest greets you right at the station.',
      'Violette Train offers the Hanoi — Sapa overnight train service with two cabin classes: Standard (4 beds/room) and Premium (2 beds/room with private restroom).',
    ],
  },
  'sapa-travel-guide-2026': {
    vi: [
      'Sapa — thi tran nui huyen thoai — la diem den ma bat ky du khach nao cung muon mot lan dat chan toi.',
      'Thoi diem dep nhat de den Sapa la tu thang 9 den thang 11. Tu thang 12 den thang 2, Sapa khoac ao tuyet trang.',
      'Di chuyen bang tau lua Violette la lua chon ly tuong nhat: ban co the ngu qua dem tren tau, tiet kiem mot dem khach san.',
      'Fansipan — "Noc nha Dong Duong" voi chieu cao 3.147m — la dinh nui cao nhat Viet Nam.',
      'Ngoai Fansipan, ban lang Ta Van, Lao Chai va thac Bac la nhung diem den mang dam ban sac van hoa dan toc.',
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
      'Truoc khi len duong den Sapa, co nhung dieu quan trong ban can biet de chuyen di them phan tron ven.',
      'Dau tien va quan trong nhat: HAY DAT VE TAU TRUOC. Cac chuyen tau HN-Sapa dac biet SE19 rat hay kinh cho, dac biet vao cuoi tuan.',
      'Ve hanh ly: Sapa co khi hau mat mung quanh nam (15-25C), nhung neu di mua dong, nhiet do co the xuong 0C.',
      'Ve tien bac: Lao Cai va Sapa co cay ATM, nhung co the het tien vao cuoi tuan hoac ngay le.',
      'Meo quan trong: Neu di vao mua le (Tet, 30/4, 1/5), hay dat moi thu truoc it nhat 1 thang.',
    ],
    en: [
      'Before setting off for Sapa, there are important things you need to know to make your trip more complete.',
      'First and most importantly: BOOK YOUR TRAIN TICKETS IN ADVANCE. HN-Sapa trains especially SE19 often sell out quickly on weekends.',
      'Regarding luggage: Sapa has a cool climate year-round (15-25C), but in winter temperatures can drop to 0C.',
      'Regarding money: Lao Cai and Sapa have ATMs, but they may run out on weekends or holidays.',
      'Important tip: If traveling during holidays, book everything at least 1 month in advance.',
    ],
  },
  'phong-nha-cave-guide': {
    vi: [
      'Phong Nha — Ke Bang, Di san Thien nhien The gioi UNESCO tu 2003, la quan the hang dong lon nhat the gioi.',
      'Dong Phong Nha — cua hang rong nhat va dep nhat — la diem khoi dau hoan hao.',
      'Hang Son Doong — hang dong lon nhat the gioi — la dinh cao cua trai nghiem Phong Nha.',
      'Di chuyen bang tau Violette SE11/SE13 tu Hanoi den Dong Hoi (6 tieng), sau do o to khoang 50km den khuvuc Phong Nha.',
    ],
    en: [
      'Phong Nha — Ke Bang, a UNESCO World Natural Heritage Site since 2003, is the largest cave system in the world.',
      'Phong Nha Cave — the widest and most beautiful entrance — is the perfect starting point.',
      'Hang Son Doong — the largest cave in the world — is the pinnacle of the Phong Nha experience.',
      'Travel by Violette train SE11/SE13 from Hanoi to Dong Hoi (6 hours), then a 50km car ride to the Phong Nha area.',
    ],
  },
  'hanoi-night-train-experience': {
    vi: [
      'Khi nhac den tuan trang mat, nguoi ta thuong nghi den nhung bai bien nhiet doi hay thanh pho lang man Chau Au.',
      'Mot hanh trinh tau lua dem HN-Sapa tren Violette Train mang den trai nghiem hoan toan khac biet.',
      'Phong Premium cua Violette Train voi 2 giuong tang co the nang len, cua khoa rieng va nha ve sinh rieng mang den khong gian rieng tu tuyet doi.',
      'Sang hom sau, khi tau den Lao Cai, cap doi duoc don bang khung canh nui non hung vi.',
    ],
    en: [
      'When it comes to honeymoons, people typically think of tropical beaches or romantic European cities.',
      'A Hanoi — Sapa overnight train journey on Violette Train offers a completely different experience.',
      'The Violette Premium cabin with 2 push-up bunk beds, private lockable door, and en-suite restroom offers absolute privacy.',
      'The next morning, when the train arrives in Lao Cai, the couple is greeted by majestic mountain scenery.',
    ],
  },
  'hue-imperial-city-guide': {
    vi: [
      'Hue — Co do cua Viet Nam — la mot trong nhung trung tam van hoa, tam linh va am thuc dac sac nhat Viet Nam.',
      'Di san Co do Hue duoc UNESCO cong nhan gom: Quan the di tich Co do Hue (1993) va Nha nhac cung dinh Hue (2003).',
      'Cach tot nhat de kham pha Hue la bat dau tu Dai Noi — kinh do cua trieu Nguyen.',
      'Tau lua Violette SE7 va SE9 khoi hanh tu Hanoi luc 19:00 va 21:00, den Hue luc 07:15 va 09:15.',
    ],
    en: [
      'Hue — the former imperial capital of Vietnam — is one of the most distinctive cultural, spiritual, and culinary centers in Vietnam.',
      'Hue Imperial Heritage sites recognized by UNESCO include: Complex of Hue Monuments (1993) and Hue Imperial Court Music (2003).',
      'The best way to explore Hue is starting from the Imperial City — the capital of the Nguyen Dynasty.',
      'Violette trains SE7 and SE9 depart Hanoi at 19:00 and 21:00, arriving in Hue at 07:15 and 09:15.',
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
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) notFound()

  const isVi = locale === 'vi'
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.slug !== slug && p.category === post.category
  ).slice(0, 3)

  const contentParagraphs = getArticleContent(slug, locale)
  const categoryColor = CATEGORY_COLORS[post.category] || 'bg-gray-50 text-gray-600'
  const categoryLabel = CATEGORY_LABELS[post.category]?.[isVi ? 'vi' : 'en'] || post.category

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
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

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {isVi ? 'Tat ca bai viet' : 'All Articles'}
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

      {/* Article Content */}
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
            <span className="text-xs text-gray-400">{isVi ? 'Chu de:' : 'Tags:'}</span>
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
            <span className="text-sm text-gray-500">{isVi ? 'Chia se:' : 'Share:'}</span>
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

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">
              {isVi ? 'Bai viet lien quan' : 'Related Articles'}
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
                      {related.readTime} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-violet-900 to-violet-950 rounded-2xl p-8 text-center">
          <h3 className="font-serif text-2xl text-white font-bold mb-3">
            {isVi ? 'San sang cho hanh trinh cua ban?' : 'Ready for Your Journey?'}
          </h3>
          <p className="text-white/70 mb-6 text-sm">
            {isVi
              ? 'Dat ve tau Violette Train ngay hom nay va bat dau cuoc phieu luu cua ban.'
              : 'Book your Violette Train ticket today and start your adventure.'}
          </p>
          <Link
            href={`/${locale}/booking`}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-violet-950 font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-gold-500/25"
          >
            {isVi ? 'Dat ve ngay' : 'Book Now'}
          </Link>
        </div>
      </div>
    </div>
  )
}
