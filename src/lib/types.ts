import type { Database } from './database.types'

type Enums = Database['public']['Enums']

export type CustomerType = Enums['customer_type']
export type ServiceType = Enums['service_type']
export type PaymentMethod = Enums['payment_method']
export type OrderStatus = Enums['order_status']
export type MachineStatus = Enums['machine_status']
export type UserRole = Enums['user_role']

export type Settings = Database['public']['Tables']['settings']['Row']
export type Addon = Database['public']['Tables']['addons']['Row']
export type Machine = Database['public']['Tables']['machines']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export interface OrderLine {
  name: string
  price: number
}

/** A fully joined order, as shown in tables and on receipts. */
export interface OrderDetail {
  id: string
  code: string
  createdAt: string
  customerType: CustomerType
  customerName: string | null
  customerPhone: string | null
  serviceType: ServiceType
  weightKg: number
  pricePerKg: number
  subtotal: number
  total: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  machineLabel: string | null
  cashierName: string
  addons: OrderLine[]
}

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'washing', 'done', 'claimed']
