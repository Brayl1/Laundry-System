import { describe, expect, it } from 'vitest'
import { buildLedgers, totalOutstanding, type LedgerEntry } from './calc'

const customer = { id: 'c1', name: 'Aling Nena', phone: '09171234567' }
let n = 0
const entry = (kind: LedgerEntry['kind'], amount: number, dueDate: string | null = null): LedgerEntry => ({
  id: `e${++n}`,
  customerId: 'c1',
  kind,
  amount,
  dueDate,
  note: null,
  createdAt: new Date(2026, 10, 1, 8, n).toISOString(),
})

describe('buildLedgers', () => {
  it('tracks the running balance across charges and partial payments', () => {
    const [l] = buildLedgers([customer], [entry('charge', 300, '2026-11-10'), entry('payment', 100)], '2026-11-01')
    expect(l).toMatchObject({ charged: 300, paid: 100, balance: 200, nextDue: '2026-11-10', overdue: false })
  })

  it('settles the oldest charge first when finding the next due date', () => {
    const entries = [entry('charge', 100, '2026-10-01'), entry('charge', 200, '2026-11-15'), entry('payment', 100)]
    const [l] = buildLedgers([customer], entries, '2026-11-01')
    expect(l.balance).toBe(200)
    expect(l.nextDue).toBe('2026-11-15')
    expect(l.overdue).toBe(false)
  })

  it('flags overdue balances and clears the due date once paid off', () => {
    const late = buildLedgers([customer], [entry('charge', 50, '2026-10-20')], '2026-11-01')[0]
    expect(late.overdue).toBe(true)
    const settled = buildLedgers([customer], [entry('charge', 50, '2026-10-20'), entry('payment', 50)], '2026-11-01')[0]
    expect(settled).toMatchObject({ balance: 0, nextDue: null, overdue: false })
  })

  it('skips customers with no entries and sums only what is owed', () => {
    const other = { id: 'c2', name: 'Kuya Bong', phone: '09981234567' }
    const ledgers = buildLedgers([customer, other], [entry('charge', 120), entry('payment', 150)], '2026-11-01')
    expect(ledgers).toHaveLength(1)
    expect(ledgers[0].balance).toBe(-30)
    expect(totalOutstanding(ledgers)).toBe(0)
  })
})
