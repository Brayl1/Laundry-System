import { ORDER_STATUSES, type OrderStatus } from '@/lib/types'

export type MoveResult =
  | { kind: 'noop' }
  /** Pending to washing needs the cashier to confirm which washer the clothes went into. */
  | { kind: 'start' }
  | { kind: 'advance'; to: OrderStatus }
  | { kind: 'reject'; reason: string }

/** What dropping a card from one column onto another should do. Orders only ever move one step forward. */
export function resolveMove(from: OrderStatus, to: OrderStatus): MoveResult {
  if (from === to) return { kind: 'noop' }
  const fromIndex = ORDER_STATUSES.indexOf(from)
  const toIndex = ORDER_STATUSES.indexOf(to)
  if (toIndex < fromIndex) return { kind: 'reject', reason: 'Orders only move forward. Use the Orders page to correct a mistake.' }
  if (toIndex - fromIndex > 1) {
    return { kind: 'reject', reason: from === 'pending' ? 'Start washing first.' : 'Mark it done before handing it over.' }
  }
  return from === 'pending' ? { kind: 'start' } : { kind: 'advance', to }
}
