import { supabase } from '@/lib/supabase'
import type { OrderDetail } from '@/lib/types'
import { dropoffMessage, readyMessage, trackingUrl } from './messages'
import { sendSms, smsEnabled } from './sms'

let shopName: Promise<string> | null = null

/** Shop name from settings, fetched once. Falls back so a failed lookup never blocks a text. */
export function getShopName(): Promise<string> {
  shopName ??= Promise.resolve(supabase.from('settings').select('shop_name').eq('id', 1).single())
    .then((res) => res.data?.shop_name ?? 'Laundry Shop')
    .catch(() => 'Laundry Shop')
  return shopName
}

/** "We got your laundry" with a tracking link. No-op for walk-ins without a phone number. */
export async function notifyDropoff(order: OrderDetail): Promise<void> {
  if (!smsEnabled || !order.customerPhone) return
  const shop = await getShopName()
  await sendSms({
    to: order.customerPhone,
    kind: 'dropoff',
    orderId: order.id,
    message: dropoffMessage({ shop, code: order.code, url: trackingUrl(window.location.origin, order.code) }),
  })
}

/** "Ready for pickup", sent when the order moves to Done. */
export async function notifyReady(order: OrderDetail): Promise<void> {
  if (!smsEnabled || !order.customerPhone) return
  const shop = await getShopName()
  await sendSms({
    to: order.customerPhone,
    kind: 'ready',
    orderId: order.id,
    message: readyMessage({ shop, code: order.code, shelf: order.shelfLocation }),
  })
}
