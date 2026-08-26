import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESTAURANT_IP = '62.195.229.217'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// This function runs on a UTC server, so every date/time must be derived in
// restaurant-local time. Shifts run past midnight (last slot 03:30), so
// anything before 05:00 belongs to the previous operating day — otherwise a
// 03:00 check-out would look for a row filed under the next calendar date.
const TZ = 'Europe/Amsterdam'
const OPERATING_DAY_START_HOUR = 5

const localParts = (d: Date) => {
  const parts: Record<string, string> = {}
  for (
    const { type, value } of new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d)
  ) parts[type] = value
  return parts
}

const localTime = (d: Date) => {
  const p = localParts(d)
  return `${p.hour}:${p.minute}`
}

const operatingDate = (d: Date) => {
  const p = localParts(d)
  const day = new Date(`${p.year}-${p.month}-${p.day}T00:00:00Z`)
  if (Number(p.hour) < OPERATING_DAY_START_HOUR) {
    day.setUTCDate(day.getUTCDate() - 1)
  }
  return day.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const clientIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()

    if (clientIp !== RESTAURANT_IP) {
      return json({ error: 'Must be on restaurant WiFi to check in' })
    }

    const { employee_id, action } = await req.json()

    if (!employee_id || !['check-in', 'check-out'].includes(action)) {
      return json({ error: 'Invalid request parameters' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const stamp = new Date()
    const today = operatingDate(stamp)
    const now = localTime(stamp)

    if (action === 'check-in') {
      const { data, error } = await supabase
        .from('attendance')
        .insert({ employee_id, date: today, check_in: now })
        .select()
        .single()

      if (error) return json({ error: error.message })
      return json({ data })
    }

    // check-out: update today's record for this employee
    const { data, error } = await supabase
      .from('attendance')
      .update({ check_out: now })
      .eq('employee_id', employee_id)
      .eq('date', today)
      .select()
      .single()

    if (error) return json({ error: error.message })
    return json({ data })
  } catch {
    return json({ error: 'Internal server error' }, 500)
  }
})
