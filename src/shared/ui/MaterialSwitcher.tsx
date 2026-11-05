import { useId } from 'react'
import { motion } from 'motion/react'
import { Droplets, Layers, Square } from 'lucide-react'
import { MATERIALS, useMaterial, type Material } from '../hooks/useMaterial'
import { cn } from '../cn'

const icons: Record<Material, typeof Droplets> = { liquid: Droplets, glass: Layers, soft: Square }

interface MaterialSwitcherProps {
  /** Icons only. */
  compact?: boolean
  className?: string
}

/** Switches the whole app between liquid glass, glassmorphism and neumorphism. */
export function MaterialSwitcher({ compact, className }: MaterialSwitcherProps) {
  const { material, setMaterial } = useMaterial()
  const group = useId()
  return (
    <div role="radiogroup" aria-label="Surface style" className={cn('inline-flex rounded-full bg-slate-100 p-1', className)}>
      {MATERIALS.map(({ id, label }) => {
        const Icon = icons[id]
        const active = material === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setMaterial(id)}
            className={cn(
              'relative flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500',
              active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {active && (
              <motion.span
                layoutId={`material-pill-${group}`}
                className="neu-sm absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="size-3.5" aria-hidden />
              {!compact && label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
