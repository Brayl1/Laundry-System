import { ErrorNote, FadeIn, PageHeader, PageLoader } from '@/shared/ui'
import { useLoad } from '@/shared/hooks/useLoad'
import { fetchSettings } from './api'
import { ShopInfoForm } from './ShopInfoForm'

export function ShopInfoPage() {
  const settings = useLoad(fetchSettings)

  return (
    <div className="max-w-3xl">
      <PageHeader title="Shop Info" subtitle="Shown on every printed receipt" />
      <ErrorNote message={settings.error} />
      {!settings.data ? (
        !settings.error && <PageLoader />
      ) : (
        <FadeIn>
          <ShopInfoForm settings={settings.data} editable />
        </FadeIn>
      )}
    </div>
  )
}
