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
        'inline-flex items-center justify-center rounded-xl text-white shadow-sm',
        tone === 'blue' ? 'bg-blue-600' : 'bg-slate-900 ring-1 ring-white/20',
        size === 'lg' ? 'size-14 [&_svg]:size-7' : 'size-9 [&_svg]:size-5',
      )}
    >
      <Droplet />
    </span>
  )
}
