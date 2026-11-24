import { db } from '@/lib/untyped'
import type { PaymentMethod } from '@/lib/types'

/** Saves one payment on an order (BR19). An order can have many: the first at the counter, later ones for the storage charge or a balance. */
export async function recordPayment(p: { orderId: string; amount: number; method: PaymentMethod; referenceNo: string }): Promise<void> {
  const { error } = await db.from('order_payments').insert({
    order_id: p.orderId,
    amount: Math.round(p.amount * 100) / 100,
    method: p.method,
    reference_no: p.method === 'qr' ? p.referenceNo.trim() || null : null,
  })
  if (error) throw new Error(error.message)
}
