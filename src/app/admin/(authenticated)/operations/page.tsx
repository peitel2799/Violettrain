import type { Metadata } from 'next'
import OperationsWorkspace from '@/components/admin/operations/OperationsWorkspace'

export const metadata: Metadata = {
  title: 'Đồng bộ DSVN',
  robots: { index: false, follow: false },
}

export default function AdminOperationsPage() {
  return <OperationsWorkspace />
}
