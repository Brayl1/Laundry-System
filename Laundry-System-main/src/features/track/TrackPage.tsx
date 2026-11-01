import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { db } from '@/lib/untyped'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/shared/cn'
import { PageLoader } from '@/shared/ui'

type TrackStatus = 'pending' | 'washing' | 'done' | 'claimed'

interface Tracked {
  code: string
  status: TrackStatus
  createdAt: string
  updatedAt: string
}

/** What the customer reads for each stage. */
const stages: { status: TrackStatus; title: string; text: string }[] = [
  { status: 'pending', title: 'Received', text: 'We have your laundry and it is in the queue.' },
  { status: 'washing', title: 'Washing', text: 'Your laundry is being washed.' },
  { status: 'done', title: 'Ready for pickup', text: 'Come by any time during opening hours.' },
  { status: 'claimed', title: 'Picked up', text: 'Thank you for choosing us!' },
]

async function fetchTracked(code: string): Promise<Tracked | null> {
  const { data, error } = await db.rpc('track_order', { p_code: code })
  if (error) throw new Error(error.message)
  const row = (data as { code: string; status: TrackStatus; created_at: string; updated_at: string }[] | null)?.[0]
  return row ? { code: row.code, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at } : null
}

/** Public page linked from the drop-off SMS. It shows progress only, never names, prices or phone numbers. */
export function TrackPage() {
  const { code = '' } = useParams()
  const [order, setOrder] = useState<Tracked | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchTracked(code)
        .then((o) => !cancelled && (setOrder(o), setError(null)))
        .catch((e: Error) => !cancelled && setError(e.message))
    load()
    const timer = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [code])

  const current = order ? stages.findIndex((s) => s.status === order.status) : -1

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Track your laundry</h1>
      <p className="mt-1 font-mono text-sm text-slate-500">{code}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : order === undefined ? (
          <PageLoader />
        ) : order === null ? (
          <p className="text-sm text-slate-600">We could not find that order. Check the link in your text message.</p>
        ) : (
          <>
            <ol className="space-y-5">
              {stages.map((s, i) => {
                const done = i < current
                const active = i === current
                return (
                  <li key={s.status} className="flex gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                        done && 'bg-green-600 text-white',
                        active && 'bg-blue-600 text-white ring-4 ring-blue-100',
                        !done && !active && 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <div>
                      <p className={cn('text-sm font-medium', active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400')}>
                        {s.title}
                        {active && <span className="sr-only"> (current step)</span>}
                      </p>
                      {active && <p className="text-sm text-slate-500">{s.text}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-500">Last updated {formatDateTime(order.updatedAt)}</p>
          </>
        )}
      </div>
    </main>
  )
}
