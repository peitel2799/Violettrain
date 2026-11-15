export const CABIN_PRODUCTS = {
  standard: {
    id: 'standard',
    nameVi: 'Full Cabin (4 giường)',
    nameEn: 'Full Cabin (4 Berths)',
    shortNameVi: 'Full Cabin',
    shortNameEn: 'Full Cabin',
    ticketPrice: 2_000_000,
    maxGuests: 4,
    pushUpBeds: false,
    privateCabinTickets: 4,
    roomCount: null,
  },
  premium: {
    id: 'premium',
    nameVi: 'VIP 2',
    nameEn: 'VIP 2',
    shortNameVi: 'VIP 2',
    shortNameEn: 'VIP 2',
    ticketPrice: 4_000_000,
    maxGuests: 4,
    pushUpBeds: true,
    privateCabinTickets: 4,
    roomCount: 1,
  },
} as const

export type CabinProductId = keyof typeof CABIN_PRODUCTS
