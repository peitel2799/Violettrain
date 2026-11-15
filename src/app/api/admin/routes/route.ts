/**
 * GET /api/admin/routes
 * Returns all available routes from the constants.
 *
 * PUT /api/admin/routes
 * Body: { id, updates }
 * Update route schedule metadata. Product prices are managed by /api/admin/pricing.
 * Requires: Authorization: Bearer <ADMIN_SECRET_TOKEN>
 */

import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { ROUTES } from '@/lib/constants'

const DATA_DIRECTORY = path.join(process.cwd(), 'data')
const ROUTES_FILE = path.join(DATA_DIRECTORY, 'routes.json')

type CustomRoutes = Record<string, Record<string, unknown>>

function loadCustomRoutes(): CustomRoutes {
  try {
    if (existsSync(ROUTES_FILE)) {
      const parsed = JSON.parse(readFileSync(ROUTES_FILE, 'utf-8')) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as CustomRoutes
      }
    }
  } catch {}
  return {}
}

function saveCustomRoutes(data: CustomRoutes) {
  if (!existsSync(DATA_DIRECTORY)) {
    mkdirSync(DATA_DIRECTORY, { recursive: true })
  }
  writeFileSync(ROUTES_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const custom = loadCustomRoutes()
    const routes = ROUTES.map((route) => ({
      ...route,
      ...(custom[route.id] ?? {}),
    }))
    return NextResponse.json({ routes })
  } catch (error) {
    console.error('[API /admin/routes GET]', error)
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const body = await request.json()
    const { id, updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing route id' }, { status: 400 })
    }

    const route = ROUTES.find((r) => r.id === id)
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    const allowedUpdates = {
      ...(typeof updates?.duration === 'string' ? { duration: updates.duration } : {}),
      ...(typeof updates?.departureTime === 'string' ? { departureTime: updates.departureTime } : {}),
      ...(typeof updates?.arrivalTime === 'string' ? { arrivalTime: updates.arrivalTime } : {}),
    }
    const custom = loadCustomRoutes()
    custom[id] = { ...(custom[id] ?? {}), ...allowedUpdates, lastUpdated: new Date().toISOString() }
    saveCustomRoutes(custom)

    const updated = { ...route, ...custom[id] }
    return NextResponse.json({ route: updated })
  } catch (error) {
    console.error('[API /admin/routes PUT]', error)
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 })
  }
}
