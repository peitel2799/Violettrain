'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  HelpCircle,
  ListChecks,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Tag,
  TrainFront,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CalendarGrid from './CalendarGrid'
import DayPanel from './DayPanel'
import BulkEditDialog, { BulkMode } from './BulkEditDialog'
import RoutePicker from './RoutePicker'
import {
  CalendarData,
  CalendarDeparture,
  formatMoney,
  isDeparted,
  isSoldOut,
  monthGrid,
  monthKey,
  monthLabel,
  permissionsFor,
  productOf,
  routeLabel,
  shiftMonth,
  STATUS_META,
  suggestedPrices,
  vietnamToday,
  weekdayIndex,
} from './schedule-utils'

type Toast = { tone: 'success' | 'error'; text: string }
const GUIDE_KEY = 'violette-admin-calendar-guide-hidden'
const ROUTE_KEY = 'violette-admin-calendar-route'

export default function ScheduleWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [today] = useState(() => vietnamToday())
  const month = /^\d{4}-\d{2}$/.test(searchParams.get('thang') ?? '') ? searchParams.get('thang')! : today.slice(0, 7)
  const urlRouteId = Number(searchParams.get('tuyen')) || null
  // The last route this browser looked at; undefined until localStorage has been read.
  const [storedRouteId, setStoredRouteId] = useState<number | null | undefined>(undefined)
  const requestedRouteId = urlRouteId ?? storedRouteId ?? null
  const routeReady = urlRouteId != null || storedRouteId !== undefined
  const trainFilter = searchParams.get('tau') || 'all'

  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState<Toast | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [bulk, setBulk] = useState<{ open: boolean; mode: BulkMode }>({ open: false, mode: 'price' })
  const [guideHidden, setGuideHidden] = useState(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const grid = useMemo(() => monthGrid(month), [month])

  const updateQuery = useCallback((changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value == null || value === '') params.delete(key)
      else params.set(key, value)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  const showToast = useCallback((next: Toast) => {
    setToast(next)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), next.tone === 'error' ? 9000 : 5000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const query = new URLSearchParams({ from: grid.start, to: grid.end })
      if (requestedRouteId) query.set('routeId', String(requestedRouteId))
      const response = await fetch(`/api/admin/schedule-calendar?${query}`, { cache: 'no-store' })
      if (response.status === 401) {
        window.location.assign('/admin/login')
        return
      }
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Không tải được lịch chạy.')
      setData(result as CalendarData)
      setNow(Date.parse((result as CalendarData).serverTime) || Date.now())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không tải được lịch chạy.')
    } finally {
      setLoading(false)
    }
  }, [grid.start, grid.end, requestedRouteId])

  useEffect(() => { if (routeReady) void load() }, [load, routeReady])

  useEffect(() => {
    try { setGuideHidden(window.localStorage.getItem(GUIDE_KEY) === '1') } catch { setGuideHidden(false) }
    try { setStoredRouteId(Number(window.localStorage.getItem(ROUTE_KEY)) || null) } catch { setStoredRouteId(null) }
  }, [])

  // Coming back from another admin page reopens the route staff were working on.
  useEffect(() => {
    if (!data?.routeId) return
    try { window.localStorage.setItem(ROUTE_KEY, String(data.routeId)) } catch { /* private mode */ }
  }, [data?.routeId])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // A new month, route or train means a new selection.
  useEffect(() => { setSelectedDates(new Set()) }, [month, requestedRouteId, trainFilter])

  const permissions = permissionsFor(data?.viewer.role)
  const route = data?.routes.find((item) => item.id === data.routeId)
  const allDepartures = useMemo(() => data?.departures ?? [], [data])

  // Trains of this route in timetable order, with their usual departure time for the picker.
  const trainOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const departure of allDepartures) if (!seen.has(departure.trainNumber)) seen.set(departure.trainNumber, departure.departureTime)
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([train, time]) => ({ train, time }))
  }, [allDepartures])
  const trainsInView = useMemo(() => trainOptions.map((option) => option.train), [trainOptions])

  const filtered = useMemo(
    () => (trainFilter === 'all' ? allDepartures : allDepartures.filter((departure) => departure.trainNumber === trainFilter)),
    [allDepartures, trainFilter]
  )

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDeparture[]>()
    for (const departure of filtered) {
      const list = map.get(departure.serviceDate) ?? []
      list.push(departure)
      map.set(departure.serviceDate, list)
    }
    return map
  }, [filtered])

  const monthDepartures = useMemo(() => filtered.filter((departure) => monthKey(departure.serviceDate) === month), [filtered, month])
  const suggestions = useMemo(() => suggestedPrices(allDepartures), [allDepartures])

  const summary = useMemo(() => {
    const upcoming = monthDepartures.filter((departure) => !isDeparted(departure, now))
    const prices = upcoming.map((departure) => productOf(departure, 'standard')?.ticketPrice).filter(Boolean) as number[]
    return {
      selling: upcoming.filter((departure) => departure.status === 'published' && !isSoldOut(departure)).length,
      paused: upcoming.filter((departure) => departure.status === 'draft').length,
      soldOut: upcoming.filter(isSoldOut).length,
      sold: monthDepartures.reduce((total, departure) => total + departure.products.reduce((sum, product) => sum + product.sold, 0), 0),
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
    }
  }, [monthDepartures, now])

  // Departed trains and trains DSVN cancelled can't be sold, so bulk edits skip them.
  const editable = useCallback((departure: CalendarDeparture) => !isDeparted(departure, now) && departure.status !== 'cancelled', [now])

  const selectedDepartures = useMemo(
    () => filtered.filter((departure) => selectedDates.has(departure.serviceDate) && editable(departure)),
    [filtered, selectedDates, editable]
  )

  const selectableDates = useMemo(() => {
    const set = new Set<string>()
    for (const departure of monthDepartures) if (editable(departure)) set.add(departure.serviceDate)
    return set
  }, [monthDepartures, editable])

  function toggleDate(date: string) {
    setSelectedDates((current) => {
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function selectWhere(predicate: (date: string) => boolean) {
    setSelectedDates(new Set([...selectableDates].filter(predicate)))
  }

  function toggleWeekday(weekday: number) {
    const dates = [...selectableDates].filter((date) => weekdayIndex(date) === weekday)
    setSelectedDates((current) => {
      const allSelected = dates.every((date) => current.has(date))
      const next = new Set(current)
      for (const date of dates) {
        if (allSelected) next.delete(date)
        else next.add(date)
      }
      return next
    })
  }

  async function afterSave(message: string) {
    showToast({ tone: 'success', text: message })
    await load()
  }

  async function afterConflict(message: string) {
    showToast({ tone: 'error', text: message })
    await load()
  }

  function hideGuide() {
    setGuideHidden(true)
    try { window.localStorage.setItem(GUIDE_KEY, '1') } catch { /* private mode */ }
  }

  const dayDepartures = openDay ? allDepartures.filter((departure) => departure.serviceDate === openDay) : []

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-40 pt-5 sm:px-6 lg:pt-8 xl:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">Xin chào {data?.viewer.displayName ?? ''}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Giá vé</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Tàu và giờ chạy lấy tự động từ DSVN. Bạn chỉ cần đặt giá bán trên web: bấm vào một ngày để sửa giá,
            hoặc bấm <strong>“Chọn nhiều ngày”</strong> để đổi giá nhiều ngày cùng lúc.
          </p>
        </div>
        {guideHidden ? (
          <button type="button" onClick={() => setGuideHidden(false)} className="flex h-12 w-fit items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <HelpCircle className="h-5 w-5" /> Hướng dẫn
          </button>
        ) : null}
      </header>

      {!guideHidden ? (
        <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/70 p-5" aria-label="Hướng dẫn nhanh">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-base font-bold text-violet-950">Cách dùng trong 3 bước</h2>
            <button type="button" onClick={hideGuide} className="-mr-2 -mt-2 flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100">
              <X className="h-4 w-4" /> Ẩn
            </button>
          </div>
          <ol className="mt-3 grid gap-3 text-sm leading-relaxed text-violet-950 md:grid-cols-3">
            <li className="rounded-2xl bg-white p-4"><strong className="block text-base">1. Lịch tàu có sẵn</strong>Mỗi sáng 4 giờ hệ thống tự lấy tàu và giờ chạy từ DSVN. Chuyến mới tự dùng giá gần nhất của tuyến.</li>
            <li className="rounded-2xl bg-white p-4"><strong className="block text-base">2. Đổi giá</strong>Bấm một ngày để sửa giá, hoặc “Chọn nhiều ngày” → chọn cuối tuần, ngày lễ → “Đổi giá”.</li>
            <li className="rounded-2xl bg-white p-4"><strong className="block text-base">3. Tạm ngưng khi cần</strong>Khi DSVN hết chỗ hoặc không muốn bán ngày nào, chọn “Tạm ngưng bán”. Khách sẽ không thấy chuyến đó.</li>
          </ol>
          <p className="mt-3 text-sm text-violet-900">Giá nhập là <strong>giá 1 vé</strong>. Khách luôn mua trọn cabin 4 vé, nên giá cabin = giá vé × 4 (hệ thống tự tính).</p>
        </section>
      ) : null}

      {/* Controls */}
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Chọn tuyến và tàu">
        {data && data.routes.length > 0 ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
            <RoutePicker
              routes={data.routes}
              value={data.routeId}
              onChange={(routeId) => updateQuery({ tuyen: String(routeId), tau: null })}
            />
            {trainOptions.length > 1 ? (
              // A dropdown, not a row of buttons: some routes have 10+ DSVN trains.
              <div className="min-w-0 sm:w-64">
                <label htmlFor="train-filter" className="mb-2 block text-sm font-bold text-slate-500">Tàu</label>
                <div className="relative">
                  <TrainFront className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <select
                    id="train-filter"
                    value={trainFilter}
                    onChange={(event) => updateQuery({ tau: event.target.value === 'all' ? null : event.target.value })}
                    className={cn(
                      'h-14 w-full appearance-none rounded-2xl border bg-white pl-12 pr-10 text-base font-bold text-slate-900 hover:border-violet-400 focus:border-violet-500',
                      trainFilter === 'all' ? 'border-slate-300' : 'border-violet-500 bg-violet-50'
                    )}
                  >
                    <option value="all">Tất cả {trainOptions.length} tàu</option>
                    {trainOptions.map(({ train, time }) => <option key={train} value={train}>{train} · đi {time}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                </div>
              </div>
            ) : null}
          </div>
        ) : !loading && !loadError ? (
          <p className="text-base text-slate-700">Chưa có tuyến nào được lấy từ DSVN. Xem tình trạng ở <Link href="/admin/operations" className="font-bold text-violet-700 underline">Đồng bộ DSVN</Link> hoặc báo bộ phận kỹ thuật.</p>
        ) : null}
      </section>

      {data?.lastSync && (
        data.lastSync.status === 'failed'
        || data.lastSync.status === 'partial'
        || now - Date.parse(data.lastSync.startedAt) > 36 * 3_600_000
      ) ? (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-base">
            <p className="font-bold">
              {data.lastSync.status === 'failed' || data.lastSync.status === 'partial'
                ? 'Lần lấy giờ tàu tự động từ DSVN gần nhất bị lỗi'
                : 'Đã hơn 1 ngày hệ thống chưa lấy giờ tàu mới từ DSVN'}
              {' '}({new Date(data.lastSync.startedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}).
            </p>
            <p className="mt-1 text-sm">
              Giờ chạy trên lịch có thể chưa khớp DSVN. Giá và trạng thái bán không bị ảnh hưởng.
              Báo cho bộ phận kỹ thuật, hoặc thử chạy lại ở <Link href="/admin/operations" className="font-bold underline">Đồng bộ DSVN</Link>.
            </p>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div role="alert" className="mt-5 flex flex-col gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-base"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {loadError}</p>
          <button type="button" onClick={() => void load()} className="h-11 rounded-xl bg-white px-4 text-sm font-bold text-rose-800 ring-1 ring-rose-200">Thử lại</button>
        </div>
      ) : null}

      {/* Calendar */}
      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label={`Lịch ${monthLabel(month)}`}>
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Tháng trước" onClick={() => updateQuery({ thang: shiftMonth(month, -1) })} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="min-w-40 text-center text-xl font-extrabold text-slate-900" aria-live="polite">{monthLabel(month)}</h2>
            <button type="button" aria-label="Tháng sau" onClick={() => updateQuery({ thang: shiftMonth(month, 1) })} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"><ChevronRight className="h-5 w-5" /></button>
            {month !== today.slice(0, 7) ? (
              <button type="button" onClick={() => updateQuery({ thang: null })} className="ml-1 h-12 rounded-2xl px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50">Về tháng này</button>
            ) : null}
            <button type="button" aria-label="Tải lại" onClick={() => void load()} className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-50 lg:ml-1">
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permissions.canPrice ? (
              <button
                type="button"
                aria-pressed={selecting}
                onClick={() => { setSelecting((value) => !value); setSelectedDates(new Set()) }}
                className={cn('flex h-12 items-center gap-2 rounded-2xl px-4 text-base font-bold', selecting ? 'bg-violet-950 text-white' : 'border border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100')}
              >
                <ListChecks className="h-5 w-5" /> {selecting ? 'Xong, thoát chọn' : 'Chọn nhiều ngày'}
              </button>
            ) : null}
          </div>
        </div>

        {selecting ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-violet-100 bg-violet-50/70 px-4 py-3 sm:px-5">
            <span className="text-sm font-semibold text-violet-900">Chọn nhanh:</span>
            <QuickButton onClick={() => selectWhere(() => true)}>Cả tháng</QuickButton>
            <QuickButton onClick={() => selectWhere((date) => weekdayIndex(date) >= 4)}>Cuối tuần (T6–CN)</QuickButton>
            <QuickButton onClick={() => selectWhere((date) => weekdayIndex(date) >= 5)}>T7 & CN</QuickButton>
            <QuickButton onClick={() => selectWhere((date) => weekdayIndex(date) <= 3)}>Ngày thường (T2–T5)</QuickButton>
            <QuickButton onClick={() => setSelectedDates(new Set())}>Bỏ chọn hết</QuickButton>
            <span className="text-sm text-violet-800">hoặc bấm từng ngày trên lịch.</span>
          </div>
        ) : null}

        <Legend />

        {loading && !data ? (
          <div className="flex min-h-80 items-center justify-center gap-2 text-base text-slate-500"><LoaderCircle className="h-6 w-6 animate-spin text-violet-600" /> Đang tải lịch…</div>
        ) : (
          <div className={cn(loading && 'opacity-60 transition-opacity')}>
            <CalendarGrid
              month={month}
              days={grid.days}
              today={today}
              byDate={byDate}
              singleTrain={trainFilter !== 'all' || trainsInView.length <= 1}
              selecting={selecting}
              selectedDates={selectedDates}
              now={now}
              onOpenDay={setOpenDay}
              onToggleDate={toggleDate}
              onToggleWeekday={toggleWeekday}
            />
          </div>
        )}
      </section>

      {/* Month summary */}
      {data && monthDepartures.length > 0 ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tóm tắt tháng">
          <SummaryCard icon={<PlayCircle className="h-5 w-5 text-emerald-600" />} label="Chuyến đang bán" value={String(summary.selling)} />
          <SummaryCard icon={<PauseCircle className="h-5 w-5 text-amber-500" />} label="Tạm ngưng / hết cabin" value={`${summary.paused} / ${summary.soldOut}`} />
          <SummaryCard icon={<Users className="h-5 w-5 text-violet-600" />} label="Cabin đã bán trong tháng" value={String(summary.sold)} />
          <SummaryCard icon={<Tag className="h-5 w-5 text-gold-600" />} label="Giá 1 vé trong tháng" value={summary.min == null ? '—' : summary.min === summary.max ? formatMoney(summary.min) : `${formatMoney(summary.min)} – ${formatMoney(summary.max)}`} />
        </section>
      ) : data && !loading && data.routes.length > 0 ? (
        <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarCheck2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-lg font-semibold text-slate-800">DSVN chưa có chuyến nào {monthLabel(month).toLowerCase()}{trainFilter !== 'all' ? ` cho tàu ${trainFilter}` : ''}.</p>
          <p className="mt-1 text-sm text-slate-500">Lịch tàu tự cập nhật từ DSVN lúc 4 giờ sáng mỗi ngày (lấy trước vài ngày tới).</p>
        </section>
      ) : null}

      {/* Sticky selection bar */}
      {selecting ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:left-64" role="region" aria-label="Thao tác với ngày đã chọn">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-semibold text-slate-800" aria-live="polite">
              {selectedDates.size ? <>Đã chọn <strong>{selectedDates.size} ngày</strong> · {selectedDepartures.length} chuyến</> : 'Bấm vào các ngày trên lịch để chọn.'}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {permissions.canPrice ? (
                <ActionButton disabled={!selectedDepartures.length} onClick={() => setBulk({ open: true, mode: 'price' })} primary>
                  <Tag className="h-5 w-5" /> Đổi giá
                </ActionButton>
              ) : null}
              {permissions.canOperate ? (
                <>
                  <ActionButton disabled={!selectedDepartures.length} onClick={() => setBulk({ open: true, mode: 'status' })}>
                    <PlayCircle className="h-5 w-5" /> Mở / ngưng bán
                  </ActionButton>
                  <ActionButton disabled={!selectedDepartures.length} onClick={() => setBulk({ open: true, mode: 'capacity' })}>
                    <Users className="h-5 w-5" /> Số cabin
                  </ActionButton>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 lg:left-64" aria-live="polite" role="status">
        {toast ? (
          <div className={cn('pointer-events-auto flex max-w-xl items-start gap-3 rounded-2xl px-5 py-4 text-base font-semibold shadow-xl', toast.tone === 'success' ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white')}>
            {toast.tone === 'success' ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />}
            <span>{toast.text}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)} className="-mr-2 -mt-1 rounded-lg p-1 opacity-80 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
      </div>

      {data ? (
        <>
          <DayPanel
            date={openDay}
            routeName={routeLabel(route)}
            departures={dayDepartures}
            permissions={permissions}
            suggestions={suggestions}
            now={now}
            onClose={() => setOpenDay(null)}
            onSaved={afterSave}
            onConflict={afterConflict}
          />
          <BulkEditDialog
            open={bulk.open}
            mode={bulk.mode}
            departures={selectedDepartures}
            dayCount={selectedDates.size}
            permissions={permissions}
            suggestions={suggestions}
            onClose={() => setBulk((current) => ({ ...current, open: false }))}
            onSaved={async (message) => { setBulk((current) => ({ ...current, open: false })); setSelectedDates(new Set()); await afterSave(message) }}
            onConflict={async (message) => { setBulk((current) => ({ ...current, open: false })); await afterConflict(message) }}
          />
        </>
      ) : null}
    </div>
  )
}

function Legend() {
  const items: Array<{ dot: string; label: string }> = [
    { dot: STATUS_META.published.dot, label: 'Đang bán' },
    { dot: STATUS_META.draft.dot, label: 'Tạm ngưng bán' },
    { dot: 'bg-slate-800', label: 'Hết cabin' },
    { dot: STATUS_META.cancelled.dot, label: STATUS_META.cancelled.label },
    { dot: STATUS_META.departed.dot, label: 'Đã chạy' },
  ]
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-600 sm:px-5" aria-label="Chú thích màu">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', item.dot)} aria-hidden="true" />{item.label}</li>
      ))}
      <li className="text-slate-500">Giá hiển thị là giá 1 vé (“2tr” = 2.000.000đ)</li>
    </ul>
  )
}

function QuickButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-900 hover:bg-violet-100">
      {children}
    </button>
  )
}

function ActionButton({ onClick, disabled, primary, children }: { onClick: () => void; disabled?: boolean; primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold disabled:cursor-not-allowed disabled:opacity-40',
        primary ? 'bg-violet-700 text-white hover:bg-violet-800' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">{icon}{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

