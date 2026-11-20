import { describe, expect, it } from 'vitest'
import type { OrderDetail } from '@/lib/types'
import { binLabel, occupiedBins, widestShelf, type Shelf } from './shelves'

const order = (id: string, shelfBinId: string | null, status: OrderDetail['status'] = 'done'): OrderDetail => ({
  id,
  code: `ORD-${id}`,
  createdAt: new Date(2026, 10, 1).toISOString(),
  customerType: 'walk-in',
  customerName: null,
  customerPhone: null,
  serviceType: 'full-service',
  weightKg: 5,
  pricePerKg: 10,
  subtotal: 50,
  total: 50,
  paymentMethod: 'cash',
  status,
  machineLabel: null,
  shelfLocation: null,
  shelfBinId,
  shelfNote: null,
  cashierName: 'Test',
  addons: [],
})

describe('shelf map', () => {
  it('labels a bin the way tickets and SMS texts show it', () => {
    expect(binLabel('Shelf 2', 'B')).toBe('Shelf 2, Bin B')
  })

  it('finds occupied bins by id, skipping the edited, claimed and unshelved orders', () => {
    const orders = [order('1', 'bin-a'), order('2', 'bin-d'), order('3', 'bin-b', 'claimed'), order('4', null)]
    const taken = occupiedBins(orders, '1')
    expect([...taken.keys()]).toEqual(['bin-d'])
    expect(occupiedBins(orders).get('bin-a')?.id).toBe('1')
  })

  it('sizes the map by the widest rack, and never to zero', () => {
    const shelf = (n: number): Shelf => ({ id: `s${n}`, name: `Shelf ${n}`, bins: Array.from({ length: n }, (_, i) => ({ id: `b${n}-${i}`, name: String(i) })) })
    expect(widestShelf([shelf(2), shelf(5), shelf(3)])).toBe(5)
    expect(widestShelf([])).toBe(1)
  })
})
