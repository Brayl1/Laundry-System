export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditEntry {
  id: number
  createdAt: string
  action: AuditAction
  entity: string
  summary: string
  /** create: the new row; delete: the old row; update: { column: { from, to } }. */
  details: Record<string, unknown> | null
  actorName: string
  actorRole: 'admin' | 'cashier' | null
}

export type AuditTone = 'red' | 'green' | 'amber' | 'blue' | 'slate'

/**
 * Colour code: red for deletions and edits (anything that rewrites a record), green for money received
 * and finished work, amber for credit given, blue for routine progress.
 */
export function auditTone(e: Pick<AuditEntry, 'action' | 'entity' | 'summary' | 'details'>): AuditTone {
  if (e.action === 'delete') return 'red'
  if (e.entity === 'ledger_entries') return e.summary.startsWith('Recorded payment') ? 'green' : 'amber'
  if (e.entity === 'orders') {
    if (e.action === 'create') return 'green'
    const changed = Object.keys(e.details ?? {})
    const onlyStatusOrShelf = changed.length > 0 && changed.every((k) => k === 'status' || k === 'shelf_location')
    return onlyStatusOrShelf ? 'blue' : 'red'
  }
  return e.action === 'update' ? 'red' : 'slate'
}
