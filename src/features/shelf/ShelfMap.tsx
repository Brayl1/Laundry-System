import type { OrderDetail } from '@/lib/types'
import { cn } from '@/shared/cn'
import { SHELF_BINS, SHELF_ROWS, binLabel, occupiedBins } from './shelves'

interface ShelfMapProps {
  orders: OrderDetail[]
  onSelect: (order: OrderDetail) => void
}

/** A read-only picture of the racks: which bag is in which bin. Tap an occupied bin to edit it. */
export function ShelfMap({ orders, onSelect }: ShelfMapProps) {
  const taken = occupiedBins(orders)
  return (
    <div className="space-y-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {SHELF_ROWS.map((row) => (
        <div key={row} className="flex items-stretch gap-2">
          <p className="flex w-16 shrink-0 items-center text-xs font-medium text-slate-500">{row}</p>
          <ul className="grid min-w-[18rem] flex-1 grid-cols-4 gap-2">
            {SHELF_BINS.map((b) => {
              const holder = taken.get(binLabel(row, b))
              return (
                <li key={b}>
                  <button
                    type="button"
                    disabled={!holder}
                    onClick={() => holder && onSelect(holder)}
                    className={cn(
                      'flex h-14 w-full flex-col items-center justify-center rounded-lg border px-1 text-center',
                      holder ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : 'border-dashed border-slate-200 text-slate-300',
                    )}
                  >
                    <span className={cn('text-[10px] font-medium', holder ? 'text-blue-700' : 'text-slate-400')}>Bin {b}</span>
                    {holder && (
                      <>
                        <span className="w-full truncate text-xs font-medium text-slate-900">{holder.customerName ?? 'Walk-in'}</span>
                        <span className="font-mono text-[10px] text-slate-500">#{holder.code.slice(-4)}</span>
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
