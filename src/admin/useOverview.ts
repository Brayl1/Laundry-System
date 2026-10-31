import { useCallback, useEffect, useState } from 'react'
import type { Machine, OrderDetail } from '@/lib/types'
import { fetchMachines } from '@/features/settings'
import { fetchOrders, subscribeToOrders } from '@/features/orders'
import { fetchOrdersSince, rangeStart, summarize, type ReportSummary } from '@/features/reports'

export interface Overview {
  /** Last 7 days, with empty days included, for the chart. */
  week: ReportSummary
  today: { income: number; orders: number }
  active: OrderDetail[]
  recent: OrderDetail[]
  machines: Machine[]
}

/** Loads the dashboard figures and refreshes them whenever any till creates or updates an order. */
export function useOverview() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    const start = rangeStart('7d')
    Promise.all([fetchOrdersSince(start), fetchOrders(), fetchMachines()])
      .then(([weekOrders, latest, machines]) => {
        const week = summarize(weekOrders, start)
        const todayPoint = week.daily.at(-1)
        setOverview({
          week,
          today: { income: todayPoint?.income ?? 0, orders: todayPoint?.orders ?? 0 },
          active: latest.filter((o) => o.status === 'pending' || o.status === 'washing'),
          recent: latest.slice(0, 6),
          machines,
        })
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToOrders(refresh)
  }, [refresh])

  return { overview, error }
}
