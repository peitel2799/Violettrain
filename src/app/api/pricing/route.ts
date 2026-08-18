import { NextResponse } from 'next/server'
import { CABIN_PRODUCTS } from '@/lib/cabin-products'
import { getProductPricing } from '@/lib/product-pricing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const savedPrices = getProductPricing()
  const pricing = savedPrices.map((entry) => {
    const product = CABIN_PRODUCTS[entry.cabinClassId]
    return {
      seatClass: entry.cabinClassId,
      seatClassVi: product.nameVi,
      seatClassEn: product.nameEn,
      basePrice: entry.ticketPrice,
      peakPrice: entry.ticketPrice,
    }
  })

  return NextResponse.json({ pricing }, { headers: { 'Cache-Control': 'no-store' } })
}
