import { ErrorNote, FadeIn, PageHeader, PageLoader } from '@/shared/ui'
import { useLoad } from '@/shared/hooks/useLoad'
import { fetchAddons, fetchSettings } from './api'
import { AddonsManager } from './AddonsManager'
import { PricingForm } from './PricingForm'

export function PricingPage() {
  const settings = useLoad(fetchSettings)
  const addons = useLoad(fetchAddons)
  const error = settings.error ?? addons.error

  return (
    <div className="max-w-3xl">
      <PageHeader title="Pricing & Add-ons" subtitle="Rates and extras offered on new orders" />
      <ErrorNote message={error} />
      {!settings.data || !addons.data ? (
        !error && <PageLoader />
      ) : (
        <div className="space-y-5">
          <FadeIn index={0}>
            <PricingForm pricePerKg={settings.data.price_per_kg} editable />
          </FadeIn>
          <FadeIn index={1}>
            <AddonsManager addons={addons.data} editable onChanged={addons.reload} />
          </FadeIn>
        </div>
      )}
    </div>
  )
}
