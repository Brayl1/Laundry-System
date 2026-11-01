import type { OrderLine } from '@/lib/types'

export interface Quote {
  subtotal: number
  addons: OrderLine[]
  total: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Mirrors create_order on the server: weight × rate, plus each selected add-on. */
export function computeQuote(weightKg: number, pricePerKg: number, addons: OrderLine[]): Quote {
  const weight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0
  const subtotal = round2(weight * pricePerKg)
  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0)
  return { subtotal, addons, total: round2(subtotal + addonsTotal) }
}

export const MAX_WEIGHT_KG = 200

/** Parses the weight field; returns null when it is not a usable weight. */
export function parseWeight(input: string): number | null {
  if (input.trim() === '') return null
  const n = Number(input)
  if (!Number.isFinite(n) || n <= 0 || n > MAX_WEIGHT_KG) return null
  return round2(n)
}
