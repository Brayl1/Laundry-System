// Sends one SMS through Semaphore (https://semaphore.co), a Philippine SMS gateway.
//
// Deploy:   supabase functions deploy send-sms
// Secrets:  supabase secrets set SEMAPHORE_API_KEY=xxxx            (required)
//           supabase secrets set SEMAPHORE_SENDER_NAME=YourShop    (optional, must be approved by Semaphore)
//
// Only signed-in, active staff can call it, so the key never reaches the browser and the
// endpoint cannot be used by strangers to send texts on your account.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** 09171234567, +63 917 123 4567 and 639171234567 all become 09171234567. Returns null if it is not a PH mobile number. */
function normalizeNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (/^09\d{9}$/.test(digits)) return digits
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`
  if (/^9\d{9}$/.test(digits)) return `0${digits}`
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return json({ error: 'Not signed in' }, 401)
  const { data: isStaff } = await supabase.rpc('is_staff')
  if (!isStaff) return json({ error: 'This account is deactivated' }, 403)

  let payload: { to?: unknown; message?: unknown }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  const number = typeof payload.to === 'string' ? normalizeNumber(payload.to) : null
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (!number) return json({ error: 'That is not a valid Philippine mobile number' }, 400)
  if (!message || message.length > 480) return json({ error: 'Message must be 1 to 480 characters' }, 400)

  const apikey = Deno.env.get('SEMAPHORE_API_KEY')
  if (!apikey) return json({ error: 'SEMAPHORE_API_KEY is not set on the server' }, 500)

  const form = new URLSearchParams({ apikey, number, message })
  const sender = Deno.env.get('SEMAPHORE_SENDER_NAME')
  if (sender) form.set('sendername', sender)

  const res = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200)
    return json({ error: `Semaphore replied ${res.status}: ${detail}` }, 502)
  }
  return json({ ok: true })
})
