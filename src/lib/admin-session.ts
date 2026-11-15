import 'server-only'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export type AdminRole = 'admin' | 'operations' | 'pricing' | 'support'

export interface AdminSession {
  userId: string
  email: string
  displayName: string
  role: AdminRole
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('display_name, role, active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile?.active) return null

  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: profile.display_name || user.email || 'Quản trị viên',
    role: profile.role as AdminRole,
  }
}

export async function requireAdminPage() {
  if (!isSupabaseConfigured()) redirect('/admin/login?setup=required')
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return session
}

export async function requireAdminApi(allowedRoles?: AdminRole[]) {
  const session = await getAdminSession()
  if (!session) return { ok: false as const, status: 401, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { ok: false as const, status: 403, error: 'Tài khoản không có quyền thực hiện thao tác này.' }
  }
  return { ok: true as const, session }
}
