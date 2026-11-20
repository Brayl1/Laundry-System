import type { OrderDetail } from '@/lib/types'
import { cn } from '@/shared/cn'
import { occupiedBins, widestShelf, type Shelf } from './shelves'

interface ShelfMapProps {
  shelves: Shelf[]
  orders: OrderDetail[]
  onSelect: (order: OrderDetail) => void
}

/** A read-only picture of the racks: which bag is in which bin. Tap an occupied bin to edit it. */
export function ShelfMap({ shelves, orders, onSelect }: ShelfMapProps) {
  const taken = occupiedBins(orders)
  const columns = widestShelf(shelves)

  if (shelves.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No shelves set up yet. An admin can add them under Shelves in the admin panel.
      </div>
    )
  }

  return (
    <div className="space-y-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {shelves.map((shelf) => (
        <div key={shelf.id} className="flex items-stretch gap-2">
          <p className="flex w-16 shrink-0 items-center text-xs font-medium text-slate-500">{shelf.name}</p>
          <ul className="grid min-w-[18rem] flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {shelf.bins.map((bin) => {
              const holder = taken.get(bin.id)
              return (
                <li key={bin.id}>
                  <button
                    type="button"
                    disabled={!holder}
                    onClick={() => holder && onSelect(holder)}
                    className={cn(
                      'flex h-14 w-full flex-col items-center justify-center rounded-lg border px-1 text-center',
                      holder ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : 'border-dashed border-slate-200 text-slate-300',
                    )}
                  >
                    <span className={cn('max-w-full truncate text-[10px] font-medium', holder ? 'text-blue-700' : 'text-slate-400')}>Bin {bin.name}</span>
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
