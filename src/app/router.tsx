import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { NewTransactionPage } from '@/features/transaction'
import { OngoingOrdersPage } from '@/features/orders'
import { AdminShell } from '@/admin/AdminShell'
import { adminRoutes } from '@/admin/routes'
import { RoleGuard } from './guards'
import { PosShell } from './PosShell'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage audience="staff" /> },
  { path: '/admin/login', element: <LoginPage audience="admin" /> },

  // Cashier interface: any signed-in staff member (admins included).
  {
    element: <RoleGuard loginPath="/login" />,
    children: [
      {
        element: <PosShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'transaction', element: <NewTransactionPage /> },
          {
            path: 'orders',
            element: <OngoingOrdersPage backTo="/" emptyMessage="No orders yet. Start one from New Transaction." />,
          },
        ],
      },
    ],
  },

  // Admin interface: admins only.
  {
    path: '/admin',
    element: <RoleGuard role="admin" loginPath="/admin/login" />,
    children: [
      {
        element: <AdminShell />,
        children: [...adminRoutes, { path: '*', element: <Navigate to="/admin" replace /> }],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
