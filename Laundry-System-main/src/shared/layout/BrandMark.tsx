import { Droplet } from 'lucide-react'
import { cn } from '../cn'

interface BrandMarkProps {
  size?: 'md' | 'lg'
  /** `blue` is the cashier POS, `dark` is the admin panel. */
  tone?: 'blue' | 'dark'
}

export function BrandMark({ size = 'md', tone = 'blue' }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'gloss inline-flex items-center justify-center rounded-xl text-white',
        tone === 'blue' ? 'bg-blue-600/90' : 'bg-slate-900/90 ring-1 ring-white/20',
        size === 'lg' ? 'size-14 [&_svg]:size-7' : 'size-9 [&_svg]:size-5',
      )}
    >
      <Droplet />
    </span>
  )
}
