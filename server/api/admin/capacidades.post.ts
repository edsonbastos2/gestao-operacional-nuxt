import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  if (!token) throw createError({ statusCode: 401 })

  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw createError({ statusCode: 401 })
  const { data: me } = await supabase.from('sgo_usuarios').select('id, perfil, nome').eq('auth_user_id', user.id).single()
  if (me?.perfil !== 'ti_admin') throw createError({ statusCode: 403 })

  const { usuario_id, capacidade, justificativa, validade } = await readBody(event)

  if (!usuario_id || !capacidade || !justificativa || justificativa.length < 10)
    throw createError({ statusCode: 400, message: 'Campos obrigatórios: usuario_id, capacidade, justificativa (mín. 10 chars).' })

  // Upsert — revoga anterior e cria nova
  await supabase.from('sgo_capacidades_usuario')
    .update({ revogada_em: new Date().toISOString(), revogada_por: me.id })
    .eq('usuario_id', usuario_id).eq('capacidade', capacidade).is('revogada_em', null)

  const { data: nova, error } = await supabase.from('sgo_capacidades_usuario').insert({
    usuario_id, capacidade,
    gerente_id: me.id,
    justificativa: justificativa.trim(),
    validade: validade || null,
  }).select('id, usuario_id, capacidade, gerente_id, justificativa, validade, revogada_em, created_at').single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await supabase.rpc('fn_audit', {
    p_entidade: 'sgo_capacidades_usuario', p_entidade_id: nova!.id,
    p_acao: 'C', p_usuario_id: me.id, p_usuario_nome: me.nome,
    p_depois: nova, p_justificativa: justificativa,
  })

  return { ...nova, gerente_nome: me.nome }
})
