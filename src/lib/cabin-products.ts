export const CABIN_PRODUCTS = {
  standard: {
    id: 'standard',
    nameVi: 'Cabin 4 giường cố định',
    nameEn: 'Fixed 4-Berth Cabin',
    shortNameVi: 'Cabin 4 giường',
    shortNameEn: 'Fixed 4-Berth',
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
    ticketPrice: 2_500_000,
    maxGuests: 4,
    pushUpBeds: true,
    privateCabinTickets: 4,
    roomCount: 7,
  },
} as const

export type CabinProductId = keyof typeof CABIN_PRODUCTS
