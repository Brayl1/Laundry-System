import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../cn'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  actions?: ReactNode
}

export function Card({ title, actions, className, children, ...rest }: CardProps) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-6', className)} {...rest}>
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-medium text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
