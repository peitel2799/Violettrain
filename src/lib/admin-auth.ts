/**
 * Admin Authentication Middleware
 * Protects all /api/admin/* routes using a shared secret token.
 * For production, replace with proper auth (NextAuth, Clerk, etc.).
 */

import { NextRequest, NextResponse } from 'next/server'

export function validateAdminRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
  const adminToken = process.env.ADMIN_SECRET_TOKEN || 'violette-admin-secret-dev'

  return token === adminToken
}

export function adminUnauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized. Valid admin token required.' },
    { status: 401 }
  )
}

export function adminForbidden(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden. Admin access required.' },
    { status: 403 }
  )
}
