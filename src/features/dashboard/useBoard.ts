import { useCallback, useEffect, useState } from 'react'
import type { OrderStatus } from '@/lib/types'
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

  /** Moves an order to its next stage. Claimed orders leave the board. */
  const advance = useCallback(
    async (id: string, status: OrderStatus) => {
      setBoard((prev) =>
        prev && {
          ...prev,
          active: status === 'claimed' ? prev.active.filter((o) => o.id !== id) : prev.active.map((o) => (o.id === id ? { ...o, status } : o)),
        },
      )
      try {
        await updateOrderStatus(id, status)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the order')
        refresh() // roll back the optimistic move
      }
    },
    [refresh],
  )

  /** Approves a pending order: the washer goes to "in use". Throws so the dialog can show the reason. */
  const start = useCallback(
    async (orderId: string, machineId: string) => {
      await startOrder(orderId, machineId)
      refresh()
    },
    [refresh],
  )

  return { board, error, advance, start }
}
