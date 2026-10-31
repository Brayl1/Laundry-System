import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { formatDateTime, peso } from '@/lib/format'
import { Card, ErrorNote, Input, PageHeader, PageLoader } from '@/shared/ui'
import { useLoad } from '@/shared/hooks/useLoad'
import { fetchCustomerStats } from './api'

export function CustomersPage() {
  const customers = useLoad(fetchCustomerStats)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (customers.data ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
  }, [customers.data, query])

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={customers.data ? `${customers.data.length} returning customers, highest spenders first` : 'Returning customers'}
      />
      <Card className="mb-4 p-4">
        <Input
          icon={<Search />}
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search customers"
        />
      </Card>
      <div className="mb-4">
        <ErrorNote message={customers.error} />
      </div>

      {!customers.data ? (
        !customers.error && <PageLoader />
      ) : visible.length === 0 ? (
        <Card className="py-12 text-center text-sm text-slate-500">
          {customers.data.length === 0 ? 'No returning customers yet. They are added from New Transaction.' : 'No customers match your search.'}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-600">
              <tr>
                {['Customer', 'Phone', 'Orders', 'Total spent', 'Last order'].map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                  <td className="px-4 py-3 tabular-nums">{c.orderCount}</td>
                  <td className="px-4 py-3 tabular-nums">{peso(c.totalSpent)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
