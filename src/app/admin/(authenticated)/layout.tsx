import { ReactNode } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdminPage } from '@/lib/admin-session'

export default async function AuthenticatedAdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage()
  return <AdminShell session={session}>{children}</AdminShell>
}
