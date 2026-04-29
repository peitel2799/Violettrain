'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube } from 'lucide-react'

export default function Footer() {
  const t = useTranslations('common.footer')
  const tNav = useTranslations('common.nav')

  const quickLinks = [
    { href: '/', label: tNav('home') },
    { href: '/booking', label: tNav('booking') },
    { href: '/cabins', label: tNav('cabins') },
    { href: '/news', label: 'News' },
    { href: '/blog', label: tNav('blog') },
  ]

  const supportLinks = [
    { href: '/about', label: tNav('about') },
    { href: '/contact', label: tNav('contact') },
    { href: '#', label: 'Refund Policy' },
    { href: '#', label: 'Terms of Service' },
    { href: '#', label: 'Privacy Policy' },
  ]

  return (
    <footer className="bg-violet-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo-violette-clean.svg"
                alt="Violette Trains Vietnam"
                width={56}
                height={56}
                className="h-14 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              {t('about')}
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-violet-950 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-violet-950 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-violet-950 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-gold-400 font-semibold text-sm uppercase tracking-wider mb-4">
              {t('quickLinks')}
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/60 hover:text-gold-400 transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-gold-400 font-semibold text-sm uppercase tracking-wider mb-4">
              {t('support')}
            </h3>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-white/60 hover:text-gold-400 transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-gold-400 font-semibold text-sm uppercase tracking-wider mb-4">
              {t('contact')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-gold-400 flex-shrink-0" />
                <span className="text-white/60 text-sm">{t('address')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-gold-400 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <a href="tel:0915823667" className="text-white/60 hover:text-gold-400 transition-colors text-sm">
                    {t('phone')}
                  </a>
                  <a href="tel:0947163497" className="text-white/60 hover:text-gold-400 transition-colors text-sm sm:pl-2 sm:border-l sm:border-white/20">
                    {t('phoneAlt')}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <a href="mailto:violettetrains@gmail.com" className="text-white/60 hover:text-gold-400 transition-colors text-sm">
                  {t('email')}
                </a>
              </li>
              <li className="flex items-start gap-2 mt-2">
                <span className="text-gold-400 text-xs font-medium bg-gold-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                  Check-in
                </span>
                <span className="text-white/50 text-xs leading-relaxed">
                  {t('checkIn')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/50 text-xs">
            &copy; {new Date().getFullYear()} {t('copyright')}
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-white/50 hover:text-gold-400 text-xs transition-colors">
              {t('privacy')}
            </Link>
            <Link href="#" className="text-white/50 hover:text-gold-400 text-xs transition-colors">
              {t('terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
