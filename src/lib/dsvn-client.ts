/**
 * Violette Train Schedule Data — CLIENT-SAFE
 * Only includes routes between the 5 Violette bookable stations:
 * Hanoi, Ninh Binh, Dong Hoi, Hue, Da Nang.
 *
 * This file must NOT import 'fs' or 'path' — it is safe to import from client components.
 */

import type { TrainSchedule, SeatAvailability } from './types'
import { CABIN_PRODUCTS } from './cabin-products'

// ---------------------------------------------------------------------------
// Station definitions (5 bookable stations)
// ---------------------------------------------------------------------------
export interface Station {
  code: string
  nameVi: string
  nameEn: string
}

export const STATIONS: Record<string, Station> = {
  hanoi:    { code: 'HNO', nameVi: 'Hà Nội',       nameEn: 'Hanoi' },
  ninhbinh: { code: 'NBI', nameVi: 'Ninh Bình',     nameEn: 'Ninh Binh' },
  donghoi:  { code: 'DHO', nameVi: 'Đồng Hới',     nameEn: 'Dong Hoi' },
  hue:      { code: 'HUE', nameVi: 'Huế',           nameEn: 'Hue' },
  danang:   { code: 'DNA', nameVi: 'Đà Nẵng',       nameEn: 'Da Nang' },
}

export function getAllStations(): Station[] {
  return Object.values(STATIONS)
}

// ---------------------------------------------------------------------------
// Route definitions (10 routes between 5 stations)
// ---------------------------------------------------------------------------
export interface RouteInfo {
  id: string
  from: string
  to: string
  nameVi: string
  nameEn: string
  descriptionVi: string
  descriptionEn: string
  distance: string
  durationVi: string
  durationEn: string
  intermediateStopsVi: string[]
  intermediateStopsEn: string[]
}

