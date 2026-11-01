import type { Profile } from '@/lib/types'

/** Where a signed-in user lands: admins in the admin panel, cashiers in the POS. */
export function homePath(profile: Pick<Profile, 'role'>): string {
  return profile.role === 'admin' ? '/admin' : '/'
}
