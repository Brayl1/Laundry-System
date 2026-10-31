import { describe, expect, it } from 'vitest'
import type { OrderDetail } from '@/lib/types'
import { rangeStart, summarize } from './stats'

function order(overrides: Partial<OrderDetail>): OrderDetail {
  return {
    id: crypto.randomUUID(),
    code: 'ORD-1',
    createdAt: new Date(2025, 9, 15, 20, 40).toISOString(),
    customerType: 'walk-in',
    customerName: null,
    customerPhone: null,
    serviceType: 'full-service',
    weightKg: 6,
    pricePerKg: 10,
    subtotal: 60,
    total: 160,
    paymentMethod: 'qr',
    status: 'pending',
    machineLabel: null,
    cashierName: 'LenLen',
    addons: [],
    ...overrides,
  }
}

describe('summarize', () => {
  const now = new Date(2025, 9, 15, 21, 0)

  it('reproduces the demo report for a single order', () => {
    const s = summarize([order({})], null, now)
    expect(s).toMatchObject({
      totalOrders: 1,
      totalWeight: 6,
      totalIncome: 160,
      avgOrderValue: 160,
      payments: { cash: 0, qr: 1 },
      walkIn: 1,
      fullService: 1,
    })
    expect(s.daily).toEqual([{ date: '2025-10-15', label: 'Oct 15', income: 160, orders: 1 }])
  })

  it('fills empty days inside a fixed range', () => {
    const s = summarize([order({})], rangeStart('7d', now), now)
    expect(s.daily).toHaveLength(7)
    expect(s.daily.filter((d) => d.orders > 0)).toHaveLength(1)
    expect(s.daily.at(-1)?.date).toBe('2025-10-15')
  })

  it('returns zero average when there are no orders', () => {
    expect(summarize([], null, now).avgOrderValue).toBe(0)
  })
})
