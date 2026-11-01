import { supabase, unwrap } from '@/lib/supabase'
import { mapOrderDetail } from '@/lib/orderDetail'
import type { Addon, Customer, CustomerType, Machine, OrderDetail, PaymentMethod, ServiceType } from '@/lib/types'

export interface PricingData {
  pricePerKg: number
  addons: Addon[]
  machines: Machine[]
}

export async function fetchPricing(): Promise<PricingData> {
  const [settings, addons, machines] = await Promise.all([
    supabase.from('settings').select('price_per_kg').eq('id', 1).single(),
    supabase.from('addons').select('*').eq('active', true).order('sort'),
    supabase.from('machines').select('*').order('label'),
  ])
  return {
    pricePerKg: Number(unwrap(settings).price_per_kg),
    addons: unwrap(addons).map((a) => ({ ...a, price: Number(a.price) })),
    machines: unwrap(machines),
  }
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.trim().replace(/[%,()]/g, '')
  if (!q) return []
  return unwrap(
    await supabase.from('customers').select('*').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).order('name').limit(6),
  )
}

export async function createCustomer(name: string, phone: string): Promise<Customer> {
  const res = await supabase.from('customers').insert({ name: name.trim(), phone: phone.trim() }).select().single()
  if (res.error?.code === '23505') throw new Error('A customer with that phone number already exists')
  return unwrap(res)
}

export interface NewOrder {
  customerType: CustomerType
  customerId: string | null
  serviceType: ServiceType
  weightKg: number
  paymentMethod: PaymentMethod
  addonIds: string[]
  /** Washer to reserve. Required for self-service, optional for full-service. */
  machineId: string | null
}

/** Creates the order server-side (totals recomputed there) and returns the joined detail for the receipt. */
export async function createOrder(order: NewOrder): Promise<OrderDetail> {
  const created = unwrap(
    await supabase.rpc('create_order', {
      payload: {
        customer_type: order.customerType,
        customer_id: order.customerId,
        service_type: order.serviceType,
        weight_kg: order.weightKg,
        payment_method: order.paymentMethod,
        addon_ids: order.addonIds,
        machine_id: order.machineId,
      },
    }),
  )
  const detail = unwrap(await supabase.from('order_details').select('*').eq('id', created.id).single())
  return mapOrderDetail(detail)
}
