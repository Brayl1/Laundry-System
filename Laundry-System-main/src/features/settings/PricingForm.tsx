import { useState, type FormEvent } from 'react'
import { Button, Card, ErrorNote, Input } from '@/shared/ui'
import { updateSettings } from './api'
import { SavedNote } from './SavedNote'
import { useSaveState } from './useSaveState'

export function PricingForm({ pricePerKg, editable }: { pricePerKg: number; editable: boolean }) {
  const [value, setValue] = useState(String(pricePerKg))
  const { saving, saved, error, run } = useSaveState()
  const parsed = Number(value)
  const valid = Number.isFinite(parsed) && parsed > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (valid) run(() => updateSettings({ price_per_kg: parsed }))
  }

  return (
    <Card title="Pricing">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Price per kg (₱)"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!editable}
          error={value && !valid ? 'Enter a price above zero' : undefined}
        />
        <p className="text-xs text-slate-500">Applies to new orders only; past orders keep the rate they were charged.</p>
        <ErrorNote message={error} />
        {editable && (
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving} disabled={!valid}>
              Save price
            </Button>
            <SavedNote show={saved} />
          </div>
        )}
      </form>
    </Card>
  )
}
