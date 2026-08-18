'use client'

import { useProductPricing } from '@/hooks/useProductPricing'
import { formatCurrency } from '@/lib/utils'
import type { CabinProductId } from '@/lib/cabin-products'

export default function ProductTicketPrice({ cabinClassId }: { cabinClassId: CabinProductId }) {
  const prices = useProductPricing()
  return <>{formatCurrency(prices[cabinClassId])}</>
}
