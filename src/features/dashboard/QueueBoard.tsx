import { useState, type DragEvent } from 'react'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import type { OrderDetail, OrderStatus } from '@/lib/types'
import { cn } from '@/shared/cn'
import { resolveMove } from './kanban'
import { DRAG_MIME, OrderTicket } from './OrderTicket'

type Stage = 'pending' | 'washing' | 'done'

interface Column {
  stage: OrderStatus
  title: string
  empty: string
  dot: string
}

const columns: Column[] = [
  { stage: 'pending', title: 'Pending', empty: 'No orders waiting to start', dot: 'bg-amber-400' },
  { stage: 'washing', title: 'Washing', empty: 'Nothing in the wash', dot: 'bg-blue-500' },
  { stage: 'done', title: 'Ready for pickup', empty: 'No orders waiting for pickup', dot: 'bg-green-500' },
  { stage: 'claimed', title: 'Claimed', empty: 'Drop an order here when it is handed over', dot: 'bg-slate-400' },
]

interface QueueBoardProps {
  orders: OrderDetail[]
  now: number
  onAdvance: (id: string, status: OrderStatus) => void
  onStart: (order: OrderDetail) => void
  onShelf: (order: OrderDetail) => void
  /** A card was dropped on another column. The page decides what that means (see resolveMove). */
  onMove: (order: OrderDetail, to: OrderStatus) => void
}

/**
 * Pending, washing, ready and claimed columns. Drag a card to the next column to advance it;
 * the buttons on each card do the same for touch screens and keyboard users.
 */
export function QueueBoard({ orders, now, onAdvance, onStart, onShelf, onMove }: QueueBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<OrderStatus | null>(null)
  const dragged = orders.find((o) => o.id === dragId) ?? null

  const endDrag = () => {
    setDragId(null)
    setOverStage(null)
  }

  function handleDragOver(e: DragEvent, stage: OrderStatus) {
    if (!dragged) return
    e.preventDefault() // required, or the browser refuses the drop
    e.dataTransfer.dropEffect = resolveMove(dragged.status, stage).kind === 'reject' ? 'none' : 'move'
    setOverStage(stage)
  }

  function handleDrop(e: DragEvent, stage: OrderStatus) {
    e.preventDefault()
    const id = e.dataTransfer.getData(DRAG_MIME) || dragId
    const order = orders.find((o) => o.id === id)
    endDrag()
    if (order) onMove(order, stage)
  }

  return (
    <LayoutGroup>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ stage, title, empty, dot }) => {
          const tickets = orders.filter((o): o is OrderDetail & { status: Stage } => o.status === stage)
          const verdict = dragged && overStage === stage ? resolveMove(dragged.status, stage).kind : null
          return (
            <section
              key={stage}
              aria-label={title}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStage(null)
              }}
              onDrop={(e) => handleDrop(e, stage)}
              className={cn(
                'rounded-xl p-3 transition-colors',
                stage === 'claimed' ? 'border-2 border-dashed border-slate-200 bg-white' : 'bg-slate-100/70',
                verdict && verdict !== 'reject' && verdict !== 'noop' && 'bg-green-50 ring-2 ring-green-400',
                verdict === 'reject' && 'bg-red-50 ring-2 ring-red-300',
              )}
            >
              <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-slate-800">
                <span className={cn('size-2.5 rounded-full', dot)} aria-hidden />
                {title}
                {stage !== 'claimed' && <span className="ml-auto text-slate-500 tabular-nums">{tickets.length}</span>}
              </h3>
              <ul className="relative min-h-16 space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {tickets.map((o) => (
                    <OrderTicket
                      key={o.id}
                      order={o}
                      now={now}
                      onAdvance={onAdvance}
                      onStart={onStart}
                      onShelf={onShelf}
                      isDragging={dragId === o.id}
                      onDragStart={setDragId}
                      onDragEnd={endDrag}
                    />
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
