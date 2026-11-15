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
      basePrice: entry.ticketPrice * product.privateCabinTickets,
      peakPrice: entry.ticketPrice * product.privateCabinTickets,
      ticketPrice: entry.ticketPrice,
      ticketsIncluded: product.privateCabinTickets,
    }
  })

  return NextResponse.json({ pricing }, { headers: { 'Cache-Control': 'no-store' } })
}
