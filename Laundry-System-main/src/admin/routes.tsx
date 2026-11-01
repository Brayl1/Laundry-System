import type { RouteObject } from 'react-router-dom'
import { AuditPage } from '@/features/audit'
import { CustomersPage } from '@/features/customers'
import { InventoryPage } from '@/features/inventory'
import { LedgerPage } from '@/features/ledger'
import { OngoingOrdersPage } from '@/features/orders'
import { ReportsPage } from '@/features/reports'
import { MachinesPage, PricingPage, ShopInfoPage } from '@/features/settings'
import { StaffPage } from '@/features/staff'
import { OverviewPage } from './OverviewPage'

/** Children of `/admin`. Every page here sits inside the admin shell and the admin-only guard. */
export const adminRoutes: RouteObject[] = [
  { index: true, element: <OverviewPage /> },
  { path: 'orders', element: <OngoingOrdersPage title="Orders" subtitle="Every order, any status. Updates live." /> },
  { path: 'customers', element: <CustomersPage /> },
  { path: 'ledger', element: <LedgerPage /> },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'staff', element: <StaffPage /> },
  { path: 'pricing', element: <PricingPage /> },
  { path: 'machines', element: <MachinesPage /> },
  { path: 'inventory', element: <InventoryPage /> },
  { path: 'shop', element: <ShopInfoPage /> },
  { path: 'audit', element: <AuditPage /> },
]
