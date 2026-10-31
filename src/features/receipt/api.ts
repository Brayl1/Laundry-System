import { supabase, unwrap } from '@/lib/supabase'
import type { Settings } from '@/lib/types'

export type ShopInfo = Pick<Settings, 'shop_name' | 'shop_subtitle' | 'address' | 'phone' | 'receipt_footer'>

export async function fetchShopInfo(): Promise<ShopInfo> {
  return unwrap(
    await supabase.from('settings').select('shop_name, shop_subtitle, address, phone, receipt_footer').eq('id', 1).single(),
  )
}
