import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-accent',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://violettetrain.com'),
  title: {
    template: '%s | Violette Train',
    default: 'Violette Train — Luxury Train Travel in Vietnam',
  },
  description:
    'Violette Train offers luxury train travel experiences in Vietnam. Book your Hanoi to Sapa, Ninh Binh, Hue, Da Nang journey with premium cabins, VIP lounges, and exceptional service.',
  keywords: [
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
    'du lịch tàu cao cấp',
    'tàu lửa Sapa',
    'tàu Hà Nội Sapa',
  ],
  authors: [{ name: 'Violette Train' }],
  creator: 'Violette Train',
  publisher: 'Violette Train',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    alternateLocale: 'en_US',
    siteName: 'Violette Train',
    title: 'Violette Train — Luxury Train Travel in Vietnam',
    description: 'Violette Train offers luxury train travel experiences in Vietnam. Book your Hanoi to Sapa, Ninh Binh, Hue, Da Nang journey today.',
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
    title: 'Violette Train — Luxury Train Travel in Vietnam',
    description: 'Violette Train offers luxury train travel experiences in Vietnam.',
    images: ['/premium_room/outside2.JPG'],
    creator: '@violettetrain',
  },
  alternates: {
    canonical: '/',
    languages: {
      'vi': '/',
      'en': '/en',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a0a2e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${playfair.variable} ${dmSans.variable} ${cormorant.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1a0a2e" />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
