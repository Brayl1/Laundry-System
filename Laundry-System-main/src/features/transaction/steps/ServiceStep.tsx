import { Package, Power } from 'lucide-react'
import type { Machine } from '@/lib/types'
import { Card, ErrorNote, MachinePicker, SelectCard } from '@/shared/ui'
import { StepActions } from '../components/StepActions'
import type { WizardDispatch, WizardState } from '../useTransactionWizard'

interface ServiceStepProps {
  state: WizardState
  dispatch: WizardDispatch
  machines: Machine[]
}

const isFree = (m: Machine) => m.status === 'idle'

export function ServiceStep({ state, dispatch, machines }: ServiceStepProps) {
  const selfService = state.serviceType === 'self-service'
  const freeCount = machines.filter(isFree).length
  // A washer picked earlier may have been taken since; treat it as not chosen.
  const chosen = machines.find((m) => m.id === state.machineId && isFree(m))?.id ?? null
  const noMachine = selfService && freeCount === 0

  return (
    <Card title="Select Service Type">
      <div role="radiogroup" aria-label="Service type" className="grid grid-cols-2 gap-3">
        <SelectCard
          group="service"
          icon={<Power />}
          label="Self-Service"
          hint={`Customer loads the machine · ${freeCount} free`}
          selected={selfService}
          onSelect={() => dispatch({ type: 'setServiceType', value: 'self-service' })}
        />
        <SelectCard
          group="service"
          icon={<Package />}
          label="Full-Service"
          hint="Handled by staff"
          selected={!selfService}
          onSelect={() => dispatch({ type: 'setServiceType', value: 'full-service' })}
        />
      </div>

      <p className="mt-6 text-sm font-medium text-slate-900">{selfService ? 'Choose a washer' : 'Assign a washer (optional)'}</p>
      <p className="mt-0.5 mb-3 text-xs text-slate-500">
        {selfService
          ? 'The washer is held for this order and switches to In use when you confirm the clothes are loaded.'
          : 'You can also pick the washer later, when you start washing.'}
      </p>
      <MachinePicker
        label="Washer"
        machines={machines}
        value={chosen}
        onChange={(id) => dispatch({ type: 'setMachine', value: id })}
        isAvailable={isFree}
        optional={!selfService}
      />

      {noMachine && (
        <div className="mt-4">
          <ErrorNote message="All washers are busy. Choose Full-Service or free a washer first." />
        </div>
      )}
      <StepActions
        onBack={() => dispatch({ type: 'back' })}
        onNext={() => dispatch({ type: 'next' })}
        nextDisabled={selfService && chosen === null}
      />
    </Card>
  )
}
