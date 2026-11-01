import { supabase, unwrap } from '@/lib/supabase'
import type { Profile, UserRole } from '@/lib/types'

export interface NewStaff {
  username: string
  displayName: string
  password: string
  role: UserRole
}

function check(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message)
}

export async function fetchStaff(): Promise<Profile[]> {
  return unwrap(await supabase.from('profiles').select('*').order('created_at'))
}

// Accounts live in auth.users, so every change goes through an admin-only database function.
export async function createStaff(staff: NewStaff): Promise<void> {
  check(
    await supabase.rpc('admin_create_staff', {
      p_username: staff.username,
      p_display_name: staff.displayName,
      p_password: staff.password,
      p_role: staff.role,
    }),
  )
}

export async function setStaffRole(id: string, role: UserRole): Promise<void> {
  check(await supabase.rpc('admin_set_staff_role', { p_id: id, p_role: role }))
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
  check(await supabase.rpc('admin_set_staff_active', { p_id: id, p_active: active }))
}

export async function resetStaffPassword(id: string, password: string): Promise<void> {
  check(await supabase.rpc('admin_reset_staff_password', { p_id: id, p_password: password }))
}
