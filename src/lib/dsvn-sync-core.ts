/**
 * DSVN per-date timetable + fare sync.
 *
 * Reads the public pages of giotaugiave.dsvn.vn exactly as a visitor would:
 * "Giờ tàu" (/giotau/thongnhat) for the trains running on each date and their
 * stop times, and "Giá vé" (/giave/thongnhat) for the fare of every seat type.
 * The page's own requests are observed; no protected booking API is called and
 * no CAPTCHA exists or is bypassed. Lookups run one at a time with a short pause.
 *
 * Kept free of Next.js / path-alias imports and of non-erasable TypeScript so
 * `scripts/dsvn-sync.mjs` can run it with plain Node (type stripping).
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Browser, BrowserContext, Page, Request, Response } from 'playwright-core'

const PORTAL = 'https://giotaugiave.dsvn.vn'
const TIME_ZONE = 'Asia/Ho_Chi_Minh'
const DAY_MS = 86_400_000
/** Pause between lookups so the public site sees a light, steady load. */
const LOOKUP_PAUSE_MS = 120
/** One route at a time: routes of the same date upsert the same train rows. */
const APPLY_CONCURRENCY = 1
/** A northbound train can reach Hà Nội two calendar days after leaving its origin. */
const MAX_ORIGIN_LAG_DAYS = 2
/** Days the projection pattern is taken from (trains present on every one of them). */
const PATTERN_DAYS = 7
/** Consecutive dates without any train that mark the end of DSVN's published window. */
const CLOSED_RUN_FOR_HORIZON = 3

const LOCAL_CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

/** DSVN "Tuyến" select values that carry trains between Hà Nội and the focus stations. */
const LINES = ['1-1', '2-1', '2-5'] as const
const MAIN_LINE = '1-1'
const DIRECTIONS = ['chieuDi', 'chieuVe'] as const
type Line = (typeof LINES)[number]
type Direction = (typeof DIRECTIONS)[number]

export type SyncTrigger = 'cron' | 'manual' | 'script'

type RouteInfo = { code: string; from: string; to: string }

type Listing = { line: Line; direction: Direction; paTau: number; macTau: string }

type PatternStop = { code: string; name: string; km: number; dayOffset: number; arrival: string; departure: string }

type BuiltDeparture = {
  routeCode: string
  fromCode: string
  toCode: string
  fromKm: number
  toKm: number
  trainNumber: string
  listing: Listing
  originDate: string
  serviceDate: string
  departureAt: string
  arrivalAt: string
}

type SnapshotItem = {
  external_id: string
  train_number: string
  departure_at: string
  arrival_at: string
  payload_hash: string
}

type ApplyResult = { upserted: number; cancelled: number; draftWithoutFare: number; skipped?: boolean }

type FareRow = { seat_code: string; seat_name: string; seat_group: string; fare_vnd: number }

type DateState = {
  service_date: string
  dsvn_open: boolean
  timetable_synced_at: string | null
  projected_at: string | null
  fares_synced_at: string | null
}

export type DsvnSyncOptions = {
  supabase: SupabaseClient
  trigger: SyncTrigger
  /** First service date (Vietnam). Default: today. */
  from?: string
  /** Last service date, inclusive. Default: from + 29 days. */
  until?: string
  /**
   * Stop starting new work after this many ms (Vercel functions are time-limited).
   * Without a budget every open date gets timetable + fares (full backfill).
   */
  budgetMs?: number
  /** Re-project dates DSVN has not opened even if they were projected before. */
  reproject?: boolean
  /** Skip fare lookups (timetable only). */
  skipFares?: boolean
  log?: (line: string) => void
}

