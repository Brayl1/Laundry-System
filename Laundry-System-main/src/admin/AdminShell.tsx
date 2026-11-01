import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { BrandMark } from '@/shared/layout/BrandMark'
import { AdminSidebar } from './AdminSidebar'

/** Admin interface: fixed sidebar on desktop, slide-over drawer on mobile. Admin-only access is enforced by the route guard. */
export function AdminShell() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the drawer after navigating.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const previous = document.title
    document.title = 'Admin · Laundry POS'
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  if (!profile) return null

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block print:hidden">
        <AdminSidebar profile={profile} onLogout={signOut} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 glass-bar border-b border-slate-200 px-4 lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-md p-1.5 text-slate-700 hover:bg-white/60"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <Link to="/admin" className="flex items-center gap-2.5">
          <BrandMark tone="dark" />
          <span className="font-medium text-slate-900">Admin Panel</span>
        </Link>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-64 max-w-[85vw]"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <AdminSidebar profile={profile} onLogout={signOut} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 -right-12 glass-strong rounded-full p-2 text-slate-700"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

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
