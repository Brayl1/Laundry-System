import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import * as api from './api'
import { AuthContext, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (session: Session | null) => {
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const next = await api.fetchProfile(session.user.id)
      if (next.active) {
        setProfile(next)
      } else {
        // Deactivated while signed in: end the session.
        setProfile(null)
        await api.signOut()
      }
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.getSession().then(applySession)
    return api.onSessionChange((session) => {
      // Defer: calling Supabase inside the auth callback can deadlock the client.
      setTimeout(() => applySession(session), 0)
    })
  }, [applySession])

  const value = useMemo<AuthState>(
    () => ({ profile, loading, signIn: api.signIn, signOut: api.signOut }),
    [profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
