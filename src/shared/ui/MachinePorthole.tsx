import { useId } from 'react'
import { motion } from 'motion/react'
import { Wrench } from 'lucide-react'
import type { MachineStatus } from '@/lib/types'
import { cn } from '../cn'

// One full wavelength is 50 units, so sliding the path by -50 loops seamlessly.
const WAVE = 'M0 0 Q12.5 -5 25 0 T50 0 T75 0 T100 0 T125 0 T150 0 T175 0 T200 0 V60 H0 Z'

// Clothes tumbling in the drum, and the same clothes resting in a pile before the machine starts.
const TUMBLING = [
  { cx: 63, cy: 50, fill: '#fda4af' },
  { cx: 43.5, cy: 61.3, fill: '#fde68a' },
  { cx: 43.5, cy: 38.7, fill: '#a5b4fc' },
]
const RESTING = [
  { cx: 41, cy: 70, fill: '#fda4af' },
  { cx: 55, cy: 72, fill: '#fde68a' },
  { cx: 48, cy: 63, fill: '#a5b4fc' },
]

const statusWord: Record<MachineStatus, string> = {
  idle: 'free',
  reserved: 'reserved',
  in_use: 'in use',
  maintenance: 'out of service',
}

interface MachinePortholeProps {
  status: MachineStatus
  label: string
  className?: string
}

/**
 * A washing machine door that mirrors the machine's status:
 * free = empty glass, reserved = clothes waiting in the drum,
 * in use = water rises and the drum turns, maintenance = wrench.
 */
export function MachinePorthole({ status, label, className }: MachinePortholeProps) {
  const clipId = `glass-${useId().replace(/:/g, '')}`

  const ring = {
    idle: 'stroke-slate-300',
    reserved: 'stroke-indigo-400',
    in_use: 'stroke-blue-600',
    maintenance: 'stroke-amber-400',
  }[status]
  const glass = {
    idle: 'fill-slate-50',
    reserved: 'fill-indigo-50',
    in_use: 'fill-blue-50',
    maintenance: 'fill-amber-50',
  }[status]

  return (
    <svg viewBox="0 0 100 100" className={cn('size-24', className)} role="img" aria-label={`${label}, ${statusWord[status]}`}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="36" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="43" fill="none" strokeWidth="7" strokeDasharray={status === 'reserved' ? '12 7' : undefined} className={ring} />
      <circle cx="50" cy="50" r="36" className={glass} />

      {status === 'reserved' && (
        <g clipPath={`url(#${clipId})`}>
          {RESTING.map((c) => (
            <circle key={c.fill} cx={c.cx} cy={c.cy} r="7" fill={c.fill} />
          ))}
        </g>
      )}

      {status === 'in_use' && (
        <g clipPath={`url(#${clipId})`}>
          {/* Mounting this group is what makes the water rise when the cashier starts the machine. */}
          <motion.g initial={{ y: 44 }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }}>
            <g transform="translate(-50 46)">
              <motion.path
                d={WAVE}
                className="fill-blue-400/70"
                animate={{ x: [0, -50] }}
                transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
              />
            </g>
          </motion.g>
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 3.2, ease: 'linear', repeat: Infinity }}>
            {/* Invisible circle keeps the group's centre on the drum so it turns in place. */}
            <circle cx="50" cy="50" r="22" fill="none" />
            {TUMBLING.map((c) => (
              <circle key={c.fill} cx={c.cx} cy={c.cy} r="7" fill={c.fill} />
            ))}
          </motion.g>
        </g>
      )}

      {status === 'maintenance' && (
        <foreignObject x="35" y="35" width="30" height="30">
          <Wrench className="size-[30px] text-amber-500" aria-hidden />
        </foreignObject>
      )}

      {/* Glare on the glass */}
      <path d="M27 42 A25 25 0 0 1 42 27" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}
