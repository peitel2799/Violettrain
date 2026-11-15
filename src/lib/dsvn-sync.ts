import 'server-only'

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import chromium from '@sparticuz/chromium'
import { chromium as playwright } from 'playwright-core'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

const DSVN_TIMETABLE_URL = 'https://giotaugiave.dsvn.vn/'
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const SNAPSHOT_CONCURRENCY = 4
const LOCAL_CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

const STATION_NAME_BY_CODE: Record<string, string> = {
  HNO: 'Hà Nội',
  NBI: 'Ninh Bình',
  DHO: 'Đồng Hới',
  HUE: 'Huế',
  DNA: 'Đà Nẵng',
}

type SyncTrigger = 'cron' | 'manual'
type TimetableDirection = { headers: string[]; rows: string[][] }
type CrawledTimetable = { sourceUrl: string; directions: TimetableDirection[] }

type RouteRow = {
  code: string
  from_station: { code: string } | Array<{ code: string }>
  to_station: { code: string } | Array<{ code: string }>
}

type NormalizedDeparture = {
  external_id: string
  train_number: string
  departure_at: string
  arrival_at: string
  payload_hash: string
}

type SnapshotResult = {
  upserted: number
  cancelled: number
  draftWithoutFare: number
}

type SnapshotBatchResult =
  | { error: string }
  | { departures: number; applied: SnapshotResult }

export type DsvnSyncResult = {
  runId: number
  status: 'succeeded' | 'partial' | 'failed'
  requestedSnapshots: number
  completedSnapshots: number
  fetchedDepartures: number
  upsertedDepartures: number
  cancelledDepartures: number
  draftDepartures: number
  errors: string[]
}

function vietnamDate(daysFromToday = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  const date = new Date(Date.UTC(year, month - 1, day + daysFromToday))
  return date.toISOString().slice(0, 10)
}

function stationCode(value: RouteRow['from_station']) {
  return (Array.isArray(value) ? value[0]?.code : value?.code) ?? ''
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

/**
 * Parses a timetable cell. DSVN has used "21:45 (ngày +1)" and, since late 2026,
 * "00:03+1". A dash or empty cell means the train does not stop there.
 */
export function parseTimetableTime(value: string) {
  const time = value.match(/(\d{1,2}):(\d{2})/)
  if (!time) return null
  const offset = value.match(/ngày\s*\+\s*(\d+)/i) ?? value.match(/\d{1,2}:\d{2}\s*\(?\s*\+\s*(\d+)/)
  return {
    time: `${time[1].padStart(2, '0')}:${time[2]}:00`,
    dayOffset: offset ? Number(offset[1]) : 0,
  }
}

const TRAIN_NUMBER = /^[A-Z]{1,4}\d{1,4}[A-Z]?$/i

/** Station header is "Tên Ga" (old) or "Ga" (current); train columns are detected by their header. */
export function isTimetableTable(rows: string[][]) {
  const header = rows[0] ?? []
  return /^(tên\s+)?ga$/i.test(header[0]?.trim() ?? '') && header.some((cell) => TRAIN_NUMBER.test(cell.trim()))
}

export function trainColumns(header: string[]) {
  return header
    .map((cell, index) => ({ trainNumber: cell.trim().toUpperCase(), index }))
    .filter((column) => column.index > 0 && TRAIN_NUMBER.test(column.trainNumber))
}

function normalizeName(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('vi')
}

function vietnamIso(date: string, time: string) {
  const parsed = new Date(`${date}T${time}+07:00`)
  if (Number.isNaN(parsed.getTime())) throw new Error('DSVN returned an invalid timetable value.')
  return parsed.toISOString()
}

async function resolveChromeExecutable() {
  const configuredPath = process.env.DSVN_CHROME_EXECUTABLE_PATH?.trim()
  if (configuredPath) {
    if (!existsSync(configuredPath)) throw new Error('DSVN_CHROME_EXECUTABLE_PATH does not exist.')
    return configuredPath
  }
  const localPath = LOCAL_CHROME_PATHS.find((candidate) => existsSync(candidate))
  if (localPath) return localPath
  return chromium.executablePath()
}

async function crawlDsvnTimetable(): Promise<CrawledTimetable> {
  const sourceUrl = process.env.DSVN_TIMETABLE_URL?.trim() || DSVN_TIMETABLE_URL
  const executablePath = await resolveChromeExecutable()
  const usesLocalChrome = LOCAL_CHROME_PATHS.includes(executablePath) || Boolean(process.env.DSVN_CHROME_EXECUTABLE_PATH)
  const browser = await playwright.launch({
    executablePath,
    headless: true,
    args: usesLocalChrome
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : chromium.args,
  })

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await page.route('**/*', async (route) => {
      if (['image', 'media', 'font'].includes(route.request().resourceType())) await route.abort()
      else await route.continue()
    })
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForSelector('table', { timeout: 20_000 })

    const directions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table'))
        .map((table) => Array.from(table.querySelectorAll('tr')).map((row) =>
          Array.from(row.querySelectorAll('th,td')).map((cell) =>
            (cell.textContent ?? '').replace(/\s+/g, ' ').trim()
          )
        ))
    )
      // Filtering happens in Node so the header rules live in one tested helper.
      .then((tables) => tables
        .filter(isTimetableTable)
        .map((rows) => ({ headers: rows[0], rows: rows.slice(1) })))

    if (directions.length < 2) {
      throw new Error('DSVN timetable tables were not found. The source page structure may have changed.')
    }
    return { sourceUrl, directions }
  } finally {
    await browser.close()
  }
}

