import { getUsuarioAutenticado } from '~/server/utils/supabase'
export default defineEventHandler(async (event) => {
  const { supabase } = await getUsuarioAutenticado(event)
  const q = getQuery(event); const page = Number(q.page ?? 1); const ps = 20
  let query = supabase.from('sgo_candidatos')
    .select('*, sgo_funcoes(id,nome), sgo_postos(id,nome)', { count: 'exact' })
    .order('nome').range((page-1)*ps, page*ps-1)
  if (q.q)      query = query.ilike('nome', `%${q.q}%`)
  if (q.status) query = query.eq('status', q.status as string)
  const { data, count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data: (data ?? []).map(c => ({ ...c, funcao: c.sgo_funcoes, posto: c.sgo_postos })), total: count ?? 0 }
})
