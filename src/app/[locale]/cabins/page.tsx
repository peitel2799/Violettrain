import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { CABIN_CLASSES } from '@/lib/constants'
import type { CabinProductId } from '@/lib/cabin-products'
import ProductTicketPrice from '@/components/cabins/ProductTicketPrice'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cabins' })
  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default async function CabinsPage() {
  const t = await getTranslations('cabins')
  const locale = await getLocale()
  const isVi = locale === 'vi'

  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/premium_room/room2.JPG"
          alt="Violette Train VIP 2 cabin"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/50 via-violet-950/30 to-violet-950/70" />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-3 drop-shadow-lg">{t('title')}</h1>
          <p className="text-white/80 max-w-xl mx-auto text-lg md:text-xl drop-shadow-md">{t('subtitle')}</p>
        </div>
      </section>

      {/* Cabin Classes */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 sm:space-y-16 md:space-y-20 lg:space-y-24">
            {CABIN_CLASSES.map((cabin, i) => (
              <div
                key={cabin.id}
                id={cabin.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Image */}
                <div className={`relative h-64 sm:h-80 md:h-96 lg:h-[500px] rounded-2xl overflow-hidden ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Image
                    src={cabin.images[0]}
                    alt={t(`${cabin.id}.name`)}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>

                {/* Content */}
                <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                  <span className="inline-block bg-gold-500 text-violet-950 text-xs font-bold px-3 py-1 rounded uppercase tracking-wide mb-3">
                    {cabin.abbr}
                  </span>
                  <h2 className="font-serif text-3xl md:text-4xl text-gray-900 font-bold mb-2">
                    {t(`${cabin.id}.name`)}
                  </h2>
                  <p className="text-gold-600 font-medium mb-4">{t(cabin.taglineKey)}</p>
                  <p className="text-gray-500 mb-4 leading-relaxed">
                    {t(cabin.descKey)}
                  </p>

                  {/* Passenger Configurations */}
                  <div className="mb-6 space-y-3">
                    {cabin.configs.map((config) => (
                      <div key={config.maxPax} className="flex items-start sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 text-sm sm:text-base">{config.maxPax} {t('guestsPerRoom')}</span>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            {t(`${config.descKey}`)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">
                            {t('startingFrom')} <ProductTicketPrice cabinClassId={cabin.id as CabinProductId} />
                          </span>
                          <span className="text-xs text-gray-400 block">{t('perPerson')}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Amenities */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{t('amenities')}</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {cabin.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gold-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{isVi ? ({
                            'Four fixed berths': 'Bốn giường cố định',
                            'Upper beds cannot be raised': 'Giường trên không thể nâng lên',
                            'Private cabin when buying 4 tickets': 'Cabin riêng khi mua đủ 4 vé',
                            'Air conditioning': 'Điều hòa không khí',
                            'Bedding included': 'Bao gồm bộ ga giường',
                            'Upper beds can be raised': 'Giường trên có thể nâng lên',
                            'More comfortable daytime space': 'Không gian ban ngày thoải mái hơn',
                            'Four-passenger cabin': 'Cabin dành cho 4 khách',
                          } as Record<string, string>)[amenity] || amenity : amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-violet-950">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="font-serif text-3xl text-white font-bold mb-4">{t('ctaTitle')}</h2>
          <p className="text-white/60 mb-8">{t('ctaSubtitle')}</p>
          <Link href="/booking" className="inline-flex bg-gold-500 hover:bg-gold-400 text-violet-950 font-semibold px-8 py-4 rounded-lg transition-all hover:scale-105">
            {t('ctaButton')}
          </Link>
        </div>
      </section>
    </>
  )
}
