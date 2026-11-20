import type { OrderDetail } from '@/lib/types'

/** A bin on a rack. Rows of the `shelf_bins` table. */
export interface Bin {
  id: string
  name: string
}

/** A rack and its bins, in display order. Rows of the `shelves` table. */
export interface Shelf {
  id: string
  name: string
  bins: Bin[]
}

/** Longest note the shelf dialog accepts (the table allows a little more). */
export const NOTE_MAX = 40

export const binLabel = (shelf: string, bin: string) => `${shelf}, Bin ${bin}`

/** Which active order holds each bin, keyed by bin id. Pass `exceptId` to ignore the order being edited. */
export function occupiedBins(orders: OrderDetail[], exceptId?: string): Map<string, OrderDetail> {
  const map = new Map<string, OrderDetail>()
  for (const o of orders) {
    if (o.id === exceptId || o.status === 'claimed' || !o.shelfBinId) continue
    map.set(o.shelfBinId, o)
  }
  return map
}

/** How many bins the widest rack has, so every row of the map lines up. */
export function widestShelf(shelves: Shelf[]): number {
  return Math.max(1, ...shelves.map((s) => s.bins.length))
}