export const ROUTES: Record<string, RouteInfo> = {
  'hanoi-ninhbinh': {
    id: 'hanoi-ninhbinh',
    from: 'hanoi',
    to: 'ninhbinh',
    nameVi: 'Hà Nội — Ninh Bình',
    nameEn: 'Hanoi — Ninh Binh',
    descriptionVi: 'Khám phá Di sản Thế giới Tràng An',
    descriptionEn: 'Explore UNESCO World Heritage Site Trang An',
    distance: '87 km',
    durationVi: '~2 tiếng',
    durationEn: '~2 hours',
    intermediateStopsVi: ['Phủ Lý', 'Nam Định'],
    intermediateStopsEn: ['Phu Ly', 'Nam Dinh'],
  },
  'hanoi-donghoi': {
    id: 'hanoi-donghoi',
    from: 'hanoi',
    to: 'donghoi',
    nameVi: 'Hà Nội — Đồng Hới (Phong Nha)',
    nameEn: 'Hanoi — Dong Hoi (Phong Nha)',
    descriptionVi: 'Cửa ngõ về phía hang động kỳ vĩ nhất Việt Nam',
    descriptionEn: "Vietnam's most spectacular cave system gateway",
    distance: '223 km',
    durationVi: '~6 tiếng',
    durationEn: '~6 hours',
    intermediateStopsVi: ['Thanh Hóa', 'Vinh'],
    intermediateStopsEn: ['Thanh Hoa', 'Vinh'],
  },
  'hanoi-hue': {
    id: 'hanoi-hue',
    from: 'hanoi',
    to: 'hue',
    nameVi: 'Hà Nội — Huế',
    nameEn: 'Hanoi — Hue',
    descriptionVi: 'Hành trình đến Cố đô kinh đô',
    descriptionEn: 'Journey to the former Imperial capital',
    distance: '658 km',
    durationVi: '~12 tiếng',
    durationEn: '~12 hours',
    intermediateStopsVi: ['Thanh Hóa', 'Vinh', 'Đồng Hới', 'Đông Hà', 'Quảng Trị'],
    intermediateStopsEn: ['Thanh Hoa', 'Vinh', 'Dong Hoi', 'Dong Ha', 'Quang Tri'],
  },
  'hanoi-danang': {
    id: 'hanoi-danang',
    from: 'hanoi',
    to: 'danang',
    nameVi: 'Hà Nội — Đà Nẵng',
    nameEn: 'Hanoi — Da Nang',
    descriptionVi: 'Tuyến ven biển dài nhất đến thành phố đáng sống',
    descriptionEn: "Longest coastal route to Vietnam's most livable city",
    distance: '791 km',
    durationVi: '~17 tiếng 30 phút',
    durationEn: '~17 hours 30 minutes',
    intermediateStopsVi: ['Thanh Hóa', 'Vinh', 'Đồng Hới', 'Đông Hà', 'Quảng Trị', 'Huế', 'Lăng Cô'],
    intermediateStopsEn: ['Thanh Hoa', 'Vinh', 'Dong Hoi', 'Dong Ha', 'Quang Tri', 'Hue', 'Lang Co'],
  },
  'ninhbinh-hue': {
    id: 'ninhbinh-hue',
    from: 'ninhbinh',
    to: 'hue',
    nameVi: 'Ninh Bình — Huế',
    nameEn: 'Ninh Binh — Hue',
    descriptionVi: 'Hành trình qua vùng duyên hải miền Trung',
    descriptionEn: 'Journey through the Central Vietnamese coast',
    distance: '571 km',
    durationVi: '~10 tiếng',
    durationEn: '~10 hours',
    intermediateStopsVi: ['Thanh Hóa', 'Vinh', 'Đồng Hới', 'Đông Hà', 'Quảng Trị'],
    intermediateStopsEn: ['Thanh Hoa', 'Vinh', 'Dong Hoi', 'Dong Ha', 'Quang Tri'],
  },
  'ninhbinh-danang': {
    id: 'ninhbinh-danang',
    from: 'ninhbinh',
    to: 'danang',
    nameVi: 'Ninh Bình — Đà Nẵng',
    nameEn: 'Ninh Binh — Da Nang',
    descriptionVi: 'Khám phá vẻ đẹp ven biển miền Trung',
    descriptionEn: 'Discover the coastal beauty of Central Vietnam',
    distance: '704 km',
    durationVi: '~15 tiếng',
    durationEn: '~15 hours',
    intermediateStopsVi: ['Thanh Hóa', 'Vinh', 'Đồng Hới', 'Đông Hà', 'Quảng Trị', 'Huế', 'Lăng Cô'],
    intermediateStopsEn: ['Thanh Hoa', 'Vinh', 'Dong Hoi', 'Dong Ha', 'Quang Tri', 'Hue', 'Lang Co'],
  },
  'donghoi-hue': {
    id: 'donghoi-hue',
    from: 'donghoi',
    to: 'hue',
    nameVi: 'Đồng Hới — Huế',
    nameEn: 'Dong Hoi — Hue',
    descriptionVi: 'Qua đèo Hải Vân và vùng đất cố đô',
    descriptionEn: 'Through Hai Van Pass to the Ancient Capital',
    distance: '210 km',
    durationVi: '~4 tiếng 30 phút',
    durationEn: '~4 hours 30 minutes',
    intermediateStopsVi: ['Quảng Trị', 'Đông Hà'],
    intermediateStopsEn: ['Quang Tri', 'Dong Ha'],
  },
  'donghoi-danang': {
    id: 'donghoi-danang',
    from: 'donghoi',
    to: 'danang',
    nameVi: 'Đồng Hới — Đà Nẵng',
    nameEn: 'Dong Hoi — Da Nang',
    descriptionVi: 'Khám phá hang động đến thành phố biển',
    descriptionEn: 'From spectacular caves to the beach city',
    distance: '343 km',
    durationVi: '~7 tiếng 30 phút',
    durationEn: '~7 hours 30 minutes',
    intermediateStopsVi: ['Quảng Trị', 'Đông Hà', 'Huế', 'Lăng Cô'],
    intermediateStopsEn: ['Quang Tri', 'Dong Ha', 'Hue', 'Lang Co'],
  },
  'hue-danang': {
    id: 'hue-danang',
    from: 'hue',
    to: 'danang',
    nameVi: 'Huế — Đà Nẵng',
    nameEn: 'Hue — Da Nang',
    descriptionVi: 'Qua đèo Hải Vân huyền thoại',
    descriptionEn: 'Through the legendary Hai Van Pass',
    distance: '103 km',
    durationVi: '~2 tiếng 30 phút',
    durationEn: '~2 hours 30 minutes',
    intermediateStopsVi: ['Lăng Cô'],
    intermediateStopsEn: ['Lang Co'],
  },
  'danang-hanoi': {
    id: 'danang-hanoi',
    from: 'danang',
    to: 'hanoi',
    nameVi: 'Đà Nẵng — Hà Nội',
    nameEn: 'Da Nang — Hanoi',
    descriptionVi: 'Tuyến ven biển từ thành phố đáng sống về thủ đô',
    descriptionEn: 'Coastal route from the most livable city back to the capital',
    distance: '791 km',
    durationVi: '~17 tiếng 30 phút',
    durationEn: '~17 hours 30 minutes',
    intermediateStopsVi: ['Lăng Cô', 'Huế', 'Quảng Trị', 'Đông Hà', 'Đồng Hới', 'Vinh', 'Thanh Hóa'],
    intermediateStopsEn: ['Lang Co', 'Hue', 'Quang Tri', 'Dong Ha', 'Dong Hoi', 'Vinh', 'Thanh Hoa'],
  },
}

