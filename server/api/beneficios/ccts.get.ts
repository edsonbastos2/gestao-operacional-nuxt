import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event)
  const page = Number(q.page ?? 1); const ps = 50
  let query = supabase
    .from('sgo_ccts')
    .select('*, sgo_prestadoras(id,razao_social,nome_fantasia), sgo_cct_funcoes(funcao_id, sgo_funcoes(id,nome))', { count: 'exact' })
    .order('nome')
    .range((page-1)*ps, page*ps-1)
  if (q.prestadora_id) query = query.eq('prestadora_id', q.prestadora_id as string)
  if (q.status)        query = query.eq('status', q.status as string)
  else                 query = query.eq('status', 'ativo')
  if (q.q)             query = query.ilike('nome', `%${q.q}%`)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: data ?? [], total: count ?? 0 }
})
