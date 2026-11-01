import type { Machine, MachineStatus } from '@/lib/types'
import { cn } from '../cn'
import { MachinePorthole } from './MachinePorthole'

const statusText: Record<MachineStatus, string> = {
  idle: 'Free',
  reserved: 'Reserved',
  in_use: 'In use',
  maintenance: 'Out of service',
}

interface MachinePickerProps {
  machines: Machine[]
  value: string | null
  onChange: (id: string | null) => void
  /** Which machines can be chosen right now. */
  isAvailable: (machine: Machine) => boolean
  /** A machine already held for this order: shown as such even though it is "reserved". */
  heldId?: string | null
  /** Lets the cashier click the selected washer again to clear the choice. */
  optional?: boolean
  label: string
}

/** Pick a washer from the shop's machines. Unavailable ones stay visible so the cashier sees why. */
export function MachinePicker({ machines, value, onChange, isAvailable, heldId, optional, label }: MachinePickerProps) {
  if (machines.length === 0) {
    return <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">No washers set up yet.</p>
  }
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {machines.map((m) => {
        const available = isAvailable(m)
        const selected = value === m.id
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={!available}
            onClick={() => onChange(selected && optional ? null : m.id)}
            className={cn(
              'flex flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
              selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/30' : 'border-slate-200 bg-white',
              available ? 'hover:border-slate-300' : 'cursor-not-allowed opacity-55',
            )}
          >
            <MachinePorthole status={m.status} label={m.label} className="size-14" />
            <span className="mt-1.5 text-sm font-medium text-slate-900">{m.label}</span>
            <span className={cn('text-xs', available ? 'text-green-600' : 'text-slate-500')}>
              {m.id === heldId ? 'Held for this order' : statusText[m.status]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