// ---------------------------------------------------------------------------
// Station code mapping
// ---------------------------------------------------------------------------
export const ROUTE_CODE_TO_KEY: Record<string, string> = {
  HNO: 'hanoi',
  NBI: 'ninhbinh',
  DHO: 'donghoi',
  HUE: 'hue',
  DNA: 'danang',
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------
function makeSeats(
  stdAvail = 24,
  prmAvail = 8
): SeatAvailability[] {
  return [
    {
      seatClass: 'standard',
      seatClassVi: CABIN_PRODUCTS.standard.nameVi,
      seatClassEn: CABIN_PRODUCTS.standard.nameEn,
      price: CABIN_PRODUCTS.standard.ticketPrice,
      available: stdAvail,
    },
    {
      seatClass: 'premium',
      seatClassVi: CABIN_PRODUCTS.premium.nameVi,
      seatClassEn: CABIN_PRODUCTS.premium.nameEn,
      price: CABIN_PRODUCTS.premium.ticketPrice,
      available: prmAvail,
    },
  ]
}

// ---------------------------------------------------------------------------
// All schedules
// ---------------------------------------------------------------------------
const ALL_SCHEDULES: (TrainSchedule & { routeId: string })[] = [

  // ===================================================================
  // HANOI — DA NANG
  // ===================================================================
  {
    routeId: 'hanoi-danang',
    trainNumber: 'SE3',
    fromStation: 'Hà Nội',
    toStation: 'Đà Nẵng',
    departureTime: '19:00',
    arrivalTime: '12:30',
    duration: '17h 30m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(24, 10),
    hasLanding: true,
    hasRestaurant: true,
  },
  {
    routeId: 'hanoi-danang',
    trainNumber: 'SE1',
    fromStation: 'Hà Nội',
    toStation: 'Đà Nẵng',
    departureTime: '20:30',
    arrivalTime: '14:00',
    duration: '17h 30m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(16, 8),
    hasLanding: true,
    hasRestaurant: true,
  },

  // ===================================================================
  // DA NANG — DONG HOI
  // ===================================================================
  {
    routeId: 'donghoi-danang',
    trainNumber: 'SE19',
    fromStation: 'Đồng Hới',
    toStation: 'Đà Nẵng',
    departureTime: '04:00',
    arrivalTime: '11:30',
    duration: '7h 30m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(20, 8),
    hasLanding: false,
    hasRestaurant: true,
  },

  // ===================================================================
  // HANOI — LAO CAI (SAPA)
  // ===================================================================
  {
    routeId: 'hanoi-laocai',
    trainNumber: 'SE19',
    fromStation: 'Hà Nội',
    toStation: 'Lào Cai',
    departureTime: '22:00',
    arrivalTime: '06:30',
    duration: '8h 30m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(32, 12),
    hasLanding: true,
    hasRestaurant: true,
  },

  // ===================================================================
  // HANOI — NINH BINH
  // ===================================================================
  {
    routeId: 'hanoi-ninhbinh',
    trainNumber: 'SE5',
    fromStation: 'Hà Nội',
    toStation: 'Ninh Bình',
    departureTime: '07:45',
    arrivalTime: '09:45',
    duration: '2h 00m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(40, 16),
    hasLanding: false,
    hasRestaurant: false,
  },

  // ===================================================================
  // HANOI — HUE
  // ===================================================================
  {
    routeId: 'hanoi-hue',
    trainNumber: 'SE1',
    fromStation: 'Hà Nội',
    toStation: 'Huế',
    departureTime: '20:30',
    arrivalTime: '08:45',
    duration: '12h 15m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(28, 10),
    hasLanding: true,
    hasRestaurant: true,
  },

  // ===================================================================
  // HANOI — DONG HOI (PHONG NHA)
  // ===================================================================
  {
    routeId: 'hanoi-donghoi',
    trainNumber: 'SE3',
    fromStation: 'Hà Nội',
    toStation: 'Đồng Hới',
    departureTime: '19:00',
    arrivalTime: '01:00',
    duration: '6h 00m',
    departureDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    availableSeats: makeSeats(36, 14),
    hasLanding: false,
    hasRestaurant: true,
  },
]

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function isDepartureDay(days: string[], date: Date): boolean {
  const dayMap: Record<number, string> = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
  }
  return days.includes(dayMap[date.getDay()])
}

