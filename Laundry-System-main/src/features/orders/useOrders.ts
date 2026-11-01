import { useCallback, useEffect, useState } from 'react'
import type { OrderDetail, OrderStatus } from '@/lib/types'
import { fetchOrders, subscribeToOrders, updateOrderStatus } from './api'

export function useOrders() {
  const [orders, setOrders] = useState<OrderDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetchOrders()
      .then((data) => {
        setOrders(data)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToOrders(refresh)
  }, [refresh])

  const setStatus = useCallback(async (id: string, status: OrderStatus) => {
    // Optimistic: update locally, roll back by refetching on failure.
    setOrders((prev) => prev?.map((o) => (o.id === id ? { ...o, status } : o)) ?? prev)
    try {
      await updateOrderStatus(id, status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status')
      refresh()
    }
  }, [refresh])

  return { orders, error, setStatus }
}
