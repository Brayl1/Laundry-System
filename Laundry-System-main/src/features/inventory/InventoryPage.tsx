import { useState, type FormEvent } from 'react'
import { PackagePlus, Trash2, Wrench } from 'lucide-react'
import type { Machine } from '@/lib/types'
import { cn } from '@/shared/cn'
import { useLoad } from '@/shared/hooks/useLoad'
import { useSaveState } from '@/features/settings/useSaveState'
import { Badge, Button, Card, ErrorNote, Input, PageHeader, PageLoader } from '@/shared/ui'
import { isLow, isServiceDue, isServiceSoon, loadsLeft, ordersLeft, type Supply } from './alerts'
import { createSupply, deleteSupply, fetchInventory, markServiced, restockSupply, setServiceInterval } from './api'

export function InventoryPage() {
  const inventory = useLoad(fetchInventory)
  const { saving, error, run } = useSaveState()
  const act = (action: () => Promise<void>) => run(action).then((ok) => ok && inventory.reload())

  return (
    <div>
      <PageHeader title="Inventory & Maintenance" subtitle="Detergent is deducted per kilo when washing starts. Each wash counts as a load on its machine." />
      <div className="mb-4">
        <ErrorNote message={inventory.error ?? error} />
      </div>
      {!inventory.data ? (
        !inventory.error && <PageLoader />
      ) : (
        <div className="space-y-5">
          <Card title="Supplies">
            {inventory.data.supplies.length === 0 ? (
              <p className="text-sm text-slate-500">No supplies yet. Add detergent and softener below.</p>
            ) : (
              <ul className="space-y-3">
                {inventory.data.supplies.map((s) => (
                  <SupplyRow key={s.id} supply={s} busy={saving} onRestock={(n) => act(() => restockSupply(s.id, n))} onDelete={() => act(() => deleteSupply(s.id))} />
                ))}
              </ul>
            )}
            <AddSupplyForm busy={saving} onAdd={(input) => run(() => createSupply(input)).then((ok) => ok && inventory.reload())} />
          </Card>

          <Card title="Machine maintenance">
            {inventory.data.machines.length === 0 ? (
              <p className="text-sm text-slate-500">No machines yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {inventory.data.machines.map((m) => (
                  <MachineRow key={m.id} machine={m} busy={saving} onServiced={() => act(() => markServiced(m.id))} onInterval={(n) => act(() => setServiceInterval(m.id, n))} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function SupplyRow({ supply: s, busy, onRestock, onDelete }: { supply: Supply; busy: boolean; onRestock: (n: number) => void; onDelete: () => void }) {
  const [amount, setAmount] = useState('')
  const low = isLow(s)
  const left = ordersLeft(s)
  const target = Math.max(s.lowThreshold * 3, s.stock, 1)
  const amountValue = Number(amount)

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-900">
          {s.name} {low && <Badge tone="red">Low stock</Badge>}
        </p>
        <p className="text-sm tabular-nums text-slate-700">
          {Math.round(s.stock).toLocaleString()} {s.unit}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/60" role="img" aria-label={`${Math.round((s.stock / target) * 100)}% of the comfortable level`}>
        <div className={cn('h-full rounded-full', low ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${Math.min((s.stock / target) * 100, 100)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {s.usagePerKg > 0 ? `${s.usagePerKg} ${s.unit}/kg` : 'Not deducted automatically'}
        {left !== null && `, about ${left} average orders left`}
        {s.lowThreshold > 0 && `, alert at ${s.lowThreshold} ${s.unit}`}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="w-32">
          <Input aria-label={`Restock ${s.name}`} inputMode="decimal" placeholder={`Add ${s.unit}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <Button
          size="md"
          variant="outline"
          icon={<PackagePlus className="size-4" />}
          disabled={busy || !(amountValue > 0)}
          onClick={() => {
            onRestock(amountValue)
            setAmount('')
          }}
        >
          Restock
        </Button>
        <button type="button" onClick={onDelete} disabled={busy} className="ml-auto rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${s.name}`}>
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  )
}

function AddSupplyForm({ busy, onAdd }: { busy: boolean; onAdd: (s: { name: string; unit: string; stock: number; lowThreshold: number; usagePerKg: number }) => void }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('ml')
  const [stock, setStock] = useState('')
  const [low, setLow] = useState('')
  const [usage, setUsage] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    onAdd({ name, unit, stock: Number(stock) || 0, lowThreshold: Number(low) || 0, usagePerKg: Number(usage) || 0 })
    setName('')
    setStock('')
    setLow('')
    setUsage('')
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3 lg:grid-cols-6">
      <div className="sm:col-span-2">
        <Input label="New supply" placeholder="e.g. Detergent" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
      <Input label="Stock" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
      <Input label="Alert at" inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} />
      <Input label="Use per kg" inputMode="decimal" value={usage} onChange={(e) => setUsage(e.target.value)} />
      <div className="sm:col-span-3 lg:col-span-6">
        <Button type="submit" variant="blue" disabled={busy || !name.trim()}>
          Add supply
        </Button>
      </div>
    </form>
  )
}

function MachineRow({ machine: m, busy, onServiced, onInterval }: { machine: Machine; busy: boolean; onServiced: () => void; onInterval: (n: number) => void }) {
  const due = isServiceDue(m)
  const soon = isServiceSoon(m)
  const pct = Math.min((m.loads_since_service / m.service_every) * 100, 100)
  const [editing, setEditing] = useState(false)
  const [interval, setIntervalValue] = useState(String(m.service_every))

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-slate-900">{m.label}</p>
        {due ? <Badge tone="red">Service due</Badge> : soon ? <Badge tone="yellow">Service soon</Badge> : <Badge tone="green">OK</Badge>}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/60" role="img" aria-label={`${m.loads_since_service} of ${m.service_every} loads`}>
        <div className={cn('h-full rounded-full', due ? 'bg-red-500' : soon ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {m.loads_since_service} of {m.service_every} loads{!due && `, ${loadsLeft(m)} to go`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={due ? 'danger' : 'outline'} icon={<Wrench className="size-3.5" />} disabled={busy} onClick={onServiced}>
          Mark serviced
        </Button>
        {editing ? (
          <>
            <div className="w-24">
              <Input aria-label={`Loads between services for ${m.label}`} inputMode="numeric" value={interval} onChange={(e) => setIntervalValue(e.target.value)} />
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || !(Number(interval) >= 1)}
              onClick={() => {
                onInterval(Math.round(Number(interval)))
                setEditing(false)
              }}
            >
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Change interval
          </Button>
        )}
      </div>
    </li>
  )
}
