import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PaymentMethod } from '@/lib/types'
import { paymentMethodLabel } from '@/lib/format'

// Blue/amber passes the CVD separation check; the original blue/purple pair does not.
const COLORS: Record<PaymentMethod, string> = { cash: '#2563eb', qr: '#d97706' }
const METHODS: PaymentMethod[] = ['cash', 'qr']

export function PaymentPie({ counts }: { counts: Record<PaymentMethod, number> }) {
  const total = counts.cash + counts.qr
  const data = METHODS.map((m) => ({ method: m, name: paymentMethodLabel[m], value: counts[m] }))
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  return (
    <div>
      <div className="h-44" role="img" aria-label={`Payment methods: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
        {total === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">No payments yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="90%"
                stroke="#ffffff"
                strokeWidth={2}
                animationDuration={600}
              >
                {data.map((d) => (
                  <Cell key={d.method} fill={COLORS[d.method]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${pct(value)}%)`, name]}
                contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Legend doubles as the data table: label, count and share for each slice. */}
      <ul className="mt-4 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.method} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: COLORS[d.method] }} aria-hidden />
              {d.name} payments
            </span>
            <span className="tabular-nums text-slate-900">
              {d.value} <span className="text-slate-500">· {pct(d.value)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
