import { describe, expect, it } from 'vitest'
import type { OrderDetail } from '@/lib/types'
import { buildHeatmap, paymentTotals, rangeStart, summarize } from './stats'

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
    shelfLocation: null,
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

describe('buildHeatmap', () => {
  it('buckets orders by weekday (Monday first) and hour, and finds the peak', () => {
    // 2025-10-15 is a Wednesday; 2025-10-19 is a Sunday.
    const wed = (h: number) => order({ createdAt: new Date(2025, 9, 15, h, 10).toISOString() })
    const sun = order({ createdAt: new Date(2025, 9, 19, 7, 0).toISOString() })
    const map = buildHeatmap([wed(9), wed(9), wed(14), sun])
    expect(map.cells[2][9]).toBe(2)
    expect(map.cells[2][14]).toBe(1)
    expect(map.cells[6][7]).toBe(1)
    expect(map.peak).toEqual({ day: 2, hour: 9, count: 2 })
    expect(map.max).toBe(2)
  })

  it('has no peak for no orders', () => {
    expect(buildHeatmap([]).peak).toBeNull()
  })
})

describe('paymentTotals', () => {
  it('sums money per payment method', () => {
    const totals = paymentTotals([order({ paymentMethod: 'cash', total: 100.5 }), order({ paymentMethod: 'qr', total: 40 }), order({ paymentMethod: 'cash', total: 20 })])
    expect(totals).toEqual({ cash: 120.5, qr: 40 })
  })
})
