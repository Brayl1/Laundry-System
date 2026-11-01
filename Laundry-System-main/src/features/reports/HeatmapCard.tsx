import { WEEKDAYS, type Heatmap } from './stats'

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`
const fullHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

/** Busiest days and hours. Darker blue means more orders, so the owner can see when to add staff. */
export function HeatmapCard({ heatmap }: { heatmap: Heatmap }) {
  if (!heatmap.peak) return <p className="text-sm text-slate-500">No orders in this range yet.</p>
  const { peak } = heatmap

  return (
    <div>
      <p className="mb-3 text-sm text-slate-700">
        Busiest: <span className="font-medium">{WEEKDAYS[peak.day]} at {fullHour(peak.hour)}</span> ({peak.count} order{peak.count > 1 ? 's' : ''})
      </p>
      <div className="overflow-x-auto pb-1">
        <table className="border-separate border-spacing-0.5 text-[10px] text-slate-500" aria-label="Orders by weekday and hour">
          <thead>
            <tr>
              <th aria-hidden />
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} scope="col" className="min-w-6 font-normal">
                  {h % 3 === 0 ? hourLabel(h) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.cells.map((row, day) => (
              <tr key={WEEKDAYS[day]}>
                <th scope="row" className="pr-2 text-left font-medium">
                  {WEEKDAYS[day]}
                </th>
                {row.map((count, hour) => (
                  <td
                    key={hour}
                    title={`${WEEKDAYS[day]} ${fullHour(hour)}: ${count} order${count === 1 ? '' : 's'}`}
                    className="size-6 rounded-md"
                    style={{ backgroundColor: count === 0 ? 'rgb(120 140 180 / 0.10)' : `rgb(37 99 235 / ${0.18 + (count / heatmap.max) * 0.77})` }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        Quiet
        {[0.18, 0.4, 0.6, 0.8, 0.95].map((a) => (
          <span key={a} className="size-3.5 rounded" style={{ backgroundColor: `rgb(37 99 235 / ${a})` }} />
        ))}
        Busy
      </p>
    </div>
  )
}
