import { NextRequest, NextResponse } from 'next/server'
import { searchSchedules } from '@/lib/dsvn'
import { CABIN_PRODUCTS, type CabinProductId } from '@/lib/cabin-products'
import { getProductPricingMap } from '@/lib/product-pricing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const date = searchParams.get('date')
  const locale = (searchParams.get('locale') || 'vi') as 'vi' | 'en'

  if (!from || !to || !date) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to, date' },
      { status: 400 }
    )
  }

  const prices = getProductPricingMap()
  const schedules = searchSchedules(from, to, date, locale).map((schedule) => ({
    ...schedule,
    availableSeats: schedule.availableSeats.map((seat) => {
      const cabinClassId = seat.seatClass as CabinProductId
      const product = CABIN_PRODUCTS[cabinClassId]
      if (!product) return seat

      return {
        ...seat,
        seatClassVi: product.nameVi,
        seatClassEn: product.nameEn,
        price: prices[cabinClassId],
      }
    }),
  }))

  return NextResponse.json({ schedules }, { headers: { 'Cache-Control': 'no-store' } })
}
