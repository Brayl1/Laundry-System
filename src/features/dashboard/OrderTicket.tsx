import { motion } from 'motion/react'
import { WashingMachine } from 'lucide-react'
import type { OrderDetail, OrderStatus } from '@/lib/types'
import { customerTypeLabel, peso, serviceTypeLabel, timeAgo } from '@/lib/format'
import { Button, type ButtonProps } from '@/shared/ui'
import { cn } from '@/shared/cn'

type Stage = Exclude<OrderStatus, 'claimed'>

/** What the single button on a ticket does at each stage. */
const nextStep: Record<Stage, { to: OrderStatus; label: string; variant: NonNullable<ButtonProps['variant']> }> = {
  pending: { to: 'washing', label: 'Start washing', variant: 'blue' },
  washing: { to: 'done', label: 'Mark done', variant: 'success' },
  done: { to: 'claimed', label: 'Handed over', variant: 'primary' },
}

const accent: Record<Stage, string> = {
  pending: 'border-l-amber-400',
  washing: 'border-l-blue-500',
  done: 'border-l-green-500',
}

interface OrderTicketProps {
  order: OrderDetail & { status: Stage }
  now: number
  onAdvance: (id: string, status: OrderStatus) => void
  /** Pending orders are started through an approval dialog instead of a plain status change. */
  onStart: (order: OrderDetail) => void
}

export function OrderTicket({ order: o, now, onAdvance, onStart }: OrderTicketProps) {
  const step = nextStep[o.status]
  return (
    <motion.li
      layout
      layoutId={`ticket-${o.id}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className={cn('rounded-lg border border-l-4 border-slate-200 bg-white p-3 shadow-sm', accent[o.status])}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-slate-900">{o.customerName ?? customerTypeLabel[o.customerType]}</p>
        <span className="shrink-0 font-mono text-sm text-slate-500" title={o.code}>
          #{o.code.slice(-4)}
        </span>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{serviceTypeLabel[o.serviceType]}</span>
        <span>{o.weightKg} kg</span>
        {o.machineLabel ? (
          <span className="inline-flex items-center gap-1">
            <WashingMachine className="size-3.5" aria-hidden /> {o.status === 'pending' ? `Reserved ${o.machineLabel}` : o.machineLabel}
          </span>
        ) : (
          o.status === 'pending' && <span className="text-amber-600">No washer yet</span>
        )}
      </p>

      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="font-medium tabular-nums text-slate-900">{peso(o.total)}</span>
        <span className="text-xs text-slate-500">{timeAgo(o.createdAt, now)}</span>
      </div>

      <Button className="mt-3" size="sm" fullWidth variant={step.variant} onClick={() => (o.status === 'pending' ? onStart(o) : onAdvance(o.id, step.to))}>
        {step.label}
      </Button>
    </motion.li>
  )
}