export type DsvnSyncResult = {
  runId: number
  status: 'succeeded' | 'partial' | 'failed'
  windowStart: string
  windowEnd: string
  /** Last date DSVN currently publishes trains for. */
  dsvnHorizon: string | null
  timetableDates: number
  requestedSnapshots: number
  completedSnapshots: number
  fetchedDepartures: number
  upsertedDepartures: number
  cancelledDepartures: number
  draftDepartures: number
  projectedDates: number
  projectedDepartures: number
  fareDates: number
  fareRows: number
  /** Open dates whose fares were not refreshed in this run (time budget). */
  pendingFareDates: number
  /** Routes with no DSVN coverage (scheduled manually). */
  skippedRoutes: string[]
  errors: string[]
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function vietnamToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

function dateRange(from: string, to: string) {
  const out: string[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) out.push(date)
  return out
}

function vietnamIso(date: string, time: string) {
  const parsed = new Date(`${date}T${time}+07:00`)
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid DSVN time ${date} ${time}`)
  return parsed.toISOString()
}

function vietnamDateOf(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

function vietnamTimeOf(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}

// ---------------------------------------------------------------------------
// Parsing helpers (exported for tests)
// ---------------------------------------------------------------------------

/** DSVN writes some train codes with "Ð" (U+00D0), e.g. "HÐ1"; store plain ASCII. */
export function normalizeTrainNumber(macTau: string) {
  return macTau.normalize('NFC').replace(/[ÐĐđð]/g, 'D').toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

/** Maps a DSVN seat type to the groups the admin compares against. */
export function seatGroupOf(code: string, description: string) {
  const text = `${description}`.normalize('NFC').toLocaleLowerCase('vi')
  if (text.includes('2 giường')) return text.includes('vip') ? 'k2_vip' : 'k2'
  if (text.includes('4 giường')) return /tầng\s*2/.test(text) ? 'k4_upper' : 'k4_lower'
  if (text.includes('6 giường')) return 'k6'
  if (/ngồi|ghế/.test(text)) return 'seat'
  if (/^AnLT1/i.test(code)) return 'k4_lower'
  if (/^AnLT2/i.test(code)) return 'k4_upper'
  if (/^BnL/i.test(code)) return 'k6'
  return 'other'
}

function payloadHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright-core')
  const configured = process.env.DSVN_CHROME_EXECUTABLE_PATH?.trim()
  if (configured) {
    if (!existsSync(configured)) throw new Error('DSVN_CHROME_EXECUTABLE_PATH does not exist.')
    return chromium.launch({ executablePath: configured, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  }
  const local = LOCAL_CHROME_PATHS.find((candidate) => existsSync(candidate))
  if (local) return chromium.launch({ executablePath: local, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const serverless = (await import('@sparticuz/chromium')).default
  return chromium.launch({ executablePath: await serverless.executablePath(), headless: true, args: serverless.args })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type GasStation = { maGa: string; tenGa: string; km: number }

/**
 * One tab on a DSVN public page. Drives the form like a visitor and reads the
 * JSON the page itself receives.
 */
class PortalPage {
  page: Page
  inflight = 0
  requestSeq = 0
  pendingReads = 0
  gas = new Map<number, GasStation[]>()
  lastList: { seq: number; date: string; body: Array<{ paTau: number; macTau: string }> } | null = null
  state = { line: '', direction: '', date: '' }
  listCache = new Map<string, Listing[]>()

  constructor(page: Page) {
    this.page = page
    const seqOf = new WeakMap<Request, number>()
    page.on('request', (request) => {
      if (!request.url().includes('/api/')) return
      this.inflight += 1
      this.requestSeq += 1
      seqOf.set(request, this.requestSeq)
    })
    const done = (request: Request) => {
      if (request.url().includes('/api/')) this.inflight = Math.max(0, this.inflight - 1)
    }
    page.on('requestfinished', done)
    page.on('requestfailed', done)
    page.on('response', (response: Response) => {
      const url = response.url()
      const gasMatch = url.match(/\/api\/mactaus\/(\d+)\/gas/)
      const isList = url.includes('/api/mactaus?')
      if (!gasMatch && !isList) return
      const seq = seqOf.get(response.request()) ?? 0
      this.pendingReads += 1
      response.json()
        .then((body) => {
          if (gasMatch && Array.isArray(body)) this.gas.set(Number(gasMatch[1]), body as GasStation[])
          if (isList && Array.isArray(body) && (!this.lastList || seq >= this.lastList.seq)) {
            this.lastList = { seq, date: new URL(url).searchParams.get('ngayDi') ?? '', body }
          }
        })
        .catch(() => undefined)
        .finally(() => { this.pendingReads -= 1 })
    })
  }

  static async open(context: BrowserContext, path: string) {
    const page = await context.newPage()
    const portal = new PortalPage(page)
    await page.goto(`${PORTAL}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForSelector('#tuyenSelect', { timeout: 30_000 })
    await portal.settle()
    return portal
  }

  /** Waits until the page has no API request in flight for a short quiet period. */
  async settle(timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs
    let quietSince = 0
    while (Date.now() < deadline) {
      if (this.inflight === 0 && this.pendingReads === 0) {
        if (!quietSince) quietSince = Date.now()
        if (Date.now() - quietSince >= 200) return
      } else {
        quietSince = 0
      }
      await sleep(40)
    }
    throw new Error('DSVN page did not respond in time.')
  }

  async options(selector: string) {
    return this.page.$$eval(`${selector} option`, (nodes) =>
      nodes.map((node) => ({ value: (node as HTMLOptionElement).value, text: (node.textContent ?? '').trim() })))
  }

  /** Selects line / direction / date and returns the trains DSVN lists for it. */
  async listTrains(line: Line, direction: Direction, date: string): Promise<Listing[]> {
    const key = `${line}|${direction}|${date}`
    const cached = this.listCache.get(key)
    if (cached && this.state.line === line && this.state.direction === direction && this.state.date === date) return cached

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const before = this.requestSeq
      if (this.state.line !== line || attempt > 0) {
        await this.page.selectOption('#tuyenSelect', line)
        await this.settle()
        await this.page.waitForSelector('#ngayDi', { timeout: 20_000 })
        this.state = { line, direction: '', date: '' }
      }
      if (this.state.direction !== direction || attempt > 0) {
        await this.page.click(`label[for=${direction}]`)
        await this.settle()
      }
      await this.page.fill('#ngayDi', date)
      await this.page.dispatchEvent('#ngayDi', 'change')
      await this.settle()
      const list = this.lastList
      if (list && list.seq > before && list.date === date) {
        this.state = { line, direction, date }
        const listings = list.body
          .filter((train) => Number.isFinite(Number(train.paTau)) && train.macTau)
          .map((train) => ({ line, direction, paTau: Number(train.paTau), macTau: String(train.macTau).trim() }))
        this.listCache.set(key, listings)
        return listings
      }
      this.state = { line: '', direction: '', date: '' }
    }
    throw new Error(`DSVN train list for ${line} ${direction} ${date} could not be read.`)
  }

  async selectTrain(paTau: number) {
    const current = await this.page.$eval('#macTau', (node) => (node as HTMLSelectElement).value).catch(() => '')
    if (current !== String(paTau)) {
      await this.page.selectOption('#macTau', String(paTau))
      await this.settle()
    }
    if (!this.gas.has(paTau)) {
      // The stop list may still be parsing; give it one more quiet period.
      await this.settle()
    }
    const gas = this.gas.get(paTau)
    if (!gas) throw new Error(`DSVN stop list for train ${paTau} was not received.`)
    return gas
  }

  async selectSegment(fromKm: number, toKm: number) {
    await this.page.selectOption('#gaDi', String(fromKm))
    await this.settle()
    const destinations = await this.options('#gaDen')
    if (!destinations.some((option) => option.value === String(toKm))) return false
    await this.page.selectOption('#gaDen', String(toKm))
    return true
  }

  async search<T>(matches: (url: URL) => boolean): Promise<T> {
    const response = this.page.waitForResponse((candidate) => {
      try { return matches(new URL(candidate.url())) } catch { return false }
    }, { timeout: 20_000 })
    await this.page.click('button:has-text("Tra cứu")')
    const result = await response
    if (!result.ok()) throw new Error(`DSVN returned HTTP ${result.status()}.`)
    const body = await result.json()
    await this.settle()
    await sleep(LOOKUP_PAUSE_MS)
    return body as T
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

async function loadRoutes(supabase: SupabaseClient): Promise<RouteInfo[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('code, from_station:stations!routes_from_station_id_fkey(code), to_station:stations!routes_to_station_id_fkey(code)')
    .eq('active', true)
    .order('code')
  if (error) throw new Error(`Cannot load active routes: ${error.message}`)
  const code = (value: unknown) => {
    const station = Array.isArray(value) ? value[0] : value
    return String((station as { code?: string } | null)?.code ?? '')
  }
  return (data ?? []).map((route) => ({ code: String(route.code), from: code(route.from_station), to: code(route.to_station) }))
}

async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>) {
  const results: R[] = []
  for (let index = 0; index < items.length; index += size) {
    results.push(...await Promise.all(items.slice(index, index + size).map(work)))
  }
  return results
}

