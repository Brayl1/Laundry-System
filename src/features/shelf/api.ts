import { supabase, unwrap } from '@/lib/supabase'
import { db } from '@/lib/untyped'
import type { Shelf } from './shelves'

interface ShelfRow {
  id: string
  name: string
  bins: { id: string; name: string; sort: number }[] | null
}

/** Every rack with its bins, in the order an admin arranged them. */
export async function fetchShelves(): Promise<Shelf[]> {
  const rows = unwrap(
    await db
      .from('shelves')
      .select('id, name, bins:shelf_bins(id, name, sort)')
      .order('sort')
      .order('created_at')
      .order('sort', { referencedTable: 'shelf_bins' }),
  ) as ShelfRow[]
  return rows.map((r) => ({ id: r.id, name: r.name, bins: (r.bins ?? []).map((b) => ({ id: b.id, name: b.name })) }))
}

/**
 * Puts an order's bag in a bin (or takes it off the shelf with nulls). The database allows one active order
 * per bin, so two tills cannot both claim the same one.
 */
export async function saveShelfLocation(orderId: string, binId: string | null, note: string | null): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ shelf_bin_id: binId, shelf_note: note })
    .eq('id', orderId)
  if (error?.code === '23505') throw new Error('That bin was just taken by another order. Pick a different one.')
  if (error) throw new Error(error.message)
}

// ---- admin: lay out the racks (the tables only accept these writes from an admin)

function check(error: { code?: string; message: string } | null, what: string): void {
  if (error?.code === '23505') throw new Error(`${what} with that name already exists here.`)
  if (error) throw new Error(error.message)
}

/** The next free position, so a new rack or bin lands at the end. */
async function nextSort(table: 'shelves' | 'shelf_bins', filter?: { column: string; value: string }): Promise<number> {
  let query = db.from(table).select('sort').order('sort', { ascending: false }).limit(1)
  if (filter) query = query.eq(filter.column, filter.value)
  const rows = unwrap(await query) as { sort: number }[]
  return (rows[0]?.sort ?? 0) + 1
}

export async function createShelf(name: string): Promise<void> {
  const { error } = await db.from('shelves').insert({ name: name.trim(), sort: await nextSort('shelves') })
  check(error, 'A shelf')
}

export async function renameShelf(id: string, name: string): Promise<void> {
  const { error } = await db.from('shelves').update({ name: name.trim() }).eq('id', id)
  check(error, 'A shelf')
}

export async function deleteShelf(id: string): Promise<void> {
  const { error } = await db.from('shelves').delete().eq('id', id)
  check(error, 'A shelf')
}

export async function createBin(shelfId: string, name: string): Promise<void> {
  const { error } = await db
    .from('shelf_bins')
    .insert({ shelf_id: shelfId, name: name.trim(), sort: await nextSort('shelf_bins', { column: 'shelf_id', value: shelfId }) })
  check(error, 'A bin')
}

export async function renameBin(id: string, name: string): Promise<void> {
  const { error } = await db.from('shelf_bins').update({ name: name.trim() }).eq('id', id)
  check(error, 'A bin')
}

export async function deleteBin(id: string): Promise<void> {
  const { error } = await db.from('shelf_bins').delete().eq('id', id)
  check(error, 'A bin')
}
