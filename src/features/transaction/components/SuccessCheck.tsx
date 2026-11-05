import { motion } from 'motion/react'

/** Green circle that pops in, then draws its check mark. */
export function SuccessCheck() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30"
    >
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="white" strokeWidth={3} aria-hidden>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}
