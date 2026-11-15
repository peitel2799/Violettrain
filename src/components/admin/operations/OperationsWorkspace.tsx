'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleAlert, RefreshCw, Route as RouteIcon } from 'lucide-react'
import DsvnSyncPanel from './DsvnSyncPanel'

type Role = 'admin' | 'operations' | 'pricing' | 'support'
type SyncedRoute = {
  id: number
  code: string
  active: boolean
  from_station: { code: string; name_vi: string } | null
  to_station: { code: string; name_vi: string } | null
}
type WorkspaceData = { routes: SyncedRoute[]; viewer: { role: Role; displayName: string } }

/**
 * Violette resells DSVN tickets: trains, timetables and departures come from the
 * daily DSVN sync and are never edited here. This page only shows that sync.
 */
export default function OperationsWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/operations', { cache: 'no-store' })
      if (response.status === 401) {
        window.location.assign('/admin/login')
        return
      }
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Không thể tải danh sách tuyến.')
      setData(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách tuyến.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const canSync = data?.viewer.role === 'admin' || data?.viewer.role === 'operations'
  const routes = data?.routes.filter((route) => route.active) ?? []

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 xl:p-8">
      <header className="mb-6">
        <p className="text-sm font-semibold text-violet-700">Dữ liệu từ DSVN</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Đồng bộ DSVN</h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600">
          Tàu, giờ chạy và các chuyến đều lấy tự động từ DSVN. Violette chỉ đặt giá bán, việc đó làm ở trang{' '}
          <Link href="/admin/calendar" className="font-semibold text-violet-700 underline underline-offset-2">Giá vé</Link>.
        </p>
      </header>

      <DsvnSyncPanel canEdit={Boolean(canSync)} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="synced-routes">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="synced-routes" className="text-lg font-bold text-slate-900">Các tuyến đang lấy lịch</h2>
            <p className="mt-1 text-sm text-slate-500">Mỗi sáng hệ thống đọc lịch DSVN cho các tuyến này.</p>
          </div>
          <button type="button" onClick={() => void loadData()} aria-label="Tải lại danh sách tuyến" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        ) : null}

        {!loading && !error && routes.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Chưa có tuyến nào. Báo bộ phận kỹ thuật để thêm tuyến cần bán.
          </p>
        ) : null}

        {routes.length ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {routes.map((route) => (
              <li key={route.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <RouteIcon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                  {route.from_station?.name_vi ?? '?'} → {route.to_station?.name_vi ?? '?'}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{route.code}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
