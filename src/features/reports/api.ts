import { supabase, unwrap } from '@/lib/supabase'
import { mapOrderDetail } from '@/lib/orderDetail'
import type { OrderDetail } from '@/lib/types'

export async function fetchOrdersSince(start: Date | null): Promise<OrderDetail[]> {
  let query = supabase.from('order_details').select('*').order('created_at', { ascending: true })
  if (start) query = query.gte('created_at', start.toISOString())
  return unwrap(await query).map(mapOrderDetail)
}
