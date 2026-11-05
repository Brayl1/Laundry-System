import type { OrderDetail } from '@/lib/types'

/** The shop's physical racks, top to bottom. Edit these two lists to match the real shelves. */
export const SHELF_ROWS = ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4'] as const
export const SHELF_BINS = ['A', 'B', 'C', 'D'] as const

/** Free-text detail after the bin, e.g. "Shelf 2, Bin B · blue bag". */
export const NOTE_SEPARATOR = ' · '

export const binLabel = (row: string, bin: string) => `${row}, Bin ${bin}`

export const ALL_BINS: string[] = SHELF_ROWS.flatMap((row) => SHELF_BINS.map((bin) => binLabel(row, bin)))

export interface ParsedLocation {
  /** One of ALL_BINS, or null when the text is only a note (or the shelves were renamed). */
  bin: string | null
  note: string
}

export function parseLocation(value: string | null): ParsedLocation {
  if (!value) return { bin: null, note: '' }
  const [head, ...rest] = value.split(NOTE_SEPARATOR)
  if (ALL_BINS.includes(head)) return { bin: head, note: rest.join(NOTE_SEPARATOR) }
  return { bin: null, note: value }
}

/** The string stored on the order, or null to clear it. */
export function formatLocation(bin: string | null, note: string): string | null {
  const cleanNote = note.trim()
  if (bin && cleanNote) return `${bin}${NOTE_SEPARATOR}${cleanNote}`
  return bin ?? (cleanNote || null)
}

/** Which active order holds each bin. Pass `exceptId` to ignore the order being edited. */
export function occupiedBins(orders: OrderDetail[], exceptId?: string): Map<string, OrderDetail> {
  const map = new Map<string, OrderDetail>()
  for (const o of orders) {
    if (o.id === exceptId || o.status === 'claimed') continue
    const { bin } = parseLocation(o.shelfLocation)
    if (bin) map.set(bin, o)
  }
  return map
}
