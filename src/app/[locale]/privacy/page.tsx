import type { Metadata } from 'next'
import PolicyPage, { policyMetadata } from '@/components/legal/PolicyPage'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return policyMetadata('privacy', locale)
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <PolicyPage policy="privacy" locale={locale} />
}
