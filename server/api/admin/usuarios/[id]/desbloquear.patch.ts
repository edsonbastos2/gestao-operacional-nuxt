import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  if (!token) throw createError({ statusCode: 401 })

  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw createError({ statusCode: 401 })
  const { data: me } = await supabase.from('sgo_usuarios').select('id, perfil, nome').eq('auth_user_id', user.id).single()
  if (me?.perfil !== 'ti_admin') throw createError({ statusCode: 403 })

  await supabase.from('sgo_usuarios').update({ tentativas_login: 0, bloqueado_em: null, updated_by: me.id }).eq('id', id)

  await supabase.rpc('fn_audit', {
    p_entidade: 'sgo_usuarios', p_entidade_id: id,
    p_acao: 'E', p_usuario_id: me.id, p_usuario_nome: me.nome,
    p_justificativa: 'Desbloqueio manual pelo administrador.',
  })

  return { success: true }
})
