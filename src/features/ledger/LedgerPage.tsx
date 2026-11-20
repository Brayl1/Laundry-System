import { useMemo, useState } from 'react'
import { AlertTriangle, MessageSquare, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { formatDateTime, localDateKey, peso } from '@/lib/format'
import { cn } from '@/shared/cn'
import { useLoad } from '@/shared/hooks/useLoad'
import { Badge, Button, Card, ErrorNote, Input, Modal, PageHeader, PageLoader } from '@/shared/ui'
import { getShopName, reminderMessage, sendSms } from '@/features/notifications'
import { StatTile } from '@/features/reports/StatTile'
import { addLedgerEntry, deleteLedgerEntry, fetchLedger } from './api'
import { totalOutstanding, type CustomerLedger, type LedgerKind } from './calc'

const integer = (n: number) => Math.round(n).toString()

interface EntryTarget {
  kind: LedgerKind
  customerId: string | null
}

export function LedgerPage() {
  const ledger = useLoad(fetchLedger)
  const [query, setQuery] = useState('')
  const [entryFor, setEntryFor] = useState<EntryTarget | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [reminding, setReminding] = useState<string | null>(null)

  const ledgers = ledger.data?.ledgers ?? []
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ledgers.filter((l) => !q || l.name.toLowerCase().includes(q) || l.phone.includes(q))
  }, [ledgers, query])
  const owing = ledgers.filter((l) => l.balance > 0)
  const history = ledgers.find((l) => l.id === historyId) ?? null

  async function remind(l: CustomerLedger) {
    setReminding(l.id)
    setNotice(null)
    const shop = await getShopName()
    const result = await sendSms({
      to: l.phone,
      kind: 'reminder',
      customerId: l.id,
      message: reminderMessage({ shop, name: l.name.split(' ')[0], balance: l.balance, dueDate: l.nextDue }),
    })
    setNotice(result.ok ? { tone: 'ok', text: `Reminder sent to ${l.name}.` } : { tone: 'error', text: result.error })
    setReminding(null)
  }

  return (
    <div>
      <PageHeader
        title="Credit Ledger"
        subtitle="Utang tracker: running balances, partial payments and due dates"
        actions={
          <Button variant="blue" icon={<Plus className="size-4" />} onClick={() => setEntryFor({ kind: 'charge', customerId: null })}>
            New entry
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ErrorNote message={ledger.error} />
        {notice && (
          <p role="status" className={cn('rounded-lg px-3 py-2 text-sm', notice.tone === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700')}>
            {notice.text}
          </p>
        )}
      </div>

      {!ledger.data ? (
        !ledger.error && <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatTile index={0} label="Total outstanding" value={totalOutstanding(ledgers)} format={peso} icon={<Wallet />} tone="bg-red-100 text-red-700" />
            <StatTile index={1} label="Customers with a balance" value={owing.length} format={integer} icon={<Wallet />} tone="bg-amber-100 text-amber-700" />
            <StatTile index={2} label="Overdue" value={ledgers.filter((l) => l.overdue).length} format={integer} icon={<AlertTriangle />} tone="bg-red-100 text-red-700" />
          </div>

          <Card className="p-4">
            <Input icon={<Search />} placeholder="Search by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search ledger" />
          </Card>

          {visible.length === 0 ? (
            <Card className="py-12 text-center text-sm text-slate-500">
              {ledgers.length === 0 ? 'No credit recorded yet. Use New entry when a customer takes laundry on credit.' : 'Nobody matches your search.'}
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    {['Customer', 'Balance', 'Next due', 'Actions'].map((c) => (
                      <th key={c} scope="col" className="px-4 py-3 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setHistoryId(l.id)} className="text-left font-medium text-slate-900 hover:underline">
                          {l.name}
                        </button>
                        <p className="font-mono text-xs text-slate-500">{l.phone}</p>
                      </td>
                      <td className={cn('px-4 py-3 font-medium tabular-nums', l.balance > 0 ? 'text-red-700' : 'text-green-700')}>
                        {l.balance > 0 ? peso(l.balance) : l.balance < 0 ? `${peso(-l.balance)} credit` : 'Settled'}
                      </td>
                      <td className="px-4 py-3">
                        {l.nextDue ? (
                          <span className="inline-flex items-center gap-2">
                            {l.nextDue}
                            {l.overdue && <Badge tone="red">Overdue</Badge>}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEntryFor({ kind: 'charge', customerId: l.id })}>
                            Charge
                          </Button>
                          <Button size="sm" variant="success" onClick={() => setEntryFor({ kind: 'payment', customerId: l.id })}>
                            Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<MessageSquare className="size-3.5" />}
                            disabled={l.balance <= 0}
                            loading={reminding === l.id}
                            onClick={() => remind(l)}
                          >
                            Remind
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <EntryModal
        target={entryFor}
        customers={ledger.data?.customers ?? []}
        onClose={() => setEntryFor(null)}
        onSaved={() => {
          setEntryFor(null)
          void ledger.reload()
        }}
      />
      <HistoryModal ledger={history} onClose={() => setHistoryId(null)} onChanged={() => void ledger.reload()} />
    </div>
  )
}

interface EntryModalProps {
  target: EntryTarget | null
  customers: { id: string; name: string; phone: string }[]
  onClose: () => void
  onSaved: () => void
}

function EntryModal({ target, customers, onClose, onSaved }: EntryModalProps) {
  return (
    <Modal open={target !== null} onClose={onClose} title={target?.kind === 'payment' ? 'Record a payment' : 'Add a credit charge'}>
      {target && <EntryForm key={`${target.kind}-${target.customerId}`} target={target} customers={customers} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

function EntryForm({ target, customers, onClose, onSaved }: Omit<EntryModalProps, 'target'> & { target: EntryTarget }) {
  const [kind, setKind] = useState<LedgerKind>(target.kind)
  const [customerId, setCustomerId] = useState(target.customerId ?? '')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(localDateKey(new Date(Date.now() + 7 * 86_400_000)))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = Number(amount)
  const valid = customerId !== '' && Number.isFinite(value) && value > 0

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await addLedgerEntry({ customerId, kind, amount: Math.round(value * 100) / 100, dueDate: dueDate || null, note })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the entry')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Entry type" className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {(['charge', 'payment'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn('rounded-md py-1.5 text-sm font-medium', kind === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
          >
            {k === 'charge' ? 'Credit charge' : 'Payment'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ledger-customer" className="block text-sm font-medium text-slate-800">
          Customer
        </label>
        <select
          id="ledger-customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-10 w-full rounded-lg bg-slate-100 px-3 text-sm focus:bg-white focus:ring-3 focus:ring-slate-200 focus:outline-none"
        >
          <option value="">Choose a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone})
            </option>
          ))}
        </select>
        {customers.length === 0 && <p className="text-xs text-slate-500">Add the customer from New Transaction first (returning customer).</p>}
      </div>

      <Input label="Amount (PHP)" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
      {kind === 'charge' && <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
      <Input label="Note (optional)" maxLength={200} placeholder="e.g. 2 comforters, will pay on payday" value={note} onChange={(e) => setNote(e.target.value)} />
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={kind === 'payment' ? 'success' : 'blue'} loading={saving} disabled={!valid} onClick={save}>
          {kind === 'payment' ? 'Record payment' : 'Add charge'}
        </Button>
      </div>
    </div>
  )
}

function HistoryModal({ ledger, onClose, onChanged }: { ledger: CustomerLedger | null; onClose: () => void; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null)

  async function remove(id: string) {
    if (!window.confirm('Delete this entry? This is recorded in the audit log.')) return
    try {
      await deleteLedgerEntry(id)
      setError(null)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the entry')
    }
  }

  return (
    <Modal open={ledger !== null} onClose={onClose} title={ledger ? `${ledger.name}'s ledger` : 'Ledger'} className="max-w-lg">
      {ledger && (
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center text-sm">
            {[
              ['Charged', peso(ledger.charged)],
              ['Paid', peso(ledger.paid)],
              ['Balance', peso(ledger.balance)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <ErrorNote message={error} />
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {ledger.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <Badge tone={e.kind === 'payment' ? 'green' : 'yellow'}>{e.kind === 'payment' ? 'Payment' : 'Charge'}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">{peso(e.amount)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatDateTime(e.createdAt)}
                    {e.dueDate ? `, due ${e.dueDate}` : ''}
                    {e.note ? `, ${e.note}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete entry"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
