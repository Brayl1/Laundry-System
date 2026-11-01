import { createContext } from 'react'
import type { Profile } from '@/lib/types'

export interface AuthState {
  profile: Profile | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
