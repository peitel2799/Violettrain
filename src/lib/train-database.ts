import trainDatabaseJson from '../../data/train-database.json'
import { CABIN_PRODUCTS, type CabinProductId } from './cabin-products'
import type { DsvnSchedule } from './types'

type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface TrainStationRecord {
  id: string
  code: string
  nameVi: string
  nameEn: string
  kmFromHanoi: number
  orderFromHanoi: number
}

export interface TrainRouteRecord {
  id: string
  code: string
  from: string
  to: string
  distanceKm: number
  baseFareVnd: number
  fareSource: string
}

interface TrainStopRecord {
  stationId: string
  time: string
  dayOffset: number
}

interface TrainServiceRecord {
  trainNumber: string
  direction: 'southbound' | 'northbound'
  operatingDays: DayCode[]
  stops: TrainStopRecord[]
}

interface TrainDatabase {
  schemaVersion: number
  source: {
    name: string
    url: string
    verifiedOn: string
    timezone: string
    scope: string
    notes: string
  }
  cabinPriceFactors: Record<CabinProductId, number>
  stations: TrainStationRecord[]
  routes: TrainRouteRecord[]
  services: TrainServiceRecord[]
}

const database = trainDatabaseJson as TrainDatabase

export const TRAIN_DATABASE_SOURCE = database.source
export const TRAIN_STATIONS = database.stations
export const TRAIN_ROUTES = database.routes

const stationById = new Map(TRAIN_STATIONS.map((station) => [station.id, station]))
const stationIdByCode = new Map(
  TRAIN_STATIONS.map((station) => [station.code.toUpperCase(), station.id])
)

function resolveStationId(value: string): string | undefined {
  const normalized = value.trim()
  return stationIdByCode.get(normalized.toUpperCase())
    ?? stationById.get(normalized.toLowerCase())?.id
}

export function getTrainStation(value: string): TrainStationRecord | undefined {
  const stationId = resolveStationId(value)
  return stationId ? stationById.get(stationId) : undefined
}

export function getTrainRoute(from: string, to: string): TrainRouteRecord | undefined {
  const fromId = resolveStationId(from)
  const toId = resolveStationId(to)
  if (!fromId || !toId || fromId === toId) return undefined

  return TRAIN_ROUTES.find((route) =>
    (route.from === fromId && route.to === toId)
    || (route.from === toId && route.to === fromId)
  )
}

export function getTrainRouteById(routeId: string): TrainRouteRecord | undefined {
  const normalized = routeId.toLowerCase()
  return TRAIN_ROUTES.find((route) =>
    route.id === normalized || route.code.toLowerCase() === normalized
  )
}

export function getRouteFare(
  from: string,
  to: string,
  cabinClassId: CabinProductId = 'standard'
): number | undefined {
  const route = getTrainRoute(from, to)
  if (!route) return undefined
  return Math.round(route.baseFareVnd * database.cabinPriceFactors[cabinClassId])
}

export function getRouteFareById(
  routeId: string,
  cabinClassId: CabinProductId = 'standard'
): number | undefined {
  const route = getTrainRouteById(routeId)
  if (!route) return undefined
  return Math.round(route.baseFareVnd * database.cabinPriceFactors[cabinClassId])
}

export function getLowestRouteFare(cabinClassId: CabinProductId = 'standard'): number {
  return Math.min(
    ...TRAIN_ROUTES.map((route) =>
      Math.round(route.baseFareVnd * database.cabinPriceFactors[cabinClassId])
    )
  )
}

function minutesAtStop(stop: TrainStopRecord): number {
  const [hours, minutes] = stop.time.split(':').map(Number)
  return stop.dayOffset * 24 * 60 + hours * 60 + minutes
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function dayCodeForDeparture(date: string, originDayOffset: number): DayCode | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const departureDate = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(departureDate.getTime())) return undefined
  departureDate.setUTCDate(departureDate.getUTCDate() - originDayOffset)
  const codes: DayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return codes[departureDate.getUTCDay()]
}

