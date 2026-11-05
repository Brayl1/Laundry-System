import { useState } from 'react'
import { Play } from 'lucide-react'
import type { Machine, OrderDetail } from '@/lib/types'
import { customerTypeLabel, serviceTypeLabel } from '@/lib/format'
import { Button, ErrorNote, MachinePicker, Modal } from '@/shared/ui'

interface StartWashingModalProps {
  order: OrderDetail | null
  machines: Machine[]
  onClose: () => void
  onConfirm: (orderId: string, machineId: string) => Promise<void>
}

/** The approval step: the cashier confirms the clothes are in the washer, and only then does it go "in use". */
export function StartWashingModal({ order, machines, onClose, onConfirm }: StartWashingModalProps) {
  return (
    <Modal open={order !== null} onClose={onClose} title="Start washing">
      {order && <StartWashingForm order={order} machines={machines} onClose={onClose} onConfirm={onConfirm} />}
    </Modal>
  )
}

function StartWashingForm({ order, machines, onClose, onConfirm }: Omit<StartWashingModalProps, 'order'> & { order: OrderDetail }) {
  const heldId = machines.find((m) => m.label === order.machineLabel)?.id ?? null
  const [machineId, setMachineId] = useState<string | null>(heldId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!machineId) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(order.id, machineId)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start washing')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{order.customerName ?? customerTypeLabel[order.customerType]}</span>
        {`, #${order.code.slice(-4)}, ${serviceTypeLabel[order.serviceType]}, ${order.weightKg} kg`}
      </p>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-900">Which washer are the clothes going into?</p>
        <MachinePicker
          label="Washer"
          machines={machines}
          value={machineId}
          onChange={setMachineId}
          heldId={heldId}
          isAvailable={(m) => m.status === 'idle' || m.id === heldId}
        />
      </div>
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="blue" icon={<Play className="size-4" />} disabled={!machineId} loading={submitting} onClick={confirm}>
          Clothes are in
        </Button>
      </div>
    </div>
  )
}
