import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { CABIN_PRODUCTS, type CabinProductId } from '@/lib/cabin-products'
import { getProductPricing, updateProductPrice } from '@/lib/product-pricing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  return NextResponse.json({ pricing: getProductPricing() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const cabinClassId = body.cabinClassId as CabinProductId
    const ticketPrice = Number(body.ticketPrice)

    if (!(cabinClassId in CABIN_PRODUCTS)) {
      return NextResponse.json({ error: 'Sản phẩm cabin không hợp lệ.' }, { status: 400 })
    }
    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      return NextResponse.json({ error: 'Giá vé phải lớn hơn 0.' }, { status: 400 })
    }

    return NextResponse.json({ pricing: updateProductPrice(cabinClassId, ticketPrice) })
  } catch (error) {
    console.error('[API /admin/pricing PUT]', error)
    return NextResponse.json({ error: 'Không thể cập nhật giá vé.' }, { status: 500 })
  }
}
