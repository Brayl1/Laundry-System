import { Droplet } from 'lucide-react'
import { cn } from '../cn'

interface BrandMarkProps {
  size?: 'md' | 'lg'
  /** `blue` is the cashier POS, `dark` is the admin panel. */
  tone?: 'blue' | 'dark'
}

/** The logo is a liquid-glass blob with a drop in it. The large one (login) slowly changes shape. */
export function BrandMark({ size = 'md', tone = 'blue' }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'liquid inline-flex items-center justify-center text-white',
        tone === 'dark' && 'liquid-ink',
        size === 'lg' ? 'liquid-morph size-16 [&_svg]:size-8' : 'size-10 [&_svg]:size-5',
      )}
    >
      <Droplet className="relative z-10 drop-shadow-sm" aria-hidden />
    </span>
  )
}
