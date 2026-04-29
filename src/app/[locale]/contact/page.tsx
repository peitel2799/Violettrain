import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react'
import ContactForm from '@/components/contact/ContactForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })

  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  const tFooter = await getTranslations({ locale, namespace: 'common.footer' })
  const isVi = locale === 'vi'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-violet-900 to-violet-950 text-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t('title')}
          </h1>
          <p className="text-violet-200 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">
              {isVi ? 'Thông tin liên hệ' : 'Contact Information'}
            </h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-0.5">{t('info.address')}</p>
                  <p className="text-gray-500 text-sm">11 Thanh Nien Street, Ba Dinh, Ha Noi</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-0.5">{t('info.phone')}</p>
                  <div className="flex flex-col gap-1">
                    <a
                      href="tel:0915823667"
                      className="text-gold-600 hover:text-gold-700 text-sm transition-colors"
                    >
                      Mobile/WhatsApp/Zalo: 091 582 3667
                    </a>
                    <a
                      href="tel:0947163497"
                      className="text-gold-600 hover:text-gold-700 text-sm transition-colors"
                    >
                      0947 163 497
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-0.5">{t('info.email')}</p>
                  <a
                    href="mailto:violettetrains@gmail.com"
                    className="text-gold-600 hover:text-gold-700 text-sm transition-colors"
                  >
                    violettetrains@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageCircle className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-0.5">
                    {isVi ? 'Đặt vé qua tin nhắn' : 'Book via Message'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {isVi ? 'WhatsApp / Zalo' : 'WhatsApp / Zalo'}: 091 582 3667
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-0.5">
                    {isVi ? 'Điểm check-in' : 'Check-in Point'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Gate 16, Hall C, Floor 1, 120 Le Duan
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {isVi ? '(Ga Hà Nội)' : '(Ha Noi Station)'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-0.5">{t('info.hours')}</p>
                  <p className="text-gray-500 text-sm">
                    24/7 — {isVi ? 'Kể cả ngày lễ' : 'Including holidays'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl overflow-hidden h-48 bg-violet-100 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                <p className="text-sm text-violet-500 font-medium">
                  11 Thanh Nien Street, Ba Dinh, Ha Noi
                </p>
                <p className="text-xs text-violet-400 mt-1">
                  {isVi ? 'Văn phòng Violette Train' : 'Violette Train Office'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">
              {isVi ? 'Gửi tin nhắn' : 'Send a Message'}
            </h2>
            <ContactForm locale={locale} />
          </div>
        </div>
      </div>
    </div>
  )
}
