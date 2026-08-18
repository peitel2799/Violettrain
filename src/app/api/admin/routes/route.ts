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
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { ROUTES } from '@/lib/constants'

const routesFile = () => {
  const path = require('path')
  const fs = require('fs')
  return path.join(process.cwd(), 'data', 'routes.json')
}

function loadCustomRoutes() {
  try {
    const fs = require('fs')
    const file = routesFile()
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch {}
  return {}
}

function saveCustomRoutes(data: Record<string, unknown>) {
  const fs = require('fs')
  const path = require('path')
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(routesFile(), JSON.stringify(data, null, 2), 'utf-8')
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
