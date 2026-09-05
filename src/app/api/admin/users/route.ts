import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest, adminUnauthorized } from '@/lib/admin-auth'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

interface User {
  id: string
  username: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  createdAt: string
  lastLogin: string | null
  active: boolean
  passwordHash?: string
}

function simpleHash(password: string): string {
  // Simple deterministic hash for demo — in production use bcrypt
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

async function readUsers(): Promise<User[]> {
  try {
    if (!existsSync(USERS_FILE)) return []
    const content = await readFile(USERS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return [] }
}

async function writeUsers(users: User[]) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

async function getCurrentUser(request: NextRequest): Promise<string> {
  return request.headers.get('X-Admin-User') || 'admin'
}

// GET all users
export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const users = await readUsers()
    // Don't return password hashes
    const safe = users.map(({ passwordHash, ...u }) => u)
    return NextResponse.json({ users: safe })
  } catch (error) {
    console.error('[API /admin/users GET]', error)
    return NextResponse.json({ error: 'Failed to read users' }, { status: 500 })
  }
}

// POST = create or update user
export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return adminUnauthorized()

  try {
    const currentUser = await getCurrentUser(request)
    const body = await request.json()
    const users = await readUsers()

    if (body.action === 'create') {
      const { username, name, email, role, password } = body
      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
      }
      if (users.find((u) => u.username === username)) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
      }
      const newUser: User = {
        id: `user_${Date.now()}`,
        username,
        name: name || username,
        email: email || '',
        role: role || 'editor',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        active: true,
        passwordHash: simpleHash(password),
      }
      users.push(newUser)
      await writeUsers(users)
      const { passwordHash, ...safe } = newUser
      return NextResponse.json({ user: safe }, { status: 201 })
    }

    if (body.action === 'update') {
      const { id, name, email, role, active, password } = body
      const idx = users.findIndex((u) => u.id === id)
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (password) users[idx].passwordHash = simpleHash(password)
      if (name !== undefined) users[idx].name = name
      if (email !== undefined) users[idx].email = email
      if (role !== undefined) users[idx].role = role
      if (active !== undefined) users[idx].active = active
      await writeUsers(users)
      const { passwordHash, ...safe } = users[idx]
      return NextResponse.json({ user: safe })
    }

    if (body.action === 'delete') {
      const { id } = body
      const idx = users.findIndex((u) => u.id === id)
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (users[idx].username === currentUser) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
      }
      users.splice(idx, 1)
      await writeUsers(users)
      return NextResponse.json({ deleted: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[API /admin/users POST]', error)
    return NextResponse.json({ error: 'Failed to save user' }, { status: 500 })
  }
}
