import { supabase, unwrap } from '@/lib/supabase'

export interface CustomerStat {
  id: string
  name: string
  phone: string
  createdAt: string
  orderCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export async function fetchCustomerStats(): Promise<CustomerStat[]> {
  const rows = unwrap(await supabase.from('customer_stats').select('*').order('total_spent', { ascending: false }))
  // View columns are all nullable in generated types; the underlying tables guarantee them.
  return rows.map((r) => ({
    id: r.id!,
    name: r.name!,
    phone: r.phone!,
    createdAt: r.created_at!,
    orderCount: Number(r.order_count ?? 0),
    totalSpent: Number(r.total_spent ?? 0),
    lastOrderAt: r.last_order_at,
  }))
}
