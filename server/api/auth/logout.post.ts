import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  const config = useRuntimeConfig()
  if (token) {
    const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)
    await supabase.auth.admin.signOut(token).catch(() => {})
  }
  deleteCookie(event, 'sgo-token', { path: '/' })
  return { success: true }
})
