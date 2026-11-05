import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useLoad } from '@/shared/hooks/useLoad'
import { isLow, isServiceDue, isServiceSoon } from './alerts'
import { fetchInventory } from './api'

/** A banner for the admin overview. Renders nothing when stock and machines are fine (or the tables are not there yet). */
export function InventoryAlerts() {
  const { data } = useLoad(fetchInventory)
  if (!data) return null

  const low = data.supplies.filter(isLow)
  const due = data.machines.filter(isServiceDue)
  const soon = data.machines.filter(isServiceSoon)
  if (!low.length && !due.length && !soon.length) return null

  const lines = [
    ...low.map((s) => `${s.name} is low (${Math.round(s.stock)} ${s.unit} left)`),
    ...due.map((m) => `${m.label} is due for maintenance (${m.loads_since_service} loads)`),
    ...soon.map((m) => `${m.label} will need maintenance soon (${m.loads_since_service}/${m.service_every} loads)`),
  ]

  return (
    <div role="alert" className="glass flex gap-3 rounded-xl border border-amber-300/60 p-4 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Needs attention</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <Link to="/admin/inventory" className="mt-2 inline-block font-medium text-blue-700 hover:underline">
          Open inventory
        </Link>
      </div>
    </div>
  )
}
