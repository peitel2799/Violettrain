import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { enforceRateLimit, HOUR, MINUTE } from '@/lib/security/rate-limit'
import { BodyTooLargeError, readJsonBody } from '@/lib/security/request'

const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.').max(160),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(256),
})

// Password guessing protection, per IP and per targeted account.
const LOGIN_LIMITS = [
  { name: 'admin-login-burst', limit: 10, windowMs: 15 * MINUTE },
  { name: 'admin-login-daily', limit: 50, windowMs: 24 * HOUR },
]
const LOGIN_LIMIT_MESSAGE = 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.'

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase chưa được cấu hình. Vui lòng kiểm tra biến môi trường.' },
      { status: 503 }
    )
  }

  const ipLimited = enforceRateLimit(request, LOGIN_LIMITS, { message: LOGIN_LIMIT_MESSAGE })
  if (ipLimited) return ipLimited

  let body: unknown
  try {
    body = await readJsonBody(request, 4 * 1024)
  } catch (error) {
    if (error instanceof BodyTooLargeError) return NextResponse.json({ error: error.message }, { status: 413 })
    throw error
  }
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const accountLimited = enforceRateLimit(
    request,
    [{ name: 'admin-login-account', limit: 8, windowMs: 15 * MINUTE }],
    { extraKey: parsed.data.email, message: LOGIN_LIMIT_MESSAGE }
  )
  if (accountLimited) return accountLimited

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error || !data.user) {
    console.warn('[admin login] failed sign-in attempt')
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('display_name, role, active')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profileError || !profile?.active) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Tài khoản chưa được cấp quyền quản trị.' }, { status: 403 })
  }

  return NextResponse.json({
    user: {
      email: data.user.email,
      displayName: profile.display_name,
      role: profile.role,
    },
  })
}

export async function DELETE() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true })
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