// ---------------------------------------------------------------------------
// Search schedules
// ---------------------------------------------------------------------------
/**
 * Search schedules by DSVN station codes: HNO, NBI, DHO, HUE, DNA
 */
export function searchSchedules(
  fromCode: string,
  toCode: string,
  date: string,
  locale: 'vi' | 'en' = 'vi'
): TrainSchedule[] {
  const fromKey = ROUTE_CODE_TO_KEY[fromCode.toUpperCase()] || fromCode.toLowerCase()
  const toKey = ROUTE_CODE_TO_KEY[toCode.toUpperCase()] || toCode.toLowerCase()
  const routeId = `${fromKey}-${toKey}`
  const reverseRouteId = `${toKey}-${fromKey}`
  const departureDate = new Date(date + 'T00:00:00')

  return ALL_SCHEDULES.filter((s) => {
    if (s.routeId !== routeId && s.routeId !== reverseRouteId) return false
    return isDepartureDay(s.departureDays, departureDate)
  })
}

/**
 * Get all schedules for a route (all days, no date filtering).
 */
export function getAllSchedulesForRoute(routeId: string): TrainSchedule[] {
  return ALL_SCHEDULES.filter((s) => s.routeId === routeId)
}

// ---------------------------------------------------------------------------
// Station graph (for multi-hop route finding)
// ---------------------------------------------------------------------------
function buildStationGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  function addEdge(a: string, b: string) {
    if (!graph.has(a)) graph.set(a, new Set())
    if (!graph.has(b)) graph.set(b, new Set())
    graph.get(a)!.add(b)
    graph.get(b)!.add(a)
  }

  for (const routeId of Object.keys(ROUTES)) {
    const [from, to] = routeId.split('-')
    if (from && to) addEdge(from, to)
  }

  for (const s of ALL_SCHEDULES) {
    addEdge(s.fromStation, s.toStation)
  }

  return graph
}

