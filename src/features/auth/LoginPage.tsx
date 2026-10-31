import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Lock, ShieldAlert, User } from 'lucide-react'
import { Button, ErrorNote, Input } from '@/shared/ui'
import { BrandMark } from '@/shared/layout/BrandMark'
import { homePath } from './paths'
import { useAuth } from './useAuth'

type Audience = 'staff' | 'admin'

const copy: Record<Audience, { title: string; subtitle: string; demo: [string, string]; switchTo: string; switchLabel: string }> = {
  staff: {
    title: 'Laundry POS',
    subtitle: 'Sign in to continue',
    demo: ['cashier2', 'pass123'],
    switchTo: '/admin/login',
    switchLabel: 'Admin? Sign in to the admin panel',
  },
  admin: {
    title: 'Admin Panel',
    subtitle: 'Sign in to manage your shop',
    demo: ['cashier1', 'pass123'],
    switchTo: '/login',
    switchLabel: 'Cashier? Go to the staff login',
  },
}

/** One login screen, two entrances: `/login` for staff and `/admin/login` for admins. */
export function LoginPage({ audience = 'staff' }: { audience?: Audience }) {
  const { profile, signIn, signOut } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isAdminLogin = audience === 'admin'
  const text = copy[audience]

  // Signed in with the right access: go straight to your own side of the app.
  if (profile && (!isAdminLogin || profile.role === 'admin')) {
    return <Navigate to={homePath(profile)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      className={
        isAdminLogin
          ? 'flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4'
          : 'flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4'
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
          >
            <BrandMark size="lg" tone={isAdminLogin ? 'dark' : 'blue'} />
          </motion.div>
          <h1 className="mt-4 text-2xl font-medium">{text.title}</h1>
          <p className="text-sm text-slate-500">{text.subtitle}</p>
        </div>

        {profile ? (
          // Signed in, but as a cashier, on the admin entrance.
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <ShieldAlert className="mx-auto size-8 text-amber-500" aria-hidden />
            <p className="text-sm text-slate-700">
              You are signed in as <strong>{profile.display_name}</strong>, a cashier. The admin panel is for admins only.
            </p>
            <Link
              to="/"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to the POS
            </Link>
            <Button variant="outline" fullWidth onClick={signOut}>
              Sign in as someone else
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Input
              label="Username"
              icon={<User />}
              placeholder="Enter your username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              icon={<Lock />}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <ErrorNote message={error} />
            <Button type="submit" variant={isAdminLogin ? 'primary' : 'blue'} fullWidth loading={submitting}>
              Login
            </Button>
            <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
              Demo credentials: <span className="font-mono">{text.demo[0]}</span> /{' '}
              <span className="font-mono">{text.demo[1]}</span>
            </p>
          </form>
        )}

        <p className="mt-4 text-center text-sm">
          <Link to={text.switchTo} className="text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
            {text.switchLabel}
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
