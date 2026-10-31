import type { ReactNode } from 'react'
import { Button, type ButtonProps } from '@/shared/ui'

interface StepActionsProps {
  onBack?: () => void
  onNext: () => void
  nextLabel?: ReactNode
  nextDisabled?: boolean
  nextVariant?: ButtonProps['variant']
  loading?: boolean
}

export function StepActions({ onBack, onNext, nextLabel = 'Continue', nextDisabled, nextVariant, loading }: StepActionsProps) {
  return (
    <div className={onBack ? 'mt-6 grid grid-cols-2 gap-3' : 'mt-6'}>
      {onBack && (
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
      )}
      <Button variant={nextVariant} onClick={onNext} disabled={nextDisabled} loading={loading} fullWidth>
        {nextLabel}
      </Button>
    </div>
  )
}
