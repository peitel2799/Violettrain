import { formatCurrency } from '@/lib/utils'
import type { CabinProductId } from '@/lib/cabin-products'
import { getLowestRouteFare } from '@/lib/train-database'

export default function ProductTicketPrice({ cabinClassId }: { cabinClassId: CabinProductId }) {
  return <>{formatCurrency(getLowestRouteFare(cabinClassId))}</>
}
