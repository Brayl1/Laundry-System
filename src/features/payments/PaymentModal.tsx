import { useState } from 'react'
import type { OrderDetail, PaymentMethod } from '@/lib/types'
import { peso } from '@/lib/format'
import { orderBalance } from '@/lib/orderDetail'
import { Button, ErrorNote, Input, Modal } from '@/shared/ui'
import { cn } from '@/shared/cn'

interface PaymentModalProps {
  order: OrderDetail | null
  /** True when the dialog opened because the customer is collecting the laundry. */
  atPickup: boolean
  onClose: () => void
  onPay: (order: OrderDetail, amount: number, method: PaymentMethod, referenceNo: string) => Promise<void>
  /** Hand the laundry over without paying. The balance stays on the order (BR21). */
  onReleaseUnpaid: (order: OrderDetail) => void
}

/** Records a later payment on an order: the storage charge at pickup, or any balance still owed (BR18 to BR21). */
export function PaymentModal({ order, atPickup, onClose, onPay, onReleaseUnpaid }: PaymentModalProps) {
  return (
    <Modal open={order !== null} onClose={onClose} title={atPickup ? 'Payment before pickup' : 'Record a payment'} className="max-w-md">
      {order && <PaymentForm order={order} atPickup={atPickup} onClose={onClose} onPay={onPay} onReleaseUnpaid={onReleaseUnpaid} />}
    </Modal>
  )
}

function PaymentForm({ order, atPickup, onClose, onPay, onReleaseUnpaid }: Omit<PaymentModalProps, 'order'> & { order: OrderDetail }) {
  const balance = orderBalance(order)
  const [amount, setAmount] = useState(balance.toFixed(2))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = Number(amount)
  const valid = Number.isFinite(value) && value > 0 && value <= balance

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onPay(order, value, method, reference)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the payment')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{order.customerName ?? 'Walk-in'}</span>, #{order.code.slice(-4)}
      </p>

      <dl className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Price</dt>
          <dd className="tabular-nums">{peso(order.total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Storage charge</dt>
          <dd className="tabular-nums">{peso(order.storageCharge)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Paid so far</dt>
          <dd className="tabular-nums">{peso(order.amountPaid)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 font-medium">
          <dt>Balance due</dt>
          <dd className="tabular-nums">{peso(balance)}</dd>
        </div>
      </dl>

      <Input label="Amount (PHP)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />

      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2">
        {(['cash', 'qr'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={cn(
              'h-11 rounded-xl border-2 text-sm font-medium',
              method === m ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:border-slate-300',
            )}
          >
            {m === 'cash' ? 'Cash' : 'GCash / QR'}
          </button>
        ))}
      </div>
      {method === 'qr' && <Input label="GCash reference no. (optional)" maxLength={50} value={reference} onChange={(e) => setReference(e.target.value)} />}

      {value > balance && <p className="text-xs text-red-600">The amount is more than the balance due.</p>}
      <ErrorNote message={error} />

      <div className="grid gap-2 pt-1">
        <Button variant="success" loading={saving} disabled={!valid} onClick={save}>
          {atPickup ? 'Record payment' : 'Save payment'}
        </Button>
        {atPickup && (
          <Button variant="outline" disabled={saving} onClick={() => onReleaseUnpaid(order)}>
            Hand over without paying
          </Button>
        )}
      </div>
    </div>
  )
}
