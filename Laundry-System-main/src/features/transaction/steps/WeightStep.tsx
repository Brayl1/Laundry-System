import { AnimatePresence, motion } from 'motion/react'
import { Weight } from 'lucide-react'
import { peso } from '@/lib/format'
import { AnimatedNumber, Card, Input } from '@/shared/ui'
import { StepActions } from '../components/StepActions'
import { MAX_WEIGHT_KG, parseWeight } from '../pricing'
import { canAdvance, type WizardDispatch, type WizardState } from '../useTransactionWizard'

interface WeightStepProps {
  state: WizardState
  dispatch: WizardDispatch
  pricePerKg: number
}

export function WeightStep({ state, dispatch, pricePerKg }: WeightStepProps) {
  const weight = parseWeight(state.weightInput)
  const tooHeavy = Number(state.weightInput) > MAX_WEIGHT_KG
  return (
    <Card title="Enter Laundry Weight">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          dispatch({ type: 'next' })
        }}
      >
        <Input
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          icon={<Weight />}
          placeholder="0.0"
          value={state.weightInput}
          onChange={(e) => dispatch({ type: 'setWeight', value: e.target.value })}
          error={tooHeavy ? `Maximum is ${MAX_WEIGHT_KG} kg per order` : undefined}
          autoFocus
        />
        <AnimatePresence>
          {weight !== null && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-5 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-4 text-sm"
            >
              <span className="text-slate-600">
                {weight} kg × {peso(pricePerKg, pricePerKg % 1 !== 0)}
              </span>
              <AnimatedNumber value={weight * pricePerKg} format={peso} className="font-medium text-blue-600" />
            </motion.div>
          )}
        </AnimatePresence>
        <StepActions
          onBack={() => dispatch({ type: 'back' })}
          onNext={() => dispatch({ type: 'next' })}
          nextDisabled={!canAdvance(state)}
        />
      </form>
    </Card>
  )
}
