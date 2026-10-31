import type { OrderDetail, PaymentMethod } from '@/lib/types'
import { localDateKey } from '@/lib/format'

export type RangeKey = 'today' | '7d' | '30d' | 'all'

export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: null },
]

/** Start of the range in local time, or null for all time. */
export function rangeStart(key: RangeKey, now = new Date()): Date | null {
  const days = RANGES.find((r) => r.key === key)?.days
  if (!days) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (days - 1))
  return start
}

export interface DailyPoint {
  date: string
  label: string
  income: number
  orders: number
}

export interface ReportSummary {
  totalOrders: number
  totalWeight: number
  totalIncome: number
  avgOrderValue: number
  daily: DailyPoint[]
  payments: Record<PaymentMethod, number>
  walkIn: number
  returning: number
  selfService: number
  fullService: number
}

const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function summarize(orders: OrderDetail[], start: Date | null, now = new Date()): ReportSummary {
  const byDay = new Map<string, DailyPoint>()

  // With a fixed range, show every day (including empty ones) so gaps are visible.
  if (start) {
    for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      byDay.set(localDateKey(d), { date: localDateKey(d), label: dayLabel(d), income: 0, orders: 0 })
    }
  }

  const summary: ReportSummary = {
    totalOrders: orders.length,
    totalWeight: 0,
    totalIncome: 0,
    avgOrderValue: 0,
    daily: [],
    payments: { cash: 0, qr: 0 },
    walkIn: 0,
    returning: 0,
    selfService: 0,
    fullService: 0,
  }

  for (const o of orders) {
    summary.totalWeight += o.weightKg
    summary.totalIncome += o.total
    summary.payments[o.paymentMethod] += 1
    if (o.customerType === 'walk-in') summary.walkIn += 1
    else summary.returning += 1
    if (o.serviceType === 'self-service') summary.selfService += 1
    else summary.fullService += 1

    const created = new Date(o.createdAt)
    const key = localDateKey(created)
    const point = byDay.get(key) ?? { date: key, label: dayLabel(created), income: 0, orders: 0 }
    point.income += o.total
    point.orders += 1
    byDay.set(key, point)
  }

  summary.totalWeight = Math.round(summary.totalWeight * 100) / 100
  summary.totalIncome = Math.round(summary.totalIncome * 100) / 100
  summary.avgOrderValue = orders.length ? Math.round((summary.totalIncome / orders.length) * 100) / 100 : 0
  summary.daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  return summary
}
