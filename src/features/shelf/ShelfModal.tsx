import { useState } from 'react'
import { Archive } from 'lucide-react'
import type { OrderDetail } from '@/lib/types'
import { Button, ErrorNote, Input, Modal } from '@/shared/ui'
import { cn } from '@/shared/cn'
import { NOTE_MAX, occupiedBins, type Shelf } from './shelves'

interface ShelfModalProps {
  order: OrderDetail | null
  shelves: Shelf[]
  /** Every unclaimed order, used to grey out bins that are already taken. */
  orders: OrderDetail[]
  onClose: () => void
  onSave: (orderId: string, binId: string | null, note: string | null) => Promise<void>
}

/** Pick the rack and bin where a finished bag is stored, with an optional note ("blue bag"). */
export function ShelfModal({ order, shelves, orders, onClose, onSave }: ShelfModalProps) {
  return (
    <Modal open={order !== null} onClose={onClose} title="Where is this bag?" className="max-w-md">
      {order && <ShelfForm order={order} shelves={shelves} orders={orders} onClose={onClose} onSave={onSave} />}
    </Modal>
  )
}

function ShelfForm({ order, shelves, orders, onClose, onSave }: Omit<ShelfModalProps, 'order'> & { order: OrderDetail }) {
  const [binId, setBinId] = useState<string | null>(order.shelfBinId)
  const [note, setNote] = useState(order.shelfNote ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taken = occupiedBins(orders, order.id)
  const hasLocation = order.shelfBinId !== null || !!order.shelfNote

  async function save(bin: string | null, text: string | null) {
    setSaving(true)
    setError(null)
    try {
      await onSave(order.id, bin, text)
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

      {shelves.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
          No shelves set up yet. An admin can add them under Shelves. You can still leave a note below.
        </p>
      ) : (
        <div className="space-y-3">
          {shelves.map((shelf) => (
            <fieldset key={shelf.id}>
              <legend className="mb-1.5 text-xs font-medium text-slate-500">{shelf.name}</legend>
              <div className="grid grid-cols-4 gap-2">
                {shelf.bins.map((bin) => {
                  const holder = taken.get(bin.id)
                  const selected = binId === bin.id
                  const label = `${shelf.name}, Bin ${bin.name}`
                  return (
                    <button
                      key={bin.id}
                      type="button"
                      disabled={!!holder}
                      aria-pressed={selected}
                      aria-label={holder ? `${label}, holds #${holder.code.slice(-4)}` : label}
                      onClick={() => setBinId(selected ? null : bin.id)}
                      className={cn(
                        'flex h-12 flex-col items-center justify-center rounded-lg border px-1 text-[11px] font-medium transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
                        holder && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                        !holder && !selected && 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50',
                        selected && 'border-blue-600 bg-blue-600 text-white',
                      )}
                    >
                      <span className="max-w-full truncate">Bin {bin.name}</span>
                      <span className={cn('text-[10px] font-normal', selected ? 'text-blue-100' : 'text-slate-400')}>
                        {holder ? `#${holder.code.slice(-4)}` : selected ? 'Here' : 'Free'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <Input label="Note (optional)" placeholder="e.g. blue bag, top rack" maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" disabled={saving || !hasLocation} onClick={() => save(null, null)}>
          Clear
        </Button>
        <Button
          variant="blue"
          icon={<Archive className="size-4" />}
          loading={saving}
          disabled={!binId && !note.trim()}
          onClick={() => save(binId, note.trim() || null)}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
