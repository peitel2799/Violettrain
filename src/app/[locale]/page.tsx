import VietnamMapHero from '@/components/home/VietnamMapHero'
import PopularFaresSection from '@/components/home/PopularFaresSection'
import WhyUsSection from '@/components/home/WhyUsSection'
import CabinShowcase from '@/components/home/CabinShowcase'
import GallerySection from '@/components/home/GallerySection'
import NoticeSection from '@/components/home/NoticeSection'
import BookingCTA from '@/components/home/BookingCTA'

export default function HomePage() {
  return (
    <>
      <VietnamMapHero />
      <PopularFaresSection />
      <CabinShowcase />
      <GallerySection />
      <WhyUsSection />
      <NoticeSection />
      <BookingCTA />
    </>
  )
}
