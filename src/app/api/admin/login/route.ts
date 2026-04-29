/**
 * POST /api/admin/login
 * Validates admin credentials (violet/violet) and returns a token.
 */

import { NextRequest, NextResponse } from 'next/server'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'violet'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'violet'
const ADMIN_TOKEN_SECRET = process.env.ADMIN_SECRET_TOKEN || 'violette-admin-secret-dev'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      token: ADMIN_TOKEN_SECRET,
      username: ADMIN_USERNAME,
      expiresIn: 86400, // 24 hours
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
