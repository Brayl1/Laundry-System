import { useState, type FormEvent } from 'react'
import type { Settings } from '@/lib/types'
import { Button, Card, ErrorNote, Input } from '@/shared/ui'
import { updateSettings } from './api'
import { SavedNote } from './SavedNote'
import { useSaveState } from './useSaveState'

const fields = [
  ['shop_name', 'Shop name'],
  ['shop_subtitle', 'Subtitle'],
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['receipt_footer', 'Receipt footer'],
] as const

type ShopFields = Pick<Settings, (typeof fields)[number][0]>

export function ShopInfoForm({ settings, editable }: { settings: Settings; editable: boolean }) {
  const [values, setValues] = useState<ShopFields>(() => ({
    shop_name: settings.shop_name,
    shop_subtitle: settings.shop_subtitle,
    address: settings.address,
    phone: settings.phone,
    receipt_footer: settings.receipt_footer,
  }))
  const { saving, saved, error, run } = useSaveState()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(() => updateSettings(values))
  }

  return (
    <Card title="Shop & Receipt">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <Input
              key={key}
              label={label}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              disabled={!editable}
              required
            />
          ))}
        </div>
        <ErrorNote message={error} />
        {editable && (
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving}>
              Save shop info
            </Button>
            <SavedNote show={saved} />
          </div>
        )}
      </form>
    </Card>
  )
}
