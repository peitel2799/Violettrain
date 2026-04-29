/**
 * GET /api/admin/stats
 * Returns dashboard analytics:
 * - Total bookings, revenue, averages
 * - Top routes by revenue
 * - Recent bookings
 * - Bookings by day (last 30 days)
 * - Revenue by month (last 12 months)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/admin-store'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()
  try {
    const stats = getDashboardStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[API /admin/stats]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
