import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  if (!token) return null

  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)
  const agora = new Date()

  const { data } = await supabase
    .from('sgo_competencias')
    .select('*')
    .eq('mes', agora.getMonth() + 1)
    .eq('ano', agora.getFullYear())
    .single()

  return data ?? null
})
