import type { OrderDetail } from '@/lib/types'
import { customerTypeLabel, localDateKey, orderStatusLabel, paymentMethodLabel, serviceTypeLabel } from '@/lib/format'
import { downloadCsv, toCsv } from '@/lib/csv'

const headers = [
  'Order ID',
  'Date',
  'Time',
  'Customer Type',
  'Customer',
  'Service Type',
  'Weight (kg)',
  'Add-ons',
  'Payment Method',
  'Total',
  'Machine',
  'Cashier',
  'Status',
]

export function exportOrdersCsv(orders: OrderDetail[]): void {
  const rows = orders.map((o) => {
    const created = new Date(o.createdAt)
    return [
      o.code,
      localDateKey(created),
      created.toLocaleTimeString('en-GB'),
      customerTypeLabel[o.customerType],
      o.customerName ?? '',
      serviceTypeLabel[o.serviceType],
      o.weightKg,
      o.addons.map((a) => a.name).join('; '),
      paymentMethodLabel[o.paymentMethod],
      o.total.toFixed(2),
      o.machineLabel ?? '',
      o.cashierName,
      orderStatusLabel[o.status],
    ]
  })
  downloadCsv(`laundry-report-${localDateKey(new Date())}.csv`, toCsv(headers, rows))
}
