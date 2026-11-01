import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
  className?: string
}

/** Counts from the previous value to the new one. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduce) {
      node.textContent = format(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (n) => (node.textContent = format(n)),
    })
    previous.current = value
    return () => controls.stop()
  }, [value, format, reduce])

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
