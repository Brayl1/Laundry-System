import { Link } from 'react-router-dom'
import { ClipboardList, DollarSign, ShoppingBag, WashingMachine } from 'lucide-react'
import type { OrderStatus } from '@/lib/types'
import { customerTypeLabel, formatDateTime, orderStatusLabel, peso, serviceTypeLabel } from '@/lib/format'
import { Badge, Card, ErrorNote, PageHeader, PageLoader, type BadgeTone } from '@/shared/ui'
import { InventoryAlerts } from '@/features/inventory'
import { DailyChart, StatTile } from '@/features/reports'
import { machineStatusMeta } from '@/features/settings'
import { useOverview } from './useOverview'

const statusTone: Record<OrderStatus, BadgeTone> = {
  pending: 'yellow',
  washing: 'blue',
  done: 'green',
  claimed: 'slate',
}

const integer = (n: number) => Math.round(n).toString()

export function OverviewPage() {
  const { overview, error } = useOverview()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      <PageHeader title="Overview" subtitle={`${today}. Updates live as orders come in.`} />
      <div className="mb-4">
        <ErrorNote message={error} />
      </div>

      {!overview ? (
        !error && <PageLoader />
      ) : (
        <div className="space-y-5">
          <InventoryAlerts />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile index={0} label="Today's Income" value={overview.today.income} format={peso} icon={<DollarSign />} tone="bg-green-100 text-green-700" />
            <StatTile index={1} label="Today's Orders" value={overview.today.orders} format={integer} icon={<ShoppingBag />} tone="bg-blue-100 text-blue-700" />
            <StatTile index={2} label="Active Orders" value={overview.active.length} format={integer} caption="pending or washing" icon={<ClipboardList />} tone="bg-amber-100 text-amber-700" />
            <StatTile
              index={3}
              label="Idle Machines"
              value={overview.machines.filter((m) => m.status === 'idle').length}
              format={integer}
              caption={`of ${overview.machines.length} machines`}
              icon={<WashingMachine />}
              tone="bg-purple-100 text-purple-700"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Last 7 days" className="lg:col-span-2">
              <DailyChart data={overview.week.daily} />
            </Card>
            <Card title="Machines" actions={<Link to="/admin/machines" className="text-sm text-blue-700 hover:underline">Manage</Link>}>
              {overview.machines.length === 0 ? (
                <p className="text-sm text-slate-500">No machines yet.</p>
              ) : (
                <ul className="space-y-2">
                  {overview.machines.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{m.label}</span>
                      <Badge tone={machineStatusMeta[m.status].tone}>{machineStatusMeta[m.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            title="Recent orders"
            actions={<Link to="/admin/orders" className="text-sm text-blue-700 hover:underline">View all</Link>}
            className="p-0"
          >
            {overview.recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-500">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="border-y border-slate-200 text-xs text-slate-600">
                    <tr>
                      {['Order ID', 'Date/Time', 'Customer', 'Service', 'Amount', 'Status'].map((c) => (
                        <th key={c} scope="col" className="px-4 py-2.5 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recent.map((o) => (
                      <tr key={o.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{o.code}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                        <td className="px-4 py-2.5">{o.customerName ?? customerTypeLabel[o.customerType]}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{serviceTypeLabel[o.serviceType]}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{peso(o.total)}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={statusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
