import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Check, Delete, Package, Power, QrCode, Search, UserRound, X } from 'lucide-react'
import type { Customer, OrderDetail, PaymentMethod, ServiceType } from '@/lib/types'
import { peso } from '@/lib/format'
import { cn } from '@/shared/cn'
import { Button, ErrorNote, PageLoader } from '@/shared/ui'
import { notifyDropoff } from '@/features/notifications'
import { ReceiptModal } from '@/features/receipt'
import { createOrder, fetchPricing, searchCustomers, type PricingData } from '@/features/transaction/api'
import { computeQuote, parseWeight } from '@/features/transaction/pricing'
import { pressKey } from './keypad'

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'back'] as const
const QUICK_WEIGHTS = [3, 5, 8, 10]

/** Big, high-contrast counter screen: tap a service, tap the weight, tap how they pay. No typing. */
export function TouchPosPage() {
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [service, setService] = useState<ServiceType>('full-service')
  const [weight, setWeight] = useState('')
  const [addonIds, setAddonIds] = useState<string[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lookup, setLookup] = useState('')
  const [matches, setMatches] = useState<Customer[]>([])
  const [paying, setPaying] = useState<PaymentMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<OrderDetail | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  const load = useCallback(() => {
    fetchPricing()
      .then(setPricing)
      .catch((e: Error) => setLoadError(e.message))
  }, [])
  useEffect(load, [load])

  useEffect(() => {
    if (!lookup.trim()) {
      setMatches([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchCustomers(lookup)
        .then((rows) => !cancelled && setMatches(rows))
        .catch(() => !cancelled && setMatches([]))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [lookup])

  const weightKg = parseWeight(weight) ?? 0
  const quote = useMemo(() => {
    const picked = (pricing?.addons ?? []).filter((a) => addonIds.includes(a.id)).map((a) => ({ name: a.name, price: a.price }))
    return computeQuote(weightKg, pricing?.pricePerKg ?? 0, picked)
  }, [pricing, addonIds, weightKg])

  // Self-service needs a washer; take the first free one so the cashier never has to choose.
  const freeWasher = pricing?.machines.find((m) => m.status === 'idle') ?? null
  const needsWasher = service === 'self-service'
  const blocked = needsWasher && !freeWasher
  const ready = weightKg > 0 && !blocked

  function reset() {
    setService('full-service')
    setWeight('')
    setAddonIds([])
    setCustomer(null)
    setLookup('')
    setMatches([])
    setDone(null)
    setError(null)
    load()
  }

  async function pay(method: PaymentMethod) {
    setPaying(method)
    setError(null)
    try {
      const order = await createOrder({
        customerType: customer ? 'returning' : 'walk-in',
        customerId: customer?.id ?? null,
        serviceType: service,
        weightKg,
        paymentMethod: method,
        addonIds,
        machineId: needsWasher ? (freeWasher?.id ?? null) : null,
      })
      setDone(order)
      void notifyDropoff(order)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
      load()
    } finally {
      setPaying(null)
    }
  }

  if (loadError) return <ErrorNote message={loadError} />
  if (!pricing) return <PageLoader />

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="glass-strong rounded-2xl border border-slate-200 p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-600 text-white">
            <Check className="size-8" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">Paid {peso(done.total)}</h1>
          <p className="mt-1 text-slate-500">Order #{done.code.slice(-4)}{done.machineLabel ? `, ${done.machineLabel} reserved` : ''}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="outline" className="h-16 text-base" onClick={() => setShowReceipt(true)}>
            Print receipt
          </Button>
          <Button size="lg" variant="blue" className="h-16 text-base" onClick={reset}>
            Next customer
          </Button>
        </div>
        <Link to="/" className="inline-block text-sm font-medium text-slate-700 hover:text-slate-950">
          Back to dashboard
        </Link>
        <ReceiptModal order={showReceipt ? done : null} onClose={() => setShowReceipt(false)} />
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-5">
        <section aria-label="Service" className="grid grid-cols-2 gap-4">
          <Tile selected={service === 'full-service'} onClick={() => setService('full-service')} icon={<Package />} title="Full service" hint="Staff handle it" />
          <Tile
            selected={service === 'self-service'}
            onClick={() => setService('self-service')}
            icon={<Power />}
            title="Self service"
            hint={freeWasher ? `${freeWasher.label} is free` : 'No free washer'}
          />
        </section>

        <section aria-label="Weight" className="glass-strong rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-end justify-between">
            <p className="text-sm font-medium text-slate-700">Weight</p>
            <p className="text-4xl font-semibold tabular-nums">
              {weight || '0'} <span className="text-lg font-normal text-slate-500">kg</span>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={k === 'back' ? 'Delete' : k}
                  onClick={() => setWeight((w) => pressKey(w, k))}
                  className="flex h-16 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl font-medium active:scale-95 active:bg-blue-50"
                >
                  {k === 'back' ? <Delete className="size-6" aria-hidden /> : k}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-1">
              {QUICK_WEIGHTS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeight(String(w))}
                  className="h-16 rounded-xl border border-slate-200 bg-white px-4 text-base font-medium active:scale-95 active:bg-blue-50"
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>
        </section>

        {pricing.addons.length > 0 && (
          <section aria-label="Add-ons" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pricing.addons.map((a) => {
              const on = addonIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAddonIds((ids) => (on ? ids.filter((i) => i !== a.id) : [...ids, a.id]))}
                  className={cn(
                    'flex min-h-20 flex-col items-start justify-center rounded-2xl border-2 px-4 py-3 text-left transition-colors active:scale-[0.98]',
                    on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white',
                  )}
                >
                  <span className="text-base font-medium text-slate-900">{a.name}</span>
                  <span className="text-sm text-slate-600">+{peso(a.price)}</span>
                </button>
              )
            })}
          </section>
        )}
      </div>

      <aside className="glass-strong h-fit space-y-4 rounded-2xl border border-slate-200 p-4 lg:sticky lg:top-24" aria-label="Order summary">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Customer</p>
          {customer ? (
            <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2.5">
              <p className="flex min-w-0 items-center gap-2 font-medium">
                <UserRound className="size-4 shrink-0 text-blue-700" aria-hidden />
                <span className="truncate">{customer.name}</span>
              </p>
              <button type="button" onClick={() => setCustomer(null)} className="rounded-md p-1 text-slate-500 hover:bg-white" aria-label="Remove customer">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  placeholder="Walk-in. Search a returning customer"
                  aria-label="Find returning customer"
                  className="h-12 w-full rounded-xl bg-slate-100 pr-3 pl-9 text-sm focus:bg-white focus:ring-3 focus:ring-slate-200 focus:outline-none"
                />
              </div>
              {matches.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomer(c)
                          setLookup('')
                        }}
                        className="flex min-h-12 w-full flex-col items-start justify-center rounded-xl bg-white px-3 text-left hover:bg-blue-50"
                      >
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="font-mono text-xs text-slate-500">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <dl className="space-y-1.5 border-y border-slate-200 py-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">
              {weightKg || 0} kg x {peso(pricing.pricePerKg)}
            </dt>
            <dd className="tabular-nums">{peso(quote.subtotal)}</dd>
          </div>
          {quote.addons.map((a) => (
            <div key={a.name} className="flex justify-between">
              <dt className="text-slate-600">{a.name}</dt>
              <dd className="tabular-nums">{peso(a.price)}</dd>
            </div>
          ))}
        </dl>

        <p className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-700">Total</span>
          <span className="text-4xl font-semibold tabular-nums">{peso(quote.total)}</span>
        </p>

        {blocked && <ErrorNote message="All washers are busy. Switch to Full service or free a washer." />}
        <ErrorNote message={error} />

        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="success" className="h-20 flex-col text-base" icon={<Banknote className="size-6" />} disabled={!ready} loading={paying === 'cash'} onClick={() => pay('cash')}>
            Cash
          </Button>
          <Button size="lg" variant="blue" className="h-20 flex-col text-base" icon={<QrCode className="size-6" />} disabled={!ready} loading={paying === 'qr'} onClick={() => pay('qr')}>
            GCash / QR
          </Button>
        </div>
      </aside>
    </div>
  )
}

function Tile({ selected, onClick, icon, title, hint }: { selected: boolean; onClick: () => void; icon: ReactNode; title: string; hint: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-center transition-colors active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <span className="text-blue-600 [&_svg]:size-10">{icon}</span>
      <span className="text-xl font-semibold text-slate-900">{title}</span>
      <span className="text-sm text-slate-600">{hint}</span>
    </button>
  )
}
