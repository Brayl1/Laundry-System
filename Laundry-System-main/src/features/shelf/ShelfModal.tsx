import { useState } from 'react'
import { Archive } from 'lucide-react'
import type { OrderDetail } from '@/lib/types'
import { Button, ErrorNote, Input, Modal } from '@/shared/ui'
import { cn } from '@/shared/cn'
import { SHELF_BINS, SHELF_ROWS, binLabel, formatLocation, occupiedBins, parseLocation } from './shelves'

interface ShelfModalProps {
  order: OrderDetail | null
  /** Every unclaimed order, used to grey out bins that are already taken. */
  orders: OrderDetail[]
  onClose: () => void
  onSave: (orderId: string, location: string | null) => Promise<void>
}

/** Pick the rack and bin where a finished bag is stored, with an optional note ("blue bag"). */
export function ShelfModal({ order, orders, onClose, onSave }: ShelfModalProps) {
  return (
    <Modal open={order !== null} onClose={onClose} title="Where is this bag?" className="max-w-md">
      {order && <ShelfForm order={order} orders={orders} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function ShelfForm({ order, orders, onClose, onSave }: Omit<ShelfModalProps, 'order'> & { order: OrderDetail }) {
  const initial = parseLocation(order.shelfLocation)
  const [bin, setBin] = useState<string | null>(initial.bin)
  const [note, setNote] = useState(initial.note)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taken = occupiedBins(orders, order.id)

  async function save(location: string | null) {
    setSaving(true)
    setError(null)
    try {
      await onSave(order.id, location)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the location')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{order.customerName ?? 'Walk-in'}</span>, #{order.code.slice(-4)}, {order.weightKg} kg
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1.5 text-center text-xs">
          <thead>
            <tr>
              <th aria-hidden />
              {SHELF_BINS.map((b) => (
                <th key={b} scope="col" className="font-medium text-slate-500">
                  Bin {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHELF_ROWS.map((row) => (
              <tr key={row}>
                <th scope="row" className="pr-1 text-left font-medium whitespace-nowrap text-slate-500">
                  {row}
                </th>
                {SHELF_BINS.map((b) => {
                  const label = binLabel(row, b)
                  const holder = taken.get(label)
                  const selected = bin === label
                  return (
                    <td key={b}>
                      <button
                        type="button"
                        disabled={!!holder}
                        aria-pressed={selected}
                        aria-label={holder ? `${label}, holds #${holder.code.slice(-4)}` : label}
                        onClick={() => setBin(selected ? null : label)}
                        className={cn(
                          'flex h-12 w-full items-center justify-center rounded-lg border text-[11px] font-medium transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
                          holder && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                          !holder && !selected && 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50',
                          selected && 'border-blue-600 bg-blue-600 text-white',
                        )}
                      >
                        {holder ? `#${holder.code.slice(-4)}` : selected ? 'Here' : 'Free'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Input label="Note (optional)" placeholder="e.g. blue bag, top rack" maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} />
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" disabled={saving || (!order.shelfLocation)} onClick={() => save(null)}>
          Clear
        </Button>
        <Button variant="blue" icon={<Archive className="size-4" />} loading={saving} disabled={!bin && !note.trim()} onClick={() => save(formatLocation(bin, note))}>
          Save
        </Button>
      </div>
    </div>
  )
}
