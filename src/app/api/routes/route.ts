/**
 * GET /api/routes
 * Returns all available routes (public endpoint).
 */

import { NextResponse } from 'next/server'
import { ROUTES } from '@/lib/constants'

export async function GET() {
  try {
    return NextResponse.json({ routes: ROUTES })
  } catch (error) {
    console.error('[API /routes GET]', error)
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 })
  }
}
