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
  const t = await getTranslations({ locale, namespace: 'about' })

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
            {t('heroTitle')}
          </h1>
          <p className="text-white/70 max-w-xl mx-auto">
            {t('heroSubtitle')}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gold-500/10 text-gold-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
              <Train className="w-4 h-4" />
              {t('story.title')}
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-gray-900 font-bold mb-6">
              {t('mission.title')}
            </h2>
            <p className="text-gray-500 leading-relaxed text-lg">
              {t('mission.text')}
            </p>
          </div>
          <div className="bg-violet-50 rounded-2xl p-8 text-center">
            <h3 className="font-serif text-2xl font-bold text-gray-900 mb-4">
              {t('mission.title')}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t('mission.text')}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-gray-900 font-bold mb-3">
              {t('coreValues')}
            </h2>
            <div className="w-16 h-1 bg-gold-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {t('uniqueTitle')}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t('uniqueDesc')}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-5">
                <Headphones className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {t('professionalTitle')}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t('professionalDesc')}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mx-auto mb-5">
                <Leaf className="w-7 h-7 text-gold-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {t('sustainableTitle')}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t('sustainableDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-violet-950">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="font-serif text-3xl text-white font-bold mb-4">
            {t('readyTitle')}
          </h2>
          <p className="text-white/60 mb-8">
            {t('readySubtitle')}
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-violet-950 font-semibold text-lg px-8 py-4 rounded-lg transition-all hover:scale-105 shadow-xl shadow-gold-500/25"
          >
            {t('bookNow')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
