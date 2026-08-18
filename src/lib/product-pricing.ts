import 'server-only'

import fs from 'fs'
import path from 'path'
import { CABIN_PRODUCTS, type CabinProductId } from '@/lib/cabin-products'

export interface ProductPricingEntry {
  cabinClassId: CabinProductId
  cabinClassName: string
  ticketPrice: number
  lastUpdated: string
}

const PRICING_FILE = path.join(process.cwd(), 'data', 'product-pricing.json')

function defaultPricing(): ProductPricingEntry[] {
  return Object.values(CABIN_PRODUCTS).map((product) => ({
    cabinClassId: product.id,
    cabinClassName: product.nameVi,
    ticketPrice: product.ticketPrice,
    lastUpdated: '2026-08-18T00:00:00.000Z',
  }))
}

export function getProductPricing(): ProductPricingEntry[] {
  try {
    if (!fs.existsSync(PRICING_FILE)) return defaultPricing()

    const saved = JSON.parse(fs.readFileSync(PRICING_FILE, 'utf8')) as ProductPricingEntry[]
    const savedById = new Map(saved.map((entry) => [entry.cabinClassId, entry]))

    return defaultPricing().map((fallback) => {
      const entry = savedById.get(fallback.cabinClassId)
      return entry && Number.isFinite(entry.ticketPrice) && entry.ticketPrice > 0
        ? { ...fallback, ...entry, cabinClassName: fallback.cabinClassName }
        : fallback
    })
  } catch (error) {
    console.error('[product-pricing] Unable to read saved prices:', error)
    return defaultPricing()
  }
}

export function getProductPricingMap(): Record<CabinProductId, number> {
  const prices = getProductPricing()
  return {
    standard: prices.find((entry) => entry.cabinClassId === 'standard')?.ticketPrice
      ?? CABIN_PRODUCTS.standard.ticketPrice,
    premium: prices.find((entry) => entry.cabinClassId === 'premium')?.ticketPrice
      ?? CABIN_PRODUCTS.premium.ticketPrice,
  }
}

export function updateProductPrice(cabinClassId: CabinProductId, ticketPrice: number) {
  if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
    throw new Error('Ticket price must be greater than zero')
  }

  const pricing = getProductPricing()
  const updated = pricing.map((entry) => entry.cabinClassId === cabinClassId
    ? { ...entry, ticketPrice: Math.round(ticketPrice), lastUpdated: new Date().toISOString() }
    : entry)

  fs.mkdirSync(path.dirname(PRICING_FILE), { recursive: true })
  fs.writeFileSync(PRICING_FILE, JSON.stringify(updated, null, 2), 'utf8')

  return updated.find((entry) => entry.cabinClassId === cabinClassId)!
}
