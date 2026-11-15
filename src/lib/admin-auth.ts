/**
 * Admin Authentication Middleware
 * Temporary compatibility guard for legacy admin APIs.
 * New operations APIs use Supabase sessions via admin-session.ts.
 */

import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

/** A shared admin token shorter than this is too easy to guess and is refused outright. */
const MIN_ADMIN_TOKEN_LENGTH = 16
const RECOMMENDED_ADMIN_TOKEN_LENGTH = 32
let warnedShortToken = false

function digest(value: string) {
  return createHash('sha256').update(value, 'utf8').digest()
}

export function validateAdminRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7).trim()
  const adminToken = process.env.ADMIN_SECRET_TOKEN?.trim()
  if (!adminToken || adminToken.length < MIN_ADMIN_TOKEN_LENGTH || !token) return false
  if (adminToken.length < RECOMMENDED_ADMIN_TOKEN_LENGTH && !warnedShortToken) {
    warnedShortToken = true
    console.warn(`[security] ADMIN_SECRET_TOKEN is shorter than ${RECOMMENDED_ADMIN_TOKEN_LENGTH} characters; generate a longer random token.`)
  }

  // Constant-time comparison of equal-length digests: response timing reveals nothing about the token.
  return timingSafeEqual(digest(token), digest(adminToken))
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
