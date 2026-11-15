// The service-role key bypasses every RLS policy: this module must never reach a browser bundle.
import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseConfig, getSupabaseServiceConfig } from './config'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
          })
        } catch {
          // Server Components cannot always write cookies. Route handlers refresh them.
        }
      },
    },
  })
}

export function createSupabaseServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceConfig()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
