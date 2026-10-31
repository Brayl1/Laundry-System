import { AnimatePresence, motion } from 'motion/react'
import { User, UserPlus } from 'lucide-react'
import { Card, SelectCard } from '@/shared/ui'
import { CustomerLookup } from '../components/CustomerLookup'
import { StepActions } from '../components/StepActions'
import { canAdvance, type WizardDispatch, type WizardState } from '../useTransactionWizard'

export function CustomerStep({ state, dispatch }: { state: WizardState; dispatch: WizardDispatch }) {
  return (
    <Card title="Select Customer Type">
      <div role="radiogroup" className="grid grid-cols-2 gap-3">
        <SelectCard
          group="customer"
          icon={<User />}
          label="Walk-in Customer"
          selected={state.customerType === 'walk-in'}
          onSelect={() => dispatch({ type: 'setCustomerType', value: 'walk-in' })}
        />
        <SelectCard
          group="customer"
          icon={<UserPlus />}
          label="Returning Customer"
          selected={state.customerType === 'returning'}
          onSelect={() => dispatch({ type: 'setCustomerType', value: 'returning' })}
        />
      </div>
      <AnimatePresence initial={false}>
        {state.customerType === 'returning' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <CustomerLookup selected={state.customer} onSelect={(c) => dispatch({ type: 'setCustomer', value: c })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <StepActions onNext={() => dispatch({ type: 'next' })} nextDisabled={!canAdvance(state)} />
    </Card>
  )
}