function departuresForRoute(
  timetable: CrawledTimetable,
  routeCode: string,
  fromCode: string,
  toCode: string,
  serviceDate: string
) {
  const fromName = STATION_NAME_BY_CODE[fromCode]
  const toName = STATION_NAME_BY_CODE[toCode]
  if (!fromName || !toName) throw new Error(`Crawler has no station mapping for ${fromCode} or ${toCode}.`)

  for (const direction of timetable.directions) {
    const fromIndex = direction.rows.findIndex((row) => normalizeName(row[0] ?? '') === normalizeName(fromName))
    const toIndex = direction.rows.findIndex((row) => normalizeName(row[0] ?? '') === normalizeName(toName))
    if (fromIndex < 0 || toIndex <= fromIndex) continue

    const fromRow = direction.rows[fromIndex]
    const toRow = direction.rows[toIndex]
    return trainColumns(direction.headers).flatMap(({ trainNumber, index }) => {
      const departure = parseTimetableTime(fromRow[index] ?? '')
      const arrival = parseTimetableTime(toRow[index] ?? '')
      if (!departure || !arrival) return []

      const arrivalOffset = Math.max(0, arrival.dayOffset - departure.dayOffset)
      const departureAt = vietnamIso(serviceDate, departure.time)
      let arrivalAt = vietnamIso(addDays(serviceDate, arrivalOffset), arrival.time)
      if (new Date(arrivalAt) <= new Date(departureAt)) {
        arrivalAt = vietnamIso(addDays(serviceDate, arrivalOffset + 1), arrival.time)
      }
      const normalized = { routeCode, serviceDate, trainNumber, departureAt, arrivalAt }
      return [{
        external_id: `${routeCode}:${serviceDate}:${trainNumber}`,
        train_number: trainNumber.toUpperCase(),
        departure_at: departureAt,
        arrival_at: arrivalAt,
        payload_hash: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
      } satisfies NormalizedDeparture]
    })
  }

  throw new Error(`Route ${routeCode} was not found in the crawled DSVN timetable.`)
}

export function getDsvnSyncConfiguration() {
  return {
    configured: true,
    sourceUrl: process.env.DSVN_TIMETABLE_URL?.trim() || DSVN_TIMETABLE_URL,
    method: 'browser-crawl' as const,
    defaultDays: Math.min(Math.max(Number(process.env.DSVN_SYNC_DAYS) || 7, 1), 31),
    timezone: VIETNAM_TIME_ZONE,
  }
}

