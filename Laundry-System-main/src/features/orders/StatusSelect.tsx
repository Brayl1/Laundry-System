import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/types'
import { orderStatusLabel } from '@/lib/format'

const tones: Record<OrderStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  washing: { bg: '#dbeafe', fg: '#1e40af' },
  done: { bg: '#dcfce7', fg: '#166534' },
  claimed: { bg: '#f1f5f9', fg: '#475569' },
}

interface StatusSelectProps {
  value: OrderStatus
  onChange: (status: OrderStatus) => void
  orderCode: string
}

export function StatusSelect({ value, onChange, orderCode }: StatusSelectProps) {
  return (
    <motion.div
      className="relative inline-flex items-center rounded-md"
      animate={{ backgroundColor: tones[value].bg, color: tones[value].fg }}
      transition={{ duration: 0.25 }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OrderStatus)}
        aria-label={`Status for ${orderCode}`}
        className="cursor-pointer appearance-none bg-transparent py-1 pr-6 pl-2.5 text-xs font-medium focus:outline-none"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-slate-900">
            {orderStatusLabel[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3" aria-hidden />
    </motion.div>
  )
}
