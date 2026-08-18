import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'common' })

  const isVi = locale === 'vi'

  return {
    title: {
      template: '%s | Violette Train',
      default: isVi
        ? 'Violette Train — Du lịch tàu cao cấp tại Việt Nam'
        : 'Violette Train — Luxury Train Travel in Vietnam',
    },
    description: isVi
      ? 'Violette Train mang đến trải nghiệm du lịch tàu đẳng cấp tại Việt Nam. Đặt vé tàu Hà Nội - Sapa, Ninh Bình, Huế, Đà Nẵng với hạng phòng VIP, phòng chờ sang trọng và dịch vụ xuất sắc.'
      : t('tagline'),
    keywords: isVi
      ? [
          'Violette Train',
          'violettetrain',
          'du lịch tàu cao cấp Việt Nam',
          'tàu lửa Sapa',
          'tàu Hà Nội Sapa',
          'tàu du lịch',
          'đặt vé tàu',
          'tàu VIP Việt Nam',
          'du lịch đường sắt',
          'ga Hà Nội',
          'hạng phòng tàu',
          'tàu lửa sang trọng',
          'Violet Train',
          'violet train Vietnam',
        ]
      : [
          'Violette Train',
          'violettetrain',
          'Vietnam train',
          'Vietnam luxury train',
          'Sapa train',
          'Hanoi to Sapa train',
          'train travel Vietnam',
          'luxury train Vietnam',
          'Vietnamese railway',
          'train booking Vietnam',
          'Hanoi train station',
          'premium train cabins',
          'VIP train travel',
          'Violet Train',
          'violet train Vietnam',
        ],
    openGraph: {
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      alternateLocale: locale === 'vi' ? 'en_US' : 'vi_VN',
      siteName: 'Violette Train',
      title: isVi
        ? 'Violette Train — Du lịch tàu cao cấp tại Việt Nam'
        : 'Violette Train — Luxury Train Travel in Vietnam',
      description: isVi
        ? 'Violette Train mang đến trải nghiệm du lịch tàu đẳng cấp tại Việt Nam. Đặt vé tàu Hà Nội - Sapa, Ninh Bình, Huế, Đà Nẵng ngay hôm nay.'
        : 'Violette Train offers luxury train travel experiences in Vietnam. Book your Hanoi to Sapa, Ninh Binh, Hue, Da Nang journey today.',
      images: [
        {
          url: '/premium_room/outside2.JPG',
          width: 2560,
          height: 1920,
          alt: 'Violette Train — Luxury Train Travel in Vietnam',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: isVi
        ? 'Violette Train — Du lịch tàu cao cấp tại Việt Nam'
        : 'Violette Train — Luxury Train Travel in Vietnam',
      description: isVi
        ? 'Violette Train mang đến trải nghiệm du lịch tàu đẳng cấp tại Việt Nam.'
        : 'Violette Train offers luxury train travel experiences in Vietnam.',
      images: ['/premium_room/outside2.JPG'],
      creator: '@violettetrain',
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        vi: '/',
        en: '/en',
      },
    },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'vi' | 'en')) {
    notFound()
  }

  const messages = await getMessages()
  const t = await getTranslations({ locale, namespace: 'common' })

  return (
    <NextIntlClientProvider messages={messages}>
      <a href="#main-content" className="skip-link">
        {t('skipLink')}
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  )
}
