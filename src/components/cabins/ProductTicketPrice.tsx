import { formatCurrency } from '@/lib/utils'
import type { CabinProductId } from '@/lib/cabin-products'
import { getLowestRouteTicketFare } from '@/lib/train-database'

export default function ProductTicketPrice({
  cabinClassId,
  locale,
  liveTicketFrom,
}: {
  cabinClassId: CabinProductId
  locale: string
  /** Cheapest fare currently on sale; falls back to the reference fare. */
  liveTicketFrom?: number
}) {
  const isVi = locale === 'vi'
  const ticketFrom = liveTicketFrom ?? getLowestRouteTicketFare(cabinClassId)

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
          {isVi ? 'Giá từ / 1 vé' : 'From / 1 ticket'}
        </span>
        <strong className="mt-1 block text-lg font-bold text-gray-700 sm:text-xl">
          {formatCurrency(ticketFrom)}
        </strong>
      </div>
      <div className="sm:text-right">
        <span className="block text-xs font-bold uppercase tracking-wide text-gold-600">
          {isVi ? 'Giá 1 cabin (4 vé)' : '1 cabin (4 tickets)'}
        </span>
        <strong className="mt-1 block font-serif text-2xl font-bold text-violet-950 sm:text-3xl">
          {formatCurrency(ticketFrom * 4)}
        </strong>
      </div>
    </div>
  )
}
