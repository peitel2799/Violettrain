import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import BookingPageContent from '@/components/booking/BookingPageContent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking' })

  return {
    title: t('title'),
    description: t('title'),
  }
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <BookingPageContent locale={locale} />
}
