export interface Route {
  id: string
  from: string
  to: string
  fromStation: string
  toStation: string
  duration: string
  departureDays: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  departureTime: string
  arrivalTime: string
  basePrice: number
}

export interface CabinConfig {
  /** Max passengers for this configuration */
  maxPax: number
  /** Description key for this configuration */
  descKey: string
  /** Price multiplier relative to base cabin price */
  priceMultiplier: number
}

export interface CabinClass {
  id: string
  name: string
  abbr: string
  taglineKey: string
  descKey: string
  /** Base capacity (max beds in room) */
  maxBeds: number
  /** Whether bunk beds can be pushed up to create seating space */
  pushUpBeds: boolean
  amenities: string[]
  images: string[]
  /** Base price factor (used when no config specified) */
  priceFactor: number
  /** Current public price for one passenger ticket */
  ticketPrice: number
  /** Number of physical rooms available for this product, when fixed */
  roomCount?: number
  /** Available passenger configurations */
  configs: CabinConfig[]
}

export type NewsCategory = 'news' | 'policy' | 'announcement' | 'travel' | 'tips' | 'culture' | 'food' | 'testimonial'

export interface BlogPost {
  id: string
  slug: string
  category: NewsCategory
  title: string
  titleEn: string
  excerpt: string
  excerptEn: string
  content: string
  coverImage: string
  author: string
  publishedAt: string
  readTime: number
  featured: boolean
}

export interface Testimonial {
  id: string
  name: string
  title: string
  quote: string
  avatar: string
}

export interface DsvnSeatAvailability {
  seatClass: string
  seatClassVi: string
  seatClassEn: string
  price: number
  /** Null when DSVN publishes a timetable but no live inventory for this request. */
  available: number | null
}

/** Alias for DsvnSeatAvailability — used by schedule data */
export type SeatAvailability = DsvnSeatAvailability

export interface DsvnSchedule {
  scheduleId?: string
  trainNumber: string
  fromStation: string
  toStation: string
  departureTime: string
  arrivalTime: string
  /** Number of calendar days after departure; 1 means arrival is the next day. */
  arrivalDayOffset?: number
  duration: string
  departureDays: string[]
  availableSeats: SeatAvailability[]
  hasLanding: boolean
  hasRestaurant: boolean
  sourceName?: string
  sourceUrl?: string
  sourceVerifiedOn?: string
  stops?: Stop[]
}

export interface Stop {
  station: string
  stationNameVi: string
  stationNameEn: string
  arrivalTime: string
  departureTime: string
}

/** Alias for DsvnSchedule — used by schedule data */
export type TrainSchedule = DsvnSchedule

export interface BookingPassenger {
  type: 'adult' | 'child'
  fullName: string
  email: string
  phone: string
  dateOfBirth?: string
  specialRequests?: string
  gender?: 'male' | 'female' | 'other'
}

export interface BookingState {
  step: 1 | 2 | 3 | 4 | 5
  routeId: string
  isRoundTrip: boolean
  departureDate: string
  returnDate?: string
  cabinClassId: string
  selectedSchedule?: DsvnSchedule
  passengers: BookingPassenger[]
  bookingRef?: string
}

export type BookingStep = 'select' | 'schedule' | 'passenger' | 'confirmation'

export interface TicketRefundPolicy {
  timeframeVi: string
  timeframeEn: string
  feePercent: number
  notesVi: string
  notesEn: string
}
