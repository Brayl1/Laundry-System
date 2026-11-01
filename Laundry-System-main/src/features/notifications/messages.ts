/** SMS templates. Plain ASCII on purpose: a peso sign would force the slower, shorter Unicode SMS format. */

const phpFormat = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const php = (n: number) => `PHP ${phpFormat.format(n)}`

export function trackingUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/track/${encodeURIComponent(code)}`
}

export function dropoffMessage(p: { shop: string; code: string; url: string }): string {
  return `${p.shop}: we got your laundry (${p.code}). Track it here: ${p.url}`
}

export function readyMessage(p: { shop: string; code: string; shelf: string | null }): string {
  const where = p.shelf ? ` It is kept at ${p.shelf}.` : ''
  return `${p.shop}: your laundry (${p.code}) is ready for pickup.${where} Thank you!`
}

export function reminderMessage(p: { shop: string; name: string; balance: number; dueDate: string | null }): string {
  const due = p.dueDate ? ` due ${p.dueDate}` : ''
  return `Hi ${p.name}, this is ${p.shop}. You have an unpaid balance of ${php(p.balance)}${due}. Thank you!`
}
