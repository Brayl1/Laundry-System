import { useReducer } from 'react'
import type { Customer, CustomerType, OrderDetail, PaymentMethod, ServiceType } from '@/lib/types'
import { parseWeight } from './pricing'

export const STEPS = ['Customer', 'Service', 'Weight', 'Add-ons', 'Payment'] as const
const LAST_STEP = STEPS.length - 1

export interface WizardState {
  step: number
  /** +1 moving forward, -1 moving back; drives the slide direction. */
  direction: 1 | -1
  customerType: CustomerType
  customer: Customer | null
  serviceType: ServiceType
  /** Washer assigned to this order, or null to decide later (full-service only). */
  machineId: string | null
  weightInput: string
  addonIds: string[]
  paymentMethod: PaymentMethod
  completed: OrderDetail | null
}

type Action =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'setCustomerType'; value: CustomerType }
  | { type: 'setCustomer'; value: Customer | null }
  | { type: 'setServiceType'; value: ServiceType }
  | { type: 'setMachine'; value: string | null }
  | { type: 'setWeight'; value: string }
  | { type: 'toggleAddon'; id: string }
  | { type: 'setPayment'; value: PaymentMethod }
  | { type: 'complete'; order: OrderDetail }
  | { type: 'reset' }

const initialState: WizardState = {
  step: 0,
  direction: 1,
  customerType: 'walk-in',
  customer: null,
  serviceType: 'self-service',
  machineId: null,
  weightInput: '',
  addonIds: [],
  paymentMethod: 'cash',
  completed: null,
}

/** Whether the current step has what it needs to continue. */
export function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case 0:
      return state.customerType === 'walk-in' || state.customer !== null
    case 1:
      return state.serviceType === 'full-service' || state.machineId !== null
    case 2:
      return parseWeight(state.weightInput) !== null
    default:
      return true
  }
}

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'next':
      if (!canAdvance(state) || state.step >= LAST_STEP) return state
      return { ...state, step: state.step + 1, direction: 1 }
    case 'back':
      return state.step === 0 ? state : { ...state, step: state.step - 1, direction: -1 }
    case 'setCustomerType':
      return { ...state, customerType: action.value, customer: action.value === 'walk-in' ? null : state.customer }
    case 'setCustomer':
      return { ...state, customer: action.value }
    case 'setServiceType':
      return { ...state, serviceType: action.value }
    case 'setMachine':
      return { ...state, machineId: action.value }
    case 'setWeight':
      return { ...state, weightInput: action.value }
    case 'toggleAddon':
      return {
        ...state,
        addonIds: state.addonIds.includes(action.id)
          ? state.addonIds.filter((id) => id !== action.id)
          : [...state.addonIds, action.id],
      }
    case 'setPayment':
      return { ...state, paymentMethod: action.value }
    case 'complete':
      return { ...state, completed: action.order }
    case 'reset':
      return initialState
  }
}

export function useTransactionWizard() {
  return useReducer(reducer, initialState)
}

export type WizardDispatch = ReturnType<typeof useTransactionWizard>[1]
