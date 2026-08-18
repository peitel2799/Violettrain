'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, BedDouble, TrainFront } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { useProductPricing } from '@/hooks/useProductPricing'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫'
}

export default function VietnamMapHero() {
  const isVi = useLocale() === 'vi'
  const prices = useProductPricing()

  return (
    <section className="relative flex h-[100svh] min-h-[720px] max-h-[920px] items-center overflow-hidden bg-violet-950">
      <Image
        src="/premium_room/outside2.JPG"
        alt={isVi ? 'Tàu Violette tại sân ga' : 'Violette Train at the station'}
        fill
        className="object-cover object-[62%_center]"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-violet-950/95 via-violet-950/72 to-violet-950/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-violet-950/80 via-transparent to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,transparent_0%,rgba(26,10,46,0.18)_70%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-20 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400 sm:text-sm">
            <span className="h-px w-8 bg-gold-400" />
            {isVi ? 'Hành trình di sản Việt Nam' : 'A Vietnamese heritage journey'}
          </p>

          <h1 className="font-serif text-5xl font-bold leading-[0.94] tracking-[-0.035em] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            {isVi ? 'Ngắm Việt Nam theo một cách khác.' : 'See Vietnam differently.'}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl">
            {isVi
              ? 'Cabin riêng tư, dịch vụ tận tâm và những cung đường đẹp nhất miền Trung — tất cả trong một hành trình đáng nhớ.'
              : 'Private cabins, thoughtful service, and Vietnam’s most beautiful central routes — all in one memorable journey.'}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/booking"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-base font-semibold text-violet-950 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-xl hover:shadow-gold-500/20 focus-ring"
            >
              {isVi ? 'Bắt đầu đặt vé' : 'Start booking'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#fares"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-7 py-3.5 text-base font-medium text-white transition-all hover:border-white/60 hover:bg-white/10 focus-ring"
            >
              {isVi ? 'Xem giá cabin' : 'View cabin fares'}
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 max-w-xl rounded-2xl border border-white/15 bg-violet-950/70 p-4 shadow-2xl backdrop-blur-md sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">
                  {isVi ? 'Giá vé cố định' : 'Fixed ticket fares'}
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {isVi ? 'Áp dụng cho tất cả các tuyến' : 'The same on every route'}
                </p>
              </div>
              <TrainFront className="h-6 w-6 shrink-0 text-white/45" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 px-3 py-3">
                <p className="flex items-center gap-1.5 text-xs text-white/55">
                  <BedDouble className="h-3.5 w-3.5" /> {isVi ? 'Cabin 4 giường' : 'Fixed 4-Berth'}
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl">
                  {formatVnd(prices.standard)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-3">
                <p className="flex items-center gap-1.5 text-xs text-white/55">
                  <BedDouble className="h-3.5 w-3.5" /> VIP 2
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl">
                  {formatVnd(prices.premium)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              {isVi
                ? 'Giá cho mỗi vé. Mua đủ 4 vé để sử dụng riêng toàn bộ cabin.'
                : 'Price per ticket. Buy all 4 tickets for a private cabin.'}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
