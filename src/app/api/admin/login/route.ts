import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { existsSync, readFileSync } from 'fs'

/**
 * Admin Login API
 *
 * Three modes (tried in order):
 * 1. FLASK_AVAILABLE=true  → Flask backend (full user management)
 * 2. Local users.json      → local user database (supports multiple users, roles)
 * 3. Env vars fallback     → ADMIN_USERNAME + ADMIN_PASSWORD (single admin account)
 */

const FLASK_BASE = process.env.VM_API_URL || 'http://localhost:5001/api'
const ADMIN_SECRET = process.env.ADMIN_SECRET_TOKEN || 'violette-admin-secret-dev'

function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'hash_' + Math.abs(hash).toString(16)
}

function verifyPassword(password: string, hash: string): boolean {
  return simpleHash(password) === hash
}

interface UserRecord {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  passwordHash: string
  lastLogin: string | null
}

function readLocalUsers(): UserRecord[] {
  try {
    const file = path.join(process.cwd(), 'data', 'users.json')
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch { return [] }
}

function updateLastLogin(username: string) {
  try {
    const file = path.join(process.cwd(), 'data', 'users.json')
    if (!existsSync(file)) return
    const users: UserRecord[] = JSON.parse(readFileSync(file, 'utf-8'))
    const idx = users.findIndex((u) => u.username === username)
    if (idx >= 0) {
      users[idx].lastLogin = new Date().toISOString()
      const { writeFileSync } = require('fs')
      writeFileSync(file, JSON.stringify(users, null, 2), 'utf-8')
    }
  } catch { /* non-fatal */ }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { username = '', password = '' } = body

  // 1. Try Flask first
  if (process.env.FLASK_AVAILABLE === 'true') {
    try {
      const flaskRes = await fetch(`${FLASK_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (flaskRes.ok) {
        const data = await flaskRes.json()
        updateLastLogin(username)
        return NextResponse.json({
          token: data.access_token,
          username: data.user?.username,
          name: data.user?.name,
          role: data.user?.role || 'admin',
          expiresIn: data.expires_in,
          mode: 'flask',
        })
      }
    } catch { /* fall through */ }
  }

  // 2. Try local users.json
  const localUsers = readLocalUsers()
  const localUser = localUsers.find(
    (u) => u.username === username && u.active && verifyPassword(password, u.passwordHash || '')
  )
  if (localUser) {
    updateLastLogin(username)
    return NextResponse.json({
      token: ADMIN_SECRET,
      username: localUser.username,
      name: localUser.name,
      role: localUser.role,
      expiresIn: 86400 * 7,
      mode: 'local',
    })
  }

  // 3. Env var fallback (single admin)
  const validUsername = process.env.ADMIN_USERNAME || 'admin'
  const validPassword = process.env.ADMIN_PASSWORD || 'violet'
  if (username === validUsername && password === validPassword) {
    return NextResponse.json({
      token: ADMIN_SECRET,
      username: validUsername,
      name: validUsername,
      role: 'admin',
      expiresIn: 86400 * 7,
      mode: 'env',
    })
  }

  return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, { status: 401 })
}
