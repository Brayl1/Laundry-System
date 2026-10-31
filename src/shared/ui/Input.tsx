import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, icon, error, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-800">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 [&_svg]:size-4">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-10 w-full rounded-lg border border-transparent bg-slate-100 px-3 text-sm text-slate-900 placeholder:text-slate-400',
            'transition-colors focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-3 focus:ring-slate-200',
            icon ? 'pl-9' : null,
            error && 'border-red-400',
            className,
          )}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})
