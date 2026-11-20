import { supabase, unwrap } from '@/lib/supabase'
import { db } from '@/lib/untyped'
import type { Machine } from '@/lib/types'
import type { Supply } from './alerts'

interface SupplyRow {
  id: string
  name: string
  unit: string
  stock: number | string
  low_threshold: number | string
  usage_per_kg: number | string
}

const toSupply = (r: SupplyRow): Supply => ({
  id: r.id,
  name: r.name,
  unit: r.unit,
  stock: Number(r.stock),
  lowThreshold: Number(r.low_threshold),
  usagePerKg: Number(r.usage_per_kg),
})

export async function fetchSupplies(): Promise<Supply[]> {
  return (unwrap(await db.from('supplies').select('*').order('name')) as SupplyRow[]).map(toSupply)
}

export interface InventoryData {
  supplies: Supply[]
  machines: Machine[]
}

export async function fetchInventory(): Promise<InventoryData> {
  const [supplies, machines] = await Promise.all([fetchSupplies(), supabase.from('machines').select('*').order('label')])
  return { supplies, machines: unwrap(machines) }
}

export interface SupplyInput {
  name: string
  unit: string
  stock: number
  lowThreshold: number
  usagePerKg: number
}

export async function createSupply(s: SupplyInput): Promise<void> {
  const { error } = await db.from('supplies').insert({
    name: s.name.trim(),
    unit: s.unit.trim() || 'ml',
    stock: s.stock,
    low_threshold: s.lowThreshold,
    usage_per_kg: s.usagePerKg,
  })
  if (error?.code === '23505') throw new Error('A supply with that name already exists')
  if (error) throw new Error(error.message)
}

/** Adds to the stock the database currently holds, so a deduction that just happened is not overwritten. */
export async function restockSupply(id: string, amount: number): Promise<void> {
  const row = unwrap(await db.from('supplies').select('stock').eq('id', id).single()) as { stock: number | string }
  const { error } = await db.from('supplies').update({ stock: Number(row.stock) + amount }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateSupplyRules(id: string, patch: { lowThreshold?: number; usagePerKg?: number }): Promise<void> {
  const { error } = await db
    .from('supplies')
    .update({
      ...(patch.lowThreshold !== undefined && { low_threshold: patch.lowThreshold }),
      ...(patch.usagePerKg !== undefined && { usage_per_kg: patch.usagePerKg }),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSupply(id: string): Promise<void> {
  const { error } = await db.from('supplies').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** The technician came: start counting loads again. */
export async function markServiced(machineId: string): Promise<void> {
  unwrap(await supabase.from('machines').update({ loads_since_service: 0 }).eq('id', machineId).select('id').single())
}

export async function setServiceInterval(machineId: string, loads: number): Promise<void> {
  unwrap(await supabase.from('machines').update({ service_every: loads }).eq('id', machineId).select('id').single())
}