function findPath(from: string, to: string): string[] | null {
  const graph = buildStationGraph()
  if (!graph.has(from) || !graph.has(to)) return null
  if (from === to) return [from]

  const visited = new Set<string>()
  const queue: string[][] = [[from]]

  while (queue.length > 0) {
    const path = queue.shift()!
    const current = path[path.length - 1]
    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = graph.get(current)
    if (!neighbors) continue

    for (const neighbor of neighbors) {
      if (neighbor === to) return [...path, neighbor]
      if (!visited.has(neighbor)) {
        queue.push([...path, neighbor])
      }
    }
  }
  return null
}

export interface ItinerarySegment {
  fromStation: string
  toStation: string
  routeId: string
  schedule: TrainSchedule
}

export interface Itinerary {
  segments: ItinerarySegment[]
  totalDurationMinutes: number
  totalPriceStandard: number
  totalPricePremium: number
}

/**
 * Find schedules between any two stations (direct or multi-hop).
 * Returns a list of itinerary options, each with one or more segments.
 */
export function findItineraries(
  fromCode: string,
  toCode: string,
  date: string,
  locale: 'vi' | 'en' = 'vi'
): Itinerary[] {
  const fromKey = ROUTE_CODE_TO_KEY[fromCode.toUpperCase()]
  const toKey = ROUTE_CODE_TO_KEY[toCode.toUpperCase()]

  if (!fromKey || !toKey) return []
  if (fromKey === toKey) return []

  const path = findPath(fromKey, toKey)
  if (!path) return []

  const departureDate = new Date(date + 'T00:00:00')
  const segments: ItinerarySegment[] = []

  for (let i = 0; i < path.length - 1; i++) {
    const segFrom = path[i]
    const segTo = path[i + 1]
    const routeId = `${segFrom}-${segTo}`
    const reverseRouteId = `${segTo}-${segFrom}`

    const schedules = ALL_SCHEDULES.filter((s) => {
      const matches =
        (s.routeId === routeId || s.routeId === reverseRouteId) &&
        isDepartureDay(s.departureDays, departureDate)
      return matches
    })

    if (schedules.length === 0) return []

    const schedule = schedules[0]
    const fromStation = STATIONS[segFrom]
    const toStation = STATIONS[segTo]

    if (!fromStation || !toStation) return []

    segments.push({
      fromStation: locale === 'vi' ? fromStation.nameVi : fromStation.nameEn,
      toStation: locale === 'vi' ? toStation.nameVi : toStation.nameEn,
      routeId,
      schedule,
    })
  }

  let totalDurationMinutes = 0
  let totalPriceStandard = 0
  let totalPricePremium = 0

  for (const seg of segments) {
    const parts = seg.schedule.duration.split(/[h ]/)
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]?.replace('m', '') || '0')
    totalDurationMinutes += hours * 60 + minutes

    const std = seg.schedule.availableSeats.find((s) => s.seatClass === 'standard')
    const prm = seg.schedule.availableSeats.find((s) => s.seatClass === 'premium')
    if (std) totalPriceStandard += std.price
    if (prm) totalPricePremium += prm.price
  }

  return [{ segments, totalDurationMinutes, totalPriceStandard, totalPricePremium }]
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
export interface RoutePricing {
  seatClass: string
  seatClassVi: string
  seatClassEn: string
  basePrice: number
  peakPrice: number
}

export function getRoutePricing(fromCode: string, toCode: string): RoutePricing[] {
  const fromKey = ROUTE_CODE_TO_KEY[fromCode.toUpperCase()] || fromCode.toLowerCase()
  const toKey = ROUTE_CODE_TO_KEY[toCode.toUpperCase()] || toCode.toLowerCase()
  const routeId = `${fromKey}-${toKey}`

  const schedules = ALL_SCHEDULES.filter((s) => s.routeId === routeId)
  if (schedules.length === 0) {
    return getFallbackPricing(routeId)
  }

  const first = schedules[0]
  const stdPrice = first.availableSeats.find((s) => s.seatClass === 'standard')?.price || 0
  const prmPrice = first.availableSeats.find((s) => s.seatClass === 'premium')?.price || 0

  return [
    {
      seatClass: 'standard',
      seatClassVi: CABIN_PRODUCTS.standard.nameVi,
      seatClassEn: CABIN_PRODUCTS.standard.nameEn,
      basePrice: stdPrice,
      peakPrice: stdPrice,
    },
    {
      seatClass: 'premium',
      seatClassVi: CABIN_PRODUCTS.premium.nameVi,
      seatClassEn: CABIN_PRODUCTS.premium.nameEn,
      basePrice: prmPrice,
      peakPrice: prmPrice,
    },
  ]
}

