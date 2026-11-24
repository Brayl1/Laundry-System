import { supabase, unwrap } from '@/lib/supabase'
import { db } from '@/lib/untyped'
import { mapOrderDetail } from '@/lib/orderDetail'
import { fetchShelves, type Shelf } from '@/features/shelf'
import type { Machine, OrderDetail, OrderStatus } from '@/lib/types'

export interface Board {
  /** Every order that is not yet claimed, oldest first. */
  active: OrderDetail[]
  /** Orders created since midnight, local time. */
  todayCount: number
  /** Washers. Dryers are kept apart so they never show up where a washer is chosen. */
  machines: Machine[]
  dryers: Machine[]
  /** The racks and bins from the shelves tables. */
  shelves: Shelf[]
}

export async function fetchBoard(): Promise<Board> {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [active, today, machines, shelves] = await Promise.all([
    supabase.from('order_details').select('*').neq('status', 'claimed').order('created_at', { ascending: true }).limit(200),
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', midnight.toISOString()),
    supabase.from('machines').select('*').order('label'),
    fetchShelves(),
  ])
  if (today.error) throw new Error(today.error.message)

  const allMachines = unwrap(machines)
  return {
    active: unwrap(active).map(mapOrderDetail),
    todayCount: today.count ?? 0,
    machines: allMachines.filter((m) => m.machine_type !== 'dryer'),
    dryers: allMachines.filter((m) => m.machine_type === 'dryer'),
    shelves,
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  unwrap(await supabase.from('orders').update({ status }).eq('id', id).select('id').single())
}

/** The cashier's approval: the clothes are in the machine. Marks the order washing and the machine in use. */
export async function startOrder(orderId: string, machineId: string): Promise<void> {
  const { error } = await supabase.rpc('start_order', { p_order_id: orderId, p_machine_id: machineId })
  if (error) throw new Error(error.message)
}

/** Moves a washing order to drying and, if a dryer is chosen, records the dry cycle on it (BR24). */
export async function startDrying(orderId: string, machineId: string | null): Promise<void> {
  const { error } = await db.rpc('start_drying', { p_order_id: orderId, p_machine_id: machineId })
  if (error) throw new Error(error.message)
}

let feedCount = 0

/** Calls `onChange` when any order, machine or shelf changes, from any till. */
export function subscribeToBoard(onChange: () => void): () => void {
  const channel = supabase
    .channel(`board-feed-${++feedCount}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shelves' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shelf_bins' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
