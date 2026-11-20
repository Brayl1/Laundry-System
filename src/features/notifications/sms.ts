import { db } from '@/lib/untyped'

/** SMS stays off until the edge function is deployed and this is set in .env.local. */
export const smsEnabled = import.meta.env.VITE_SMS_ENABLED === 'true'

export type SmsKind = 'dropoff' | 'ready' | 'reminder'

export interface SmsRequest {
  to: string
  message: string
  kind: SmsKind
  orderId?: string | null
  customerId?: string | null
}

export type SmsResult = { ok: true } | { ok: false; error: string }

/** Sends through the `send-sms` edge function (which holds the Semaphore key) and records the attempt. */
export async function sendSms(req: SmsRequest): Promise<SmsResult> {
  if (!smsEnabled) return { ok: false, error: 'SMS is turned off. Set VITE_SMS_ENABLED=true and deploy the send-sms function.' }

  let error: string | null = null
  try {
    const { data, error: fnError } = await db.functions.invoke('send-sms', { body: { to: req.to, message: req.message } })
    if (fnError) error = fnError.message
    else if (data && typeof data === 'object' && 'error' in data) error = String((data as { error: unknown }).error)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Could not send the SMS'
  }

  try {
    await db.from('sms_log').insert({
      kind: req.kind,
      recipient: req.to,
      message: req.message,
      status: error ? 'failed' : 'sent',
      error,
      order_id: req.orderId ?? null,
      customer_id: req.customerId ?? null,
    })
  } catch {
    // The log is a convenience; never fail a send because of it.
  }

  return error ? { ok: false, error } : { ok: true }
}
