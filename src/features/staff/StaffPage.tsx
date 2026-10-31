import { useState } from 'react'
import { KeyRound, Power, UserPlus } from 'lucide-react'
import type { Profile, UserRole } from '@/lib/types'
import { useAuth } from '@/features/auth'
import { Badge, Button, Card, ErrorNote, Modal, PageHeader, PageLoader } from '@/shared/ui'
import { useLoad } from '@/shared/hooks/useLoad'
import { fetchStaff, setStaffActive, setStaffRole } from './api'
import { AddStaffModal, ResetPasswordModal } from './StaffFormModals'

const joined = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function StaffPage() {
  const { profile: me } = useAuth()
  const staff = useLoad(fetchStaff)
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState<Profile | null>(null)
  const [deactivating, setDeactivating] = useState<Profile | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function act(action: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await staff.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeactivate() {
    const target = deactivating
    setDeactivating(null)
    if (target) await act(() => setStaffActive(target.id, false))
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Who can sign in, and what they can do"
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>
            Add staff
          </Button>
        }
      />
      <div className="mb-4 space-y-2">
        <ErrorNote message={staff.error} />
        <ErrorNote message={actionError} />
      </div>

      {!staff.data ? (
        !staff.error && <PageLoader />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  {['Name', 'Role', 'Status', 'Added', 'Actions'].map((c) => (
                    <th key={c} scope="col" className="px-4 py-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.data.map((m) => {
                  const isMe = m.id === me?.id
                  return (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {m.display_name} {isMe && <Badge tone="blue">You</Badge>}
                        </p>
                        <p className="font-mono text-xs text-slate-500">@{m.username}</p>
                      </td>
                      <td className="px-4 py-3">
                        {isMe ? (
                          <Badge tone="slate">Admin</Badge>
                        ) : (
                          <select
                            value={m.role}
                            disabled={busy}
                            onChange={(e) => act(() => setStaffRole(m.id, e.target.value as UserRole))}
                            aria-label={`Role of ${m.display_name}`}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs focus:outline-none"
                          >
                            <option value="cashier">Cashier</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={m.active ? 'green' : 'red'}>{m.active ? 'Active' : 'Deactivated'}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{joined(m.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" icon={<KeyRound className="size-3.5" />} onClick={() => setResetting(m)}>
                            Password
                          </Button>
                          {!isMe &&
                            (m.active ? (
                              <Button variant="ghost" size="sm" icon={<Power className="size-3.5" />} disabled={busy} onClick={() => setDeactivating(m)}>
                                Deactivate
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" icon={<Power className="size-3.5" />} disabled={busy} onClick={() => act(() => setStaffActive(m.id, true))}>
                                Activate
                              </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AddStaffModal open={adding} onClose={() => setAdding(false)} onCreated={staff.reload} />
      <ResetPasswordModal member={resetting} onClose={() => setResetting(null)} />
      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title="Deactivate account?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeactivating(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeactivate}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {deactivating?.display_name} will no longer be able to sign in. Their past orders stay on record, and you can
          reactivate the account any time.
        </p>
      </Modal>
    </div>
  )
}
