import type { Metadata } from 'next'
import { Suspense } from 'react'
import ScheduleWorkspace from '@/components/admin/schedule/ScheduleWorkspace'

export const metadata: Metadata = {
  title: 'Giá vé',
  robots: { index: false, follow: false },
}

export default function AdminCalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-base text-slate-500">Đang tải lịch…</div>}>
      <ScheduleWorkspace />
    </Suspense>
  )
}
