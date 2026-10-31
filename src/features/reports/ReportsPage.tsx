import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { DollarSign, Download, ShoppingBag, TrendingUp, Users } from 'lucide-react'
import type { OrderDetail } from '@/lib/types'
import { peso } from '@/lib/format'
import { cn } from '@/shared/cn'
import { Button, Card, ErrorNote, PageHeader, PageLoader } from '@/shared/ui'
import { fetchOrdersSince } from './api'
import { exportOrdersCsv } from './exportCsv'
import { DailyChart } from './DailyChart'
import { PaymentPie } from './PaymentPie'
import { StatTile } from './StatTile'
import { RANGES, rangeStart, summarize, type RangeKey } from './stats'

const integer = (n: number) => Math.round(n).toString()
const kilos = (n: number) => n.toFixed(1)

export function ReportsPage() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [orders, setOrders] = useState<OrderDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useMemo(() => rangeStart(range), [range])

  useEffect(() => {
    let cancelled = false
    setOrders(null)
    fetchOrdersSince(start)
      .then((data) => !cancelled && setOrders(data))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [start])

  const summary = useMemo(() => (orders ? summarize(orders, start) : null), [orders, start])

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Sales and statistics"
        actions={
          <Button
            icon={<Download className="size-4" />}
            onClick={() => orders && exportOrdersCsv(orders)}
            disabled={!orders?.length}
          >
            Export to CSV
          </Button>
        }
      />

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={range === r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              'relative rounded-md px-3 py-1.5 text-sm transition-colors',
              range === r.key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {range === r.key && (
              <motion.span layoutId="range-pill" className="absolute inset-0 rounded-md bg-white shadow-sm" />
            )}
            <span className="relative">{r.label}</span>
          </button>
        ))}
      </div>

      <ErrorNote message={error} />

      {!summary ? (
        !error && <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile index={0} label="Total Orders" value={summary.totalOrders} format={integer} icon={<Users />} tone="bg-blue-100 text-blue-700" />
            <StatTile index={1} label="Total Weight" value={summary.totalWeight} format={kilos} caption="kg processed" icon={<ShoppingBag />} tone="bg-purple-100 text-purple-700" />
            <StatTile index={2} label="Total Income" value={summary.totalIncome} format={peso} icon={<DollarSign />} tone="bg-green-100 text-green-700" />
            <StatTile index={3} label="Avg Order Value" value={summary.avgOrderValue} format={peso} icon={<TrendingUp />} tone="bg-orange-100 text-orange-700" />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Daily Performance" className="lg:col-span-2">
              <DailyChart data={summary.daily} />
            </Card>
            <Card title="Payment Methods">
              <PaymentPie counts={summary.payments} />
            </Card>
          </div>

          <Card title="Summary Breakdown">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Walk-in Customers', summary.walkIn],
                ['Returning Customers', summary.returning],
                ['Self-Service', summary.selfService],
                ['Full-Service', summary.fullService],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 text-xl font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
    </div>
  )
}
