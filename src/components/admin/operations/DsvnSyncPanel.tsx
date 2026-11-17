'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, DatabaseZap, LoaderCircle, Play, ShieldAlert } from 'lucide-react'

type SyncRun = {
  id: number
  status: 'running' | 'succeeded' | 'partial' | 'failed'
  trigger_type: 'cron' | 'manual' | 'script'
  window_start: string
  window_end: string
  requested_snapshots: number
  completed_snapshots: number
  fetched_departures: number
  upserted_departures: number
  cancelled_departures: number
  draft_departures: number
  fare_dates: number
  fare_rows: number
  projected_departures: number
  dsvn_horizon: string | null
  error_summary: string | null
  started_at: string
  finished_at: string | null
}

type SyncData = {
  config: { configured: boolean; sourceUrl: string; method: 'browser-crawl'; defaultDays: number; timezone: string }
  runs: SyncRun[]
}

const statusText = {
  running: 'Đang chạy',
  succeeded: 'Thành công',
  partial: 'Một phần',
  failed: 'Thất bại',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function DsvnSyncPanel({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<SyncData | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/operations/dsvn-sync', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể tải trạng thái đồng bộ.')
      setData(payload)
      setDays(payload.config.defaultDays)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không thể tải trạng thái đồng bộ.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function runNow() {
    setRunning(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/operations/dsvn-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || payload.errors?.[0] || 'Đồng bộ DSVN thất bại.')
      setMessage({
        type: payload.status === 'succeeded' ? 'success' : 'error',
        text: payload.status === 'succeeded'
          ? `Đã cập nhật ${payload.upsertedDepartures} chuyến và giá DSVN của ${payload.fareDates ?? 0} ngày${payload.pendingFareDates ? ` (${payload.pendingFareDates} ngày còn lại sẽ cập nhật giá ở lượt sau)` : ''}.`
          : `Đồng bộ hoàn tất một phần. ${payload.errors?.[0] ?? 'Kiểm tra nhật ký bên dưới.'}`,
      })
      await load()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Đồng bộ DSVN thất bại.' })
      await load()
    } finally {
      setRunning(false)
    }
  }

  const latest = data?.runs[0]
  const configured = data?.config.configured ?? false

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <DatabaseZap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">Đồng bộ lịch tàu &amp; giá vé DSVN</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {configured ? 'Browser crawler sẵn sàng' : 'Crawler chưa sẵn sàng'}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Mỗi ngày lúc <strong>04:00 giờ Việt Nam</strong>, hệ thống đọc trang Giờ tàu và Giá vé công khai của DSVN theo từng ngày: lịch các tàu cho số ngày bên cạnh, và giá vé DSVN (giá cơ sở) cho những ngày lâu chưa cập nhật nhất. Giá bán và số cabin của Violette vẫn do bạn đặt.
            </p>
            {latest ? (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Lần cuối: {formatDateTime(latest.finished_at ?? latest.started_at)}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {statusText[latest.status]} · {latest.upserted_departures} chuyến</span>
                {latest.fare_dates > 0 ? <span>Giá DSVN: {latest.fare_dates} ngày · {latest.fare_rows} dòng giá</span> : null}
                {latest.dsvn_horizon ? <span>DSVN mở bán đến {latest.dsvn_horizon.split('-').reverse().join('/')}</span> : null}
                {latest.draft_departures > 0 ? <span>{latest.draft_departures} chuyến nháp chưa có giá</span> : null}
              </div>
            ) : null}
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-xs font-bold text-slate-600">
              Số ngày
              <input
                type="number"
                min={1}
                max={31}
                value={days}
                onChange={(event) => setDays(Math.min(Math.max(Number(event.target.value) || 1, 1), 31))}
                className="mt-1 block h-11 w-24 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </label>
            <button
              type="button"
              onClick={() => void runNow()}
              disabled={!configured || running || loading}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
            </button>
          </div>
        ) : null}
      </div>

      {!configured ? (
        <div className="flex gap-3 border-t border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 sm:px-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Chromium chưa khởi động được. Khi chạy local, có thể đặt <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">DSVN_CHROME_EXECUTABLE_PATH</code>; khi deploy, ứng dụng dùng Chromium serverless đã đóng gói.</p>
        </div>
      ) : null}

      {message ? (
        <div className={`border-t px-5 py-3 text-sm font-medium sm:px-6 ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      ) : null}

      {latest?.error_summary ? (
        <details className="border-t border-slate-100 px-5 py-3 text-sm sm:px-6">
          <summary className="cursor-pointer font-semibold text-rose-700">Xem lỗi lần đồng bộ gần nhất</summary>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-200">{latest.error_summary}</pre>
        </details>
      ) : null}
    </section>
  )
}
