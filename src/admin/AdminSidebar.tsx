import { Link, NavLink } from 'react-router-dom'
import { LogOut, ShoppingCart } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { cn } from '@/shared/cn'
import { BrandMark } from '@/shared/layout/BrandMark'
import { navSections } from './nav'

interface AdminSidebarProps {
  profile: Profile
  onLogout: () => void
}

export function AdminSidebar({ profile, onLogout }: AdminSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <Link to="/admin" className="flex items-center gap-3 px-5 py-5">
        <BrandMark tone="dark" />
        <div className="leading-tight">
          <p className="font-medium text-white">Laundry POS</p>
          <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Admin">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-slate-500 uppercase">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-blue-400',
                        isActive ? 'bg-white/10 font-medium text-white' : 'hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 px-2.5 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
            {profile.display_name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{profile.display_name}</p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
        </div>
        <Link to="/" className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-white/5 hover:text-white">
          <ShoppingCart className="size-4.5" aria-hidden /> Open POS
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4.5" aria-hidden /> Logout
        </button>
      </div>
    </div>
  )
}
