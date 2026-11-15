import VietnamMapHero from '@/components/home/VietnamMapHero'
import PopularFaresSection from '@/components/home/PopularFaresSection'
import WhyUsSection from '@/components/home/WhyUsSection'
import CabinShowcase from '@/components/home/CabinShowcase'
import GallerySection from '@/components/home/GallerySection'
import NoticeSection from '@/components/home/NoticeSection'
import BookingCTA from '@/components/home/BookingCTA'
import { getLiveFares } from '@/lib/public-fares'

export default async function HomePage() {
  // Prices set by staff in "Giá vé" (admin); null falls back to the reference fares.
  const liveFares = await getLiveFares()

  return (
    <>
      <VietnamMapHero />
      <PopularFaresSection liveFares={liveFares} />
      <CabinShowcase liveFares={liveFares} />
      <GallerySection />
      <WhyUsSection />
      <NoticeSection />
      <BookingCTA />
    </>
  )
}
