/**
 * GET /api/routes/:id
 * Returns a single route by ID (public endpoint).
 */

import { NextRequest, NextResponse } from 'next/server'
import { ROUTES } from '@/lib/constants'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const route = ROUTES.find((r) => r.id === id || r.id.toLowerCase() === id.toLowerCase())

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    return NextResponse.json({ route })
  } catch (error) {
    console.error('[API /routes/[id] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch route' }, { status: 500 })
  }
}
