import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Droplets, Layers, Search, Square, type LucideIcon } from 'lucide-react'
import { applyMaterial, MATERIALS, type Material } from '../hooks/useMaterial'
import { cn } from '../cn'

export interface PaletteCommand {
  id: string
  label: string
  /** Shown on the right, e.g. the section the page belongs to. */
  group: string
  icon?: LucideIcon
  /** Go to this path... */
  to?: string
  /** ...or run this. */
  run?: () => void
}

const OPEN_EVENT = 'open-command-palette'
const materialIcons: Record<Material, LucideIcon> = { liquid: Droplets, glass: Layers, soft: Square }

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** A button that opens the palette; it lives in the header and the admin sidebar. */
export function PaletteButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={cn(
        'neu-btn inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs text-slate-600',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
        className,
      )}
    >
      <Search className="size-3.5" aria-hidden />
      <span>Search</span>
      <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{isMac() ? '\u2318K' : 'Ctrl K'}</kbd>
    </button>
  )
}

/**
 * Jump to any page or change the look from the keyboard: Ctrl+K (Cmd+K on a Mac).
 * Arrow keys move, Enter runs, Escape closes.
 */
export function CommandPalette({ commands }: { commands: PaletteCommand[] }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const all = useMemo<PaletteCommand[]>(
    () => [
      ...commands,
      ...MATERIALS.map((m) => ({
        id: `look-${m.id}`,
        label: `Look: ${m.label === 'Liquid' ? 'Liquid glass' : m.label === 'Glass' ? 'Glassmorphism' : 'Neumorphism'}`,
        group: 'Appearance',
        icon: materialIcons[m.id],
        run: () => applyMaterial(m.id),
      })),
    ],
    [commands],
  )

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return all.filter((c) => words.every((w) => `${c.label} ${c.group}`.toLowerCase().includes(w)))
  }, [all, query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function choose(command: PaletteCommand | undefined) {
    if (!command) return
    setOpen(false)
    if (command.to) navigate(command.to)
    else command.run?.()
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh] print:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onKeyDown={onKeyDown}
            className="glass-strong relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200"
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4">
              <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Go to a page or change the look…"
                aria-label="Search commands"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
                className="h-14 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Esc</kbd>
            </div>
            <ul id="palette-list" ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-500">Nothing matches “{query}”.</li>}
              {results.map((c, i) => {
                const Icon = c.icon
                return (
                  <li
                    key={c.id}
                    id={`palette-${c.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(c)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm',
                      i === active ? 'neu-sm text-slate-900' : 'text-slate-700',
                    )}
                  >
                    {Icon && <Icon className="size-4 shrink-0 text-blue-600" aria-hidden />}
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="text-xs text-slate-500">{c.group}</span>
                    {i === active && <CornerDownLeft className="size-3.5 text-slate-400" aria-hidden />}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
