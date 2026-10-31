import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Plus } from 'lucide-react'
import { useAuth } from '@/features/auth'
import type { OrderDetail } from '@/lib/types'
import { AnimatedNumber, Button, Card, ErrorNote, MachinePorthole, PageLoader } from '@/shared/ui'
import { useClock } from '@/shared/hooks/useClock'
import { cn } from '@/shared/cn'
import { QueueBoard } from './QueueBoard'
import { StartWashingModal } from './StartWashingModal'
import { useBoard } from './useBoard'

const MotionLink = motion.create(Link)
const integer = (n: number) => Math.round(n).toString()

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { board, error, advance, start } = useBoard()
  const [starting, setStarting] = useState<OrderDetail | null>(null)
  const clock = useClock(30_000)
  const now = clock.getTime()

  const firstName = profile?.display_name.split(' ')[0] ?? ''
  const idle = board?.machines.filter((m) => m.status === 'idle').length ?? 0
  const ready = board?.active.filter((o) => o.status === 'done').length ?? 0

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {greeting(clock.getHours())}, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            {clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <MotionLink
          to="/transaction"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex h-14 items-center gap-3 rounded-xl bg-blue-600 px-7 text-base font-medium text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <Plus className="size-5" aria-hidden /> New transaction
        </MotionLink>
      </section>

      <ErrorNote message={error} />

      {!board ? (
        !error && <PageLoader />
      ) : (
        <>
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-slate-500">orders today</dt>
              <dd className="text-4xl font-semibold tabular-nums text-slate-900">
                <AnimatedNumber value={board.todayCount} format={integer} />
              </dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-slate-500">ready for pickup</dt>
              <dd className={cn('text-4xl font-semibold tabular-nums', ready > 0 ? 'text-green-600' : 'text-slate-900')}>
                <AnimatedNumber value={ready} format={integer} />
              </dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-sm text-slate-500">washers free</dt>
              <dd className="text-4xl font-semibold tabular-nums text-slate-900">
                <AnimatedNumber value={idle} format={integer} />
                <span className="ml-1.5 text-xl font-normal text-slate-400">of {board.machines.length}</span>
              </dd>
            </div>
          </dl>

          <section aria-labelledby="washers-heading">
            <h2 id="washers-heading" className="mb-4 text-lg font-medium text-slate-900">
              Washers
            </h2>
            {board.machines.length === 0 ? (
              <Card className="py-8 text-center text-sm text-slate-500">No washers set up yet. An admin can add them in the admin panel.</Card>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
                {board.machines.map((m) => {
                  const order = board.active.find((o) => o.machineLabel === m.label && (o.status === 'pending' || o.status === 'washing'))
                  const tone = { idle: 'text-green-600', reserved: 'text-indigo-600', in_use: 'text-blue-600', maintenance: 'text-amber-600' }[m.status]
                  const word = { idle: 'Free', reserved: 'Reserved', in_use: 'Washing', maintenance: 'Out of service' }[m.status]
                  return (
                    <li key={m.id} className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm">
                      <MachinePorthole status={m.status} label={m.label} />
                      <p className="mt-2 font-medium text-slate-900">{m.label}</p>
                      <p className={cn('text-sm', tone)}>{word}</p>
                      {order && (
                        <p className="mt-0.5 max-w-full truncate text-xs text-slate-500">
                          {order.customerName ?? 'Walk-in'} #{order.code.slice(-4)}
                        </p>
                      )}
                      {m.status === 'reserved' && order && (
                        <Button className="mt-3" size="sm" variant="blue" fullWidth onClick={() => setStarting(order)}>
                          Start washing
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="queue-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="queue-heading" className="text-lg font-medium text-slate-900">
                Order queue
              </h2>
              <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
                All orders <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {board.active.length === 0 ? (
              <Card className="py-10 text-center">
                <p className="font-medium text-slate-900">The queue is clear</p>
                <p className="mt-1 text-sm text-slate-500">New orders show up here as soon as they are created.</p>
              </Card>
            ) : (
              <QueueBoard orders={board.active} now={now} onAdvance={advance} onStart={setStarting} />
            )}
          </section>
        </>
      )}

      <StartWashingModal order={starting} machines={board?.machines ?? []} onClose={() => setStarting(null)} onConfirm={start} />
    </div>
  )
}
