import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import { peso } from '@/lib/format'
import type { DailyPoint } from './stats'

const BAR = '#2563eb'
const INK_MUTED = '#64748b'
const GRID = '#e2e8f0'

function DailyTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as DailyPoint | undefined
  if (!active || !point) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{point.label}</p>
      <p className="text-slate-600">
        Income: <span className="font-medium text-slate-900">{peso(point.income)}</span>
      </p>
      <p className="text-slate-600">
        Orders: <span className="font-medium text-slate-900">{point.orders}</span>
      </p>
    </div>
  )
}

export function DailyChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-slate-500">No sales in this range.</p>
  }
  return (
    <div className="h-64" role="img" aria-label="Daily income bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK_MUTED, fontSize: 12 }} />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            tickFormatter={(v: number) => peso(v, false)}
            allowDecimals={false}
          />
          <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="income" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={56} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
