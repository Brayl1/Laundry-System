import { supabase, unwrap } from '@/lib/supabase'

/** Sets (or clears, with null) where an order's bag is stored. */
export async function saveShelfLocation(orderId: string, location: string | null): Promise<void> {
  unwrap(await supabase.from('orders').update({ shelf_location: location }).eq('id', orderId).select('id').single())
}
