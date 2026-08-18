'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { Globe, Menu, Phone, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const t = useTranslations('common.nav')
  const tCommon = useTranslations('common')
  const locale = useLocale() as 'vi' | 'en'
  const pathname = usePathname()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isHome = pathname === '/'
  const isTransparent = isHome && !isScrolled && !isMobileOpen

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 36)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const toggleLocale = () => {
    router.replace(pathname, { locale: locale === 'vi' ? 'en' : 'vi' })
  }

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/cabins', label: t('cabins') },
    { href: '/blog', label: t('blog') },
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-16 transition-all duration-300 sm:h-[72px]',
        isTransparent
          ? 'border-b border-white/10 bg-transparent'
          : 'border-b border-gray-100 bg-white/95 shadow-card backdrop-blur-xl'
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex h-full shrink-0 items-center focus-ring" aria-label="Violette Train">
          <Image
            src="/logo-violette-clean.svg"
            alt="Violette Train"
            width={80}
            height={72}
            priority
            className={cn(
              'h-11 w-auto object-contain transition-all duration-300 sm:h-14',
              isTransparent && 'brightness-0 invert'
            )}
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'group relative py-2 text-sm font-medium transition-colors focus-ring',
                isTransparent ? 'text-white/80 hover:text-white' : 'text-violet-950/70 hover:text-violet-700'
              )}
            >
              {link.label}
              <span className={cn(
                'absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100',
                isTransparent ? 'bg-gold-400' : 'bg-violet-600'
              )} />
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <a
            href="tel:0915823667"
            className={cn(
              'hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring xl:inline-flex',
              isTransparent ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-violet-950/65 hover:bg-violet-50 hover:text-violet-800'
            )}
            aria-label={isHome ? (locale === 'vi' ? 'Gọi Violette Train' : 'Call Violette Train') : undefined}
          >
            <Phone className="h-4 w-4" />
            0915 823 667
          </a>

          <button
            onClick={toggleLocale}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold uppercase tracking-wide transition-colors focus-ring',
              isTransparent ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-violet-950/60 hover:bg-violet-50 hover:text-violet-700'
            )}
            aria-label={tCommon('locale.switch')}
          >
            <Globe className="h-4 w-4" />
            <span>{locale}</span>
          </button>

          <Link
            href="/booking"
            className="hidden min-h-10 items-center rounded-lg bg-gold-500 px-5 text-sm font-semibold text-violet-950 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-lg focus-ring sm:inline-flex"
          >
            {t('booking')}
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileOpen((open) => !open)}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-ring lg:hidden',
              isTransparent ? 'text-white hover:bg-white/10' : 'text-violet-950 hover:bg-violet-50'
            )}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={cn(
          'absolute inset-x-0 top-full overflow-hidden border-t border-gray-100 bg-white shadow-elevated transition-all duration-300 lg:hidden',
          isMobileOpen ? 'max-h-[520px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        )}
      >
        <nav className="space-y-1 px-4 py-5" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-violet-950/75 transition-colors hover:bg-violet-50 hover:text-violet-800 focus-ring"
            >
              {link.label}
            </Link>
          ))}
          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
            <a
              href="tel:0915823667"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-violet-800 focus-ring"
            >
              <Phone className="h-4 w-4" />
              {locale === 'vi' ? 'Gọi tư vấn' : 'Call us'}
            </a>
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-lg bg-gold-500 px-4 py-3 text-sm font-semibold text-violet-950 focus-ring"
            >
              {t('booking')}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
