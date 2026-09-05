/**
 * Violette Train Schedule Data — CLIENT-SAFE
 * Only includes routes between the 5 Violette bookable stations:
 * Hanoi, Ninh Binh, Dong Hoi, Hue, Da Nang.
 *
 * This file must NOT import 'fs' or 'path' — it is safe to import from client components.
 */

export {
  TRAIN_DATABASE_SOURCE,
  TRAIN_ROUTES,
  TRAIN_STATIONS,
  getAllSchedulesForRoute,
  getLowestRouteFare,
  getRouteFare,
  getRoutePricing,
  getRouteScheduleSummary,
  getTrainRoute,
  getTrainRouteById,
  getTrainStation,
  searchSchedules,
  type RoutePricing,
  type RouteScheduleSummary,
  type TrainRouteRecord,
  type TrainStationRecord,
} from './train-database'

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
    distance: '115 km',
    durationVi: '2 giờ 16–18 phút',
    durationEn: '2h 16–18m',
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
    distance: '522 km',
    durationVi: '9 giờ 37 phút–10 giờ 57 phút',
    durationEn: '9h 37m–10h 57m',
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
    distance: '688 km',
    durationVi: '12 giờ 35 phút–14 giờ 12 phút',
    durationEn: '12h 35m–14h 12m',
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
    durationVi: '15 giờ 23 phút–17 giờ 03 phút',
    durationEn: '15h 23m–17h 03m',
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
    distance: '573 km',
    durationVi: '10 giờ 19 phút–11 giờ 55 phút',
    durationEn: '10h 19m–11h 55m',
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
    distance: '676 km',
    durationVi: '13 giờ 07 phút–14 giờ 46 phút',
    durationEn: '13h 07m–14h 46m',
    intermediateStopsVi: ['Thanh Hóa', 'Vinh', 'Đồng Hới', 'Đông Hà', 'Quảng Trị', 'Huế', 'Lăng Cô'],
    intermediateStopsEn: ['Thanh Hoa', 'Vinh', 'Dong Hoi', 'Dong Ha', 'Quang Tri', 'Hue', 'Lang Co'],
  },
  'donghoi-hue': {
    id: 'donghoi-hue',
    from: 'donghoi',
    to: 'hue',
    nameVi: 'Đồng Hới — Huế',
    nameEn: 'Dong Hoi — Hue',
    descriptionVi: 'Hành trình ngắn qua Đông Hà đến Cố đô',
    descriptionEn: 'A short journey via Dong Ha to the Imperial capital',
    distance: '166 km',
    durationVi: '2 giờ 57 phút–3 giờ 29 phút',
    durationEn: '2h 57m–3h 29m',
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
    distance: '269 km',
    durationVi: '5 giờ 46 phút–6 giờ 25 phút',
    durationEn: '5h 46m–6h 25m',
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
    durationVi: '2 giờ 47 phút–2 giờ 59 phút',
    durationEn: '2h 47m–2h 59m',
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
    durationVi: '16 giờ 08 phút–18 giờ 41 phút',
    durationEn: '16h 08m–18h 41m',
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
