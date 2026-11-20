import { describe, expect, it } from 'vitest'
import { resolveMove } from './kanban'

describe('resolveMove', () => {
  it('ignores a drop on the same column', () => {
    expect(resolveMove('washing', 'washing')).toEqual({ kind: 'noop' })
  })

  it('routes pending to washing through the washer approval', () => {
    expect(resolveMove('pending', 'washing')).toEqual({ kind: 'start' })
  })

  it('advances one step at a time', () => {
    expect(resolveMove('washing', 'done')).toEqual({ kind: 'advance', to: 'done' })
    expect(resolveMove('done', 'claimed')).toEqual({ kind: 'advance', to: 'claimed' })
  })

  it('rejects skipping a stage or moving backwards', () => {
    expect(resolveMove('pending', 'done').kind).toBe('reject')
    expect(resolveMove('washing', 'claimed').kind).toBe('reject')
    expect(resolveMove('done', 'washing').kind).toBe('reject')
  })
})
