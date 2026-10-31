import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'

export function SavedNote({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="inline-flex items-center gap-1 text-sm text-green-700"
          role="status"
        >
          <CheckCircle2 className="size-4" /> Saved
        </motion.span>
      )}
    </AnimatePresence>
  )
}
