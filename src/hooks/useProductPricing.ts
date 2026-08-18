'use client'

import { useEffect, useState } from 'react'
import { CABIN_PRODUCTS, type CabinProductId } from '@/lib/cabin-products'

type ProductPriceMap = Record<CabinProductId, number>

const DEFAULT_PRICES: ProductPriceMap = {
  standard: CABIN_PRODUCTS.standard.ticketPrice,
  premium: CABIN_PRODUCTS.premium.ticketPrice,
}

export function useProductPricing() {
  const [prices, setPrices] = useState<ProductPriceMap>(DEFAULT_PRICES)

  useEffect(() => {
    let active = true

    fetch('/api/pricing', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Pricing request failed')))
      .then((data) => {
        if (!active || !Array.isArray(data.pricing)) return
        setPrices((current) => {
          const next = { ...current }
          for (const entry of data.pricing) {
            if ((entry.seatClass === 'standard' || entry.seatClass === 'premium') && Number.isFinite(entry.basePrice)) {
              next[entry.seatClass as CabinProductId] = entry.basePrice
            }
          }
          return next
        })
      })
      .catch(() => undefined)

    return () => { active = false }
  }, [])

  return prices
}
