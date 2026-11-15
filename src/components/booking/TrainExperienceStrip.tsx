import Image from 'next/image'
import { ArrowRight, BedDouble, Phone } from 'lucide-react'
import { Link } from '@/i18n/routing'

export default function TrainExperienceStrip({ locale }: { locale: 'vi' | 'en' }) {
  const isVi = locale === 'vi'

  return (
    <section aria-label={isVi ? 'Hình ảnh toa tàu và cabin Violette' : 'Violette carriage and cabin photos'} className="mb-7 sm:mb-9">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.8fr)]">
        <article className="relative min-h-[270px] overflow-hidden rounded-[22px] bg-[#291535] sm:min-h-[340px]">
          <Image
            src="/premium_room/outside2.JPG"
            alt={isVi ? 'Toa tàu Violette Heritage Journey tại sân ga' : 'Violette Heritage Journey carriage at the station'}
            fill
            sizes="(max-width: 1024px) 100vw, 64vw"
            className="object-cover object-[58%_center]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,10,38,.92)_0%,rgba(26,10,38,.62)_45%,rgba(26,10,38,.08)_82%)]" />
          <div className="relative flex min-h-[270px] max-w-md flex-col justify-end p-6 text-white sm:min-h-[340px] sm:p-8">
            <p className="text-sm font-semibold text-[#efd890]">
              {isVi ? 'Violette Heritage Journey' : 'Violette Heritage Journey'}
            </p>
            <h2 className="mt-2 max-w-[12ch] font-serif text-3xl font-bold leading-tight sm:text-4xl">
              {isVi ? 'Một toa tàu, một không gian riêng.' : 'A carriage, a private space.'}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">
              {isVi
                ? 'Xem đúng hình ảnh toa và cabin trước khi chọn chuyến. Mọi sản phẩm đều bán trọn cabin 4 vé.'
                : 'See the actual carriage and cabins before choosing a train. Every product is sold as a complete four-ticket cabin.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/cabins" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d6ad54] px-4 py-2 text-sm font-bold text-[#291535] hover:bg-[#e6c773] focus-ring">
                {isVi ? 'Xem ảnh các cabin' : 'See cabin photos'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="tel:0915823667" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 bg-black/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-ring">
                <Phone className="h-4 w-4" /> 0915 823 667
              </a>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <figure className="relative min-h-[190px] overflow-hidden rounded-[18px] bg-[#e9e3ec] lg:min-h-0">
            <Image
              src="/premium_room/4pax1.JPG"
              alt={isVi ? 'Cabin riêng tiêu chuẩn bốn giường' : 'Standard private four-berth cabin'}
              fill
              sizes="(max-width: 1024px) 50vw, 32vw"
              className="object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12 text-sm font-bold text-white">
              <span className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-[#efd890]" />{isVi ? 'Full cabin · 4 giường' : 'Full cabin · 4 berths'}</span>
            </figcaption>
          </figure>
          <figure className="relative min-h-[190px] overflow-hidden rounded-[18px] bg-[#e9e3ec] lg:min-h-0">
            <Image
              src="/premium_room/room1.JPG"
              alt={isVi ? 'Cabin VIP2 trên tàu SE19' : 'VIP2 cabin on train SE19'}
              fill
              sizes="(max-width: 1024px) 50vw, 32vw"
              className="object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12 text-sm font-bold text-white">
              <span className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-[#efd890]" />{isVi ? 'VIP2 · chỉ trên SE19' : 'VIP2 · SE19 only'}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
