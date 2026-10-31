import { Banknote, QrCode } from 'lucide-react'
import { peso } from '@/lib/format'
import { AnimatedNumber, Card, ErrorNote, SelectCard } from '@/shared/ui'
import { StepActions } from '../components/StepActions'
import type { WizardDispatch, WizardState } from '../useTransactionWizard'

interface PaymentStepProps {
  state: WizardState
  dispatch: WizardDispatch
  total: number
  submitting: boolean
  error: string | null
  onConfirm: () => void
}

export function PaymentStep({ state, dispatch, total, submitting, error, onConfirm }: PaymentStepProps) {
  return (
    <Card title="Payment">
      <div className="rounded-lg bg-blue-50 py-5 text-center">
        <p className="text-sm text-slate-600">Total Amount</p>
        <AnimatedNumber value={total} format={peso} className="mt-1 block text-3xl font-medium text-blue-600" />
      </div>
      <p className="mt-5 mb-2 text-sm font-medium">Select Payment Method</p>
      <div role="radiogroup" className="grid grid-cols-2 gap-3">
        <SelectCard
          group="payment"
          icon={<Banknote />}
          label="Cash"
          selected={state.paymentMethod === 'cash'}
          onSelect={() => dispatch({ type: 'setPayment', value: 'cash' })}
        />
        <SelectCard
          group="payment"
          icon={<QrCode />}
          label="QR Code"
          hint="GCash / PayMaya"
          selected={state.paymentMethod === 'qr'}
          onSelect={() => dispatch({ type: 'setPayment', value: 'qr' })}
        />
      </div>
      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}
      <StepActions
        onBack={() => dispatch({ type: 'back' })}
        onNext={onConfirm}
        nextLabel="Confirm Payment"
        nextVariant="success"
        loading={submitting}
      />
    </Card>
  )
}
