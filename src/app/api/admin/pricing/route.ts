/**
 * GET /api/admin/pricing
 * Returns pricing tiers for each route/cabin class combination.
 *
 * PUT /api/admin/pricing
 * Body: { routeId, cabinClassId, basePrice, peakPrice, seasonFactor }
 * Update pricing for a route + cabin combination.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ROUTES } from '@/lib/constants'
import { CABIN_CLASSES } from '@/lib/constants'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'

interface PricingEntry {
  routeId: string
  routeName: string
  cabinClassId: string
  cabinClassName: string
  basePrice: number
  peakPrice: number
  seasonFactor: number
  lastUpdated: string
}

const pricingFile = () => {
  const path = require('path')
  const fs = require('fs')
  return path.join(process.cwd(), 'data', 'pricing.json')
}

function loadPricing(): Record<string, PricingEntry> {
  try {
    const fs = require('fs')
    const path = require('path')
    const file = pricingFile()
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch {}
  return buildDefaultPricing()
}

function buildDefaultPricing(): Record<string, PricingEntry> {
  const map: Record<string, PricingEntry> = {}
  for (const route of ROUTES) {
    for (const cabin of CABIN_CLASSES) {
      const key = `${route.id}__${cabin.id}`
      map[key] = {
        routeId: route.id,
        routeName: `${route.fromStation} → ${route.toStation}`,
        cabinClassId: cabin.id,
        cabinClassName: cabin.name,
        basePrice: Math.round(route.basePrice * cabin.priceFactor),
        peakPrice: Math.round(route.basePrice * cabin.priceFactor * 1.4),
        seasonFactor: 1.0,
        lastUpdated: new Date().toISOString(),
      }
    }
  }
  return map
}

function savePricing(data: Record<string, PricingEntry>) {
  const fs = require('fs')
  const path = require('path')
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(pricingFile(), JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const pricing = loadPricing()
    const entries = Object.values(pricing)
    return NextResponse.json({ pricing: entries })
  } catch (error) {
    console.error('[API /admin/pricing GET]', error)
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { routeId, cabinClassId, basePrice, peakPrice, seasonFactor } = body

    if (!routeId || !cabinClassId) {
      return NextResponse.json(
        { error: 'Missing required fields: routeId, cabinClassId' },
        { status: 400 }
      )
    }

    const route = ROUTES.find((r) => r.id === routeId)
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    const cabin = CABIN_CLASSES.find((c) => c.id === cabinClassId)
    if (!cabin) {
      return NextResponse.json({ error: 'Cabin class not found' }, { status: 404 })
    }

    const pricing = loadPricing()
    const key = `${routeId}__${cabinClassId}`

    if (pricing[key]) {
      return NextResponse.json(
        { error: 'Pricing entry already exists for this route and cabin class. Use PUT to update it.' },
        { status: 409 }
      )
    }

    const entry: PricingEntry = {
      routeId,
      routeName: `${route.fromStation} → ${route.toStation}`,
      cabinClassId,
      cabinClassName: cabin.name,
      basePrice: typeof basePrice === 'number' ? basePrice : Math.round(route.basePrice * cabin.priceFactor),
      peakPrice: typeof peakPrice === 'number' ? peakPrice : Math.round(route.basePrice * cabin.priceFactor * 1.4),
      seasonFactor: typeof seasonFactor === 'number' ? seasonFactor : 1.0,
      lastUpdated: new Date().toISOString(),
    }

    pricing[key] = entry
    savePricing(pricing)

    return NextResponse.json({ pricing: entry }, { status: 201 })
  } catch (error) {
    console.error('[API /admin/pricing POST]', error)
    return NextResponse.json({ error: 'Failed to create pricing entry' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { routeId, cabinClassId, basePrice, peakPrice, seasonFactor } = body

    if (!routeId || !cabinClassId) {
      return NextResponse.json(
        { error: 'Missing required fields: routeId, cabinClassId' },
        { status: 400 }
      )
    }

    const pricing = loadPricing()
    const key = `${routeId}__${cabinClassId}`
    const existing = pricing[key]

    if (!existing) {
      return NextResponse.json(
        { error: `Pricing entry not found for route ${routeId} and cabin ${cabinClassId}` },
        { status: 404 }
      )
    }

    const updated: PricingEntry = {
      ...existing,
      basePrice: typeof basePrice === 'number' ? basePrice : existing.basePrice,
      peakPrice: typeof peakPrice === 'number' ? peakPrice : existing.peakPrice,
      seasonFactor: typeof seasonFactor === 'number' ? seasonFactor : existing.seasonFactor,
      lastUpdated: new Date().toISOString(),
    }

    pricing[key] = updated
    savePricing(pricing)

    return NextResponse.json({ pricing: updated })
  } catch (error) {
    console.error('[API /admin/pricing PUT]', error)
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
  }
}
