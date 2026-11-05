import { useEffect, useState } from 'react'

/** The three looks of the reference: liquid glass (the default blend), glassmorphism and neumorphism. */
export type Material = 'liquid' | 'glass' | 'soft'

export const MATERIALS: { id: Material; label: string }[] = [
  { id: 'liquid', label: 'Liquid' },
  { id: 'glass', label: 'Glass' },
  { id: 'soft', label: 'Soft' },
]

const KEY = 'laundry-material'
const EVENT = 'laundry-material-change'

function read(): Material {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'glass' || v === 'soft' || v === 'liquid') return v
  } catch {
    // Storage can be blocked (private mode); the default look is fine.
  }
  return 'liquid'
}

/** Sets the look on <html>, remembers it, and tells every switcher on the page. */
export function applyMaterial(material: Material) {
  document.documentElement.dataset.material = material
  try {
    localStorage.setItem(KEY, material)
  } catch {
    // Not remembered; still applied for this visit.
  }
  window.dispatchEvent(new CustomEvent<Material>(EVENT, { detail: material }))
}

export function useMaterial() {
  const [material, setMaterial] = useState<Material>(read)

  useEffect(() => {
    document.documentElement.dataset.material = material
    const onChange = (e: Event) => setMaterial((e as CustomEvent<Material>).detail)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [material])

  return { material, setMaterial: applyMaterial }
}
