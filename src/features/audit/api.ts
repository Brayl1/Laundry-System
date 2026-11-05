import { db } from '@/lib/untyped'
import { unwrap } from '@/lib/supabase'
import type { AuditAction, AuditEntry } from './tone'

interface AuditRow {
  id: number
  created_at: string
  action: AuditAction
  entity: string
  summary: string
  details: Record<string, unknown> | null
  actor: { display_name: string; role: 'admin' | 'cashier' } | null
}

export async function fetchAuditLog(limit = 200): Promise<AuditEntry[]> {
  const rows = unwrap(
    await db.from('audit_log').select('id, created_at, action, entity, summary, details, actor:profiles(display_name, role)').order('created_at', { ascending: false }).limit(limit),
  ) as AuditRow[]
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    action: r.action,
    entity: r.entity,
    summary: r.summary,
    details: r.details,
    actorName: r.actor?.display_name ?? 'System',
    actorRole: r.actor?.role ?? null,
  }))
}
