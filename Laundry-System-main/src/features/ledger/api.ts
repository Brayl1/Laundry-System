import { supabase, unwrap } from '@/lib/supabase'
import { db } from '@/lib/untyped'
import { localDateKey } from '@/lib/format'
import { buildLedgers, type CustomerLedger, type CustomerRef, type LedgerEntry, type LedgerKind } from './calc'

interface EntryRow {
  id: string
  customer_id: string
  kind: LedgerKind
  amount: number | string
  due_date: string | null
  note: string | null
  created_at: string
}

export interface LedgerData {
  customers: CustomerRef[]
  ledgers: CustomerLedger[]
}

export async function fetchLedger(): Promise<LedgerData> {
  const [customerRows, entryRes] = await Promise.all([
    supabase.from('customers').select('id, name, phone').order('name'),
    db.from('ledger_entries').select('*').order('created_at', { ascending: true }),
  ])
  const customers = unwrap(customerRows)
  const rows = unwrap(entryRes) as EntryRow[]
  const entries: LedgerEntry[] = rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    kind: r.kind,
    amount: Number(r.amount),
    dueDate: r.due_date,
    note: r.note,
    createdAt: r.created_at,
  }))
  return { customers, ledgers: buildLedgers(customers, entries, localDateKey(new Date())) }
}

export interface NewEntry {
  customerId: string
  kind: LedgerKind
  amount: number
  dueDate: string | null
  note: string
}

export async function addLedgerEntry(entry: NewEntry): Promise<void> {
  const { error } = await db.from('ledger_entries').insert({
    customer_id: entry.customerId,
    kind: entry.kind,
    amount: entry.amount,
    due_date: entry.kind === 'charge' ? entry.dueDate : null,
    note: entry.note.trim() || null,
  })
  if (error) throw new Error(error.message)
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  const { error } = await db.from('ledger_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
