import type { Database } from './database.types'
import type { OrderDetail, OrderLine } from './types'

type OrderDetailRow = Database['public']['Views']['order_details']['Row']

/** View columns are all nullable in generated types; the underlying table guarantees them. */
export function mapOrderDetail(row: OrderDetailRow): OrderDetail {
  return {
    id: row.id!,
    code: row.code!,
    createdAt: row.created_at!,
    customerType: row.customer_type!,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceType: row.service_type!,
    weightKg: Number(row.weight_kg),
    pricePerKg: Number(row.price_per_kg),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    paymentMethod: row.payment_method!,
    status: row.status!,
    machineLabel: row.machine_label,
    cashierName: row.cashier_name ?? 'Unknown',
    addons: ((row.addons ?? []) as unknown as OrderLine[]).map((a) => ({ name: a.name, price: Number(a.price) })),
  }
}
