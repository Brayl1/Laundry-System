import { useCallback, useEffect, useState } from 'react'

/**
 * Loads data once on mount and exposes `reload`. `fetcher` must be a stable reference
 * (a module-level function), otherwise it reloads on every render.
 */
export function useLoad<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    () =>
      fetcher()
        .then((result) => {
          setData(result)
          setError(null)
        })
        .catch((e: Error) => setError(e.message)),
    [fetcher],
  )

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, reload }
}