export async function runDsvnSync(options: DsvnSyncOptions): Promise<DsvnSyncResult> {
  const { supabase } = options
  const log = options.log ?? (() => undefined)
  const startedAt = Date.now()
  const deadline = options.budgetMs ? startedAt + options.budgetMs : Number.POSITIVE_INFINITY
  const budgeted = Number.isFinite(deadline)
  const timeLeft = () => deadline - Date.now()
  const today = vietnamToday()
  const from = options.from ?? today
  const until = options.until ?? addDays(from, 29)
  if (until < from) throw new Error('The sync end date is before its start date.')

  const routes = await loadRoutes(supabase)
  const routeByPair = new Map(routes.map((route) => [`${route.from}>${route.to}`, route]))
  const focusCodes = new Set(routes.flatMap((route) => [route.from, route.to]))

  const { data: run, error: runError } = await supabase
    .from('schedule_sync_runs')
    .insert({ source: 'dsvn', trigger_type: options.trigger, window_start: from, window_end: until, requested_snapshots: 0 })
    .select('id')
    .single()
  if (runError || !run) throw new Error(`Cannot create sync run: ${runError?.message ?? 'unknown error'}`)

  const result: DsvnSyncResult = {
    runId: Number(run.id),
    status: 'succeeded',
    windowStart: from,
    windowEnd: until,
    dsvnHorizon: null,
    timetableDates: 0,
    requestedSnapshots: 0,
    completedSnapshots: 0,
    fetchedDepartures: 0,
    upsertedDepartures: 0,
    cancelledDepartures: 0,
    draftDepartures: 0,
    projectedDates: 0,
    projectedDepartures: 0,
    fareDates: 0,
    fareRows: 0,
    pendingFareDates: 0,
    skippedRoutes: [],
    errors: [],
  }
  const fail = (message: string) => {
    result.errors.push(message)
    log(`! ${message}`)
  }

  const { data: stateRows } = await supabase
    .from('dsvn_sync_dates')
    .select('service_date, dsvn_open, timetable_synced_at, projected_at, fares_synced_at')
  const states = new Map<string, DateState>((stateRows ?? []).map((row) => [String(row.service_date), row as DateState]))
  const stateUpdates = new Map<string, Record<string, unknown>>()
  const markDate = (date: string, values: Record<string, unknown>) => {
    stateUpdates.set(date, { ...(stateUpdates.get(date) ?? { service_date: date }), ...values, updated_at: new Date().toISOString() })
  }

  let browser: Browser | null = null
  try {
    browser = await launchBrowser()
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' })
    await context.route('**/*', (route) => {
      const request = route.request()
      // Skip images/fonts and the page's search analytics beacon.
      if (['image', 'media', 'font'].includes(request.resourceType()) || request.url().includes('/api/searches')) return route.abort()
      return route.continue()
    })
    const timetablePage = await PortalPage.open(context, '/giotau/thongnhat')
    const farePage = await PortalPage.open(context, '/giave/thongnhat')

    // --- Train lists and stop patterns --------------------------------------
    const listingsByDate = new Map<string, Listing[]>()
    async function listingsFor(originDate: string) {
      const cached = listingsByDate.get(originDate)
      if (cached) return cached
      const all: Listing[] = []
      for (const line of LINES) {
        for (const direction of DIRECTIONS) {
          all.push(...await timetablePage.listTrains(line, direction, originDate))
        }
      }
      listingsByDate.set(originDate, all)
      return all
    }
    const isOpen = async (date: string) => (await listingsFor(date)).some((listing) => listing.line === MAIN_LINE)

    // Patterns are keyed by DSVN's run-plan id (paTau), which stays the same for
    // every date a train keeps the same timetable.
    const patterns = new Map<number, PatternStop[] | null>()
    async function patternFor(listing: Listing, originDate: string) {
      if (patterns.has(listing.paTau)) return patterns.get(listing.paTau) ?? null
      await timetablePage.listTrains(listing.line, listing.direction, originDate)
      const gas = await timetablePage.selectTrain(listing.paTau)
      const codes = new Set(gas.map((station) => station.maGa))
      const relevant = [...codes].filter((code) => focusCodes.has(code))
      const servesRoute = relevant.some((a) => relevant.some((b) => routeByPair.has(`${a}>${b}`)))
      if (!servesRoute || gas.length < 2) {
        patterns.set(listing.paTau, null)
        return null
      }
      const first = gas.reduce((min, station) => (station.km < min.km ? station : min))
      const last = gas.reduce((max, station) => (station.km > max.km ? station : max))
      if (!await timetablePage.selectSegment(first.km, last.km)) throw new Error(`Cannot select full route of ${listing.macTau}.`)
      const rows = await timetablePage.search<Array<{ tenGa: string; km: number; ngayDi: string; gioDi: string; gioDen: string }>>(
        (url) => url.pathname.endsWith('/api/giotaus') && url.searchParams.get('paTau') === String(listing.paTau))
      const codeByKm = new Map(gas.map((station) => [station.km, station.maGa]))
      const stops = rows.map((row) => ({
        code: codeByKm.get(row.km) ?? '',
        name: row.tenGa,
        km: row.km,
        dayOffset: daysBetween(originDate, String(row.ngayDi).slice(0, 10)),
        arrival: String(row.gioDen),
        departure: String(row.gioDi),
      }))
      patterns.set(listing.paTau, stops)
      return stops
    }

    /** All departures whose boarding (route origin) date is `serviceDate`. */
    async function departuresOn(serviceDate: string) {
      const byRoute = new Map<string, BuiltDeparture[]>(routes.map((route) => [route.code, []]))
      for (let lag = MAX_ORIGIN_LAG_DAYS; lag >= 0; lag -= 1) {
        const originDate = addDays(serviceDate, -lag)
        for (const listing of await listingsFor(originDate)) {
          const stops = await patternFor(listing, originDate)
          if (!stops) continue
          const trainNumber = normalizeTrainNumber(listing.macTau)
          stops.forEach((board, boardIndex) => {
            if (board.dayOffset !== lag || !focusCodes.has(board.code)) return
            for (const alight of stops.slice(boardIndex + 1)) {
              const route = routeByPair.get(`${board.code}>${alight.code}`)
              if (!route) continue
              const departureAt = vietnamIso(addDays(originDate, board.dayOffset), board.departure)
              const arrivalAt = vietnamIso(addDays(originDate, alight.dayOffset), alight.arrival)
              const list = byRoute.get(route.code)!
              if (list.some((existing) => existing.trainNumber === trainNumber)) continue
              list.push({
                routeCode: route.code, fromCode: board.code, toCode: alight.code, fromKm: board.km, toKm: alight.km,
                trainNumber, listing, originDate, serviceDate, departureAt, arrivalAt,
              })
            }
          })
        }
      }
      return byRoute
    }

    const toSnapshot = (departure: BuiltDeparture): SnapshotItem => ({
      external_id: `${departure.routeCode}:${departure.serviceDate}:${departure.trainNumber}`,
      train_number: departure.trainNumber,
      departure_at: departure.departureAt,
      arrival_at: departure.arrivalAt,
      payload_hash: payloadHash({
        routeCode: departure.routeCode, serviceDate: departure.serviceDate, trainNumber: departure.trainNumber,
        departureAt: departure.departureAt, arrivalAt: departure.arrivalAt,
      }),
    })

    async function applyDate(serviceDate: string, byRoute: Map<string, SnapshotItem[]>, projected: boolean) {
      const entries = [...byRoute.entries()]
      result.requestedSnapshots += entries.length
      const outcomes = await inBatches(entries, APPLY_CONCURRENCY, async ([routeCode, items]) => {
        try {
          if (items.length === 0) throw new Error('no train listed; nothing applied.')
          // Routes share train rows (SE2 serves SGO/NTR/DNA/HUE…→HNO), so a
          // concurrent run (e.g. cron + manual) can still deadlock; retry then.
          for (let attempt = 1; ; attempt += 1) {
            const { data, error } = await supabase.rpc('apply_dsvn_route_snapshot', {
              p_route_code: routeCode, p_service_date: serviceDate, p_departures: items, p_projected: projected,
            })
            if (!error) return { routeCode, items: items.length, applied: data as ApplyResult }
            const retryable = error.code === '40P01' || error.code === '40001' || /deadlock|could not serialize/i.test(error.message)
            if (!retryable || attempt >= 3) throw new Error(error.message)
            await sleep(300 * attempt)
          }
        } catch (error) {
          return { routeCode, error: error instanceof Error ? error.message : String(error) }
        }
      })
      let ok = 0
      for (const outcome of outcomes) {
        if ('error' in outcome) {
          fail(`${outcome.routeCode} ${serviceDate}: ${outcome.error}`)
          continue
        }
        ok += 1
        if (outcome.applied.skipped) continue
        result.completedSnapshots += 1
        result.fetchedDepartures += outcome.items
        result.upsertedDepartures += Number(outcome.applied.upserted) || 0
        result.cancelledDepartures += Number(outcome.applied.cancelled) || 0
        result.draftDepartures += Number(outcome.applied.draftWithoutFare) || 0
        if (projected) result.projectedDepartures += Number(outcome.applied.upserted) || 0
      }
      return ok === entries.length
    }

    async function syncTimetable(serviceDate: string) {
      const built = await departuresOn(serviceDate)
      const snapshot = new Map([...built.entries()].map(([code, list]) => [code, list.map(toSnapshot)]))
      const complete = await applyDate(serviceDate, snapshot, false)
      const trainCount = new Set([...built.values()].flat().map((departure) => departure.trainNumber)).size
      markDate(serviceDate, {
        dsvn_open: true,
        train_count: trainCount,
        ...(complete ? { timetable_synced_at: new Date().toISOString(), last_error: null } : { last_error: 'Một số chặng chưa cập nhật được lịch.' }),
      })
      result.timetableDates += 1
      return built
    }

    async function syncFares(serviceDate: string, built: Map<string, BuiltDeparture[]>) {
      const departures = [...built.values()].flat()
      // One train selection per (line, direction, origin date, run plan).
      const groups = new Map<string, BuiltDeparture[]>()
      for (const departure of departures) {
        const key = `${departure.listing.line}|${departure.listing.direction}|${departure.originDate}|${departure.listing.paTau}`
        groups.set(key, [...(groups.get(key) ?? []), departure])
      }
      const items: Array<{ trainNumber: string; fromCode: string; toCode: string; fares: FareRow[] }> = []
      let failures = 0
      for (const group of groups.values()) {
        const { listing, originDate } = group[0]
        try {
          await farePage.listTrains(listing.line, listing.direction, originDate)
          await farePage.selectTrain(listing.paTau)
          for (const departure of group) {
            try {
              if (!await farePage.selectSegment(departure.fromKm, departure.toKm)) continue
              const fares = await farePage.search<Array<{ loaiCho: string; dienGiai: string; giaVe: number }>>((url) =>
                url.pathname.endsWith('/api/giaves')
                && url.searchParams.get('maGaDi') === departure.fromCode
                && url.searchParams.get('maGaDen') === departure.toCode
                && url.searchParams.get('ngayDi') === originDate)
              const rows = (Array.isArray(fares) ? fares : [])
                .filter((fare) => fare.loaiCho && Number(fare.giaVe) > 0)
                .map((fare) => ({
                  seat_code: String(fare.loaiCho).trim(),
                  seat_name: String(fare.dienGiai ?? '').trim() || String(fare.loaiCho).trim(),
                  seat_group: seatGroupOf(String(fare.loaiCho), String(fare.dienGiai ?? '')),
                  fare_vnd: Math.round(Number(fare.giaVe)),
                }))
              if (rows.length) items.push({ trainNumber: departure.trainNumber, fromCode: departure.fromCode, toCode: departure.toCode, fares: rows })
            } catch (error) {
              failures += 1
              fail(`Giá ${departure.trainNumber} ${departure.fromCode}-${departure.toCode} ${serviceDate}: ${error instanceof Error ? error.message : error}`)
            }
          }
        } catch (error) {
          failures += group.length
          fail(`Giá tàu ${listing.macTau} ${serviceDate}: ${error instanceof Error ? error.message : error}`)
        }
      }
      if (items.length) {
        const { data, error } = await supabase.rpc('upsert_dsvn_fares_batch', { p_service_date: serviceDate, p_items: items })
        if (error) {
          fail(`Lưu giá ${serviceDate}: ${error.message}`)
          return
        }
        result.fareRows += Number(data) || 0
      }
      result.fareDates += 1
      markDate(serviceDate, {
        fare_rows: items.reduce((sum, item) => sum + item.fares.length, 0),
        ...(failures === 0 ? { fares_synced_at: new Date().toISOString() } : { last_error: `${failures} lượt tra giá lỗi.` }),
      })
    }

    // --- 1. Which dates has DSVN opened? -------------------------------------
    const windowDates = dateRange(from, until)
    const openDates: string[] = []
    const closedDates: string[] = []
    let closedRun: string[] = []
    let reachedHorizon = false
    for (const date of windowDates) {
      if (reachedHorizon) { closedDates.push(date); continue }
      if (timeLeft() < 60_000) break
      try {
        if (await isOpen(date)) {
          // A trainless date between open dates is a DSVN glitch, not the end of sales.
          for (const gap of closedRun) fail(`DSVN không trả danh sách tàu ngày ${gap}; giữ nguyên dữ liệu cũ.`)
          closedRun = []
          openDates.push(date)
        } else {
          closedRun.push(date)
          if (closedRun.length >= CLOSED_RUN_FOR_HORIZON) reachedHorizon = true
          if (reachedHorizon) { closedDates.push(...closedRun); closedRun = [] }
        }
      } catch (error) {
        fail(`Danh sách tàu ngày ${date}: ${error instanceof Error ? error.message : error}`)
      }
    }
    // Trailing trainless dates at the end of the window are past DSVN's horizon too.
    if (openDates.length) closedDates.push(...closedRun)
    result.dsvnHorizon = openDates.at(-1) ?? null
    log(`DSVN mở bán ${openDates.length} ngày trong khoảng ${from}..${until}; ngày cuối có tàu: ${result.dsvnHorizon ?? '—'}`)

    // --- 2. Timetable + fares for open dates ---------------------------------
    const fareThresholdMs = (date: string) => {
      const ahead = daysBetween(today, date)
      return (ahead <= 7 ? 20 : ahead <= 30 ? 72 : 168) * 3_600_000
    }
    const fareDue = (date: string) => {
      const synced = states.get(date)?.fares_synced_at
      if (!synced) return Number.POSITIVE_INFINITY
      return (Date.now() - Date.parse(synced)) / fareThresholdMs(date)
    }
    // Budgeted runs refresh fares stalest-first; a full run does every open date.
    const fareOrder = options.skipFares ? [] : budgeted
      ? [...openDates].filter((date) => fareDue(date) >= 1).sort((a, b) => fareDue(b) - fareDue(a) || a.localeCompare(b))
      : [...openDates]
    const fareSet = new Set(fareOrder)
    const builtByDate = new Map<string, Map<string, BuiltDeparture[]>>()

    for (const date of openDates) {
      if (timeLeft() < 45_000) { fail(`Hết thời gian chạy: lịch từ ngày ${date} để lượt sau.`); break }
      try {
        builtByDate.set(date, await syncTimetable(date))
        if (!budgeted && fareSet.has(date)) {
          await syncFares(date, builtByDate.get(date)!)
          log(`${date}: ${result.upsertedDepartures} chuyến, ${result.fareRows} dòng giá (tích lũy)`)
        } else {
          log(`${date}: lịch đã cập nhật`)
        }
      } catch (error) {
        fail(`Lịch ngày ${date}: ${error instanceof Error ? error.message : error}`)
        markDate(date, { last_error: error instanceof Error ? error.message.slice(0, 500) : 'Lỗi không rõ' })
      }
    }
    if (budgeted) {
      for (const date of fareOrder) {
        if (timeLeft() < 40_000) break
        const built = builtByDate.get(date)
        if (!built) continue
        try {
          await syncFares(date, built)
          fareSet.delete(date)
        } catch (error) {
          fail(`Giá ngày ${date}: ${error instanceof Error ? error.message : error}`)
        }
      }
      result.pendingFareDates = [...fareSet].length
    }

    // --- 3. Placeholder departures where DSVN has not opened sales -----------
    const lastOpen = result.dsvnHorizon
    const toProject = closedDates.filter((date) => options.reproject || !states.get(date)?.projected_at)
    if (lastOpen && toProject.length && timeLeft() > 30_000) {
      // Trains that ran with identical times on each of the last PATTERN_DAYS open dates.
      const patternDates = dateRange(addDays(lastOpen, -(PATTERN_DAYS - 1)), lastOpen)
      const samples: Array<Map<string, BuiltDeparture[]>> = []
      for (const date of patternDates) samples.push(builtByDate.get(date) ?? await departuresOn(date))
      const templates = new Map<string, Array<{ trainNumber: string; dep: string; arr: string; arrOffset: number }>>()
      for (const route of routes) {
        const signature = (departure: BuiltDeparture) =>
          `${departure.trainNumber}|${vietnamTimeOf(departure.departureAt)}|${vietnamTimeOf(departure.arrivalAt)}|${daysBetween(departure.serviceDate, vietnamDateOf(departure.arrivalAt))}`
        const sets = samples.map((sample) => new Set((sample.get(route.code) ?? []).map(signature)))
        const common = [...sets[0] ?? []].filter((key) => sets.every((set) => set.has(key)))
        templates.set(route.code, common.map((key) => {
          const [trainNumber, dep, arr, offset] = key.split('|')
          return { trainNumber, dep, arr, arrOffset: Number(offset) }
        }))
      }
      for (const date of toProject) {
        if (timeLeft() < 15_000) { fail(`Hết thời gian chạy: lịch dự kiến từ ngày ${date} để lượt sau.`); break }
        const snapshot = new Map(routes.map((route) => [route.code, (templates.get(route.code) ?? []).map((template) => {
          const departureAt = vietnamIso(date, template.dep)
          const arrivalAt = vietnamIso(addDays(date, template.arrOffset), template.arr)
          return {
            external_id: `${route.code}:${date}:${template.trainNumber}`,
            train_number: template.trainNumber,
            departure_at: departureAt,
            arrival_at: arrivalAt,
            payload_hash: payloadHash({ routeCode: route.code, serviceDate: date, trainNumber: template.trainNumber, departureAt, arrivalAt, projected: true }),
          }
        })]))
        await applyDate(date, snapshot, true)
        markDate(date, { dsvn_open: false, projected_at: new Date().toISOString() })
        result.projectedDates += 1
      }
      log(`Lịch dự kiến (DSVN chưa mở bán): ${result.projectedDates} ngày, ${result.projectedDepartures} chuyến`)
    }

    const hasErrors = result.errors.length > 0
    result.status = !hasErrors ? 'succeeded' : result.completedSnapshots > 0 || result.fareDates > 0 ? 'partial' : 'failed'
  } catch (error) {
    result.status = 'failed'
    fail(error instanceof Error ? error.message : 'Unknown DSVN sync failure.')
  } finally {
    await browser?.close().catch(() => undefined)
  }

  if (stateUpdates.size) {
    const rows = [...stateUpdates.values()]
    for (let index = 0; index < rows.length; index += 200) {
      const { error } = await supabase.from('dsvn_sync_dates').upsert(rows.slice(index, index + 200), { onConflict: 'service_date' })
      if (error) fail(`Không lưu được trạng thái ngày: ${error.message}`)
    }
  }

  const { error: finishError } = await supabase
    .from('schedule_sync_runs')
    .update({
      status: result.status,
      requested_snapshots: result.requestedSnapshots,
      completed_snapshots: result.completedSnapshots,
      fetched_departures: result.fetchedDepartures,
      upserted_departures: result.upsertedDepartures,
      cancelled_departures: result.cancelledDepartures,
      draft_departures: result.draftDepartures,
      fare_dates: result.fareDates,
      fare_rows: result.fareRows,
      projected_departures: result.projectedDepartures,
      dsvn_horizon: result.dsvnHorizon,
      error_summary: result.errors.slice(0, 30).join('\n').slice(0, 8000) || null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', result.runId)
  if (finishError) throw new Error(`Sync completed but its log could not be updated: ${finishError.message}`)

  log(`Xong sau ${Math.round((Date.now() - startedAt) / 1000)} giây: ${result.status}`)
  return result
}
