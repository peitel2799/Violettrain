'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { Menu, X, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const t = useTranslations('common.nav')
  const tLocale = useTranslations('common')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState<'vi' | 'en'>('vi')
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/en')) {
      setCurrentLocale('en')
    } else {
      setCurrentLocale('vi')
    }
  }, [])

  const toggleLocale = () => {
    const next = currentLocale === 'vi' ? 'en' : 'vi'
    setCurrentLocale(next)
    router.replace(pathname, { locale: next })
  }

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/cabins', label: t('cabins') },
    { href: '/booking', label: t('booking') },
    { href: '/blog', label: t('blog') },
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 sm:h-[72px]',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-card-hover'
          : 'bg-white'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo — fills header height */}
          <Link href="/" className="flex items-center group flex-shrink-0 h-full py-2 sm:py-0">
            <Image
              src="/logo-violette-clean.svg"
              alt="Violette Train"
              width={80}
              height={72}
              className="object-contain object-left h-full w-auto max-h-12 sm:max-h-full"
            />
          </Link>

          {/* Desktop Nav — centered */}
          <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-violet-950/70 text-sm font-medium hover:text-violet-600 transition-colors relative group py-1"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-violet-600 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Locale Switcher */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1 text-violet-950/50 hover:text-violet-600 transition-colors text-sm font-medium"
              aria-label={tLocale('locale.switch')}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline uppercase">{currentLocale}</span>
              <span className="sm:hidden uppercase">{currentLocale}</span>
            </button>

            {/* Book CTA */}
            <Link
              href="/booking"
              className="hidden sm:inline-flex items-center bg-gold-500 hover:bg-gold-400 text-violet-950 font-semibold text-sm px-5 py-2.5 rounded hover:shadow-lg hover:shadow-gold-500/25 transition-all duration-200"
            >
              {t('booking')}
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden text-violet-950 p-1 hover:text-violet-600 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'lg:hidden absolute top-full left-0 right-0 transition-all duration-300 overflow-hidden',
          isMobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
        style={{ backgroundColor: '#ffffff' }}
      >
        <nav className="px-4 pb-6 pt-2 space-y-1 border-t border-white/10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileOpen(false)}
              className="block text-violet-950/70 hover:text-violet-600 hover:bg-violet-950/5 px-4 py-3 rounded-lg transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/booking"
            onClick={() => setIsMobileOpen(false)}
            className="block bg-gold-500 hover:bg-gold-400 text-violet-950 font-semibold text-center px-4 py-3 rounded-lg mt-4 transition-colors"
          >
            {t('booking')}
          </Link>
        </nav>
      </div>
    </header>
  )
}
