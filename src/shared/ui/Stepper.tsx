import { Fragment } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

interface StepperProps {
  steps: string[]
  /** Zero-based index of the current step. */
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-start" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <Fragment key={label}>
            <li className="flex w-14 shrink-0 flex-col items-center gap-1.5" aria-current={active ? 'step' : undefined}>
              <motion.span
                animate={{
                  backgroundColor: done ? '#16a34a' : active ? '#2563eb' : '#e2e8f0',
                  color: done || active ? '#ffffff' : '#64748b',
                  scale: active ? 1.08 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="flex size-8 items-center justify-center rounded-full text-xs font-medium"
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </motion.span>
              <span className={active ? 'text-xs font-medium text-slate-900' : 'text-xs text-slate-500'}>{label}</span>
            </li>
            {i < steps.length - 1 && (
              <li aria-hidden className="relative mx-1 mt-4 h-0.5 flex-1 overflow-hidden rounded bg-slate-200">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-green-600"
                  initial={false}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
