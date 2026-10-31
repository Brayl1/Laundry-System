import { useMemo, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import { ORDER_STATUSES, type OrderDetail, type OrderStatus } from '@/lib/types'
import { orderStatusLabel } from '@/lib/format'
import { Card, ErrorNote, Input, PageHeader, PageLoader } from '@/shared/ui'
import { ReceiptModal } from '@/features/receipt'
import { OrdersTable } from './OrdersTable'
import { useOrders } from './useOrders'

type StatusFilter = OrderStatus | 'all' | 'active'

interface OngoingOrdersPageProps {
  title?: string
  subtitle?: string
  /** Shows a "Back to Dashboard" link (the cashier POS uses it; the admin panel has a sidebar instead). */
  backTo?: string
  emptyMessage?: string
}

export function OngoingOrdersPage({
  title = 'Ongoing Orders',
  subtitle,
  backTo,
  emptyMessage = 'No orders yet.',
}: OngoingOrdersPageProps) {
  const { orders, error, setStatus } = useOrders()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [printing, setPrinting] = useState<OrderDetail | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (orders ?? []).filter((o) => {
      if (filter === 'active' && (o.status === 'done' || o.status === 'claimed')) return false
      if (filter !== 'all' && filter !== 'active' && o.status !== filter) return false
      if (!q) return true
      return [o.code, o.cashierName, o.customerName ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [orders, query, filter])

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} backTo={backTo} />
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              icon={<Search />}
              placeholder="Search by Order ID, Cashier or Customer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search orders"
            />
          </div>
          <label className="relative flex items-center">
            <Filter className="pointer-events-none absolute left-3 size-4 text-slate-400" aria-hidden />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
              aria-label="Filter by status"
              className="h-10 rounded-lg border border-transparent bg-slate-100 pr-8 pl-9 text-sm focus:border-slate-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active (not done)</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="mb-4">
        <ErrorNote message={error} />
      </div>

      {!orders ? (
        <PageLoader />
      ) : visible.length === 0 ? (
        <Card className="py-12 text-center text-sm text-slate-500">
          {orders.length === 0 ? emptyMessage : 'No orders match your search.'}
        </Card>
      ) : (
        <OrdersTable orders={visible} onStatusChange={setStatus} onPrint={setPrinting} />
      )}

      <ReceiptModal order={printing} onClose={() => setPrinting(null)} />
    </div>
  )
}
