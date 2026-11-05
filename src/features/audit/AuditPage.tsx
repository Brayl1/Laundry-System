import { useMemo, useState } from 'react'
import { ShieldCheck, UserRound } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/shared/cn'
import { useLoad } from '@/shared/hooks/useLoad'
import { Badge, Card, ErrorNote, PageHeader, PageLoader } from '@/shared/ui'
import { fetchAuditLog } from './api'
import { auditTone, type AuditEntry, type AuditTone } from './tone'

const dot: Record<AuditTone, string> = {
  red: 'bg-red-500 ring-red-200',
  green: 'bg-green-500 ring-green-200',
  amber: 'bg-amber-500 ring-amber-200',
  blue: 'bg-blue-500 ring-blue-200',
  slate: 'bg-slate-400 ring-slate-200',
}

const filters = [
  { key: 'all', label: 'Everything', match: () => true },
  { key: 'orders', label: 'Orders', match: (e: AuditEntry) => e.entity === 'orders' },
  { key: 'money', label: 'Credit & payments', match: (e: AuditEntry) => e.entity === 'ledger_entries' },
  { key: 'admin', label: 'Settings & staff', match: (e: AuditEntry) => ['settings', 'addons', 'supplies', 'profiles'].includes(e.entity) },
] as const

const permissions = [
  { role: 'Admin', tone: 'blue' as const, can: 'Everything: staff accounts, pricing and add-ons, machines, inventory, reports, ledger deletions and this log.' },
  { role: 'Cashier', tone: 'slate' as const, can: 'New transactions, moving orders along, shelf locations, customers and ledger entries. No pricing, staff or deletions.' },
]

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'none'
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

export function AuditPage() {
  const log = useLoad(fetchAuditLog)
  const [filter, setFilter] = useState<(typeof filters)[number]['key']>('all')
  const [open, setOpen] = useState<number | null>(null)

  const visible = useMemo(() => {
    const f = filters.find((x) => x.key === filter) ?? filters[0]
    return (log.data ?? []).filter(f.match)
  }, [log.data, filter])

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Who changed what, and when. Admins only; nobody can edit or delete these lines." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {permissions.map((p) => (
          <Card key={p.role} className="p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <ShieldCheck className="size-4 text-slate-500" aria-hidden /> {p.role} <Badge tone={p.tone}>{p.role.toLowerCase()}</Badge>
            </p>
            <p className="mt-1 text-xs text-slate-600">{p.can}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter">
          {filters.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn('rounded-md px-3 py-1.5 text-sm', filter === f.key ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {(['red', 'green', 'amber', 'blue'] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', dot[t].split(' ')[0])} />
              {{ red: 'Edit or deletion', green: 'Payment or new sale', amber: 'Credit given', blue: 'Routine progress' }[t]}
            </span>
          ))}
        </p>
      </div>

      <ErrorNote message={log.error} />

      {!log.data ? (
        !log.error && <PageLoader />
      ) : visible.length === 0 ? (
        <Card className="py-12 text-center text-sm text-slate-500">Nothing logged here yet.</Card>
      ) : (
        <Card className="p-0">
          <ol className="divide-y divide-slate-200/70">
            {visible.map((e) => {
              const tone = auditTone(e)
              const expanded = open === e.id
              const changes = e.action === 'update' ? Object.entries(e.details ?? {}) : []
              return (
                <li key={e.id} className="flex gap-3 px-5 py-3.5">
                  <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full ring-4', dot[tone])} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{e.summary}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="size-3.5" aria-hidden /> {e.actorName}
                      </span>
                      {e.actorRole && <Badge tone={e.actorRole === 'admin' ? 'blue' : 'slate'}>{e.actorRole}</Badge>}
                      <span>{formatDateTime(e.createdAt)}</span>
                      {changes.length > 0 && (
                        <button type="button" className="font-medium text-blue-700 hover:underline" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)}>
                          {expanded ? 'Hide changes' : `${changes.length} change${changes.length > 1 ? 's' : ''}`}
                        </button>
                      )}
                    </p>
                    {expanded && (
                      <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-700">
                        {changes.map(([field, change]) => {
                          const c = change as { from?: unknown; to?: unknown }
                          return (
                            <li key={field}>
                              {field}: <span className="text-red-700">{formatValue(c.from)}</span> to <span className="text-green-700">{formatValue(c.to)}</span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
    </div>
  )
}
