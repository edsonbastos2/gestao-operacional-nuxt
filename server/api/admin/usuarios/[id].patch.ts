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

  const { data: antes } = await supabase.from('sgo_usuarios').select('*').eq('id', id).single()
  if (!antes) throw createError({ statusCode: 404, message: 'Usuário não encontrado.' })

  const body = await readBody(event)
  const { nome, perfil, escopo_tomador_ids, escopo_posto_ids, escopo_turno_ids } = body

  const { data: atualizado, error } = await supabase.from('sgo_usuarios')
    .update({ nome, perfil, escopo_tomador_ids, escopo_posto_ids, escopo_turno_ids, updated_by: me.id })
    .eq('id', id)
    .select('id, nome, email, login, perfil, status, primeiro_acesso, tentativas_login, ultimo_acesso, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await supabase.rpc('fn_audit', {
    p_entidade: 'sgo_usuarios', p_entidade_id: id,
    p_acao: 'E', p_usuario_id: me.id, p_usuario_nome: me.nome,
    p_antes: antes, p_depois: atualizado,
  })

  return { ...atualizado, capacidades: antes.sgo_capacidades_usuario ?? [] }
})
