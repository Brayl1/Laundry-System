import type { ReactNode } from 'react'
import { AnimatedNumber, FadeIn } from '@/shared/ui'
import { cn } from '@/shared/cn'

interface StatTileProps {
  label: string
  value: number
  format: (n: number) => string
  icon: ReactNode
  /** Tailwind classes for the icon chip. */
  tone: string
  caption?: string
  index: number
}

export function StatTile({ label, value, format, icon, tone, caption, index }: StatTileProps) {
  return (
    <FadeIn index={index} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <AnimatedNumber value={value} format={format} className="mt-1 block text-2xl font-medium tabular-nums" />
        {caption && <p className="text-xs text-slate-500">{caption}</p>}
      </div>
      <span className={cn('flex size-9 items-center justify-center rounded-lg [&_svg]:size-4', tone)}>{icon}</span>
    </FadeIn>
  )
}
