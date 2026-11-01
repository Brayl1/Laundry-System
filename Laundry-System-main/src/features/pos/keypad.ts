import { MAX_WEIGHT_KG } from '@/features/transaction/pricing'

/** Appends a keypad key to the weight text, refusing anything that is not a plain number with up to 2 decimals. */
export function pressKey(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') return current.includes('.') ? current : current === '' ? '0.' : `${current}.`
  const next = current === '0' ? key : current + key
  if (!/^\d{0,3}(\.\d{0,2})?$/.test(next)) return current
  return Number(next) > MAX_WEIGHT_KG ? current : next
}
