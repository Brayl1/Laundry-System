import { describe, expect, it } from 'vitest'
import { isLow, isServiceDue, isServiceSoon, loadsLeft, ordersLeft, type Supply } from './alerts'

const supply = (over: Partial<Supply> = {}): Supply => ({ id: '1', name: 'Detergent', unit: 'ml', stock: 5000, lowThreshold: 3000, usagePerKg: 15, ...over })

describe('supply alerts', () => {
  it('is low at or under the threshold, never when the threshold is 0', () => {
    expect(isLow(supply({ stock: 3000 }))).toBe(true)
    expect(isLow(supply({ stock: 3001 }))).toBe(false)
    expect(isLow(supply({ stock: 0, lowThreshold: 0 }))).toBe(false)
  })

  it('estimates how many average orders remain', () => {
    expect(ordersLeft(supply({ stock: 900, usagePerKg: 15 }))).toBe(10)
    expect(ordersLeft(supply({ usagePerKg: 0 }))).toBeNull()
  })
})

describe('machine maintenance', () => {
  it('flags due and soon-due machines', () => {
    expect(isServiceDue({ loads_since_service: 500, service_every: 500 })).toBe(true)
    expect(isServiceSoon({ loads_since_service: 450, service_every: 500 })).toBe(true)
    expect(isServiceSoon({ loads_since_service: 449, service_every: 500 })).toBe(false)
    expect(loadsLeft({ loads_since_service: 510, service_every: 500 })).toBe(0)
  })
})
