import { useCallback, useState } from 'react'

/** Tracks one async save: pending flag, error text, and a brief "saved" confirmation. */
export function useSaveState() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (action: () => Promise<void>) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await action()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return { saving, saved, error, run }
}
