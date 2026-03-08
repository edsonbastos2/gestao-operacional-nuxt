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

  const { data: alvo } = await supabase.from('sgo_usuarios').select('auth_user_id').eq('id', id).single()
  if (!alvo?.auth_user_id) throw createError({ statusCode: 404 })

  const senhaTemp = Math.random().toString(36).slice(-10) + 'A1!'
  await supabase.auth.admin.updateUserById(alvo.auth_user_id, { password: senhaTemp })
  await supabase.from('sgo_usuarios').update({ primeiro_acesso: true, updated_by: me.id }).eq('id', id)

  await supabase.rpc('fn_audit', {
    p_entidade: 'sgo_usuarios', p_entidade_id: id,
    p_acao: 'E', p_usuario_id: me.id, p_usuario_nome: me.nome,
    p_justificativa: 'Reset de senha pelo administrador.',
  })

  return { senha_temp: senhaTemp }
})
