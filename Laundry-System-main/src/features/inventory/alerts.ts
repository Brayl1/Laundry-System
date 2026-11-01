import type { Machine } from '@/lib/types'

export interface Supply {
  id: string
  name: string
  unit: string
  stock: number
  lowThreshold: number
  usagePerKg: number
}

export const isLow = (s: Supply) => s.lowThreshold > 0 && s.stock <= s.lowThreshold

/** Whole loads left before the machine is due for service (0 once it is due). */
export const loadsLeft = (m: Pick<Machine, 'loads_since_service' | 'service_every'>) =>
  Math.max(m.service_every - m.loads_since_service, 0)

export const isServiceDue = (m: Pick<Machine, 'loads_since_service' | 'service_every'>) => m.loads_since_service >= m.service_every

/** "Soon" is the last 10% of the interval, so the owner can book the technician in advance. */
export const isServiceSoon = (m: Pick<Machine, 'loads_since_service' | 'service_every'>) =>
  !isServiceDue(m) && m.loads_since_service >= m.service_every * 0.9

/** How many orders the remaining stock covers at an average weight, or null if usage is not tracked. */
export function ordersLeft(s: Supply, avgKg = 6): number | null {
  if (s.usagePerKg <= 0) return null
  return Math.floor(s.stock / (s.usagePerKg * avgKg))
}
