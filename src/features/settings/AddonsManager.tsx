import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import type { Addon } from '@/lib/types'
import { peso } from '@/lib/format'
import { Button, Card, ErrorNote, Input } from '@/shared/ui'
import { cn } from '@/shared/cn'
import { createAddon, deleteAddon, updateAddon } from './api'
import { useSaveState } from './useSaveState'

interface AddonsManagerProps {
  addons: Addon[]
  editable: boolean
  onChanged: () => void
}

export function AddonsManager({ addons, editable, onChanged }: AddonsManagerProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const { saving, error, run } = useSaveState()

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const ok = await run(() => createAddon(name, Number(price), addons.length + 1))
    if (ok) {
      setName('')
      setPrice('')
      onChanged()
    }
  }

  const act = (action: () => Promise<void>) => run(action).then((ok) => ok && onChanged())

  return (
    <Card title="Add-ons">
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {addons.map((a) => (
            <motion.li
              key={a.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={cn('flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2', !a.active && 'opacity-60')}>
                <span className="flex-1 text-sm">{a.name}</span>
                <span className="text-sm tabular-nums">{peso(a.price, false)}</span>
                {editable && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={a.active}
                        onChange={() => act(() => updateAddon(a.id, { active: !a.active }))}
                        className="accent-slate-900"
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => act(() => deleteAddon(a.id))}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${a.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {editable && (
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-[1fr_7rem_auto] items-end gap-2">
          <Input label="New add-on" placeholder="e.g. Ironing" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <Button type="submit" variant="outline" icon={<Plus className="size-4" />} loading={saving} aria-label="Add add-on" />
        </form>
      )}
      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
    </Card>
  )
}