export async function runDsvnScheduleSync(trigger: SyncTrigger, requestedDays?: number): Promise<DsvnSyncResult> {
  const config = getDsvnSyncConfiguration()
  const days = Math.min(Math.max(requestedDays ?? config.defaultDays, 1), 31)
  const windowStart = vietnamDate(0)
  const windowEnd = vietnamDate(days - 1)
  const supabase = createSupabaseServiceClient()

  const { data: routes, error: routesError } = await supabase
    .from('routes')
    .select('code, from_station:stations!routes_from_station_id_fkey(code), to_station:stations!routes_to_station_id_fkey(code)')
    .eq('active', true)
    .order('code')
  if (routesError) throw new Error(`Cannot load active routes: ${routesError.message}`)

  const routeRows = routes as unknown as RouteRow[]
  const requestedSnapshots = routeRows.length * days
  const { data: run, error: runError } = await supabase
    .from('schedule_sync_runs')
    .insert({
      source: 'dsvn',
      trigger_type: trigger,
      window_start: windowStart,
      window_end: windowEnd,
      requested_snapshots: requestedSnapshots,
    })
    .select('id')
    .single()
  if (runError || !run) throw new Error(`Cannot create sync run: ${runError?.message ?? 'unknown error'}`)

  const result: DsvnSyncResult = {
    runId: Number(run.id),
    status: 'succeeded',
    requestedSnapshots,
    completedSnapshots: 0,
    fetchedDepartures: 0,
    upsertedDepartures: 0,
    cancelledDepartures: 0,
    draftDepartures: 0,
    errors: [],
  }

  try {
    const timetable = await crawlDsvnTimetable()
    const snapshots = routeRows.flatMap((route) =>
      Array.from({ length: days }, (_, day) => ({
        route,
        serviceDate: addDays(windowStart, day),
      }))
    )

    for (let index = 0; index < snapshots.length; index += SNAPSHOT_CONCURRENCY) {
      const batch = snapshots.slice(index, index + SNAPSHOT_CONCURRENCY)
      const batchResults = await Promise.all(batch.map(async ({ route, serviceDate }): Promise<SnapshotBatchResult> => {
        try {
          const departures = departuresForRoute(
            timetable,
            route.code,
            stationCode(route.from_station),
            stationCode(route.to_station),
            serviceDate
          )
          const { data, error } = await supabase.rpc('apply_dsvn_route_snapshot', {
            p_route_code: route.code,
            p_service_date: serviceDate,
            p_departures: departures,
          })
          if (error) throw new Error(error.message)

          return {
            departures: departures.length,
            applied: data as SnapshotResult,
          }
        } catch (error) {
          return {
            error: `${route.code} ${serviceDate}: ${error instanceof Error ? error.message : 'Unknown snapshot error.'}`,
          }
        }
      }))

      for (const batchResult of batchResults) {
        if ('error' in batchResult) {
          result.errors.push(batchResult.error)
          continue
        }
        result.completedSnapshots += 1
        result.fetchedDepartures += batchResult.departures
        result.upsertedDepartures += Number(batchResult.applied.upserted) || 0
        result.cancelledDepartures += Number(batchResult.applied.cancelled) || 0
        result.draftDepartures += Number(batchResult.applied.draftWithoutFare) || 0
      }
    }
    result.status = result.errors.length === 0
      ? 'succeeded'
      : result.completedSnapshots > 0 ? 'partial' : 'failed'
  } catch (error) {
    result.status = 'failed'
    result.errors.push(error instanceof Error ? error.message : 'Unknown crawler failure.')
  }

  const { error: finishError } = await supabase
    .from('schedule_sync_runs')
    .update({
      status: result.status,
      completed_snapshots: result.completedSnapshots,
      fetched_departures: result.fetchedDepartures,
      upserted_departures: result.upsertedDepartures,
      cancelled_departures: result.cancelledDepartures,
      draft_departures: result.draftDepartures,
      error_summary: result.errors.slice(0, 20).join('\n').slice(0, 8000) || null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', result.runId)
  if (finishError) throw new Error(`Sync completed but its log could not be updated: ${finishError.message}`)

  return result
}
