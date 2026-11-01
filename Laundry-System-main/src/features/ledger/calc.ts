export type LedgerKind = 'charge' | 'payment'

export interface LedgerEntry {
  id: string
  customerId: string
  kind: LedgerKind
  amount: number
  /** yyyy-mm-dd, only meaningful on charges. */
  dueDate: string | null
  note: string | null
  createdAt: string
}

export interface CustomerRef {
  id: string
  name: string
  phone: string
}

export interface CustomerLedger extends CustomerRef {
  charged: number
  paid: number
  /** What the customer still owes. Negative means they overpaid. */
  balance: number
  /** Earliest due date among charges that are not fully covered yet. */
  nextDue: string | null
  overdue: boolean
  lastActivity: string | null
  /** Newest first. */
  entries: LedgerEntry[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Builds one ledger per customer who has any entries. Payments settle the oldest charges first,
 * so a partial payment on an old debt does not hide a newer one that is due sooner.
 * `today` is yyyy-mm-dd in local time.
 */
export function buildLedgers(customers: CustomerRef[], entries: LedgerEntry[], today: string): CustomerLedger[] {
  const byCustomer = new Map<string, LedgerEntry[]>()
  for (const e of entries) byCustomer.set(e.customerId, [...(byCustomer.get(e.customerId) ?? []), e])

  const ledgers: CustomerLedger[] = []
  for (const c of customers) {
    const list = byCustomer.get(c.id)
    if (!list?.length) continue

    const chronological = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const charged = round2(chronological.filter((e) => e.kind === 'charge').reduce((s, e) => s + e.amount, 0))
    const paid = round2(chronological.filter((e) => e.kind === 'payment').reduce((s, e) => s + e.amount, 0))

    let credit = paid
    let nextDue: string | null = null
    for (const charge of chronological.filter((e) => e.kind === 'charge')) {
      const covered = Math.min(credit, charge.amount)
      credit = round2(credit - covered)
      const stillOwed = round2(charge.amount - covered)
      if (stillOwed > 0 && charge.dueDate && (nextDue === null || charge.dueDate < nextDue)) nextDue = charge.dueDate
    }

    const balance = round2(charged - paid)
    ledgers.push({
      ...c,
      charged,
      paid,
      balance,
      nextDue: balance > 0 ? nextDue : null,
      overdue: balance > 0 && nextDue !== null && nextDue < today,
      lastActivity: chronological.at(-1)?.createdAt ?? null,
      entries: [...chronological].reverse(),
    })
  }
  return ledgers.sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name))
}

/** Sum of every positive balance: what customers owe the shop right now. */
export function totalOutstanding(ledgers: CustomerLedger[]): number {
  return round2(ledgers.reduce((sum, l) => sum + Math.max(l.balance, 0), 0))
}
