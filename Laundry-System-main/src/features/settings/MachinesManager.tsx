import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2, WashingMachine } from 'lucide-react'
import type { Machine, MachineStatus } from '@/lib/types'
import { Badge, Button, Card, ErrorNote, Input, type BadgeTone } from '@/shared/ui'
import { createMachine, deleteMachine, updateMachineStatus } from './api'
import { useSaveState } from './useSaveState'

export const machineStatusMeta: Record<MachineStatus, { label: string; tone: BadgeTone }> = {
  idle: { label: 'Idle', tone: 'green' },
  reserved: { label: 'Reserved', tone: 'yellow' },
  in_use: { label: 'In use', tone: 'blue' },
  maintenance: { label: 'Maintenance', tone: 'red' },
}

interface MachinesManagerProps {
  machines: Machine[]
  editable: boolean
  onChanged: () => void
}

export function MachinesManager({ machines, editable, onChanged }: MachinesManagerProps) {
  const [label, setLabel] = useState('')
  const { saving, error, run } = useSaveState()

  const act = (action: () => Promise<void>) => run(action).then((ok) => ok && onChanged())

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const ok = await run(() => createMachine(label))
    if (ok) {
      setLabel('')
      onChanged()
    }
  }

  return (
    <Card title="Machines">
      <ul className="grid gap-2 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {machines.map((m) => (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <WashingMachine className="size-5 text-slate-500" aria-hidden />
              <span className="flex-1 text-sm">{m.label}</span>
              {editable ? (
                <select
                  value={m.status}
                  onChange={(e) => act(() => updateMachineStatus(m.id, e.target.value as MachineStatus))}
                  aria-label={`Status of ${m.label}`}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs focus:outline-none"
                >
                  {Object.entries(machineStatusMeta).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge tone={machineStatusMeta[m.status].tone}>{machineStatusMeta[m.status].label}</Badge>
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => act(() => deleteMachine(m.id))}
                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${m.label}`}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {editable && (
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-[1fr_auto] items-end gap-2">
          <Input label="New machine" placeholder="e.g. Washer 5" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Button type="submit" variant="outline" icon={<Plus className="size-4" />} loading={saving} aria-label="Add machine" />
        </form>
      )}
      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
    </Card>
  )
}
