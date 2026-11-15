import { NextRequest, NextResponse } from 'next/server'
import { BodyTooLargeError } from '@/lib/security/request'
import { enforceRateLimit, MINUTE } from '@/lib/security/rate-limit'

/**
 * Proxy for the legacy Violet Manager Flask backend: any /api/admin/* path
 * that has no route of its own is forwarded there.
 *
 * Hardening:
 * - off unless VM_API_URL is configured (no silent fallback to localhost);
 * - only requests carrying a Bearer token are forwarded (Flask checks it),
 *   except the rate-limited POST /auth/login that issues that token;
 * - the path is limited to plain segments, so "..", encoded slashes or
 *   absolute URLs cannot reach other hosts or services (SSRF);
 * - bodies are size-limited, upstream calls time out, and upstream errors
 *   are not echoed back.
 */

const MAX_BODY_BYTES = 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 15_000
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/

function upstreamBase() {
  const configured = process.env.VM_API_URL?.trim()
  if (!configured) return null
  try {
    const url = new URL(configured)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

function safePath(request: NextRequest) {
  const raw = request.nextUrl.pathname.replace(/^\/api\/admin/, '')
  const segments = raw.split('/').filter(Boolean)
  if (!segments.length || segments.length > 8) return null
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment)) return null
  }
  return `/${segments.join('/')}`
}

async function proxy(request: NextRequest, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE') {
  const base = upstreamBase()
  if (!base) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const path = safePath(request)
  if (!path) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const authorization = request.headers.get('authorization')
  const isLogin = method === 'POST' && path === '/auth/login'
  if (isLogin) {
    const limited = enforceRateLimit(request, [{ name: 'vm-login', limit: 10, windowMs: 15 * MINUTE }], {
      message: 'Too many login attempts. Please wait 15 minutes.',
    })
    if (limited) return limited
  } else if (!authorization?.startsWith('Bearer ') || authorization.length > 2048) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'DELETE') {
    const declared = Number(request.headers.get('content-length') || 0)
    if (declared > MAX_BODY_BYTES) throw new BodyTooLargeError()
    body = await request.text()
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) throw new BodyTooLargeError()
  }

  try {
    const response = await fetch(`${base}${path}${method === 'GET' ? request.nextUrl.search : ''}`, {
      method,
      headers: {
        ...(authorization?.startsWith('Bearer ') ? { authorization } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    const data = await response.json().catch(() => null)
    if (data === null) {
      return NextResponse.json({ error: 'Upstream returned an invalid response.' }, { status: 502 })
    }
    return NextResponse.json(data, { status: response.status >= 300 && response.status < 400 ? 502 : response.status })
  } catch (error) {
    console.error('[admin proxy]', method, path, error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Admin backend is unavailable.' }, { status: 502 })
  }
}

function handle(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE') {
  return async (request: NextRequest) => {
    try {
      return await proxy(request, method)
    } catch (error) {
      if (error instanceof BodyTooLargeError) return NextResponse.json({ error: error.message }, { status: 413 })
      throw error
    }
  }
}

export const GET = handle('GET')
export const POST = handle('POST')
export const PATCH = handle('PATCH')
export const PUT = handle('PUT')
export const DELETE = handle('DELETE')
