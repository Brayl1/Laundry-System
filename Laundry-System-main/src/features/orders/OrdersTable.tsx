import { AnimatePresence, motion } from 'motion/react'
import { Printer } from 'lucide-react'
import type { OrderDetail, OrderStatus } from '@/lib/types'
import { customerTypeLabel, formatDateTime, paymentMethodLabel, peso, serviceTypeLabel } from '@/lib/format'
import { Button } from '@/shared/ui'
import { StatusSelect } from './StatusSelect'

const columns = ['Order ID', 'Date/Time', 'Customer', 'Service', 'Weight', 'Payment', 'Amount', 'Machine', 'Cashier', 'Status', 'Actions']

interface OrdersTableProps {
  orders: OrderDetail[]
  onStatusChange: (id: string, status: OrderStatus) => void
  onPrint: (order: OrderDetail) => void
}

export function OrdersTable({ orders, onStatusChange, onPrint }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[60rem] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs font-medium text-slate-600">
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {orders.map((o) => (
              <motion.tr
                key={o.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{o.code}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                <td className="px-4 py-3">{o.customerName ?? customerTypeLabel[o.customerType]}</td>
                <td className="px-4 py-3 whitespace-nowrap">{serviceTypeLabel[o.serviceType]}</td>
                <td className="px-4 py-3 whitespace-nowrap">{o.weightKg} kg</td>
                <td className="px-4 py-3 whitespace-nowrap">{paymentMethodLabel[o.paymentMethod]}</td>
                <td className="px-4 py-3 whitespace-nowrap">{peso(o.total)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{o.machineLabel ?? '–'}</td>
                <td className="px-4 py-3">{o.cashierName}</td>
                <td className="px-4 py-3">
                  <StatusSelect value={o.status} orderCode={o.code} onChange={(s) => onStatusChange(o.id, s)} />
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" icon={<Printer className="size-3.5" />} onClick={() => onPrint(o)}>
                    Print
                  </Button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
