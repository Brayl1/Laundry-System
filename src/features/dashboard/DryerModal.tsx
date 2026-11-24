import { useState } from 'react'
import type { Machine, OrderDetail } from '@/lib/types'
import { Button, ErrorNote, MachinePorthole, Modal } from '@/shared/ui'
import { cn } from '@/shared/cn'

interface DryerModalProps {
  order: OrderDetail | null
  dryers: Machine[]
  onClose: () => void
  /** Moves the order to drying. `machineId` is the chosen dryer, or null when no dryer is recorded. */
  onConfirm: (orderId: string, machineId: string | null) => Promise<void>
}

/** Moves a washing order to drying and records which dryer it went into (BR24). */
export function DryerModal({ order, dryers, onClose, onConfirm }: DryerModalProps) {
  return (
    <Modal open={order !== null} onClose={onClose} title="Move to drying" className="max-w-md">
      {order && <DryerForm order={order} dryers={dryers} onClose={onClose} onConfirm={onConfirm} />}
    </Modal>
  )
}

function DryerForm({ order, dryers, onClose, onConfirm }: Omit<DryerModalProps, 'order'> & { order: OrderDetail }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setSaving(true)
    setError(null)
    try {
      await onConfirm(order.id, picked)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not move the order to drying')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{order.customerName ?? 'Walk-in'}</span>, #{order.code.slice(-4)}, {order.weightKg} kg. Which dryer is it going into?
      </p>

      {dryers.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No dryers are set up yet. An admin can add them under Machines. You can still move the order to drying.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {dryers.map((d) => {
            const free = d.status === 'idle'
            const selected = picked === d.id
            return (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={!free}
                  aria-pressed={selected}
                  onClick={() => setPicked(selected ? null : d.id)}
                  className={cn(
                    'flex w-full flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center text-sm',
                    selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200',
                    !free && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <MachinePorthole status={d.status} label={d.label} className="size-14" />
                  <span className="font-medium text-slate-900">{d.label}</span>
                  <span className="text-xs text-slate-500">{free ? 'Free' : d.status === 'maintenance' ? 'Out of service' : 'In use'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="blue" loading={saving} onClick={confirm}>
          {picked ? 'Start drying' : 'Move to drying'}
        </Button>
      </div>
    </div>
  )
}
