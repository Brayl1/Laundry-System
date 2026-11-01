import { useCallback, useEffect, useState } from 'react'
import type { OrderStatus } from '@/lib/types'
import { saveShelfLocation } from '@/features/shelf'
import { fetchBoard, startOrder, subscribeToBoard, updateOrderStatus, type Board } from './api'

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetchBoard()
      .then((data) => {
        setBoard(data)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToBoard(refresh)
  }, [refresh])

  /** Moves an order to its next stage. Claimed orders leave the board. Resolves to false if the update failed. */
  const advance = useCallback(
    async (id: string, status: OrderStatus): Promise<boolean> => {
      setBoard((prev) =>
        prev && {
          ...prev,
          active: status === 'claimed' ? prev.active.filter((o) => o.id !== id) : prev.active.map((o) => (o.id === id ? { ...o, status } : o)),
        },
      )
      try {
        await updateOrderStatus(id, status)
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the order')
        refresh() // roll back the optimistic move
        return false
      }
    },
    [refresh],
  )

  /** Stores where an order's bag is kept. Throws so the dialog can show the reason. */
  const setShelf = useCallback(async (orderId: string, location: string | null) => {
    await saveShelfLocation(orderId, location)
    setBoard((prev) => prev && { ...prev, active: prev.active.map((o) => (o.id === orderId ? { ...o, shelfLocation: location } : o)) })
  }, [])

  /** Approves a pending order: the washer goes to "in use". Throws so the dialog can show the reason. */
  const start = useCallback(
    async (orderId: string, machineId: string) => {
      await startOrder(orderId, machineId)
      refresh()
    },
    [refresh],
  )

  return { board, error, advance, start, setShelf }
}
