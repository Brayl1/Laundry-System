import { describe, expect, it } from 'vitest'
import { timeAgo } from './format'

describe('timeAgo', () => {
  const now = new Date('2026-10-30T12:00:00Z').getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('rounds to minutes, hours and days', () => {
    expect(timeAgo(ago(20_000), now)).toBe('Just now')
    expect(timeAgo(ago(12 * 60_000), now)).toBe('12 min ago')
    expect(timeAgo(ago(3 * 3_600_000 + 5 * 60_000), now)).toBe('3 h ago')
    expect(timeAgo(ago(50 * 3_600_000), now)).toBe('2 d ago')
  })

  it('never goes negative when the clock is slightly behind the server', () => {
    expect(timeAgo(ago(-5_000), now)).toBe('Just now')
  })
})
