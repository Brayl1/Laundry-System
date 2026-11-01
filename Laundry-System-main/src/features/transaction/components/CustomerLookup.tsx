import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Phone, Search, UserPlus, X } from 'lucide-react'
import type { Customer } from '@/lib/types'
import { Button, ErrorNote, Input, Spinner } from '@/shared/ui'
import { cn } from '@/shared/cn'
import { createCustomer, searchCustomers } from '../api'

interface CustomerLookupProps {
  selected: Customer | null
  onSelect: (customer: Customer | null) => void
}

export function CustomerLookup({ selected, onSelect }: CustomerLookupProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search.
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const id = setTimeout(() => {
      searchCustomers(query)
        .then(setResults)
        .catch((e: Error) => setError(e.message))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(id)
  }, [query])

  if (selected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
      >
        <div>
          <p className="text-sm font-medium">{selected.name}</p>
          <p className="text-xs text-slate-500">{selected.phone}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-900"
          aria-label="Change customer"
        >
          <X className="size-4" />
        </button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <Input
        icon={<Search />}
        placeholder="Search by name or phone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search customers"
        autoFocus
      />
      <ErrorNote message={error} />
      {searching && <Spinner className="mx-auto block" />}
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {results.map((c) => (
            <motion.li key={c.id} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-slate-500">{c.phone}</span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {!searching && query.trim() && results.length === 0 && !adding && (
        <p className="text-center text-xs text-slate-500">No customer found.</p>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {adding ? (
          <NewCustomerForm
            key="form"
            defaultName={/\d/.test(query) ? '' : query}
            defaultPhone={/\d/.test(query) ? query : ''}
            onCancel={() => setAdding(false)}
            onCreated={onSelect}
          />
        ) : (
          <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="ghost" size="sm" icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>
              Add new customer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface NewCustomerFormProps {
  defaultName: string
  defaultPhone: string
  onCancel: () => void
  onCreated: (customer: Customer) => void
}

function NewCustomerForm({ defaultName, defaultPhone, onCancel, onCreated }: NewCustomerFormProps) {
  const [name, setName] = useState(defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onCreated(await createCustomer(name, phone))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save customer')
      setSaving(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn('space-y-3 overflow-hidden rounded-lg border border-slate-200 p-3')}
    >
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        label="Phone"
        icon={<Phone />}
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        pattern="[0-9+ \-]{7,}"
        title="At least 7 digits"
        required
      />
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="blue" loading={saving}>
          Save customer
        </Button>
      </div>
    </motion.form>
  )
}
