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
    shelfLocation: row.shelf_location,
    shelfBinId: row.shelf_bin_id,
    shelfNote: row.shelf_note,
    storageCharge: Number(row.storage_charge ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    cashierName: row.cashier_name ?? 'Unknown',
    addons: ((row.addons ?? []) as unknown as OrderLine[]).map((a) => ({ name: a.name, price: Number(a.price) })),
  }
}

/** What is still owed on an order: its price plus the storage charge, minus every payment (BR20). Never below zero. */
export function orderBalance(o: Pick<OrderDetail, 'total' | 'storageCharge' | 'amountPaid'>): number {
  return Math.max(Math.round((o.total + o.storageCharge - o.amountPaid) * 100) / 100, 0)
}
