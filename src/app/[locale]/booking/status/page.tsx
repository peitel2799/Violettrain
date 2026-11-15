import BookingStatusClient from '@/components/booking/BookingStatusClient'

export default async function BookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ reference?: string; return?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  return (
    <BookingStatusClient
      locale={locale === 'en' ? 'en' : 'vi'}
      reference={query.reference || ''}
      returnState={query.return || ''}
    />
  )
}
