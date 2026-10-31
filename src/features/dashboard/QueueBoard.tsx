import { AnimatePresence, LayoutGroup } from 'motion/react'
import type { OrderDetail, OrderStatus } from '@/lib/types'
import { cn } from '@/shared/cn'
import { OrderTicket } from './OrderTicket'

type Stage = 'pending' | 'washing' | 'done'

const columns: { stage: Stage; title: string; empty: string; dot: string }[] = [
  { stage: 'pending', title: 'Pending', empty: 'No orders waiting to start', dot: 'bg-amber-400' },
  { stage: 'washing', title: 'Washing', empty: 'Nothing in the wash', dot: 'bg-blue-500' },
  { stage: 'done', title: 'Ready for pickup', empty: 'No orders waiting for pickup', dot: 'bg-green-500' },
]

interface QueueBoardProps {
  orders: OrderDetail[]
  now: number
  onAdvance: (id: string, status: OrderStatus) => void
  onStart: (order: OrderDetail) => void
}

/** Pending, washing and ready columns. Moving an order glides its ticket to the next column. */
export function QueueBoard({ orders, now, onAdvance, onStart }: QueueBoardProps) {
  return (
    <LayoutGroup>
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map(({ stage, title, empty, dot }) => {
          const tickets = orders.filter((o): o is OrderDetail & { status: Stage } => o.status === stage)
          return (
            <section key={stage} aria-label={title} className="rounded-xl bg-slate-100/70 p-3">
              <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-slate-800">
                <span className={cn('size-2.5 rounded-full', dot)} aria-hidden />
                {title}
                <span className="ml-auto text-slate-500 tabular-nums">{tickets.length}</span>
              </h3>
              <ul className="relative space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {tickets.map((o) => (
                    <OrderTicket key={o.id} order={o} now={now} onAdvance={onAdvance} onStart={onStart} />
                  ))}
                </AnimatePresence>
              </ul>
              {tickets.length === 0 && <p className="px-1 py-6 text-center text-sm text-slate-500">{empty}</p>}
            </section>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
