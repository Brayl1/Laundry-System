import { describe, expect, it } from 'vitest'
import { auditTone } from './tone'

const base = { action: 'update' as const, entity: 'orders', summary: '', details: null }

describe('auditTone', () => {
  it('colours deletions red', () => {
    expect(auditTone({ ...base, action: 'delete' })).toBe('red')
  })

  it('separates payments (green) from credit given (amber)', () => {
    expect(auditTone({ ...base, action: 'create', entity: 'ledger_entries', summary: 'Recorded payment of PHP 100' })).toBe('green')
    expect(auditTone({ ...base, action: 'create', entity: 'ledger_entries', summary: 'Added credit charge of PHP 100' })).toBe('amber')
  })

  it('treats status moves as routine but edits to money fields as red', () => {
    expect(auditTone({ ...base, details: { status: { from: 'pending', to: 'washing' } } })).toBe('blue')
    expect(auditTone({ ...base, details: { total: { from: 100, to: 10 } } })).toBe('red')
  })

  it('colours settings and staff edits red', () => {
    expect(auditTone({ ...base, entity: 'settings' })).toBe('red')
  })
})
