import { describe, expect, it } from 'vitest'
import type { OrderDetail } from '@/lib/types'
import { formatLocation, occupiedBins, parseLocation } from './shelves'

const order = (id: string, shelfLocation: string | null, status: OrderDetail['status'] = 'done'): OrderDetail => ({
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
  shelfLocation,
  cashierName: 'Test',
  addons: [],
})

describe('shelf locations', () => {
  it('round-trips a bin with a note', () => {
    const stored = formatLocation('Shelf 2, Bin B', ' blue bag ')
    expect(stored).toBe('Shelf 2, Bin B · blue bag')
    expect(parseLocation(stored)).toEqual({ bin: 'Shelf 2, Bin B', note: 'blue bag' })
  })

  it('stores a bin alone, a note alone, or nothing', () => {
    expect(formatLocation('Shelf 1, Bin A', '')).toBe('Shelf 1, Bin A')
    expect(formatLocation(null, 'Top rack - red bag')).toBe('Top rack - red bag')
    expect(formatLocation(null, '   ')).toBeNull()
  })

  it('treats unknown text as a note, so renamed shelves never lose data', () => {
    expect(parseLocation('Old Rack 9')).toEqual({ bin: null, note: 'Old Rack 9' })
    expect(parseLocation(null)).toEqual({ bin: null, note: '' })
  })

  it('finds occupied bins, skipping the edited and claimed orders', () => {
    const orders = [order('1', 'Shelf 1, Bin A'), order('2', 'Shelf 3, Bin D · tote'), order('3', 'Shelf 2, Bin B', 'claimed'), order('4', null)]
    const taken = occupiedBins(orders, '1')
    expect([...taken.keys()]).toEqual(['Shelf 3, Bin D'])
    expect(occupiedBins(orders).get('Shelf 1, Bin A')?.id).toBe('1')
  })
})