function schedulesForRoute(
  fromId: string,
  toId: string,
  date: string,
  locale: 'vi' | 'en'
): DsvnSchedule[] {
  const fromStation = stationById.get(fromId)
  const toStation = stationById.get(toId)
  const route = getTrainRoute(fromId, toId)
  if (!fromStation || !toStation || !route) return []

  return database.services.flatMap((service) => {
    const fromIndex = service.stops.findIndex((stop) => stop.stationId === fromId)
    const toIndex = service.stops.findIndex((stop) => stop.stationId === toId)
    if (fromIndex < 0 || toIndex <= fromIndex) return []

    const fromStop = service.stops[fromIndex]
    const toStop = service.stops[toIndex]
    const serviceDay = dayCodeForDeparture(date, fromStop.dayOffset)
    if (!serviceDay || !service.operatingDays.includes(serviceDay)) return []

    const standardPrice = getRouteFare(fromId, toId, 'standard')
    const premiumPrice = getRouteFare(fromId, toId, 'premium')
    if (!standardPrice || !premiumPrice) return []

    return [{
      scheduleId: `${service.trainNumber}-${fromStation.code}-${toStation.code}`,
      trainNumber: service.trainNumber,
      fromStation: locale === 'vi' ? fromStation.nameVi : fromStation.nameEn,
      toStation: locale === 'vi' ? toStation.nameVi : toStation.nameEn,
      departureTime: fromStop.time,
      arrivalTime: toStop.time,
      arrivalDayOffset: toStop.dayOffset - fromStop.dayOffset,
      duration: formatDuration(minutesAtStop(toStop) - minutesAtStop(fromStop)),
      departureDays: [...service.operatingDays],
      availableSeats: [
        {
          seatClass: 'standard',
          seatClassVi: CABIN_PRODUCTS.standard.nameVi,
          seatClassEn: CABIN_PRODUCTS.standard.nameEn,
          price: standardPrice,
          available: null,
        },
        {
          seatClass: 'premium',
          seatClassVi: CABIN_PRODUCTS.premium.nameVi,
          seatClassEn: CABIN_PRODUCTS.premium.nameEn,
          price: premiumPrice,
          available: null,
        },
      ],
      hasLanding: true,
      hasRestaurant: false,
      sourceName: TRAIN_DATABASE_SOURCE.name,
      sourceUrl: TRAIN_DATABASE_SOURCE.url,
      sourceVerifiedOn: TRAIN_DATABASE_SOURCE.verifiedOn,
    }]
  }).sort((a, b) => a.departureTime.localeCompare(b.departureTime))
}

/** Search the versioned DSVN timetable snapshot by station code or station id. */
export function searchSchedules(
  from: string,
  to: string,
  date: string,
  locale: 'vi' | 'en' = 'vi'
): DsvnSchedule[] {
  const fromId = resolveStationId(from)
  const toId = resolveStationId(to)
  if (!fromId || !toId || fromId === toId) return []
  return schedulesForRoute(fromId, toId, date, locale)
}

export function getAllSchedulesForRoute(routeId: string): DsvnSchedule[] {
  const route = getTrainRouteById(routeId)
  if (!route) return []
  return schedulesForRoute(route.from, route.to, '2026-09-06', 'vi')
}

export interface RoutePricing {
  seatClass: CabinProductId
  seatClassVi: string
  seatClassEn: string
  basePrice: number
  peakPrice: number
}

export function getRoutePricing(from: string, to: string): RoutePricing[] {
  const standardPrice = getRouteFare(from, to, 'standard')
  const premiumPrice = getRouteFare(from, to, 'premium')
  if (!standardPrice || !premiumPrice) return []

  return [
    {
      seatClass: 'standard',
      seatClassVi: CABIN_PRODUCTS.standard.nameVi,
      seatClassEn: CABIN_PRODUCTS.standard.nameEn,
      basePrice: standardPrice,
      peakPrice: standardPrice,
    },
    {
      seatClass: 'premium',
      seatClassVi: CABIN_PRODUCTS.premium.nameVi,
      seatClassEn: CABIN_PRODUCTS.premium.nameEn,
      basePrice: premiumPrice,
      peakPrice: premiumPrice,
    },
  ]
}

export interface RouteScheduleSummary {
  departureTime: string
  arrivalTime: string
  duration: string
}

export function getRouteScheduleSummary(from: string, to: string): RouteScheduleSummary {
  const schedules = searchSchedules(from, to, '2026-09-06', 'vi')
  if (schedules.length === 0) {
    return { departureTime: '', arrivalTime: '', duration: '' }
  }

  const durations = schedules.map((schedule) => {
    const match = schedule.duration.match(/^(\d+)h(?: (\d+)m)?$/)
    return match ? Number(match[1]) * 60 + Number(match[2] ?? 0) : 0
  }).filter(Boolean)
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)

  return {
    departureTime: schedules.map((schedule) => schedule.departureTime).join(' / '),
    arrivalTime: schedules.map((schedule) =>
      `${schedule.arrivalTime}${schedule.arrivalDayOffset ? ` (+${schedule.arrivalDayOffset})` : ''}`
    ).join(' / '),
    duration: minDuration === maxDuration
      ? formatDuration(minDuration)
      : `${formatDuration(minDuration)}–${formatDuration(maxDuration)}`,
  }
}
