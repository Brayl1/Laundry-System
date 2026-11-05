import { AnimatePresence, motion } from 'motion/react'
import { peso } from '@/lib/format'
import { AnimatedNumber } from '@/shared/ui'
import type { Quote } from '../pricing'

export function Breakdown({ weightKg, quote }: { weightKg: number; quote: Quote }) {
  return (
    <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>Weight ({weightKg} kg)</span>
        <span>{peso(quote.subtotal)}</span>
      </div>
      <AnimatePresence initial={false}>
        {quote.addons.map((a) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex justify-between pt-1.5 text-slate-600">
              <span>{a.name}</span>
              <span>{peso(a.price, false)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-medium">
        <span>Total</span>
        <AnimatedNumber value={quote.total} format={peso} />
      </div>
    </div>
  )
}
