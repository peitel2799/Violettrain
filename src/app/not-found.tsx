import { getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default async function NotFound() {
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-[#0D0B1E]">
        <div className="text-center px-6">
          <h1 className="font-serif text-8xl font-bold text-[#D4AF37] mb-4">404</h1>
          <p className="text-2xl text-white/80 font-light mb-8">
            Page Not Found
          </p>
          <a
            href="/"
            className="inline-block bg-[#D4AF37] text-[#0D0B1E] px-8 py-3 rounded-sm font-medium tracking-wide hover:bg-[#E5C04B] transition-colors"
          >
            Return Home
          </a>
        </div>
      </main>
      <Footer />
    </NextIntlClientProvider>
  )
}
