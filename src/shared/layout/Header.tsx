import { Link } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useClock } from '../hooks/useClock'
import { Button, MaterialSwitcher, PaletteButton } from '../ui'
import { BrandMark } from './BrandMark'

interface HeaderProps {
  userName: string
  /** Admins get a shortcut to the admin panel. */
  isAdmin?: boolean
  onLogout: () => void
}

export function Header({ userName, isAdmin, onLogout }: HeaderProps) {
  const now = useClock()
  return (
    <header className="sticky top-0 z-30 glass-bar border-b border-slate-200 print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">Suds &amp; Stats</p>
            <p className="text-xs text-slate-500">Welcome, {userName}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <PaletteButton className="hidden md:inline-flex" />
          <MaterialSwitcher compact className="hidden sm:inline-flex" />
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm tabular-nums text-slate-900">{now.toLocaleTimeString('en-US')}</p>
            <p className="text-xs text-slate-500">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="gloss inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-900/90 px-3.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              <ShieldCheck className="size-3.5" aria-hidden /> Admin Panel
            </Link>
          )}
          <Button variant="outline" size="sm" icon={<LogOut className="size-3.5" />} onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
