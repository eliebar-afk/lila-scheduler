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

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toTimeString().slice(0, 5)

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
