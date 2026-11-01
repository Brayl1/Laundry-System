import { supabase, unwrap } from '@/lib/supabase'
import type { Addon, Machine, MachineStatus, Settings } from '@/lib/types'

export type SettingsPatch = Partial<Omit<Settings, 'id' | 'updated_at'>>

export async function fetchSettings(): Promise<Settings> {
  const row = unwrap(await supabase.from('settings').select('*').eq('id', 1).single())
  return { ...row, price_per_kg: Number(row.price_per_kg) }
}

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  unwrap(
    await supabase
      .from('settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('id')
      .single(),
  )
}

export async function fetchAddons(): Promise<Addon[]> {
  const rows = unwrap(await supabase.from('addons').select('*').order('sort').order('created_at'))
  return rows.map((a) => ({ ...a, price: Number(a.price) }))
}

export async function createAddon(name: string, price: number, sort: number): Promise<void> {
  unwrap(await supabase.from('addons').insert({ name: name.trim(), price, sort }).select('id').single())
}

export async function updateAddon(id: string, patch: Partial<Pick<Addon, 'name' | 'price' | 'active'>>): Promise<void> {
  unwrap(await supabase.from('addons').update(patch).eq('id', id).select('id').single())
}

export async function deleteAddon(id: string): Promise<void> {
  unwrap(await supabase.from('addons').delete().eq('id', id))
}

export async function fetchMachines(): Promise<Machine[]> {
  return unwrap(await supabase.from('machines').select('*').order('label'))
}

export async function createMachine(label: string): Promise<void> {
  const res = await supabase.from('machines').insert({ label: label.trim() }).select('id').single()
  if (res.error?.code === '23505') throw new Error('A machine with that label already exists')
  unwrap(res)
}

export async function updateMachineStatus(id: string, status: MachineStatus): Promise<void> {
  unwrap(await supabase.from('machines').update({ status }).eq('id', id).select('id').single())
}

export async function deleteMachine(id: string): Promise<void> {
  unwrap(await supabase.from('machines').delete().eq('id', id))
}
