import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

/**
 * Fixed-window rate limiter kept in memory.
 *
 * Each serverless instance keeps its own counters, so this is a best-effort
 * brake against brute force, card-testing and booking spam rather than a hard
 * global quota. Put a shared limiter (Vercel Firewall / WAF rules, Upstash,
 * Cloudflare) in front of production for a global limit.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_TRACKED_KEYS = 10_000

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // Under a flood of unique keys, drop the oldest entries instead of growing forever.
  if (buckets.size > MAX_TRACKED_KEYS) {
    const overflow = buckets.size - MAX_TRACKED_KEYS
    let removed = 0
    for (const key of buckets.keys()) {
      buckets.delete(key)
      if (++removed >= overflow) break
    }
  }
}

export type RateLimitRule = {
  /** Short name of the protected action, e.g. "booking-create". */
  name: string
  /** Requests allowed per window. */
  limit: number
  windowMs: number
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

export function checkRateLimit(rule: RateLimitRule, identifier: string): RateLimitResult {
  const now = Date.now()
  if (buckets.size > MAX_TRACKED_KEYS / 2) sweep(now)

  const key = `${rule.name}:${identifier}`
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs })
    return { ok: true }
  }
  bucket.count += 1
  if (bucket.count > rule.limit) {
    return { ok: false, retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1) }
  }
  return { ok: true }
}

/**
 * Client IP as reported by the hosting proxy. Vercel overwrites
 * x-forwarded-for with the real client address, so the first entry is trusted.
 */
export function getClientIp(request: NextRequest | Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const ip = forwarded || realIp || 'unknown'
  return ip.slice(0, 64)
}

export function tooManyRequests(retryAfterSeconds: number, message = 'Too many requests. Please wait and try again.') {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds), 'Cache-Control': 'no-store' } }
  )
}

/**
 * Applies every rule to the client IP (plus an optional extra key such as an
 * email address). Returns a 429 response when any rule is exceeded.
 */
export function enforceRateLimit(
  request: NextRequest | Request,
  rules: RateLimitRule[],
  options: { extraKey?: string; message?: string } = {}
): NextResponse | null {
  const ip = getClientIp(request)
  for (const rule of rules) {
    const results = [checkRateLimit(rule, `ip:${ip}`)]
    if (options.extraKey) results.push(checkRateLimit(rule, `key:${options.extraKey.toLowerCase()}`))
    const blocked = results.find((result) => !result.ok)
    if (blocked && !blocked.ok) return tooManyRequests(blocked.retryAfterSeconds, options.message)
  }
  return null
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
