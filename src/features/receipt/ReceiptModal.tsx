import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import type { OrderDetail } from '@/lib/types'
import { Button, ErrorNote, Modal, PageLoader } from '@/shared/ui'
import { fetchShopInfo, type ShopInfo } from './api'
import { Receipt } from './Receipt'
import './print.css'

interface ReceiptModalProps {
  order: OrderDetail | null
  onClose: () => void
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!order || shop) return
    fetchShopInfo()
      .then(setShop)
      .catch((e: Error) => setError(e.message))
  }, [order, shop])

  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      title="Receipt Preview"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button icon={<Printer className="size-4" />} onClick={() => window.print()} disabled={!shop}>
            Print
          </Button>
        </>
      }
    >
      <ErrorNote message={error} />
      <div className="max-h-[60vh] overflow-y-auto">
        {order && shop ? <Receipt order={order} shop={shop} /> : !error && <PageLoader />}
      </div>
    </Modal>
  )
}
