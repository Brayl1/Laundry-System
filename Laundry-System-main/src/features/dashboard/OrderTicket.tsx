import { motion } from 'motion/react'
import { Archive, GripVertical, WashingMachine } from 'lucide-react'
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
  onShelf: (order: OrderDetail) => void
  /** Drag and drop. The buttons stay as the fallback for touch screens and keyboards. */
  isDragging: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
}

export const DRAG_MIME = 'application/x-laundry-order'

export function OrderTicket({ order: o, now, onAdvance, onStart, onShelf, isDragging, onDragStart, onDragEnd }: OrderTicketProps) {
  const step = nextStep[o.status]
  return (
    <motion.li
      layout
      layoutId={`ticket-${o.id}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isDragging ? 0.45 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className={cn('rounded-lg border border-l-4 border-slate-200 bg-white shadow-sm', accent[o.status])}
    >
      {/* A plain div carries the HTML5 drag events: motion's own onDrag props mean something else. */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, o.id)
          e.dataTransfer.setData('text/plain', o.code)
          e.dataTransfer.effectAllowed = 'move'
          onDragStart(o.id)
        }}
        onDragEnd={onDragEnd}
        className="cursor-grab p-3 active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 font-medium text-slate-900">
            <GripVertical className="-ml-1 size-4 shrink-0 text-slate-300" aria-hidden />
            <span className="truncate">{o.customerName ?? customerTypeLabel[o.customerType]}</span>
          </p>
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

        {o.shelfLocation && (
          <p className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-800">
            <Archive className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{o.shelfLocation}</span>
          </p>
        )}

        <div className={cn('mt-3 grid gap-2', o.status === 'done' ? 'grid-cols-[auto_1fr]' : 'grid-cols-1')}>
          {o.status === 'done' && (
            <Button size="sm" variant="outline" icon={<Archive className="size-3.5" />} onClick={() => onShelf(o)}>
              {o.shelfLocation ? 'Move' : 'Shelf'}
            </Button>
          )}
          <Button size="sm" fullWidth variant={step.variant} onClick={() => (o.status === 'pending' ? onStart(o) : onAdvance(o.id, step.to))}>
            {step.label}
          </Button>
        </div>
      </div>
    </motion.li>
  )
}
