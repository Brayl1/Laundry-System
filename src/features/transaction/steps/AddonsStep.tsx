import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import type { Addon } from '@/lib/types'
import { peso } from '@/lib/format'
import { cn } from '@/shared/cn'
import { Card } from '@/shared/ui'
import { Breakdown } from '../components/Breakdown'
import { StepActions } from '../components/StepActions'
import type { Quote } from '../pricing'
import type { WizardDispatch, WizardState } from '../useTransactionWizard'

interface AddonsStepProps {
  state: WizardState
  dispatch: WizardDispatch
  addons: Addon[]
  weightKg: number
  quote: Quote
}

export function AddonsStep({ state, dispatch, addons, weightKg, quote }: AddonsStepProps) {
  return (
    <Card title="Add-ons (Optional)">
      <div className="space-y-2.5">
        {addons.map((addon, i) => {
          const checked = state.addonIds.includes(addon.id)
          return (
            <motion.label
              key={addon.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                checked ? 'border-blue-500 bg-blue-50/70' : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => dispatch({ type: 'toggleAddon', id: addon.id })}
              />
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded border transition-colors',
                  checked ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white',
                )}
                aria-hidden
              >
                <motion.span initial={false} animate={{ scale: checked ? 1 : 0 }}>
                  <Check className="size-3" strokeWidth={3} />
                </motion.span>
              </span>
              <span className="flex-1">{addon.name}</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium">+ {peso(addon.price, false)}</span>
            </motion.label>
          )
        })}
        {addons.length === 0 && <p className="text-sm text-slate-500">No add-ons configured.</p>}
      </div>
      <Breakdown weightKg={weightKg} quote={quote} />
      <StepActions
        onBack={() => dispatch({ type: 'back' })}
        onNext={() => dispatch({ type: 'next' })}
        nextLabel="Continue to Payment"
      />
    </Card>
  )
}
