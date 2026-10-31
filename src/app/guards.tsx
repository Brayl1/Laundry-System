import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import type { UserRole } from '@/lib/types'
import { PageLoader } from '@/shared/ui'

interface RoleGuardProps {
  /** Required role. Omit to allow any signed-in staff member. */
  role?: UserRole
  /** Where to send people who are not signed in. */
  loginPath: string
}

/** Route guard: not signed in -> login, wrong role -> the cashier POS. */
export function RoleGuard({ role, loginPath }: RoleGuardProps) {
  const { profile, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!profile) return <Navigate to={loginPath} replace />
  if (role && profile.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}
