import { ErrorNote, FadeIn, PageHeader, PageLoader } from '@/shared/ui'
import { useLoad } from '@/shared/hooks/useLoad'
import { fetchMachines } from './api'
import { MachinesManager } from './MachinesManager'

export function MachinesPage() {
  const machines = useLoad(fetchMachines)

  return (
    <div className="max-w-3xl">
      <PageHeader title="Machines" subtitle="Washers available for self-service orders" />
      <ErrorNote message={machines.error} />
      {!machines.data ? (
        !machines.error && <PageLoader />
      ) : (
        <FadeIn>
          <MachinesManager machines={machines.data} editable onChanged={machines.reload} />
        </FadeIn>
      )}
    </div>
  )
}
