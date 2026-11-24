import { ORDER_STATUSES, type OrderStatus } from '@/lib/types'

export type MoveResult =
  | { kind: 'noop' }
  /** Pending to washing needs the cashier to confirm which washer the clothes went into. */
  | { kind: 'start' }
  /** Washing to drying lets the cashier pick the dryer (or skip it). */
  | { kind: 'dry' }
  | { kind: 'advance'; to: OrderStatus }
  | { kind: 'reject'; reason: string }

const skipReason: Partial<Record<OrderStatus, string>> = {
  pending: 'Start washing first.',
  washing: 'Move it to drying first.',
  drying: 'Mark it ready before handing it over.',
}

/** What dropping a card from one column onto another should do. Orders only ever move one step forward. */
export function resolveMove(from: OrderStatus, to: OrderStatus): MoveResult {
  if (from === to) return { kind: 'noop' }
  const fromIndex = ORDER_STATUSES.indexOf(from)
  const toIndex = ORDER_STATUSES.indexOf(to)
  if (toIndex < fromIndex) return { kind: 'reject', reason: 'Orders only move forward. Use the Orders page to correct a mistake.' }
  if (toIndex - fromIndex > 1) return { kind: 'reject', reason: skipReason[from] ?? 'Move it one step at a time.' }
  if (from === 'pending') return { kind: 'start' }
  if (from === 'washing') return { kind: 'dry' }
  return { kind: 'advance', to }
}
