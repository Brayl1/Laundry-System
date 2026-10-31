import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/features/auth'
import { Header } from '@/shared/layout/Header'

/** Cashier interface: header plus an animated page outlet. Sign-in is enforced by the route guard. */
export function PosShell() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  if (!profile) return null

  return (
    <div className="min-h-screen">
      <Header userName={profile.display_name} isAdmin={profile.role === 'admin'} onLogout={signOut} />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
