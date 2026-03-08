import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'sgo-token')
  if (!token) throw createError({ statusCode: 401, message: 'Não autenticado.' })

  const config = useRuntimeConfig()
  const supabase = createClient(process.env.SUPABASE_URL!, config.supabaseServiceKey)

  // Verifica se é admin
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw createError({ statusCode: 401 })
  const { data: me } = await supabase.from('sgo_usuarios').select('perfil').eq('auth_user_id', user.id).single()
  if (me?.perfil !== 'ti_admin') throw createError({ statusCode: 403, message: 'Acesso negado.' })

  const query = getQuery(event)
  const page = Number(query.page ?? 1)
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('sgo_usuarios')
    .select('id, nome, email, login, perfil, status, primeiro_acesso, tentativas_login, ultimo_acesso, created_at, sgo_capacidades_usuario(id, usuario_id, capacidade, gerente_id, justificativa, validade, revogada_em, created_at)', { count: 'exact' })
    .order('nome')
    .range(from, to)

  if (query.q)      q = q.ilike('nome', `%${query.q}%`)
  if (query.perfil) q = q.eq('perfil', query.perfil)
  if (query.status) q = q.eq('status', query.status)

  const { data, count, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    data: (data ?? []).map(u => ({ ...u, capacidades: u.sgo_capacidades_usuario ?? [] })),
    total: count ?? 0,
  }
})