function getFallbackPricing(_routeId: string): RoutePricing[] {
  return [
    {
      seatClass: 'standard',
      seatClassVi: CABIN_PRODUCTS.standard.nameVi,
      seatClassEn: CABIN_PRODUCTS.standard.nameEn,
      basePrice: CABIN_PRODUCTS.standard.ticketPrice,
      peakPrice: CABIN_PRODUCTS.standard.ticketPrice,
    },
    {
      seatClass: 'premium',
      seatClassVi: CABIN_PRODUCTS.premium.nameVi,
      seatClassEn: CABIN_PRODUCTS.premium.nameEn,
      basePrice: CABIN_PRODUCTS.premium.ticketPrice,
      peakPrice: CABIN_PRODUCTS.premium.ticketPrice,
    },
  ]
}

// ---------------------------------------------------------------------------
// News (client-safe fallback)
// ---------------------------------------------------------------------------
export interface NewsItem {
  id: string
  title: string
  titleEn: string
  excerpt: string
  excerptEn: string
  content: string
  category: 'news' | 'policy' | 'announcement'
  publishedAt: string
  updatedAt?: string
}

export const FALLBACK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Lịch nghỉ Tết Nguyên Đán 2026',
    titleEn: 'Tet Holiday Schedule 2026',
    excerpt: 'Thông báo lịch nghỉ Tết Nguyên Đán và các chuyến tàu đặc biệt trong dịp lễ.',
    excerptEn: 'Tet Holiday schedule and special trains during the festive season.',
    content: '',
    category: 'announcement',
    publishedAt: '2026-01-15',
  },
  {
    id: '2',
    title: 'Cập nhật lịch tàu mùa hè 2026',
    titleEn: 'Summer 2026 Schedule Update',
    excerpt: 'Lịch tàu mùa hè 2026 với nhiều chuyến tàu mới và giờ khởi hành điều chỉnh.',
    excerptEn: 'Summer 2026 train schedule with new trips and adjusted departure times.',
    content: '',
    category: 'news',
    publishedAt: '2026-03-01',
  },
  {
    id: '3',
    title: 'Chính sách đổi vé linh hoạt mới',
    titleEn: 'New Flexible Ticket Exchange Policy',
    excerpt: 'Violette Train ra mắt chính sách đổi vé linh hoạt, hỗ trợ hành khách tối đa.',
    excerptEn: 'Violette Train launches flexible ticket exchange policy to support passengers.',
    content: '',
    category: 'policy',
    publishedAt: '2026-02-20',
  },
  {
    id: '4',
    title: 'Mở bán vé tàu mùa cao điểm Tết 2026',
    titleEn: 'Open Sales for Tet 2026 Peak Season',
    excerpt: 'Vé tàu Tết 2026 đã chính thức mở bán. Đặt vé sớm để có chỗ tốt nhất.',
    excerptEn: 'Tet 2026 train tickets are now on sale. Book early for the best seats.',
    content: '',
    category: 'announcement',
    publishedAt: '2025-12-01',
  },
  {
    id: '5',
    title: 'Nâng cấp dịch vụ nhà hàng trên tàu',
    titleEn: 'Onboard Restaurant Service Upgrade',
    excerpt: 'Thực đơn nhà hàng trên tàu Violette được nâng cấp với nhiều món ăn đặc sản địa phương.',
    excerptEn: 'Violette onboard restaurant menu upgraded with more local specialties.',
    content: '',
    category: 'news',
    publishedAt: '2026-01-20',
  },
]
