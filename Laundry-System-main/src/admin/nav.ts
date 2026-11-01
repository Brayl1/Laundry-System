import type { LucideIcon } from 'lucide-react'
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, ScrollText, Store, Tag, UserCog, Users, Wallet, WashingMachine } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Match the path exactly, so "Overview" is not highlighted on every admin page. */
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/ledger', label: 'Credit Ledger', icon: Wallet },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/staff', label: 'Staff', icon: UserCog },
      { to: '/admin/pricing', label: 'Pricing & Add-ons', icon: Tag },
      { to: '/admin/machines', label: 'Machines', icon: WashingMachine },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
      { to: '/admin/shop', label: 'Shop Info', icon: Store },
    ],
  },
  {
    label: 'Security',
    items: [{ to: '/admin/audit', label: 'Audit Log', icon: ScrollText }],
  },
]
