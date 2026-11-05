import type { ReactNode } from 'react'
import type { OrderDetail } from '@/lib/types'
import { customerTypeLabel, formatReceiptDate, paymentMethodLabel, peso, serviceTypeLabel } from '@/lib/format'
import type { ShopInfo } from './api'

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between text-sm font-bold' : 'flex justify-between'}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

const Divider = ({ thick }: { thick?: boolean }) => (
  <hr className={thick ? 'my-2 border-t-2 border-slate-900' : 'my-2 border-t border-dashed border-slate-400'} />
)

export function Receipt({ order, shop }: { order: OrderDetail; shop: ShopInfo }) {
  const customer =
    order.customerType === 'returning' && order.customerName
      ? order.customerName
      : customerTypeLabel[order.customerType]

  return (
    <div className="receipt-paper mx-auto w-full max-w-[19rem] border border-dashed border-slate-300 bg-white p-4 font-mono text-[11px] leading-relaxed text-slate-900">
      <div className="text-center">
        <p className="text-sm font-bold tracking-wide">{shop.shop_name.toUpperCase()}</p>
        <p>{shop.shop_subtitle}</p>
        <p>{shop.address}</p>
        <p>Tel: {shop.phone}</p>
      </div>
      <Divider />
      <Row label="Order #:" value={order.code} />
      <Row label="Date:" value={formatReceiptDate(order.createdAt)} />
      <Row label="Cashier:" value={order.cashierName} />
      <Row label="Customer:" value={customer} />
      <Row label="Service:" value={serviceTypeLabel[order.serviceType]} />
      {order.machineLabel && <Row label="Machine:" value={order.machineLabel} />}
      <Divider />
      <Row label={`Laundry (${order.weightKg} kg)`} value={peso(order.subtotal)} />
      {order.addons.map((a) => (
        <Row key={a.name} label={a.name} value={peso(a.price)} />
      ))}
      <Divider />
      <Row label="TOTAL:" value={peso(order.total)} strong />
      <Row label="Payment:" value={paymentMethodLabel[order.paymentMethod]} />
      <Divider thick />
      <div className="text-center">
        <p>{shop.receipt_footer}</p>
        <p>Please keep this receipt</p>
        <p className="my-1">---</p>
        <p>Visit us again soon!</p>
      </div>
    </div>
  )
}
