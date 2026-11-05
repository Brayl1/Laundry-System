import { Link, NavLink } from 'react-router-dom'
import { LogOut, ShoppingCart } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { cn } from '@/shared/cn'
import { MaterialSwitcher, PaletteButton } from '@/shared/ui'
import { BrandMark } from '@/shared/layout/BrandMark'
import { navSections } from './nav'

interface AdminSidebarProps {
  profile: Profile
  onLogout: () => void
}

export function AdminSidebar({ profile, onLogout }: AdminSidebarProps) {
  return (
    <div className="glass-bar flex h-full flex-col border-r border-slate-200 text-slate-700">
      <Link to="/admin" className="flex items-center gap-3 px-5 py-5">
        <BrandMark tone="dark" />
        <div className="leading-tight">
          <p className="font-semibold text-slate-900">Suds &amp; Stats</p>
          <p className="text-xs text-slate-500">Admin Panel</p>
        </div>
      </Link>

      <div className="px-4 pb-2">
        <PaletteButton className="w-full justify-between" />
      </div>

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
                        'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-blue-400',
                        isActive ? 'neu-sm font-medium text-slate-900' : 'hover:bg-white/40 hover:text-slate-900',
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

      <div className="space-y-1 border-t border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-3 px-2.5 py-1.5">
          <span className="liquid-btn flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white">
            {profile.display_name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-slate-900">{profile.display_name}</p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
        <MaterialSwitcher className="mb-1 w-full justify-between" />
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-white/40 hover:text-slate-900">
          <ShoppingCart className="size-4.5" aria-hidden /> Open POS
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-white/40 hover:text-slate-900"
        >
          <LogOut className="size-4.5" aria-hidden /> Logout
        </button>
      </div>
    </div>
  )
}
