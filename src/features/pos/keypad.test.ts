import { describe, expect, it } from 'vitest'
import { pressKey } from './keypad'

describe('pressKey', () => {
  it('builds a weight digit by digit', () => {
    expect(['7', '.', '5'].reduce(pressKey, '')).toBe('7.5')
  })

  it('starts a decimal with 0 and ignores a second point', () => {
    expect(pressKey('', '.')).toBe('0.')
    expect(pressKey('1.5', '.')).toBe('1.5')
  })

  it('stops at two decimals and at the maximum weight', () => {
    expect(pressKey('1.25', '9')).toBe('1.25')
    expect(pressKey('200', '1')).toBe('200')
    expect(pressKey('25', '0')).toBe('25')
  })

  it('does not stack leading zeros and backspaces', () => {
    expect(pressKey('0', '5')).toBe('5')
    expect(pressKey('12', 'back')).toBe('1')
  })
})
