import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '../cn'

interface SelectCardProps {
  selected: boolean
  onSelect: () => void
  icon: ReactNode
  label: string
  hint?: string
  /** Cards sharing a group animate one highlight ring between them. */
  group: string
}

export function SelectCard({ selected, onSelect, icon, label, hint, group }: SelectCardProps) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-white px-4 py-5 text-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        selected ? 'border-transparent bg-blue-50/70' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      {selected && (
        <motion.span
          layoutId={`select-ring-${group}`}
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-500"
          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        />
      )}
      <span className="text-blue-600 [&_svg]:size-7">{icon}</span>
      <span className="font-medium text-slate-900">{label}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </motion.button>
  )
}
