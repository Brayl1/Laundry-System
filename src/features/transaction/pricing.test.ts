import { describe, expect, it } from 'vitest'
import { computeQuote, parseWeight } from './pricing'

const addons = [
  { name: 'Fabric Softener', price: 20 },
  { name: 'Fold & Pack', price: 30 },
  { name: 'Express Wash', price: 50 },
]

describe('computeQuote', () => {
  it('matches the demo order: 6 kg at ₱10 with all add-ons is ₱160', () => {
    expect(computeQuote(6, 10, addons)).toEqual({ subtotal: 60, addons, total: 160 })
  })

  it('charges only weight when no add-ons are picked', () => {
    expect(computeQuote(90, 10, []).total).toBe(900)
  })

  it('rounds fractional weights to centavos', () => {
    expect(computeQuote(2.35, 12.5, []).subtotal).toBe(29.38)
  })

  it('treats a missing weight as zero', () => {
    expect(computeQuote(NaN, 10, []).total).toBe(0)
  })
})

describe('parseWeight', () => {
  it.each([
    ['', null],
    ['0', null],
    ['-3', null],
    ['abc', null],
    ['500', null],
    ['6', 6],
    ['2.345', 2.35],
  ])('parses %j as %j', (input, expected) => {
    expect(parseWeight(input)).toBe(expected)
  })
})
