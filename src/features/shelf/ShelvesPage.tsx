import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button, Card, ErrorNote, Input, Modal, PageHeader, PageLoader } from '@/shared/ui'
import { useLoad } from '@/shared/hooks/useLoad'
import { createBin, createShelf, deleteBin, deleteShelf, fetchShelves, renameBin, renameShelf } from './api'
import type { Shelf } from './shelves'

/** Admin: lay out the racks and bins that cashiers see on the shelf map. */
export function ShelvesPage() {
  const shelves = useLoad(fetchShelves)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newShelf, setNewShelf] = useState('')
  const [removing, setRemoving] = useState<Shelf | null>(null)

  /** Runs a change, then reloads. Resolves to true when it worked, so forms know whether to clear. */
  async function act(action: () => Promise<void>): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await action()
      await shelves.reload()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addShelf(e: FormEvent) {
    e.preventDefault()
    if (await act(() => createShelf(newShelf))) setNewShelf('')
  }

  async function confirmRemove() {
    const target = removing
    setRemoving(null)
    if (target) await act(() => deleteShelf(target.id))
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Shelves" subtitle="The racks and bins cashiers choose from when they store a finished bag" />
      <div className="mb-4 space-y-2">
        <ErrorNote message={shelves.error} />
        <ErrorNote message={error} />
      </div>

      {!shelves.data ? (
        !shelves.error && <PageLoader />
      ) : (
        <div className="space-y-5">
          <Card title="Add a shelf">
            <form onSubmit={addShelf} className="flex items-end gap-3">
              <div className="flex-1">
                <Input aria-label="Shelf name" placeholder="e.g. Shelf 5, or Back rack" maxLength={40} value={newShelf} onChange={(e) => setNewShelf(e.target.value)} required />
              </div>
              <Button type="submit" icon={<Plus className="size-4" />} loading={busy} disabled={!newShelf.trim()}>
                Add shelf
              </Button>
            </form>
          </Card>

          {shelves.data.length === 0 && <Card className="py-10 text-center text-sm text-slate-500">No shelves yet. Add your first one above.</Card>}

          {shelves.data.map((shelf) => (
            <Card key={shelf.id}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <EditableName value={shelf.name} label="shelf" className="text-base font-medium text-slate-900" onSave={(name) => act(() => renameShelf(shelf.id, name))} />
                <Button variant="ghost" size="sm" icon={<Trash2 className="size-3.5" />} disabled={busy} onClick={() => setRemoving(shelf)}>
                  Delete shelf
                </Button>
              </div>

              <ul className="flex flex-wrap gap-2">
                {shelf.bins.map((bin) => (
                  <li key={bin.id} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1 pl-3 text-sm">
                    <span className="text-slate-500">Bin</span>
                    <EditableName value={bin.name} label="bin" onSave={(name) => act(() => renameBin(bin.id, name))} />
                    <button
                      type="button"
                      aria-label={`Delete Bin ${bin.name}`}
                      disabled={busy}
                      onClick={() => act(() => deleteBin(bin.id))}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
                {shelf.bins.length === 0 && <li className="py-1 text-sm text-slate-500">No bins on this shelf yet.</li>}
              </ul>

              <AddBinForm busy={busy} onAdd={(name) => act(() => createBin(shelf.id, name))} />
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Delete this shelf?"
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {removing?.name} and its {removing?.bins.length} bins are removed from the shelf map. If a bag is still in one of them, the delete is
          refused until it is moved.
        </p>
      </Modal>
    </div>
  )
}

function AddBinForm({ busy, onAdd }: { busy: boolean; onAdd: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (await onAdd(name)) setName('')
  }

  return (
    <form onSubmit={submit} className="mt-4 flex items-center gap-2">
      <div className="w-40">
        <Input aria-label="New bin name" placeholder="New bin, e.g. E" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" variant="outline" size="sm" icon={<Plus className="size-3.5" />} disabled={busy || !name.trim()}>
        Add bin
      </Button>
    </form>
  )
}

/** A name that turns into a text field when you press the pencil. Enter saves, Escape cancels. */
function EditableName({ value, label, className, onSave }: { value: string; label: string; className?: string; onSave: (name: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  async function save() {
    if (draft.trim() === value || !draft.trim()) {
      setEditing(false)
      return
    }
    if (await onSave(draft)) setEditing(false)
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={className}>{value}</span>
        <button
          type="button"
          aria-label={`Rename ${label} ${value}`}
          onClick={() => {
            setDraft(value)
            setEditing(true)
          }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <Pencil className="size-3.5" />
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        aria-label={`New name for ${label} ${value}`}
        value={draft}
        maxLength={label === 'bin' ? 20 : 40}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          } else if (e.key === 'Escape') setEditing(false)
        }}
        className="h-7 w-32 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button type="button" aria-label="Save name" onClick={save} className="rounded-md p-1 text-green-600 hover:bg-green-50">
        <Check className="size-3.5" />
      </button>
      <button type="button" aria-label="Cancel" onClick={() => setEditing(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-200">
        <X className="size-3.5" />
      </button>
    </span>
  )
}
