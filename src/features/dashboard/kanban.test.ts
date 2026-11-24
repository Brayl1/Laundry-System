import { describe, expect, it } from 'vitest'
import { resolveMove } from './kanban'

describe('resolveMove', () => {
  it('ignores a drop on the same column', () => {
    expect(resolveMove('washing', 'washing')).toEqual({ kind: 'noop' })
  })

  it('routes pending to washing through the washer approval', () => {
    expect(resolveMove('pending', 'washing')).toEqual({ kind: 'start' })
  })

  it('routes washing to drying through the dryer choice', () => {
    expect(resolveMove('washing', 'drying')).toEqual({ kind: 'dry' })
  })

  it('advances one step at a time', () => {
    expect(resolveMove('drying', 'done')).toEqual({ kind: 'advance', to: 'done' })
    expect(resolveMove('done', 'claimed')).toEqual({ kind: 'advance', to: 'claimed' })
  })

  it('rejects skipping a stage or moving backwards', () => {
    expect(resolveMove('pending', 'done').kind).toBe('reject')
    expect(resolveMove('washing', 'done').kind).toBe('reject')
    expect(resolveMove('drying', 'claimed').kind).toBe('reject')
    expect(resolveMove('done', 'drying').kind).toBe('reject')
  })
})
