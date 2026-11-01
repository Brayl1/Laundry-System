import { useState, type FormEvent } from 'react'
import { KeyRound, Lock, User, UserPlus } from 'lucide-react'
import type { Profile, UserRole } from '@/lib/types'
import { Button, ErrorNote, Input, Modal } from '@/shared/ui'
import { createStaff, resetStaffPassword } from './api'

/** Runs an async submit, tracking pending state and error text for a modal form. */
function useSubmit(onDone: () => void) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(action: () => Promise<void>) {
    setSubmitting(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }
  return { submitting, error, submit }
}

interface AddStaffModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddStaffModal({ open, onClose, onCreated }: AddStaffModalProps) {
  // The form lives in its own component so closing the modal resets its fields.
  return (
    <Modal open={open} onClose={onClose} title="Add staff member">
      <AddStaffForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  )
}

function AddStaffForm({ onClose, onCreated }: Omit<AddStaffModalProps, 'open'>) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('cashier')
  const { submitting, error, submit } = useSubmit(() => {
    onCreated()
    onClose()
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit(() => createStaff({ username, displayName, password, role }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Display name" icon={<User />} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoFocus />
      <Input
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. maria"
        autoComplete="off"
        pattern="[A-Za-z0-9._\-]{3,32}"
        title="3-32 characters: letters, numbers, dot, dash or underscore"
        required
      />
      <Input
        label="Password"
        type="password"
        icon={<Lock />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={6}
        required
      />
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium text-slate-800">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="h-10 w-full rounded-lg border border-transparent bg-slate-100 px-3 text-sm focus:border-slate-300 focus:outline-none"
        >
          <option value="cashier">Cashier: POS only</option>
          <option value="admin">Admin: POS and admin panel</option>
        </select>
      </label>
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<UserPlus className="size-4" />} loading={submitting}>
          Add
        </Button>
      </div>
    </form>
  )
}

interface ResetPasswordModalProps {
  member: Profile | null
  onClose: () => void
}

export function ResetPasswordModal({ member, onClose }: ResetPasswordModalProps) {
  return (
    <Modal open={member !== null} onClose={onClose} title={member ? `Reset password for ${member.display_name}` : 'Reset password'}>
      {member && <ResetPasswordForm member={member} onClose={onClose} />}
    </Modal>
  )
}

function ResetPasswordForm({ member, onClose }: { member: Profile; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const { submitting, error, submit } = useSubmit(onClose)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit(() => resetStaffPassword(member.id, password))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="New password"
        type="password"
        icon={<Lock />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={6}
        required
        autoFocus
      />
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<KeyRound className="size-4" />} loading={submitting}>
          Reset
        </Button>
      </div>
    </form>
  )
}
