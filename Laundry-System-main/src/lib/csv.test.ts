import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('quotes cells containing commas so columns do not shift', () => {
    const csv = toCsv(['Order ID', 'Date', 'Total'], [['ORD-1', 'Oct 15, 2025, 08:40 PM', 160]])
    expect(csv).toBe('Order ID,Date,Total\r\nORD-1,"Oct 15, 2025, 08:40 PM",160')
  })

  it('escapes embedded quotes and renders empty cells', () => {
    expect(toCsv(['a', 'b'], [['say "hi"', null]])).toBe('a,b\r\n"say ""hi""",')
  })
})
